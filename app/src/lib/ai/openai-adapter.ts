import { openai } from "@ai-sdk/openai";
import { generateText, Output, streamText } from "ai";
import { z } from "zod";

import {
  buildRejectedClaimChatSystemPrompt,
  enforceRejectedClaimChatGuardrails,
} from "@/lib/ai/chat-guardrails";
import {
  MANDATORY_ASSESSMENT_DISCLAIMER,
  type AiAdapter,
} from "@/lib/ai/types";

const assessmentOutputSchema = z.object({
  decision: z.enum(["accepted", "rejected", "needs_clarification"]),
  damageType: z.enum(["mechanical", "unknown"]),
  confidence: z.enum(["low", "medium", "high"]),
  reasoningSummary: z.string().min(1),
  photoEvidenceSummary: z.string().min(1),
  descriptionEvidenceSummary: z.string().min(1),
  serviceReviewRecommended: z.boolean(),
});

export function createOpenAiAdapter(): AiAdapter {
  const modelId = process.env.OPENAI_MODEL ?? "gpt-5.5";
  const model = openai.chat(modelId);

  return {
    async assessClaim(input) {
      const { output } = await generateText({
        model,
        output: Output.object({
          schema: assessmentOutputSchema,
          name: "claim_assessment",
        }),
        system: [
          "Jesteś asystentem do wstępnej oceny reklamacji rowerów.",
          "Odpowiadasz wyłącznie po polsku i zwracasz dane zgodne ze schematem.",
          "Uwzględniaj zdjęcia oraz opis okoliczności. Nie odrzucaj reklamacji wyłącznie na podstawie zdjęcia, jeśli opis wskazuje normalną jazdę.",
          "Decyzja jest wstępna i może wymagać weryfikacji sprzedawcy lub serwisu.",
        ].join(" "),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: [
                  `Sprzęt: ${input.equipmentType}`,
                  `Marka: ${input.brand}`,
                  `Model: ${input.model}`,
                  `Opis problemu: ${input.problemDescription}`,
                  `Okoliczności: ${input.damageCircumstances}`,
                  `Polityka: ${input.policyText}`,
                ].join("\n"),
              },
              ...input.photos.map((photo) => ({
                type: "image" as const,
                image: photo.bytes,
                mediaType: photo.mimeType,
              })),
            ],
          },
        ],
      });

      return {
        ...output,
        mandatoryDisclaimer: MANDATORY_ASSESSMENT_DISCLAIMER,
      };
    },

    async streamRejectedClaimChat(input) {
      const result = streamText({
        model,
        system: buildRejectedClaimChatSystemPrompt(input),
        messages: [
          ...input.chatHistory.map((message) => ({
            role: message.role === "system" ? "assistant" as const : message.role,
            content: message.content,
          })),
          { role: "user" as const, content: input.userMessage },
        ],
        maxOutputTokens: 500,
      });

      return guardedTextStream(result.textStream);
    },
  };
}

async function* guardedTextStream(stream: AsyncIterable<string>) {
  let text = "";
  for await (const chunk of stream) {
    text += chunk;
  }
  yield enforceRejectedClaimChatGuardrails(text);
}

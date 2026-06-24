import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage
} from "ai";
import { z } from "zod";

import {
  decisionResultSchema,
  imageAnalysisSchema,
  intakeSubmissionSchema,
  type IntakeSubmission
} from "../../shared/contracts";
import { buildChatContinuationPrompt } from "../prompts/policy-prompts";
import { loadPolicyForRequestType } from "../policies/policy-loader";
import { createOpenRouterModelFactory, type OpenRouterModelFactory } from "./openrouter-provider";

const uiMessageSchema = z
  .object({
    id: z.string().trim().min(1),
    role: z.enum(["system", "user", "assistant"]),
    parts: z.array(z.unknown())
  })
  .passthrough()
  .transform((message): UIMessage => message as UIMessage);

export const chatCaseContextSchema = z.object({
  caseId: z.string().trim().min(1),
  submission: intakeSubmissionSchema,
  imageAnalysis: imageAnalysisSchema,
  decision: decisionResultSchema
});

export const chatMessagesSchema = z.array(uiMessageSchema).min(1);

export type ChatCaseContext = z.infer<typeof chatCaseContextSchema>;

export type StreamCaseChatReplyInput = {
  caseContext: ChatCaseContext;
  messages: UIMessage[];
  modelFactory?: OpenRouterModelFactory;
};

export const streamCaseChatReply = async ({
  caseContext,
  messages,
  modelFactory
}: StreamCaseChatReplyInput): Promise<Response> => {
  if (isOffTopicRequest(messages, caseContext.submission)) {
    return createOffTopicResponse(caseContext, messages);
  }

  const policy = await loadPolicyForRequestType(caseContext.submission.requestType);
  const resolvedModelFactory = modelFactory ?? createOpenRouterModelFactory();
  const modelMessages = await convertToModelMessages(messages);
  const result = streamText({
    model: resolvedModelFactory.modelFor("chat"),
    system: buildChatContinuationPrompt({
      policy: policy.content,
      caseContext: buildPromptCaseContext(caseContext, messages),
      initialDecision: JSON.stringify(caseContext.decision, null, 2)
    }),
    messages: modelMessages,
    temperature: 0.2,
    experimental_include: {
      requestBody: false
    }
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onError: () => "Nie udało się wygenerować odpowiedzi. Spróbuj ponownie."
  });
};

const buildPromptCaseContext = (caseContext: ChatCaseContext, messages: UIMessage[]) =>
  [
    "Snapshot zgłoszenia:",
    JSON.stringify(
      {
        caseId: caseContext.caseId,
        submission: {
          requestType: caseContext.submission.requestType,
          equipmentCategory: caseContext.submission.equipmentCategory,
          equipmentName: caseContext.submission.equipmentName,
          purchaseDate: caseContext.submission.purchaseDate,
          reason: caseContext.submission.reason,
          images: caseContext.submission.images
        }
      },
      null,
      2
    ),
    "",
    "Analiza zdjęcia:",
    JSON.stringify(caseContext.imageAnalysis, null, 2),
    "",
    "Historia wiadomości:",
    formatMessageHistory(messages)
  ].join("\n");

const formatMessageHistory = (messages: UIMessage[]) =>
  messages
    .map((message) => {
      const text = getMessageText(message);

      return `${message.role}: ${text.length > 0 ? text : "[brak tekstu]"}`;
    })
    .join("\n");

const createOffTopicResponse = (caseContext: ChatCaseContext, messages: UIMessage[]) => {
  const text = [
    "Nie mogę pomóc w tym pobocznym temacie.",
    `Mogę za to odpowiedzieć na pytania dotyczące tej sprawy: ${describeCase(caseContext.submission)}.`
  ].join(" ");

  const stream = createUIMessageStream({
    originalMessages: messages,
    execute({ writer }) {
      const id = "off-topic-refusal";

      writer.write({ type: "text-start", id });
      writer.write({ type: "text-delta", id, delta: text });
      writer.write({ type: "text-end", id });
    }
  });

  return createUIMessageStreamResponse({ stream });
};

const describeCase = (submission: IntakeSubmission) => {
  const requestType = submission.requestType === "RETURN" ? "zwrot" : "reklamacja";

  return `${requestType} dla sprzętu ${submission.equipmentName}`;
};

const isOffTopicRequest = (messages: UIMessage[], submission: IntakeSubmission) => {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  const text = latestUserMessage ? normalize(getMessageText(latestUserMessage)) : "";

  if (text.length === 0) {
    return false;
  }

  const caseTerms = [
    submission.equipmentName,
    submission.equipmentCategory,
    submission.reason,
    "zwrot",
    "reklamacja",
    "reklamacje",
    "sprzet",
    "sprzęt",
    "decyzja",
    "rekomendacja",
    "zdjecie",
    "zdjęcie",
    "uszkodzenie",
    "zakup",
    "termin",
    "serwis",
    "gwarancja",
    "naprawa"
  ]
    .map(normalize)
    .filter((term) => term.length >= 3);

  if (caseTerms.some((term) => text.includes(term))) {
    return false;
  }

  return [
    "napisz wiersz",
    "opowiedz zart",
    "opowiedz żart",
    "jaka jest pogoda",
    "prognoza pogody",
    "przepis",
    "plan trening",
    "kod w python",
    "kod javascript",
    "przetlumacz",
    "przetłumacz",
    "rozwod",
    "rozwód",
    "podatek",
    "kredyt"
  ]
    .map(normalize)
    .some((pattern) => text.includes(pattern));
};

const getMessageText = (message: UIMessage) =>
  message.parts
    .map((part) => (isTextPart(part) ? part.text : ""))
    .filter((text) => text.length > 0)
    .join("\n");

const isTextPart = (part: unknown): part is { type: "text"; text: string } =>
  typeof part === "object" &&
  part !== null &&
  "type" in part &&
  "text" in part &&
  part.type === "text" &&
  typeof part.text === "string";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

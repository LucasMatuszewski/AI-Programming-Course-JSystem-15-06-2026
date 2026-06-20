import { generateText, NoObjectGeneratedError, Output, type LanguageModel, type ModelMessage } from "ai";
import type { z } from "zod";

import { logger } from "../observability/logger";
import { AIOrchestrationError, invalidStructuredOutputError } from "./errors";

export type StructuredOutputOperation = "imageAnalysis" | "decision";

export type StructuredOutputRequest<TOutput> = {
  operation: StructuredOutputOperation;
  model: LanguageModel;
  schema: z.ZodType<TOutput>;
  system?: string;
  prompt?: string;
  messages?: ModelMessage[];
};

export type StructuredOutputGenerator = <TOutput>(
  request: StructuredOutputRequest<TOutput>
) => Promise<unknown>;

export const generateStructuredObject: StructuredOutputGenerator = async <TOutput>({
  operation,
  model,
  schema,
  system,
  prompt,
  messages
}: StructuredOutputRequest<TOutput>) => {
  try {
    const commonSettings = {
      model,
      system,
      temperature: 0,
      output: Output.object({ schema }),
      experimental_include: {
        requestBody: false,
        responseBody: false
      }
    } as const;

    const result = messages
      ? await generateText({
          ...commonSettings,
          messages
        })
      : await generateText({
          ...commonSettings,
          prompt: prompt ?? ""
        });

    return result.output;
  } catch (error) {
    // The provider error is the actual reason a generation fails. Log it here,
    // at the boundary, before it gets wrapped into a generic user-facing error.
    logger.error("ai.structured_generation_failed", { operation, error });

    if (NoObjectGeneratedError.isInstance(error)) {
      throw invalidStructuredOutputError(error);
    }

    if (error instanceof AIOrchestrationError) {
      throw error;
    }

    throw new AIOrchestrationError({
      code: "ai_generation_failed",
      kind: "AI_PROVIDER",
      message: "Nie udało się uzyskać odpowiedzi od modelu AI. Spróbuj ponownie.",
      retryable: true,
      cause: error
    });
  }
};

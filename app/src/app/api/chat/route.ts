import { z } from "zod";

import { assessmentErrorSchema, type AssessmentError } from "../../../shared/contracts";
import { AIOrchestrationError } from "../../../server/ai/errors";
import {
  chatCaseContextSchema,
  chatMessagesSchema,
  streamCaseChatReply
} from "../../../server/ai/chat";
import { PolicyLoadError } from "../../../server/policies/policy-loader";

export const maxDuration = 30;

const chatRequestSchema = z
  .object({
    caseContext: chatCaseContextSchema.optional(),
    context: chatCaseContextSchema.optional(),
    messages: chatMessagesSchema.optional()
  })
  .passthrough();

export async function POST(request: Request) {
  const bodyResult = await readJsonBody(request);

  if (!bodyResult.ok) {
    return errorResponse(bodyResult.error, 400);
  }

  const parsedRequest = chatRequestSchema.safeParse(bodyResult.value);

  if (!parsedRequest.success) {
    return errorResponse(
      {
        kind: "VALIDATION",
        retryable: false,
        message: "Nie udało się odczytać wiadomości czatu dla aktywnej sprawy."
      },
      400
    );
  }

  const caseContext = parsedRequest.data.caseContext ?? parsedRequest.data.context;

  if (!caseContext) {
    return errorResponse(
      {
        kind: "VALIDATION",
        retryable: false,
        message: "Brakuje aktywnego kontekstu sprawy."
      },
      400
    );
  }

  if (!parsedRequest.data.messages) {
    return errorResponse(
      {
        kind: "VALIDATION",
        retryable: false,
        message: "Brakuje historii wiadomości czatu."
      },
      400
    );
  }

  try {
    return await streamCaseChatReply({
      caseContext,
      messages: parsedRequest.data.messages
    });
  } catch (error) {
    return handleChatError(error);
  }
}

const readJsonBody = async (
  request: Request
): Promise<{ ok: true; value: unknown } | { ok: false; error: AssessmentError }> => {
  try {
    return {
      ok: true,
      value: await request.json()
    };
  } catch {
    return {
      ok: false,
      error: {
        kind: "VALIDATION",
        retryable: false,
        message: "Wyślij zapytanie czatu jako poprawny JSON."
      }
    };
  }
};

const handleChatError = (error: unknown) => {
  if (error instanceof AIOrchestrationError) {
    return errorResponse(
      {
        kind: error.kind,
        retryable: error.retryable,
        message: error.message
      },
      error.kind === "CONFIG" ? 500 : error.retryable ? 503 : 502
    );
  }

  if (error instanceof PolicyLoadError) {
    return errorResponse(
      {
        kind: "CONFIG",
        retryable: false,
        message: error.message
      },
      500
    );
  }

  return errorResponse(
    {
      kind: "UNKNOWN",
      retryable: false,
      message: "Wystąpił nieoczekiwany błąd serwera. Spróbuj ponownie później."
    },
    500
  );
};

const errorResponse = (error: AssessmentError, status: number) =>
  Response.json({ error: assessmentErrorSchema.parse(error) }, { status });

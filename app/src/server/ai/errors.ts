import type { AssessmentErrorKind } from "../../shared/contracts";

export class AIOrchestrationError extends Error {
  readonly code: string;
  readonly kind: AssessmentErrorKind;
  readonly retryable: boolean;

  constructor(params: {
    code: string;
    kind: AssessmentErrorKind;
    message: string;
    retryable: boolean;
    cause?: unknown;
  }) {
    super(params.message, { cause: params.cause });
    this.name = "AIOrchestrationError";
    this.code = params.code;
    this.kind = params.kind;
    this.retryable = params.retryable;
  }
}

export const invalidStructuredOutputError = (cause?: unknown) =>
  new AIOrchestrationError({
    code: "invalid_structured_output",
    kind: "AI_PROVIDER",
    message: "Model zwrócił niepoprawną strukturę odpowiedzi. Spróbuj ponownie.",
    retryable: true,
    cause
  });

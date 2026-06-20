import { randomUUID } from "node:crypto";

import {
  assessmentErrorSchema,
  formatValidationErrors,
  intakeSubmissionSchema,
  type AssessmentError,
  type DecisionResult,
  type ImageAnalysis,
  type IntakeSubmission,
  type ValidationError
} from "../../../shared/contracts";
import { analyzeImageForCase } from "../../../server/ai/image-analysis";
import { AIOrchestrationError } from "../../../server/ai/errors";
import {
  ImageProcessingError,
  processUploadedImage
} from "../../../server/image/image-processor";
import { loadPolicyForRequestType, PolicyLoadError } from "../../../server/policies/policy-loader";
import { generateInitialDecision } from "../../../server/ai/decision-generation";
import { logger } from "../../../server/observability/logger";

type AssessmentSuccessResponse = {
  caseId: string;
  submission: IntakeSubmission;
  imageAnalysis: ImageAnalysis;
  decision: DecisionResult;
  firstAssistantMessage: DecisionCardMessage;
};

type DecisionCardMessage = {
  role: "assistant";
  type: "decision-card";
  content: string;
  card: {
    greeting: string;
    outcome: DecisionResult["outcome"];
    title: string;
    justification: string;
    policyReferences: string[];
    nextSteps: string[];
    missingInformation: string[];
    disclaimer: string;
  };
};

type ParsedMultipartSubmission = {
  submission: IntakeSubmission;
  imageFile: File;
};

export async function POST(request: Request) {
  const parsedSubmission = await parseAndValidateMultipartSubmission(request);

  if (!parsedSubmission.ok) {
    return errorResponse(parsedSubmission.error, 400);
  }

  const { imageFile, submission } = parsedSubmission.value;

  const processedImageResult = await processImageForAssessment(submission, imageFile);

  if (!processedImageResult.ok) {
    return errorResponse(processedImageResult.error, processedImageResult.status);
  }

  const processedImage = processedImageResult.value;

  try {
    const imageAnalysis = await analyzeImageForCase({
      submission,
      image: {
        mimeType: processedImage.mimeType,
        payload: processedImage.payload
      }
    });

    const policy = await loadPolicyForRequestType(submission.requestType);
    const decision = await generateInitialDecision({
      submission,
      imageAnalysis,
      policy: policy.content
    });

    return Response.json({
      caseId: randomUUID(),
      submission,
      imageAnalysis,
      decision,
      firstAssistantMessage: buildDecisionCardMessage(decision)
    } satisfies AssessmentSuccessResponse);
  } catch (error) {
    return handleAssessmentError(error);
  }
}

const processImageForAssessment = async (submission: IntakeSubmission, imageFile: File) => {
  try {
    const processedImage = await processUploadedImage({
      bytes: Buffer.from(await imageFile.arrayBuffer()),
      mimeType: submission.images[0].mimeType
    });

    return {
      ok: true as const,
      value: processedImage
    };
  } catch (error) {
    if (error instanceof ImageProcessingError) {
      return {
        ok: false as const,
        status: error.kind === "VALIDATION" ? 400 : 422,
        error: {
          kind: error.kind,
          retryable: error.retryable,
          message: error.message,
          fieldErrors:
            error.kind === "VALIDATION"
              ? [
                  {
                    code: error.code,
                    field: "images.0",
                    message: error.message
                  }
                ]
              : undefined
        } satisfies AssessmentError
      };
    }

    return {
      ok: false as const,
      status: 422,
      error: {
        kind: "IMAGE_PROCESSING" as const,
        retryable: false,
        message: "Nie udało się przetworzyć zdjęcia. Dodaj inny plik JPEG, PNG albo WebP."
      }
    };
  }
};

const parseAndValidateMultipartSubmission = async (
  request: Request
): Promise<
  | { ok: true; value: ParsedMultipartSubmission }
  | { ok: false; error: AssessmentError }
> => {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return {
      ok: false,
      error: validationError([
        {
          code: "invalid_content_type",
          field: null,
          message: "Wyślij zgłoszenie jako formularz multipart/form-data."
        }
      ])
    };
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return {
      ok: false,
      error: validationError([
        {
          code: "invalid_multipart",
          field: null,
          message: "Nie udało się odczytać formularza. Spróbuj ponownie."
        }
      ])
    };
  }

  const imageFiles = [...formData.values()].filter(isFileLike);
  const submissionResult = intakeSubmissionSchema.safeParse({
    requestType: readTextField(formData, "requestType"),
    equipmentCategory: readTextField(formData, "equipmentCategory"),
    equipmentName: readTextField(formData, "equipmentName"),
    purchaseDate: readTextField(formData, "purchaseDate"),
    reason: readTextField(formData, "reason"),
    images: imageFiles.map((file) => ({
      name: file.name,
      mimeType: file.type,
      sizeBytes: file.size
    }))
  });

  if (!submissionResult.success) {
    return {
      ok: false,
      error: validationError(formatValidationErrors(submissionResult.error))
    };
  }

  return {
    ok: true,
    value: {
      submission: submissionResult.data,
      imageFile: imageFiles[0]
    }
  };
};

const readTextField = (formData: FormData, field: string) => {
  const value = formData.get(field);

  return typeof value === "string" ? value : undefined;
};

const isFileLike = (value: FormDataEntryValue): value is File =>
  typeof value === "object" &&
  value !== null &&
  "arrayBuffer" in value &&
  "name" in value &&
  "type" in value &&
  "size" in value;

const validationError = (fieldErrors: ValidationError[]): AssessmentError => ({
  kind: "VALIDATION",
  retryable: false,
  message: "Popraw błędy w formularzu i spróbuj ponownie.",
  fieldErrors
});

const handleAssessmentError = (error: unknown) => {
  if (error instanceof AIOrchestrationError) {
    // Expected, classified failures: warn level keeps them visible without noise.
    logger.warn("assess.orchestration_error", {
      code: error.code,
      kind: error.kind,
      retryable: error.retryable,
      error
    });

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

  // Anything reaching here is unexpected and uncategorised — log full detail.
  logger.error("assess.unexpected_error", { error });

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

const buildDecisionCardMessage = (decision: DecisionResult): DecisionCardMessage => {
  const greeting = "Dzień dobry, przygotowałem wstępną ocenę zgłoszenia.";
  const nextSteps = decision.nextSteps.length > 0 ? decision.nextSteps.join("\n") : "Brak dodatkowych kroków.";
  const missingInformation =
    decision.missingInformation.length > 0
      ? `\n\nBrakujące informacje:\n${decision.missingInformation.join("\n")}`
      : "";

  return {
    role: "assistant",
    type: "decision-card",
    content: [
      greeting,
      "",
      `Decyzja: ${decision.title}`,
      "",
      `Uzasadnienie: ${decision.justification}`,
      "",
      `Następne kroki:\n${nextSteps}`,
      missingInformation,
      "",
      decision.disclaimer
    ]
      .filter((part) => part.length > 0)
      .join("\n"),
    card: {
      greeting,
      outcome: decision.outcome,
      title: decision.title,
      justification: decision.justification,
      policyReferences: decision.policyReferences,
      nextSteps: decision.nextSteps,
      missingInformation: decision.missingInformation,
      disclaimer: decision.disclaimer
    }
  };
};

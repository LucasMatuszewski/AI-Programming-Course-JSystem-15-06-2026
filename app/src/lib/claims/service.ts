import path from "node:path";

import { prisma } from "@/lib/db/client";
import { getAiAdapter } from "@/lib/ai/adapter-registry";
import { enforceRejectedClaimChatGuardrails } from "@/lib/ai/chat-guardrails";
import { loadClaimsPolicy } from "@/lib/ai/policy-context";
import {
  MANDATORY_ASSESSMENT_DISCLAIMER,
  type AssessmentPhotoInput,
  type AssessmentResult,
} from "@/lib/ai/types";
import {
  canRequestServiceReview,
  mapAssessmentDecisionToClaimStatus,
  validateClaimTextInput,
  type ClaimStatus,
  type ValidationError,
} from "@/lib/claims/domain";
import { createClaimRepository } from "@/lib/claims/repository";
import { LocalPhotoStorage, validatePhotoFiles } from "@/lib/storage/local-photo-storage";

const MAX_CHAT_MESSAGE_LENGTH = 2000;

export async function submitClaim(formData: FormData) {
  const textInput = {
    equipmentType: String(formData.get("equipmentType") ?? ""),
    brand: String(formData.get("brand") ?? ""),
    model: String(formData.get("model") ?? ""),
    problemDescription: String(formData.get("problemDescription") ?? ""),
    damageCircumstances: String(formData.get("damageCircumstances") ?? ""),
  };
  const textValidation = validateClaimTextInput(textInput);
  if (!textValidation.success) {
    return { success: false as const, error: textValidation.error };
  }

  const files = formData
    .getAll("photos")
    .filter(isNonEmptyFile);
  const photoValidation = validatePhotoFiles(files);
  if (!photoValidation.success) {
    return { success: false as const, error: photoValidation.error };
  }

  const assessment = await getAiAdapter().assessClaim({
    ...textValidation.data,
    photos: await filesToAssessmentPhotos(files),
    policyText: await loadClaimsPolicy(),
  });
  const status = mapAssessmentDecisionToClaimStatus(assessment.decision);
  const claimId = crypto.randomUUID();
  const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "data", "uploads");
  const storage = new LocalPhotoStorage(uploadDir);
  const photos = await storage.storeClaimPhotos(claimId, files);
  const repository = createClaimRepository(prisma);

  const claim = await repository.createClaimWithAssessment({
    claim: {
      ...textValidation.data,
      status,
      damageType: assessment.damageType,
    },
    photos,
    assessment,
  });

  return {
    success: true as const,
    data: {
      claimId: claim.id,
      status: claim.status,
      assessment,
    },
  };
}

export async function requestServiceReview(claimId: string) {
  const repository = createClaimRepository(prisma);
  const claim = await repository.getClaimById(claimId);
  if (!claim) {
    return {
      success: false as const,
      error: { code: "CLAIM_NOT_FOUND", message: "Nie znaleziono zgłoszenia." },
    };
  }

  if (!canRequestServiceReview(claim.status as ClaimStatus)) {
    return {
      success: false as const,
      error: {
        code: "SERVICE_REVIEW_NOT_ALLOWED",
        message: "Tego zgłoszenia nie można przekazać do weryfikacji serwisu.",
      },
    };
  }

  const updated = await repository.updateClaimStatus(
    claimId,
    "service_review_requested",
  );
  return {
    success: true as const,
    data: { claimId: updated.id, status: updated.status },
  };
}

export async function clarifyClaim(claimId: string, formData: FormData) {
  const clarification = String(formData.get("clarification") ?? "").trim();
  if (!clarification) {
    return {
      success: false as const,
      error: {
        code: "CLARIFICATION_REQUIRED",
        message: "Dodaj doprecyzowanie problemu.",
      },
    };
  }

  const repository = createClaimRepository(prisma);
  const claim = await repository.getClaimById(claimId);
  if (!claim) {
    return {
      success: false as const,
      error: { code: "CLAIM_NOT_FOUND", message: "Nie znaleziono zgłoszenia." },
    };
  }

  const additionalFiles = formData
    .getAll("photos")
    .filter(isNonEmptyFile);
  const totalPhotoCount = claim.photos.length + additionalFiles.length;
  if (totalPhotoCount > 5) {
    return {
      success: false as const,
      error: {
        code: "PHOTO_LIMIT_EXCEEDED",
        message: "Możesz dodać maksymalnie 5 zdjęć łącznie.",
      },
    };
  }

  let photos: Awaited<ReturnType<LocalPhotoStorage["storeClaimPhotos"]>> = [];
  if (additionalFiles.length > 0) {
    const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "data", "uploads");
    const storage = new LocalPhotoStorage(uploadDir);
    photos = await storage.storeClaimPhotos(claimId, additionalFiles);
  }

  const assessment = await getAiAdapter().assessClaim({
    equipmentType: "bicycle",
    brand: claim.brand,
    model: claim.model,
    problemDescription: `${claim.problemDescription}\n${clarification}`,
    damageCircumstances: `${claim.damageCircumstances}\n${clarification}`,
    photos: await filesToAssessmentPhotos(additionalFiles),
    policyText: await loadClaimsPolicy(),
  });
  const status = mapAssessmentDecisionToClaimStatus(assessment.decision);
  const updated = await repository.updateClaimAfterClarification({
    claimId,
    clarification,
    status,
    damageType: assessment.damageType,
    photos,
    assessment,
  });

  return {
    success: true as const,
    data: {
      claimId: updated.id,
      status: updated.status,
      assessment,
    },
  };
}

export async function startRejectedClaimChat(claimId: string, userMessage: string) {
  const message = userMessage.trim();
  if (!message || message.length > MAX_CHAT_MESSAGE_LENGTH) {
    return {
      success: false as const,
      error: {
        code: "INVALID_CHAT_MESSAGE",
        message: "Wpisz krótką wiadomość do chatu.",
      },
    };
  }

  const repository = createClaimRepository(prisma);
  const claim = await repository.getClaimById(claimId);
  if (!claim) {
    return {
      success: false as const,
      error: { code: "CLAIM_NOT_FOUND", message: "Nie znaleziono zgłoszenia." },
    };
  }

  const latestAssessment = claim.assessments[0];
  if (!latestAssessment || latestAssessment.decision !== "rejected") {
    return {
      success: false as const,
      error: {
        code: "CHAT_NOT_ALLOWED",
        message: "Chat jest dostępny tylko dla odrzuconych zgłoszeń.",
      },
    };
  }

  await repository.appendChatMessage(claimId, {
    role: "user",
    content: message,
  });

  const textStream = await getAiAdapter().streamRejectedClaimChat({
    claim: {
      id: claim.id,
      brand: claim.brand,
      model: claim.model,
      problemDescription: claim.problemDescription,
      damageCircumstances: claim.damageCircumstances,
    },
    assessment: toAssessmentResult(latestAssessment),
    policyText: await loadClaimsPolicy(),
    userMessage: message,
    chatHistory: claim.chatMessages.map((chatMessage) => ({
      role: chatMessage.role,
      content: chatMessage.content,
    })),
  });

  return {
    success: true as const,
    data: {
      stream: createPersistedChatTextStream(claimId, textStream, repository),
    },
  };
}

export function statusForError(error: ValidationError) {
  if (error.code === "CLAIM_NOT_FOUND") {
    return 404;
  }
  if (error.code === "SERVICE_REVIEW_NOT_ALLOWED") {
    return 409;
  }
  if (error.code === "CHAT_NOT_ALLOWED") {
    return 409;
  }
  return 400;
}

function isNonEmptyFile(value: FormDataEntryValue): value is File {
  return (
    typeof value === "object" &&
    "arrayBuffer" in value &&
    "size" in value &&
    typeof value.size === "number" &&
    value.size > 0
  );
}

async function filesToAssessmentPhotos(files: File[]): Promise<AssessmentPhotoInput[]> {
  return Promise.all(
    files.map(async (file) => ({
      originalFileName: file.name,
      mimeType: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
    })),
  );
}

function toAssessmentResult(assessment: {
  decision: AssessmentResult["decision"];
  damageType: AssessmentResult["damageType"];
  confidence: AssessmentResult["confidence"];
  reasoningSummary: string;
  photoEvidenceSummary: string;
  descriptionEvidenceSummary: string;
  serviceReviewRecommended: boolean;
}): AssessmentResult {
  return {
    decision: assessment.decision,
    damageType: assessment.damageType,
    confidence: assessment.confidence,
    reasoningSummary: assessment.reasoningSummary,
    photoEvidenceSummary: assessment.photoEvidenceSummary,
    descriptionEvidenceSummary: assessment.descriptionEvidenceSummary,
    serviceReviewRecommended: assessment.serviceReviewRecommended,
    mandatoryDisclaimer: MANDATORY_ASSESSMENT_DISCLAIMER,
  };
}

function createPersistedChatTextStream(
  claimId: string,
  source: AsyncIterable<string>,
  repository: ReturnType<typeof createClaimRepository>,
) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        let rawText = "";
        for await (const chunk of source) {
          rawText += chunk;
        }

        const text = enforceRejectedClaimChatGuardrails(rawText);
        if (text) {
          controller.enqueue(encoder.encode(text));
          await repository.appendChatMessage(claimId, {
            role: "assistant",
            content: text,
          });
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

import path from "node:path";

import { prisma } from "@/lib/db/client";
import { assessClaimLocally } from "@/lib/ai/local-assessment";
import {
  canRequestServiceReview,
  mapAssessmentDecisionToClaimStatus,
  validateClaimTextInput,
  type ClaimStatus,
  type ValidationError,
} from "@/lib/claims/domain";
import { createClaimRepository } from "@/lib/claims/repository";
import { LocalPhotoStorage, validatePhotoFiles } from "@/lib/storage/local-photo-storage";

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

  const assessment = assessClaimLocally({
    problemDescription: textValidation.data.problemDescription,
    damageCircumstances: textValidation.data.damageCircumstances,
    photoCount: files.length,
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

  const assessment = assessClaimLocally({
    problemDescription: `${claim.problemDescription}\n${clarification}`,
    damageCircumstances: `${claim.damageCircumstances}\n${clarification}`,
    photoCount: totalPhotoCount,
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

export function statusForError(error: ValidationError) {
  if (error.code === "CLAIM_NOT_FOUND") {
    return 404;
  }
  if (error.code === "SERVICE_REVIEW_NOT_ALLOWED") {
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

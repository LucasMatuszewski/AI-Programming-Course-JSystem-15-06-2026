export const CLAIM_PHOTO_LIMIT = 5;
export const CLAIM_PHOTO_MIN = 1;

export type EquipmentType = "bicycle";
export type AssessmentDecision = "accepted" | "rejected" | "needs_clarification";
export type ClaimStatus =
  | "draft"
  | "submitted"
  | "needs_clarification"
  | "preliminarily_accepted"
  | "preliminarily_rejected"
  | "service_review_requested"
  | "closed";
export type DamageType = "mechanical" | "unknown";
export type AssessmentConfidence = "low" | "medium" | "high";

export type ClaimTextInput = {
  equipmentType: string;
  brand: string;
  model: string;
  problemDescription: string;
  damageCircumstances: string;
};

export type ValidationError = {
  code: string;
  message: string;
  details?: Record<string, string>;
};

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: ValidationError };

export function validateClaimTextInput(
  input: ClaimTextInput,
): ValidationResult<ClaimTextInput & { equipmentType: EquipmentType }> {
  const details: Record<string, string> = {};

  if (input.equipmentType !== "bicycle") {
    details.equipmentType = "W MVP obsługiwany jest tylko rower.";
  }
  if (!input.brand.trim()) {
    details.brand = "Podaj markę roweru.";
  }
  if (!input.model.trim()) {
    details.model = "Podaj model roweru.";
  }
  if (!input.problemDescription.trim()) {
    details.problemDescription = "Opisz problem.";
  }
  if (!input.damageCircumstances.trim()) {
    details.damageCircumstances = "Opisz okoliczności powstania uszkodzenia.";
  }

  if (Object.keys(details).length > 0) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Uzupełnij wymagane pola formularza.",
        details,
      },
    };
  }

  return {
    success: true,
    data: {
      equipmentType: "bicycle",
      brand: input.brand.trim(),
      model: input.model.trim(),
      problemDescription: input.problemDescription.trim(),
      damageCircumstances: input.damageCircumstances.trim(),
    },
  };
}

export function mapAssessmentDecisionToClaimStatus(
  decision: AssessmentDecision,
): ClaimStatus {
  if (decision === "accepted") {
    return "preliminarily_accepted";
  }
  if (decision === "rejected") {
    return "preliminarily_rejected";
  }
  return "needs_clarification";
}

export function canRequestServiceReview(status: ClaimStatus) {
  return ["preliminarily_rejected", "needs_clarification", "submitted"].includes(
    status,
  );
}

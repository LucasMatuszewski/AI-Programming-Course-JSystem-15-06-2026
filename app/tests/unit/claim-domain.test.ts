import { describe, expect, it } from "vitest";

import {
  CLAIM_PHOTO_LIMIT,
  canRequestServiceReview,
  mapAssessmentDecisionToClaimStatus,
  validateClaimTextInput,
} from "@/lib/claims/domain";

describe("claim domain", () => {
  it("accepts complete bicycle claim text input", () => {
    const result = validateClaimTextInput({
      equipmentType: "bicycle",
      brand: "Trek",
      model: "Marlin 7",
      problemDescription: "Rama pękła przy suporcie.",
      damageCircumstances: "Uszkodzenie powstało podczas normalnej jazdy.",
    });

    expect(result.success).toBe(true);
  });

  it("rejects missing required fields with Polish field messages", () => {
    const result = validateClaimTextInput({
      equipmentType: "bicycle",
      brand: "",
      model: "",
      problemDescription: "",
      damageCircumstances: "",
    });

    expect(result.success).toBe(false);
    expect(result.error?.details).toMatchObject({
      brand: "Podaj markę roweru.",
      model: "Podaj model roweru.",
      problemDescription: "Opisz problem.",
      damageCircumstances: "Opisz okoliczności powstania uszkodzenia.",
    });
  });

  it("maps AI assessment decisions to claim statuses", () => {
    expect(mapAssessmentDecisionToClaimStatus("accepted")).toBe(
      "preliminarily_accepted",
    );
    expect(mapAssessmentDecisionToClaimStatus("rejected")).toBe(
      "preliminarily_rejected",
    );
    expect(mapAssessmentDecisionToClaimStatus("needs_clarification")).toBe(
      "needs_clarification",
    );
  });

  it("allows service review only for configured statuses", () => {
    expect(canRequestServiceReview("preliminarily_rejected")).toBe(true);
    expect(canRequestServiceReview("needs_clarification")).toBe(true);
    expect(canRequestServiceReview("submitted")).toBe(true);
    expect(canRequestServiceReview("preliminarily_accepted")).toBe(false);
    expect(canRequestServiceReview("closed")).toBe(false);
  });

  it("keeps the MVP photo limit at five files", () => {
    expect(CLAIM_PHOTO_LIMIT).toBe(5);
  });
});

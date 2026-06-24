import type {
  AssessmentConfidence,
  AssessmentDecision,
  DamageType,
} from "@/lib/claims/domain";

export const MANDATORY_ASSESSMENT_DISCLAIMER =
  "To jest wstępna ocena wygenerowana automatycznie. Ostateczna decyzja może wymagać weryfikacji przez sprzedawcę lub serwis.";

export type AssessmentResult = {
  decision: AssessmentDecision;
  damageType: DamageType;
  confidence: AssessmentConfidence;
  reasoningSummary: string;
  photoEvidenceSummary: string;
  descriptionEvidenceSummary: string;
  serviceReviewRecommended: boolean;
  mandatoryDisclaimer: string;
};

export type AssessmentPhotoInput = {
  originalFileName: string;
  mimeType: string;
  bytes: Uint8Array;
};

export type ClaimAssessmentInput = {
  equipmentType: "bicycle";
  brand: string;
  model: string;
  problemDescription: string;
  damageCircumstances: string;
  photos: AssessmentPhotoInput[];
  policyText: string;
};

export type PersistedChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type RejectedClaimChatInput = {
  claim: {
    id: string;
    brand: string;
    model: string;
    problemDescription: string;
    damageCircumstances: string;
  };
  assessment: AssessmentResult;
  policyText: string;
  userMessage: string;
  chatHistory: PersistedChatMessage[];
};

export type AiAdapter = {
  assessClaim(input: ClaimAssessmentInput): Promise<AssessmentResult>;
  streamRejectedClaimChat(input: RejectedClaimChatInput): Promise<AsyncIterable<string>>;
};

import type {
  AssessmentError,
  DecisionOutcome,
  DecisionResult,
  ImageAnalysis,
  IntakeSubmission
} from "@/shared/contracts";

export type DecisionCardMessage = {
  role: "assistant";
  type: "decision-card";
  content: string;
  card: {
    greeting: string;
    outcome: DecisionOutcome;
    title: string;
    justification: string;
    policyReferences: string[];
    nextSteps: string[];
    missingInformation: string[];
    disclaimer: string;
  };
};

export type AssessmentSuccessResponse = {
  caseId: string;
  submission: IntakeSubmission;
  imageAnalysis: ImageAnalysis;
  decision: DecisionResult;
  firstAssistantMessage: DecisionCardMessage;
};

export type AssessmentErrorResponse = {
  error: AssessmentError;
};

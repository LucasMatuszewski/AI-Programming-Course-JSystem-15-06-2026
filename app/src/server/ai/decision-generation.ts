import {
  decisionResultSchema,
  type DecisionResult,
  type ImageAnalysis,
  type IntakeSubmission,
  type RequestType
} from "../../shared/contracts";
import {
  buildComplaintDecisionPrompt,
  buildReturnDecisionPrompt
} from "../prompts/policy-prompts";
import { AIOrchestrationError, invalidStructuredOutputError } from "./errors";
import { createOpenRouterModelFactory, type OpenRouterModelFactory } from "./openrouter-provider";
import { generateStructuredObject, type StructuredOutputGenerator } from "./structured-generation";

const DAY_MS = 24 * 60 * 60 * 1000;

export type GenerateInitialDecisionInput = {
  submission: IntakeSubmission;
  imageAnalysis: ImageAnalysis;
  policy: string;
  now?: Date;
  modelFactory?: OpenRouterModelFactory;
  generateStructuredObject?: StructuredOutputGenerator;
};

export const generateInitialDecision = async ({
  submission,
  imageAnalysis,
  policy,
  now = new Date(),
  modelFactory = createOpenRouterModelFactory(),
  generateStructuredObject: generate = generateStructuredObject
}: GenerateInitialDecisionInput): Promise<DecisionResult> => {
  const output = await generate({
    operation: "decision",
    model: modelFactory.modelFor("decision"),
    schema: decisionResultSchema,
    system: buildDecisionSystemPrompt(submission.requestType, policy),
    prompt: buildDecisionUserPrompt(submission, imageAnalysis)
  });

  const parsed = decisionResultSchema.safeParse(output);

  if (!parsed.success) {
    throw invalidStructuredOutputError(parsed.error);
  }

  validateDecisionContract(parsed.data);
  enforceVisualGuardrail({
    decision: parsed.data,
    imageAnalysis,
    submission,
    now
  });

  return parsed.data;
};

const buildDecisionSystemPrompt = (requestType: RequestType, policy: string) =>
  requestType === "RETURN"
    ? buildReturnDecisionPrompt({ policy })
    : buildComplaintDecisionPrompt({ policy });

const buildDecisionUserPrompt = (submission: IntakeSubmission, imageAnalysis: ImageAnalysis) =>
  [
    "Oceń zgłoszenie na podstawie danych formularza, analizy zdjęcia i wstrzykniętej polityki.",
    "Nie dopowiadaj faktów spoza tych danych.",
    "",
    "<ZGLOSZENIE>",
    JSON.stringify(
      {
        requestType: submission.requestType,
        equipmentCategory: submission.equipmentCategory,
        equipmentName: submission.equipmentName,
        purchaseDate: submission.purchaseDate,
        reason: submission.reason
      },
      null,
      2
    ),
    "</ZGLOSZENIE>",
    "",
    "<ANALIZA_ZDJECIA>",
    JSON.stringify(imageAnalysis, null, 2),
    "</ANALIZA_ZDJECIA>"
  ].join("\n");

const validateDecisionContract = (decision: DecisionResult) => {
  if (decision.outcome !== "NEEDS_MORE_INFO" && decision.missingInformation.length > 0) {
    throw invalidStructuredOutputError();
  }
};

const enforceVisualGuardrail = ({
  decision,
  imageAnalysis,
  submission,
  now
}: {
  decision: DecisionResult;
  imageAnalysis: ImageAnalysis;
  submission: IntakeSubmission;
  now: Date;
}) => {
  const visualEvidenceTooWeak = !imageAnalysis.usable || imageAnalysis.confidence === "low";
  const finalVisualOutcome = decision.outcome === "APPROVE" || decision.outcome === "REJECT";

  if (!visualEvidenceTooWeak || !finalVisualOutcome) {
    return;
  }

  if (decision.outcome === "REJECT" && hasClearMissedDeadline(submission, now)) {
    return;
  }

  throw new AIOrchestrationError({
    code: "unsafe_visual_decision",
    kind: "AI_PROVIDER",
    message:
      "Nie można zatwierdzić ani odrzucić zgłoszenia na podstawie nieużytecznego lub mało pewnego zdjęcia.",
    retryable: false
  });
};

const hasClearMissedDeadline = (submission: IntakeSubmission, now: Date) => {
  const purchaseDate = parseIsoDateOnly(submission.purchaseDate);

  if (!purchaseDate) {
    return false;
  }

  const today = startOfUtcDay(now);

  if (submission.requestType === "RETURN") {
    return today.getTime() - purchaseDate.getTime() > 14 * DAY_MS;
  }

  const complaintDeadline = new Date(
    Date.UTC(purchaseDate.getUTCFullYear() + 2, purchaseDate.getUTCMonth(), purchaseDate.getUTCDate())
  );

  return today.getTime() > complaintDeadline.getTime();
};

const parseIsoDateOnly = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfUtcDay = (value: Date) =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));

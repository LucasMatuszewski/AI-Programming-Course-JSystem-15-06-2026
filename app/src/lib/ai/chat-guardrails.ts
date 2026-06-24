import type { AssessmentResult } from "@/lib/ai/types";

type RejectedClaimPromptInput = {
  policyText: string;
  claim: {
    brand: string;
    model: string;
    problemDescription: string;
    damageCircumstances: string;
  };
  assessment: AssessmentResult;
};

const prohibitedPromisePatterns = [
  /obiecuj\w*/gi,
  /gwarantuj\w*/gi,
  /zwrot pieniędzy/gi,
  /zwrotu pieniędzy/gi,
  /wymian[ayę] roweru/gi,
  /wymian[ayę] sprzętu/gi,
  /napraw[ayę] w ramach reklamacji/gi,
  /reklamacja zostanie uznana/gi,
  /ostateczna decyzja/gi,
];

export function buildRejectedClaimChatSystemPrompt(
  input: RejectedClaimPromptInput,
) {
  return [
    "Jesteś asystentem reklamacji rowerów.",
    "Odpowiadaj po polsku, konkretnie i neutralnie.",
    "Wyjaśniaj wyłącznie wstępną odmowę na podstawie zgłoszenia, oceny AI i polityki reklamacji.",
    "Nie obiecuj uznania reklamacji, zwrotu pieniędzy, wymiany sprzętu ani naprawy.",
    "Nie udzielaj szczegółowej porady prawnej.",
    "Informuj, że dalsze czynności reklamacyjne może prowadzić sprzedawca lub serwis.",
    "",
    `Rower: ${input.claim.brand} ${input.claim.model}`,
    `Opis problemu: ${input.claim.problemDescription}`,
    `Okoliczności: ${input.claim.damageCircumstances}`,
    `Decyzja AI: ${input.assessment.decision}`,
    `Typ uszkodzenia: ${input.assessment.damageType}`,
    `Uzasadnienie: ${input.assessment.reasoningSummary}`,
    `Zdjęcia: ${input.assessment.photoEvidenceSummary}`,
    `Opis: ${input.assessment.descriptionEvidenceSummary}`,
    "",
    input.policyText,
  ].join("\n");
}

export function enforceRejectedClaimChatGuardrails(text: string) {
  const hasViolation = prohibitedPromisePatterns.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });

  if (!hasViolation) {
    return ensureServiceReviewBoundary(text);
  }

  return [
    "Nie mogę obiecać uznania reklamacji, zwrotu pieniędzy, wymiany sprzętu ani naprawy.",
    "Mogę wyjaśnić jedynie wstępną ocenę: zgłoszenie wymaga oceny sprzedawcy lub serwisu w dalszej procedurze.",
  ].join(" ");
}

function ensureServiceReviewBoundary(text: string) {
  if (/sprzedawc|serwis/i.test(text)) {
    return text;
  }

  return `${text} Dalsze czynności reklamacyjne może prowadzić sprzedawca lub serwis.`;
}

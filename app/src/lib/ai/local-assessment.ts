import type { AssessmentConfidence, AssessmentDecision, DamageType } from "@/lib/claims/domain";

export type AssessmentResult = {
  decision: AssessmentDecision;
  damageType: DamageType;
  confidence: AssessmentConfidence;
  reasoningSummary: string;
  photoEvidenceSummary: string;
  descriptionEvidenceSummary: string;
  serviceReviewRecommended: boolean;
};

export function assessClaimLocally(input: {
  problemDescription: string;
  damageCircumstances: string;
  photoCount: number;
}): AssessmentResult {
  const text = `${input.problemDescription} ${input.damageCircumstances}`.toLowerCase();
  const indicatesExternalEvent = /upad|przewr|koliz|uderz|wypad/.test(text);
  const indicatesNormalUse = /normaln|jazd|podczas jazdy|bez upadku/.test(text);
  const isVague = input.damageCircumstances.trim().length < 18 || /nie wiem/.test(text);

  if (indicatesExternalEvent) {
    return {
      decision: "rejected",
      damageType: "mechanical",
      confidence: "medium",
      reasoningSummary:
        "Opis wskazuje na zdarzenie zewnętrzne, które może wykluczać uznanie reklamacji.",
      photoEvidenceSummary: `Dodano ${input.photoCount} zdjęcie/zdjęcia pokazujące uszkodzenie.`,
      descriptionEvidenceSummary:
        "Klient opisał upadek, przewrócenie, uderzenie albo kolizję.",
      serviceReviewRecommended: true,
    };
  }

  if (indicatesNormalUse) {
    return {
      decision: "accepted",
      damageType: "mechanical",
      confidence: "medium",
      reasoningSummary:
        "Opis wskazuje, że uszkodzenie mogło powstać podczas normalnej jazdy.",
      photoEvidenceSummary: `Dodano ${input.photoCount} zdjęcie/zdjęcia pokazujące uszkodzenie.`,
      descriptionEvidenceSummary:
        "Klient wskazał normalnej jazdy jako okoliczność powstania uszkodzenia.",
      serviceReviewRecommended: true,
    };
  }

  if (isVague) {
    return {
      decision: "needs_clarification",
      damageType: "mechanical",
      confidence: "low",
      reasoningSummary:
        "Opis nie wyjaśnia wystarczająco okoliczności powstania uszkodzenia.",
      photoEvidenceSummary: `Dodano ${input.photoCount} zdjęcie/zdjęcia do wstępnej analizy.`,
      descriptionEvidenceSummary:
        "Potrzebne jest doprecyzowanie, czy uszkodzenie powstało podczas normalnego użycia, upadku albo kolizji.",
      serviceReviewRecommended: true,
    };
  }

  return {
    decision: "needs_clarification",
    damageType: "mechanical",
    confidence: "low",
    reasoningSummary:
      "Zdjęcia i opis wymagają doprecyzowania przed wstępną oceną.",
    photoEvidenceSummary: `Dodano ${input.photoCount} zdjęcie/zdjęcia do wstępnej analizy.`,
    descriptionEvidenceSummary:
      "Opis nie wskazuje jednoznacznie, czy uszkodzenie wynika z normalnego użytkowania.",
    serviceReviewRecommended: true,
  };
}

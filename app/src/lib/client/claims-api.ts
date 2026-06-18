export type AssessmentDecision = "accepted" | "rejected" | "needs_clarification";
export type ClaimStatus =
  | "submitted"
  | "needs_clarification"
  | "preliminarily_accepted"
  | "preliminarily_rejected"
  | "service_review_requested";
export type DamageType = "mechanical" | "unknown";
export type AssessmentConfidence = "low" | "medium" | "high";

export type AssessmentResult = {
  decision: AssessmentDecision;
  damageType: DamageType;
  confidence: AssessmentConfidence;
  reasoningSummary: string;
  photoEvidenceSummary: string;
  descriptionEvidenceSummary: string;
  serviceReviewRecommended: boolean;
};

export type ClaimDecisionResponse = {
  claimId: string;
  status: ClaimStatus;
  assessment: AssessmentResult;
};

export type ServiceReviewResponse = {
  claimId: string;
  status: "service_review_requested";
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ApiErrorBody = {
  message?: string;
  details?: Record<string, string>;
};

export async function submitClaim(formData: FormData) {
  return postForm<ClaimDecisionResponse>("/api/claims", formData);
}

export async function submitClarification(claimId: string, formData: FormData) {
  return postForm<ClaimDecisionResponse>(
    `/api/claims/${claimId}/clarifications`,
    formData,
  );
}

export async function requestServiceReview(claimId: string) {
  const response = await fetch(`/api/claims/${claimId}/service-review`, {
    method: "POST",
  });
  return readJson<ServiceReviewResponse>(response);
}

export async function sendRejectedClaimChatMessage(input: {
  claimId: string;
  messages: ChatMessage[];
  message: string;
}) {
  const response = await fetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    return {
      role: "assistant" as const,
      content:
        "Mogę wyjaśnić powód odmowy na podstawie danych zgłoszenia. Nie mogę obiecać uznania reklamacji, zwrotu, wymiany ani naprawy. Dalsza weryfikacja może zostać przekazana do sprzedawcy lub serwisu.",
    };
  }

  const data = (await response.json()) as { message?: string };
  return {
    role: "assistant" as const,
    content:
      data.message ??
      "Dalsze czynności reklamacyjne mogą zostać przekazane do sprzedawcy lub serwisu.",
  };
}

async function postForm<T>(url: string, formData: FormData) {
  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });
  return readJson<T>(response);
}

async function readJson<T>(response: Response) {
  const data = (await response.json().catch(() => ({}))) as ApiErrorBody | T;
  if (!response.ok) {
    const body = data as ApiErrorBody;
    throw new Error(body.message ?? "Nie udało się wykonać operacji.");
  }
  return data as T;
}

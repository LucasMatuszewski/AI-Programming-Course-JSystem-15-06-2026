export type RequestType = "complaint" | "return";

export type EquipmentCategory =
  | "laptop"
  | "desktop_pc"
  | "smartphone"
  | "tablet"
  | "monitor"
  | "tv"
  | "printer"
  | "headphones"
  | "smartwatch"
  | "gaming_console"
  | "computer_accessory"
  | "other_electronics";

export type CreateSessionInput = {
  requestType: RequestType;
  equipmentCategory: EquipmentCategory;
  equipmentNameOrModel: string;
  purchaseDate: string;
  reason: string;
  image: File;
};

export type ApiFieldErrors = Partial<Record<keyof CreateSessionInput, string>>;

export type ApiErrorResponse = {
  code: string;
  messagePl: string;
  fieldErrors?: ApiFieldErrors;
  traceId?: string;
};

export type DecisionResponse = {
  status: "approved" | "rejected" | "human_verification_required" | string;
  rejectionType?: string | null;
  rejectionReasonPl?: string | null;
  justificationPl: string;
  nextStepsPl: string;
  ruleCategory: string;
  version: number;
};

export type ImageRetryResponse = {
  reasonPl: string;
  remainingAttempts: number;
};

export type ChatMessageResponse = {
  messageId: string;
  role: "SYSTEM" | "CUSTOMER" | string;
  contentPl: string;
  sequenceNumber: number;
  messageType: "INITIAL_DECISION" | "FOLLOW_UP" | "DECISION_UPDATE" | string;
  createdAt: string;
};

export type SessionResponse = {
  sessionId: string;
  requestType?: RequestType;
  status?: string;
  terminalState?: string;
  imageAttemptCount?: number;
  remainingImageAttempts?: number;
  latestDecision?: DecisionResponse | null;
  imageRetry?: ImageRetryResponse | null;
  messages?: ChatMessageResponse[];
};

type RequestOptions = {
  fetcher?: typeof fetch;
  apiBaseUrl?: string;
};

export async function createSession(
  input: CreateSessionInput,
  options: RequestOptions = {}
): Promise<SessionResponse> {
  const fetcher = options.fetcher ?? fetch;
  const apiBaseUrl =
    options.apiBaseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  const formData = new FormData();

  formData.set("requestType", input.requestType);
  formData.set("equipmentCategory", input.equipmentCategory);
  formData.set("equipmentNameOrModel", input.equipmentNameOrModel);
  formData.set("purchaseDate", input.purchaseDate);
  formData.set("reason", input.reason);
  formData.set("image", input.image);

  const response = await fetcher(`${apiBaseUrl}/api/sessions`, {
    method: "POST",
    body: formData
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw normalizeApiError(body);
  }

  return body as SessionResponse;
}

export async function getSession(
  sessionId: string,
  options: RequestOptions = {}
): Promise<SessionResponse> {
  const response = await request(`/api/sessions/${sessionId}`, {
    method: "GET"
  }, options);

  return response as SessionResponse;
}

export async function retryImageAttempt(
  sessionId: string,
  image: File,
  options: RequestOptions = {}
): Promise<SessionResponse> {
  const formData = new FormData();
  formData.set("image", image);

  const response = await request(
    `/api/sessions/${sessionId}/image-attempts`,
    {
      method: "POST",
      body: formData
    },
    options
  );

  return response as SessionResponse;
}

export async function postChatMessage(
  sessionId: string,
  contentPl: string,
  options: RequestOptions = {}
): Promise<SessionResponse> {
  const response = await request(
    `/api/sessions/${sessionId}/chat/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ contentPl })
    },
    options
  );

  return response as SessionResponse;
}

async function request(
  path: string,
  init: RequestInit,
  options: RequestOptions
): Promise<unknown> {
  const fetcher = options.fetcher ?? fetch;
  const apiBaseUrl =
    options.apiBaseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

  const response = await fetcher(`${apiBaseUrl}${path}`, init);
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw normalizeApiError(body);
  }

  return body;
}

function normalizeApiError(body: unknown): ApiErrorResponse {
  if (isApiErrorResponse(body)) {
    return body;
  }

  return {
    code: "INTERNAL_ERROR",
    messagePl: "Nie udało się wysłać zgłoszenia."
  };
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "messagePl" in value
  );
}

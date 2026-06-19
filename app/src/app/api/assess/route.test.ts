import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DecisionResult, ImageAnalysis } from "../../../shared/contracts";
import { AIOrchestrationError } from "../../../server/ai/errors";
import { POST } from "./route";

const processUploadedImageMock = vi.hoisted(() => vi.fn());
const analyzeImageForCaseMock = vi.hoisted(() => vi.fn());
const generateInitialDecisionMock = vi.hoisted(() => vi.fn());
const loadPolicyForRequestTypeMock = vi.hoisted(() => vi.fn());

vi.mock("../../../server/image/image-processor", () => ({
  ImageProcessingError: class ImageProcessingError extends Error {
    readonly code: string;
    readonly kind: string;
    readonly retryable: boolean;

    constructor(params: {
      code: string;
      kind: string;
      message: string;
      retryable?: boolean;
    }) {
      super(params.message);
      this.name = "ImageProcessingError";
      this.code = params.code;
      this.kind = params.kind;
      this.retryable = params.retryable ?? false;
    }
  },
  processUploadedImage: processUploadedImageMock
}));

vi.mock("../../../server/ai/image-analysis", () => ({
  analyzeImageForCase: analyzeImageForCaseMock
}));

vi.mock("../../../server/ai/decision-generation", () => ({
  generateInitialDecision: generateInitialDecisionMock
}));

vi.mock("../../../server/policies/policy-loader", () => ({
  PolicyLoadError: class PolicyLoadError extends Error {
    constructor() {
      super("Brak wymaganej polityki.");
      this.name = "PolicyLoadError";
    }
  },
  loadPolicyForRequestType: loadPolicyForRequestTypeMock
}));

const imageAnalysis: ImageAnalysis = {
  usable: true,
  description: "Na zdjeciu widac telefon bez uszkodzen.",
  visibleDamage: [],
  conditionSignals: ["brak widocznych pekniec"],
  likelyCause: "unclear",
  missingItems: [],
  confidence: "high"
};

const approveDecision: DecisionResult = {
  outcome: "APPROVE",
  title: "Zwrot moze zostac przyjety",
  justification: "Zgloszenie miesci sie w terminie 14 dni i nie widac sladow uzycia.",
  policyReferences: ["Zwrot w terminie 14 dni"],
  nextSteps: ["Przygotuj kompletne urzadzenie do odeslania."],
  missingInformation: [],
  changedFromPrevious: false,
  disclaimer: "Ocena jest wstepna i niewiazaca; ostateczna decyzja nalezy do zespolu serwisu."
};

const rejectDecision: DecisionResult = {
  ...approveDecision,
  outcome: "REJECT",
  title: "Reklamacja nie kwalifikuje sie",
  justification: "Widoczne uszkodzenie mechaniczne jest wylaczone z reklamacji.",
  policyReferences: ["Wylaczenie uszkodzen mechanicznych"],
  nextSteps: ["Mozesz zapytac o platna naprawe."]
};

const needsMoreInfoDecision: DecisionResult = {
  ...approveDecision,
  outcome: "NEEDS_MORE_INFO",
  title: "Potrzebujemy dodatkowych informacji",
  justification: "Zdjecie nie pozwala potwierdzic stanu urzadzenia.",
  policyReferences: ["Ocena stanu urzadzenia"],
  nextSteps: ["Dodaj wyrazniejsze zdjecie urzadzenia."],
  missingInformation: ["Wyrazne zdjecie urzadzenia z przodu"]
};

describe("POST /api/assess", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    processUploadedImageMock.mockResolvedValue({
      mimeType: "image/jpeg",
      byteLength: 512,
      width: 800,
      height: 600,
      payload: Buffer.from("compressed-image")
    });
    analyzeImageForCaseMock.mockResolvedValue(imageAnalysis);
    loadPolicyForRequestTypeMock.mockResolvedValue({
      requestType: "RETURN",
      content: "Polityka zwrotow",
      sourcePath: "docs/policies/polityka-zwrotow.md"
    });
    generateInitialDecisionMock.mockResolvedValue(approveDecision);
  });

  it("returns an approved assessment with sanitized submission and first decision card", async () => {
    const response = await POST(buildRequest({ reason: "  Chce zwrocic produkt.  " }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.caseId).toEqual(expect.any(String));
    expect(body.submission).toMatchObject({
      requestType: "RETURN",
      equipmentCategory: "Smartfon",
      equipmentName: "Telefon X",
      purchaseDate: "2026-06-10",
      reason: "Chce zwrocic produkt."
    });
    expect(body.imageAnalysis).toEqual(imageAnalysis);
    expect(body.decision).toEqual(approveDecision);
    expect(body.firstAssistantMessage).toMatchObject({
      role: "assistant",
      type: "decision-card",
      card: {
        greeting: "Dzień dobry, przygotowałem wstępną ocenę zgłoszenia.",
        outcome: "APPROVE",
        title: approveDecision.title,
        justification: approveDecision.justification,
        nextSteps: approveDecision.nextSteps,
        disclaimer: approveDecision.disclaimer
      }
    });
    expect(body.firstAssistantMessage.content).toContain(approveDecision.justification);
    expect(processUploadedImageMock).toHaveBeenCalledOnce();
    expect(analyzeImageForCaseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        submission: body.submission,
        image: expect.objectContaining({ mimeType: "image/jpeg" })
      })
    );
    expect(loadPolicyForRequestTypeMock).toHaveBeenCalledWith("RETURN");
    expect(generateInitialDecisionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        submission: body.submission,
        imageAnalysis,
        policy: "Polityka zwrotow"
      })
    );
  });

  it("returns a rejected assessment", async () => {
    generateInitialDecisionMock.mockResolvedValue(rejectDecision);

    const response = await POST(buildRequest({ requestType: "COMPLAINT", reason: "Ekran pekl po tygodniu." }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.decision.outcome).toBe("REJECT");
    expect(body.firstAssistantMessage.card.outcome).toBe("REJECT");
    expect(body.firstAssistantMessage.content).toContain(rejectDecision.nextSteps[0]);
  });

  it("returns a needs-more-info assessment", async () => {
    analyzeImageForCaseMock.mockResolvedValue({
      ...imageAnalysis,
      usable: false,
      description: "Zdjecie jest rozmazane.",
      missingItems: ["Wyrazne zdjecie urzadzenia"],
      confidence: "low"
    });
    generateInitialDecisionMock.mockResolvedValue(needsMoreInfoDecision);

    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.decision.outcome).toBe("NEEDS_MORE_INFO");
    expect(body.firstAssistantMessage.card.missingInformation).toEqual(
      needsMoreInfoDecision.missingInformation
    );
  });

  it("returns validation errors before image processing or AI calls", async () => {
    const response = await POST(buildRequest({ purchaseDate: "2099-01-01" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatchObject({
      kind: "VALIDATION",
      retryable: false
    });
    expect(body.error.fieldErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "future_purchase_date",
          field: "purchaseDate"
        })
      ])
    );
    expect(processUploadedImageMock).not.toHaveBeenCalled();
    expect(analyzeImageForCaseMock).not.toHaveBeenCalled();
    expect(generateInitialDecisionMock).not.toHaveBeenCalled();
  });

  it("returns an image-processing error without a decision", async () => {
    processUploadedImageMock.mockRejectedValue(
      new Error("Nie udalo sie odczytac zdjecia.")
    );

    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toMatchObject({
      kind: "IMAGE_PROCESSING",
      retryable: false
    });
    expect(body.decision).toBeUndefined();
    expect(analyzeImageForCaseMock).not.toHaveBeenCalled();
    expect(generateInitialDecisionMock).not.toHaveBeenCalled();
  });

  it("returns a retryable provider error without a decision", async () => {
    analyzeImageForCaseMock.mockRejectedValue(
      new AIOrchestrationError({
        code: "ai_generation_failed",
        kind: "AI_PROVIDER",
        message: "Nie udało się uzyskać odpowiedzi od modelu AI. Spróbuj ponownie.",
        retryable: true
      })
    );

    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toMatchObject({
      kind: "AI_PROVIDER",
      retryable: true,
      message: "Nie udało się uzyskać odpowiedzi od modelu AI. Spróbuj ponownie."
    });
    expect(body.decision).toBeUndefined();
    expect(generateInitialDecisionMock).not.toHaveBeenCalled();
  });
});

const buildRequest = (overrides: Partial<Record<string, string>> = {}) => {
  const formData = new FormData();
  formData.set("requestType", overrides.requestType ?? "RETURN");
  formData.set("equipmentCategory", overrides.equipmentCategory ?? "Smartfon");
  formData.set("equipmentName", overrides.equipmentName ?? "  Telefon X  ");
  formData.set("purchaseDate", overrides.purchaseDate ?? "2026-06-10");
  formData.set("reason", overrides.reason ?? "");
  formData.set("image", new File([new Uint8Array([1, 2, 3])], "telefon.jpg", { type: "image/jpeg" }));

  const request = new Request("http://localhost/api/assess", {
    method: "POST",
    headers: {
      "content-type": "multipart/form-data; boundary=test"
    }
  });

  Object.defineProperty(request, "formData", {
    value: async () => formData
  });

  return request;
};

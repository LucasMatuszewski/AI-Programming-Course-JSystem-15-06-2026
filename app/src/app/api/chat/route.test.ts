import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UIMessage } from "ai";

import type { DecisionResult, ImageAnalysis, IntakeSubmission } from "../../../shared/contracts";
import { POST } from "./route";

const streamTextMock = vi.hoisted(() => vi.fn());
const convertToModelMessagesMock = vi.hoisted(() => vi.fn());
const modelForMock = vi.hoisted(() => vi.fn());
const createOpenRouterModelFactoryMock = vi.hoisted(() => vi.fn(() => ({ modelFor: modelForMock })));
const loadPolicyForRequestTypeMock = vi.hoisted(() => vi.fn());

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");

  return {
    ...actual,
    convertToModelMessages: convertToModelMessagesMock,
    streamText: streamTextMock
  };
});

vi.mock("../../../server/ai/openrouter-provider", () => ({
  createOpenRouterModelFactory: createOpenRouterModelFactoryMock
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

const submission: IntakeSubmission = {
  requestType: "RETURN",
  equipmentCategory: "Smartfon",
  equipmentName: "Telefon X",
  purchaseDate: "2026-06-10",
  reason: "Chce zwrocic produkt.",
  images: [
    {
      name: "telefon.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1024
    }
  ]
};

const imageAnalysis: ImageAnalysis = {
  usable: true,
  description: "Na zdjeciu widac telefon bez uszkodzen.",
  visibleDamage: [],
  conditionSignals: ["brak widocznych pekniec"],
  likelyCause: "unclear",
  missingItems: [],
  confidence: "high"
};

const decision: DecisionResult = {
  outcome: "APPROVE",
  title: "Zwrot moze zostac przyjety",
  justification: "Zgloszenie miesci sie w terminie 14 dni i nie widac sladow uzycia.",
  policyReferences: ["Zwrot w terminie 14 dni"],
  nextSteps: ["Przygotuj kompletne urzadzenie do odeslania."],
  missingInformation: [],
  changedFromPrevious: false,
  disclaimer: "Ocena jest wstepna i niewiazaca; ostateczna decyzja nalezy do zespolu serwisu."
};

const messages: UIMessage[] = [
  {
    id: "msg-1",
    role: "user",
    parts: [{ type: "text", text: "Czy musze dolaczyc oryginalne opakowanie?" }]
  }
];

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    modelForMock.mockReturnValue("mock-chat-model");
    loadPolicyForRequestTypeMock.mockResolvedValue({
      requestType: "RETURN",
      content: "Polityka zwrotow: opakowanie pomaga w ocenie.",
      sourcePath: "docs/policies/polityka-zwrotow.md"
    });
    convertToModelMessagesMock.mockResolvedValue([{ role: "user", content: "converted history" }]);
    streamTextMock.mockReturnValue({
      toUIMessageStreamResponse: () =>
        new Response("data: {\"type\":\"text-delta\",\"delta\":\"Opakowanie pomaga w ocenie.\"}\n\n", {
          headers: { "content-type": "text/event-stream" }
        })
    });
  });

  it("streams a normal case-related answer with full case context", async () => {
    const response = await POST(buildRequest({ messages }));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(body).toContain("Opakowanie pomaga");
    expect(loadPolicyForRequestTypeMock).toHaveBeenCalledWith("RETURN");
    expect(modelForMock).toHaveBeenCalledWith("chat");
    expect(convertToModelMessagesMock).toHaveBeenCalledWith(messages);
    expect(streamTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "mock-chat-model",
        messages: [{ role: "user", content: "converted history" }]
      })
    );

    const streamTextInput = streamTextMock.mock.calls[0][0];
    expect(streamTextInput.system).toContain("Telefon X");
    expect(streamTextInput.system).toContain("Na zdjeciu widac telefon");
    expect(streamTextInput.system).toContain("Zwrot moze zostac przyjety");
    expect(streamTextInput.system).toContain("Polityka zwrotow");
    expect(streamTextInput.system).toContain("Czy musze dolaczyc oryginalne opakowanie?");
  });

  it("declines an off-topic request in Polish and redirects to the case", async () => {
    const response = await POST(
      buildRequest({
        messages: [
          {
            id: "msg-2",
            role: "user",
            parts: [{ type: "text", text: "Napisz wiersz o wakacjach." }]
          }
        ]
      })
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain("Nie mogę pomóc w tym pobocznym temacie");
    expect(body).toContain("Telefon X");
    expect(createOpenRouterModelFactoryMock).not.toHaveBeenCalled();
    expect(streamTextMock).not.toHaveBeenCalled();
    expect(loadPolicyForRequestTypeMock).not.toHaveBeenCalled();
  });

  it("allows a revised recommendation when new relevant information changes the case", async () => {
    streamTextMock.mockReturnValue({
      toUIMessageStreamResponse: () =>
        new Response("Zmieniam wstepna rekomendacje, bo nowa informacja wplywa na termin zwrotu.", {
          headers: { "content-type": "text/event-stream" }
        })
    });

    const response = await POST(
      buildRequest({
        messages: [
          {
            id: "msg-3",
            role: "user",
            parts: [
              {
                type: "text",
                text: "Znalazlem paragon: zakup byl jednak 20 dni temu. Czy rekomendacja sie zmienia?"
              }
            ]
          }
        ]
      })
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain("Zmieniam wstepna rekomendacje");

    const streamTextInput = streamTextMock.mock.calls[0][0];
    expect(streamTextInput.system).toContain("Możesz zrewidować rekomendację");
    expect(streamTextInput.system).toContain("co się zmieniło i dlaczego");
    expect(streamTextInput.system).toContain("Ocena ma charakter");
  });

  it("returns a validation error when active case context is missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({ messages }),
        headers: { "content-type": "application/json" }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatchObject({
      kind: "VALIDATION",
      retryable: false,
      message: "Brakuje aktywnego kontekstu sprawy."
    });
    expect(streamTextMock).not.toHaveBeenCalled();
  });
});

const buildRequest = ({
  caseContext = {
    caseId: "case-1",
    submission,
    imageAnalysis,
    decision
  },
  messages: requestMessages
}: {
  caseContext?: unknown;
  messages: UIMessage[];
}) =>
  new Request("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify({ caseContext, messages: requestMessages }),
    headers: { "content-type": "application/json" }
  });

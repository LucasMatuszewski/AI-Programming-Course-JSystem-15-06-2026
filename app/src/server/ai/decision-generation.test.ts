import { describe, expect, it, vi } from "vitest";
import type { LanguageModel } from "ai";

import type { DecisionResult, ImageAnalysis, IntakeSubmission } from "../../shared/contracts";
import { generateInitialDecision } from "./decision-generation";
import type { OpenRouterModelFactory } from "./openrouter-provider";
import type { StructuredOutputGenerator } from "./structured-generation";

const baseSubmission: IntakeSubmission = {
  requestType: "RETURN",
  equipmentCategory: "Smartfon",
  equipmentName: "Telefon X",
  purchaseDate: "2026-06-10",
  reason: "Chcę zwrócić produkt.",
  images: [{ name: "telefon.jpg", mimeType: "image/jpeg", sizeBytes: 1234 }]
};

const lowConfidenceImage: ImageAnalysis = {
  usable: false,
  description: "Zdjęcie jest zbyt rozmazane, aby ocenić stan produktu.",
  visibleDamage: [],
  conditionSignals: [],
  likelyCause: "unclear",
  missingItems: ["czytelne zdjęcie produktu"],
  confidence: "low"
};

const validDecision: DecisionResult = {
  outcome: "NEEDS_MORE_INFO",
  title: "Potrzebujemy dodatkowych informacji",
  justification: "Na podstawie polityki potrzebne jest czytelne zdjęcie produktu.",
  policyReferences: ["Ocena stanu produktu"],
  nextSteps: ["Dodaj wyraźne zdjęcie produktu."],
  missingInformation: ["Czytelne zdjęcie produktu"],
  changedFromPrevious: false,
  disclaimer: "Ocena jest wstępna i niewiążąca; ostateczna decyzja należy do zespołu serwisu."
};

const textModel = { provider: "openrouter", modelId: "text-model" } as LanguageModel;

const modelFactory = (): OpenRouterModelFactory => ({
  modelFor: vi.fn(() => textModel)
});

const generatorReturning = (output: unknown) =>
  vi.fn<StructuredOutputGenerator>(async () => output);

describe("generateInitialDecision", () => {
  it("uses the text model and returns validated structured output", async () => {
    const factory = modelFactory();
    const generateStructuredObject = generatorReturning(validDecision);

    const result = await generateInitialDecision({
      submission: baseSubmission,
      imageAnalysis: {
        ...lowConfidenceImage,
        usable: true,
        confidence: "medium"
      },
      policy: "Zwrot wymaga oceny stanu produktu.",
      now: new Date("2026-06-19T00:00:00.000Z"),
      modelFactory: factory,
      generateStructuredObject
    });

    expect(result).toEqual(validDecision);
    expect(factory.modelFor).toHaveBeenCalledWith("decision");
    expect(generateStructuredObject).toHaveBeenCalledWith(
      expect.objectContaining({
        model: textModel,
        operation: "decision"
      })
    );
  });

  it("fails closed when structured decision output is invalid", async () => {
    await expect(
      generateInitialDecision({
        submission: baseSubmission,
        imageAnalysis: lowConfidenceImage,
        policy: "Zwrot wymaga oceny stanu produktu.",
        now: new Date("2026-06-19T00:00:00.000Z"),
        modelFactory: modelFactory(),
        generateStructuredObject: generatorReturning({
          ...validDecision,
          outcome: "ACCEPT"
        })
      })
    ).rejects.toMatchObject({
      code: "invalid_structured_output",
      retryable: true
    });
  });

  it("blocks approve/reject when image is unusable or low-confidence", async () => {
    await expect(
      generateInitialDecision({
        submission: baseSubmission,
        imageAnalysis: lowConfidenceImage,
        policy: "Zwrot wymaga oceny stanu produktu.",
        now: new Date("2026-06-19T00:00:00.000Z"),
        modelFactory: modelFactory(),
        generateStructuredObject: generatorReturning({
          ...validDecision,
          outcome: "APPROVE",
          missingInformation: []
        })
      })
    ).rejects.toMatchObject({
      code: "unsafe_visual_decision",
      retryable: false
    });
  });

  it("allows a reject from a clear non-visual deadline rule", async () => {
    const result = await generateInitialDecision({
      submission: {
        ...baseSubmission,
        purchaseDate: "2026-05-01"
      },
      imageAnalysis: lowConfidenceImage,
      policy: "Zwrot po przekroczeniu 14 dni może zostać odrzucony.",
      now: new Date("2026-06-19T00:00:00.000Z"),
      modelFactory: modelFactory(),
      generateStructuredObject: generatorReturning({
        ...validDecision,
        outcome: "REJECT",
        title: "Zwrot po terminie",
        justification: "Zgłoszenie przekracza termin 14 dni wskazany w polityce.",
        policyReferences: ["Termin 14 dni"],
        nextSteps: ["Skontaktuj się z obsługą, jeśli data zakupu jest inna."],
        missingInformation: []
      })
    });

    expect(result.outcome).toBe("REJECT");
  });
});

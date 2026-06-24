import { describe, expect, it, vi } from "vitest";
import type { LanguageModel } from "ai";

import type { ImageAnalysis, IntakeSubmission } from "../../shared/contracts";
import { analyzeImageForCase } from "./image-analysis";
import type { OpenRouterModelFactory } from "./openrouter-provider";
import type { StructuredOutputGenerator } from "./structured-generation";

const submission: IntakeSubmission = {
  requestType: "RETURN",
  equipmentCategory: "Smartfon",
  equipmentName: "Telefon X",
  purchaseDate: "2026-06-10",
  reason: "Chcę zwrócić produkt.",
  images: [{ name: "telefon.jpg", mimeType: "image/jpeg", sizeBytes: 1234 }]
};

const validImageAnalysis: ImageAnalysis = {
  usable: true,
  description: "Na zdjęciu widać telefon bez oczywistych uszkodzeń.",
  visibleDamage: [],
  conditionSignals: ["brak widocznych pęknięć"],
  likelyCause: "unclear",
  missingItems: [],
  confidence: "medium"
};

const visionModel = { provider: "openrouter", modelId: "vision-model" } as LanguageModel;

const modelFactory = (): OpenRouterModelFactory => ({
  modelFor: vi.fn(() => visionModel)
});

describe("analyzeImageForCase", () => {
  it("uses the image analysis model and returns validated structured output", async () => {
    const factory = modelFactory();
    const generateStructuredObject = vi.fn<StructuredOutputGenerator>(async () => validImageAnalysis);

    const result = await analyzeImageForCase({
      submission,
      image: {
        mimeType: "image/jpeg",
        payload: Buffer.from("image")
      },
      modelFactory: factory,
      generateStructuredObject
    });

    expect(result).toEqual(validImageAnalysis);
    expect(factory.modelFor).toHaveBeenCalledWith("imageAnalysis");
    expect(generateStructuredObject).toHaveBeenCalledWith(
      expect.objectContaining({
        model: visionModel,
        operation: "imageAnalysis"
      })
    );
  });

  it("fails closed when the model output does not match the image schema", async () => {
    const generateStructuredObject = vi.fn<StructuredOutputGenerator>(async () => ({
      usable: true,
      description: "Brakuje wymaganych pól."
    }));

    await expect(
      analyzeImageForCase({
        submission,
        image: {
          mimeType: "image/jpeg",
          payload: Buffer.from("image")
        },
        modelFactory: modelFactory(),
        generateStructuredObject
      })
    ).rejects.toMatchObject({
      code: "invalid_structured_output",
      retryable: true
    });
  });
});

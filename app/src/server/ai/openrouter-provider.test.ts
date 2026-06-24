import { describe, expect, it, vi } from "vitest";
import type { LanguageModel } from "ai";

import {
  createOpenRouterModelFactory,
  resolveOpenRouterConfig
} from "./openrouter-provider";

const model = (modelId: string): LanguageModel => ({ provider: "openrouter", modelId }) as LanguageModel;

describe("OpenRouter model selection", () => {
  it("uses vision model for image analysis and text model for decision/chat", () => {
    const provider = vi.fn((modelId: string) => model(modelId));
    const createProvider = vi.fn(() => provider);
    const factory = createOpenRouterModelFactory({
      createProvider,
      env: {
        NODE_ENV: "production",
        OPENROUTER_API_KEY: "test-key",
        OPENROUTER_VISION_MODEL: "google/gemini-2.5-flash",
        OPENROUTER_TEXT_MODEL: "openai/gpt-4.1-mini"
      }
    });

    expect(factory.modelFor("imageAnalysis").modelId).toBe("google/gemini-2.5-flash");
    expect(factory.modelFor("decision").modelId).toBe("openai/gpt-4.1-mini");
    expect(factory.modelFor("chat").modelId).toBe("openai/gpt-4.1-mini");

    expect(createProvider).toHaveBeenCalledWith({
      apiKey: "test-key",
      compatibility: "strict"
    });
  });

  it("allows OPENROUTER_MODEL as local fallback only", () => {
    expect(
      resolveOpenRouterConfig({
        NODE_ENV: "development",
        OPENROUTER_API_KEY: "test-key",
        OPENROUTER_MODEL: "openai/gpt-4.1-mini"
      })
    ).toMatchObject({
      visionModel: "openai/gpt-4.1-mini",
      textModel: "openai/gpt-4.1-mini"
    });

    expect(() =>
      resolveOpenRouterConfig({
        NODE_ENV: "production",
        OPENROUTER_API_KEY: "test-key",
        OPENROUTER_MODEL: "openai/gpt-4.1-mini"
      })
    ).toThrow("OPENROUTER_VISION_MODEL");
  });
});

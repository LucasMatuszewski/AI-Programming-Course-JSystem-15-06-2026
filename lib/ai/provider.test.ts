import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// We test the factory by mocking the OpenRouter SDK so no real network call
// is made. The mock captures which model ID was passed and returns a fake
// model object with that ID accessible.
// ---------------------------------------------------------------------------

// Mock the provider module BEFORE importing lib/ai/provider
vi.mock("@openrouter/ai-sdk-provider", () => {
  const mockChat = vi.fn((modelId: string) => ({ id: modelId, __type: "chat-model" }));
  const mockInstance = { chat: mockChat };
  const createOpenRouter = vi.fn(() => mockInstance);
  return { createOpenRouter, __mockInstance: mockInstance };
});

// Import the mock accessors and the module under test AFTER the mock is set up
import * as OpenRouterModule from "@openrouter/ai-sdk-provider";
import { getMultimodalModel, getDecisionModel } from "./provider";

// The mock instance's chat function
const getMockChat = () => {
  const mod = OpenRouterModule as unknown as { __mockInstance: { chat: ReturnType<typeof vi.fn> } };
  return mod.__mockInstance.chat as ReturnType<typeof vi.fn>;
};

describe("provider model factory", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset env to known defaults before each test
    process.env.OPENROUTER_API_KEY = "sk-test-key";
    delete process.env.OPENROUTER_MULTIMODAL_MODEL;
    delete process.env.OPENROUTER_DECISION_MODEL;
    getMockChat().mockClear();
  });

  afterEach(() => {
    // Restore env
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) delete process.env[key];
    });
    Object.assign(process.env, originalEnv);
  });

  it("getMultimodalModel uses OPENROUTER_MULTIMODAL_MODEL env var", () => {
    process.env.OPENROUTER_MULTIMODAL_MODEL = "openai/gpt-4-vision";
    const model = getMultimodalModel();
    const chatFn = getMockChat();
    // chat() must have been called with the env var value
    expect(chatFn).toHaveBeenCalledWith("openai/gpt-4-vision");
    expect((model as { id: string }).id).toBe("openai/gpt-4-vision");
  });

  it("getDecisionModel uses OPENROUTER_DECISION_MODEL env var", () => {
    process.env.OPENROUTER_DECISION_MODEL = "anthropic/claude-3.5-sonnet";
    const model = getDecisionModel();
    const chatFn = getMockChat();
    expect(chatFn).toHaveBeenCalledWith("anthropic/claude-3.5-sonnet");
    expect((model as { id: string }).id).toBe("anthropic/claude-3.5-sonnet");
  });

  it("getMultimodalModel falls back to default when env var is not set", () => {
    const model = getMultimodalModel();
    expect((model as { id: string }).id).toBe("openai/gpt-4o");
  });

  it("getDecisionModel falls back to default when env var is not set", () => {
    const model = getDecisionModel();
    expect((model as { id: string }).id).toBe("anthropic/claude-3.5-sonnet");
  });

  it("getMultimodalModel and getDecisionModel are never cross-wired", () => {
    process.env.OPENROUTER_MULTIMODAL_MODEL = "vision-model-id";
    process.env.OPENROUTER_DECISION_MODEL = "decision-model-id";

    getMockChat().mockClear();
    const multimodal = getMultimodalModel();
    const [firstCall] = getMockChat().mock.calls;
    expect(firstCall[0]).toBe("vision-model-id");

    getMockChat().mockClear();
    const decision = getDecisionModel();
    const [secondCall] = getMockChat().mock.calls;
    expect(secondCall[0]).toBe("decision-model-id");

    // Confirm the IDs are different and not swapped
    expect((multimodal as { id: string }).id).toBe("vision-model-id");
    expect((decision as { id: string }).id).toBe("decision-model-id");
    expect((multimodal as { id: string }).id).not.toBe((decision as { id: string }).id);
  });

  it("env override changes the model selected at call time", () => {
    process.env.OPENROUTER_MULTIMODAL_MODEL = "custom/vision-v2";
    const model = getMultimodalModel();
    expect((model as { id: string }).id).toBe("custom/vision-v2");
  });
});

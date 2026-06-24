import { createOpenRouter, type OpenRouterProvider, type OpenRouterProviderSettings } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

import { AIOrchestrationError } from "./errors";

export type OpenRouterOperation = "imageAnalysis" | "decision" | "chat";

export type OpenRouterConfig = {
  apiKey: string;
  baseURL?: string;
  visionModel: string;
  textModel: string;
};

export type OpenRouterEnv = Record<string, string | undefined>;

export type OpenRouterModelFactory = {
  modelFor(operation: OpenRouterOperation): LanguageModel;
};

type CreateOpenRouterProvider = (options?: OpenRouterProviderSettings) => OpenRouterProvider;

export type OpenRouterModelFactoryOptions = {
  env?: OpenRouterEnv;
  createProvider?: CreateOpenRouterProvider;
};

export const resolveOpenRouterConfig = (env: OpenRouterEnv = process.env): OpenRouterConfig => {
  const isProduction = env.NODE_ENV === "production";
  const fallbackModel = readOptionalEnv(env, "OPENROUTER_MODEL");
  const visionModel = readOptionalEnv(env, "OPENROUTER_VISION_MODEL") ?? (!isProduction ? fallbackModel : undefined);
  const textModel = readOptionalEnv(env, "OPENROUTER_TEXT_MODEL") ?? (!isProduction ? fallbackModel : undefined);
  const apiKey = readOptionalEnv(env, "OPENROUTER_API_KEY");
  const baseURL = readOptionalEnv(env, "OPENROUTER_BASE_URL");

  if (!apiKey) {
    throw new AIOrchestrationError({
      code: "missing_openrouter_api_key",
      kind: "CONFIG",
      message: "Brakuje zmiennej OPENROUTER_API_KEY.",
      retryable: false
    });
  }

  if (!visionModel || !textModel) {
    throw new AIOrchestrationError({
      code: "missing_openrouter_models",
      kind: "CONFIG",
      message:
        "Brakuje zmiennych OPENROUTER_VISION_MODEL i OPENROUTER_TEXT_MODEL. OPENROUTER_MODEL jest dozwolony tylko lokalnie jako fallback.",
      retryable: false
    });
  }

  if (baseURL && !isHttpUrl(baseURL)) {
    throw new AIOrchestrationError({
      code: "invalid_openrouter_base_url",
      kind: "CONFIG",
      message: "OPENROUTER_BASE_URL musi być poprawnym adresem HTTP albo HTTPS.",
      retryable: false
    });
  }

  return {
    apiKey,
    ...(baseURL ? { baseURL } : {}),
    visionModel,
    textModel
  };
};

export const createOpenRouterModelFactory = ({
  env = process.env,
  createProvider = createOpenRouter
}: OpenRouterModelFactoryOptions = {}): OpenRouterModelFactory => {
  const config = resolveOpenRouterConfig(env);
  const provider = createProvider({
    apiKey: config.apiKey,
    compatibility: "strict",
    ...(config.baseURL ? { baseURL: config.baseURL } : {})
  });

  return {
    modelFor(operation) {
      const modelId = operation === "imageAnalysis" ? config.visionModel : config.textModel;

      return provider(modelId);
    }
  };
};

const readOptionalEnv = (env: OpenRouterEnv, key: string) => {
  const value = env[key]?.trim();

  return value && value.length > 0 ? value : undefined;
};

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

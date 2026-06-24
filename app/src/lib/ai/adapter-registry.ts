import type { AiAdapter } from "@/lib/ai/types";
import { createLocalAiAdapter } from "@/lib/ai/local-assessment";
import { createOpenAiAdapter } from "@/lib/ai/openai-adapter";

const globalForAi = globalThis as unknown as {
  aiAdapterOverride?: AiAdapter;
};

let cachedAdapter: AiAdapter | undefined;

export function getAiAdapter(): AiAdapter {
  if (globalForAi.aiAdapterOverride) {
    return globalForAi.aiAdapterOverride;
  }

  if (!cachedAdapter) {
    cachedAdapter = shouldUseOpenAiAdapter()
      ? createOpenAiAdapter()
      : createLocalAiAdapter();
  }

  return cachedAdapter;
}

export function setAiAdapterForTests(adapter: AiAdapter | undefined) {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("setAiAdapterForTests can be used only in tests");
  }

  globalForAi.aiAdapterOverride = adapter;
  cachedAdapter = undefined;
}

function shouldUseOpenAiAdapter() {
  if (process.env.AI_ADAPTER === "local" || process.env.AI_ADAPTER === "test") {
    return false;
  }

  return Boolean(process.env.OPENAI_API_KEY);
}

import { createOpenRouter } from "@openrouter/ai-sdk-provider";

// ---------------------------------------------------------------------------
// Default model IDs (ADR-000 §7)
// ---------------------------------------------------------------------------

const DEFAULT_MULTIMODAL_MODEL = "openai/gpt-4o";
const DEFAULT_DECISION_MODEL = "anthropic/claude-3.5-sonnet";

// ---------------------------------------------------------------------------
// Single provider instance — configured from env at module load time.
// ADR-003 AI-1: one createOpenRouter, two roles.
// ---------------------------------------------------------------------------

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
  ...(process.env.OPENROUTER_BASE_URL
    ? { baseURL: process.env.OPENROUTER_BASE_URL }
    : {}),
  ...(process.env.OPENROUTER_APP_NAME
    ? { appName: process.env.OPENROUTER_APP_NAME }
    : {}),
  ...(process.env.OPENROUTER_APP_URL
    ? { appUrl: process.env.OPENROUTER_APP_URL }
    : {}),
});

// ---------------------------------------------------------------------------
// Model factories — resolve env var at **call time** so tests can override
// process.env before invoking the factory.
// ---------------------------------------------------------------------------

/**
 * Returns the multimodal (vision) model.
 * Reads `OPENROUTER_MULTIMODAL_MODEL` at call time.
 * MUST NOT be used for decision or chat calls (ADR-003 AI-1).
 */
export function getMultimodalModel() {
  const modelId =
    process.env.OPENROUTER_MULTIMODAL_MODEL ?? DEFAULT_MULTIMODAL_MODEL;
  return openrouter.chat(modelId);
}

/**
 * Returns the decision/chat reasoning model.
 * Reads `OPENROUTER_DECISION_MODEL` at call time.
 * MUST NOT be used for image analysis calls (ADR-003 AI-1).
 */
export function getDecisionModel() {
  const modelId =
    process.env.OPENROUTER_DECISION_MODEL ?? DEFAULT_DECISION_MODEL;
  return openrouter.chat(modelId);
}

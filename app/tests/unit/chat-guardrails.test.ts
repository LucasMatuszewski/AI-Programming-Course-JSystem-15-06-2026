import { describe, expect, it } from "vitest";

import {
  buildRejectedClaimChatSystemPrompt,
  enforceRejectedClaimChatGuardrails,
} from "@/lib/ai/chat-guardrails";

describe("rejected claim chat guardrails", () => {
  it("removes prohibited promises from assistant text", () => {
    const result = enforceRejectedClaimChatGuardrails(
      "Obiecuję zwrot pieniędzy, wymianę roweru i naprawę w ramach reklamacji.",
    );

    expect(result).not.toMatch(/obiecuj/i);
    expect(result).not.toMatch(/zwrot pieniędzy/i);
    expect(result).not.toMatch(/wymianę roweru/i);
    expect(result).toMatch(/sprzedawc|serwis/i);
    expect(result).toMatch(/wstępn/i);
  });

  it("grounds the prompt in the claim policy and rejected assessment", () => {
    const prompt = buildRejectedClaimChatSystemPrompt({
      policyText: "Polityka reklamacji: upadek może wykluczać uznanie.",
      claim: {
        brand: "Trek",
        model: "Marlin 7",
        problemDescription: "Rama jest pęknięta.",
        damageCircumstances: "Rower przewrócił się podczas upadku.",
      },
      assessment: {
        decision: "rejected",
        damageType: "mechanical",
        confidence: "medium",
        reasoningSummary: "Opis wskazuje na zdarzenie zewnętrzne.",
        photoEvidenceSummary: "Zdjęcie pokazuje uszkodzenie ramy.",
        descriptionEvidenceSummary: "Klient opisał upadek.",
        serviceReviewRecommended: true,
        mandatoryDisclaimer:
          "To jest wstępna ocena wygenerowana automatycznie. Ostateczna decyzja może wymagać weryfikacji przez sprzedawcę lub serwis.",
      },
    });

    expect(prompt).toContain("Polityka reklamacji");
    expect(prompt).toContain("Trek Marlin 7");
    expect(prompt).toContain("Opis wskazuje na zdarzenie zewnętrzne.");
    expect(prompt).toContain("Odpowiadaj po polsku");
    expect(prompt).toContain("Nie obiecuj");
  });
});

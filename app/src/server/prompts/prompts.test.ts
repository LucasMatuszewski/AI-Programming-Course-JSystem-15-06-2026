import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildChatContinuationPrompt,
  buildComplaintDecisionPrompt,
  buildComplaintImageAnalysisPrompt,
  buildReturnDecisionPrompt,
  buildReturnImageAnalysisPrompt
} from "./policy-prompts";

const policy = "# Polityka\n\nReguła testowa.";

describe("policy prompts", () => {
  it("includes safety constraints in the return image analysis prompt", () => {
    const prompt = buildReturnImageAnalysisPrompt();

    expect(prompt).toContain("wstępna i niewiążąca");
    expect(prompt).toContain("Nie wymyślaj");
    expect(prompt).toContain("ZWROT");
    expect(prompt).toContain("stan do odsprzedaży");
  });

  it("includes safety constraints in the complaint image analysis prompt", () => {
    const prompt = buildComplaintImageAnalysisPrompt();

    expect(prompt).toContain("wstępna i niewiążąca");
    expect(prompt).toContain("Nie wymyślaj");
    expect(prompt).toContain("REKLAMACJA");
    expect(prompt).toContain("przyczynę uszkodzenia");
  });

  it("grounds return decisions in the return policy without invented rules", () => {
    const prompt = buildReturnDecisionPrompt({ policy });

    expect(prompt).toContain(policy);
    expect(prompt).toContain("14 dni");
    expect(prompt).toContain("wstępna i niewiążąca");
    expect(prompt).toContain("Nie wymyślaj terminów, praw, wyjątków ani środków");
    expect(prompt).toContain("APPROVE");
    expect(prompt).toContain("ESCALATE");
  });

  it("grounds complaint decisions in the complaint policy without invented rules", () => {
    const prompt = buildComplaintDecisionPrompt({ policy });

    expect(prompt).toContain(policy);
    expect(prompt).toContain("2 lat");
    expect(prompt).toContain("wstępna i niewiążąca");
    expect(prompt).toContain("Nie wymyślaj terminów, praw, wyjątków ani środków");
    expect(prompt).toContain("naprawa albo wymiana");
    expect(prompt).toContain("NEEDS_MORE_INFO");
  });

  it("grounds chat continuation in the selected policy and non-binding constraints", () => {
    const prompt = buildChatContinuationPrompt({
      policy,
      caseContext: "Typ: ZWROT. Produkt: słuchawki.",
      initialDecision: "NEEDS_MORE_INFO: brak zdjęcia plomby."
    });

    expect(prompt).toContain(policy);
    expect(prompt).toContain("Typ: ZWROT");
    expect(prompt).toContain("brak zdjęcia plomby");
    expect(prompt).toContain("wstępna i niewiążąca");
    expect(prompt).toContain("Nie wymyślaj terminów, praw, wyjątków ani środków");
    expect(prompt).toContain("odmów krótko po polsku");
  });
});

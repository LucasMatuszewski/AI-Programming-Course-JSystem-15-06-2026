import { render, screen } from "@testing-library/react";
import { DecisionSummary } from "./decision-summary";
import type { SessionResponse } from "@/lib/api/sessions";

describe("podsumowanie decyzji", () => {
  it("pokazuje weryfikację osobistą jako stan terminalny", () => {
    const session: SessionResponse = {
      sessionId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      status: "CLOSED",
      terminalState: "IN_PERSON_VERIFICATION_REQUIRED",
      imageAttemptCount: 3,
      remainingImageAttempts: 0,
      latestDecision: {
        status: "human_verification_required",
        rejectionType: null,
        rejectionReasonPl: null,
        justificationPl: "Zdjęcie nadal nie pozwala ocenić sprawy.",
        nextStepsPl: "Zgłoś się z produktem do serwisu stacjonarnego.",
        ruleCategory: "image.in_person_verification_after_three_attempts",
        version: 1
      },
      imageRetry: null,
      messages: []
    };

    render(<DecisionSummary session={session} />);

    expect(screen.getByText("Wymagana weryfikacja osobista")).toBeInTheDocument();
    expect(screen.getByText("Zgłoś się z produktem do serwisu stacjonarnego.")).toBeInTheDocument();
  });
});

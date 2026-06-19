import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClaimSubmissionApp } from "@/components/claims/claim-submission-app";

const rejectedResponse = {
  claimId: "claim-rejected",
  status: "preliminarily_rejected",
  assessment: {
    decision: "rejected",
    damageType: "mechanical",
    confidence: "medium",
    reasoningSummary:
      "Opis wskazuje na zdarzenie zewnętrzne, które może wykluczać uznanie reklamacji.",
    photoEvidenceSummary: "Dodano 1 zdjęcie pokazujące uszkodzenie.",
    descriptionEvidenceSummary: "Klient opisał upadek albo przewrócenie roweru.",
    serviceReviewRecommended: true,
  },
};

const clarificationResponse = {
  claimId: "claim-clarification",
  status: "needs_clarification",
  assessment: {
    decision: "needs_clarification",
    damageType: "mechanical",
    confidence: "low",
    reasoningSummary:
      "Opis nie wyjaśnia wystarczająco okoliczności powstania uszkodzenia.",
    photoEvidenceSummary: "Dodano 1 zdjęcie do wstępnej analizy.",
    descriptionEvidenceSummary:
      "Potrzebne jest doprecyzowanie, czy uszkodzenie powstało podczas normalnego użycia.",
    serviceReviewRecommended: true,
  },
};

function imageFile(name = "rama.jpg") {
  return new File(["image-bytes"], name, { type: "image/jpeg" });
}

async function submitClaim(circumstances: string) {
  fireEvent.change(screen.getByLabelText(/marka/i), {
    target: { value: "Trek" },
  });
  fireEvent.change(screen.getByLabelText(/model/i), {
    target: { value: "Marlin 7" },
  });
  fireEvent.change(screen.getByLabelText(/opis problemu/i), {
    target: { value: "Rama jest uszkodzona." },
  });
  fireEvent.change(screen.getByLabelText(/okoliczności uszkodzenia/i), {
    target: { value: circumstances },
  });
  fireEvent.change(screen.getByLabelText(/zdjęcia/i), {
    target: { files: [imageFile()] },
  });
  fireEvent.click(screen.getByRole("button", { name: /wyślij zgłoszenie/i }));
}

describe("przepływ decyzji reklamacyjnej", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("po odmowie pokazuje chat i pozwala przekazać sprawę do serwisu", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(rejectedResponse), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            claimId: "claim-rejected",
            status: "service_review_requested",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    render(<ClaimSubmissionApp />);
    await submitClaim("Rower przewrócił się podczas upadku na trasie.");

    expect(await screen.findByText(/nie podlega reklamacji/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /dane roweru/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /rozpocznij rozmowę z ai/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /przekaż do serwisu/i }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /rozpocznij rozmowę z ai/i }),
    );
    expect(
      await screen.findByText(/mogę wyjaśnić powód odmowy/i),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/napisz wiadomość/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /przekaż do serwisu/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/claims/claim-rejected/service-review",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    expect(
      await screen.findByText(/sprawa została przekazana do serwisu/i),
    ).toBeInTheDocument();
  });

  it("po decyzji wymagającej doprecyzowania wysyła uzupełnienie do endpointu clarifications", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(clarificationResponse), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            claimId: "claim-clarification",
            status: "preliminarily_accepted",
            assessment: {
              ...clarificationResponse.assessment,
              decision: "accepted",
              confidence: "medium",
              reasoningSummary:
                "Doprecyzowanie wskazuje na uszkodzenie podczas normalnej jazdy.",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    render(<ClaimSubmissionApp />);
    await submitClaim("Nie wiem.");

    expect(await screen.findByText(/wymaga doprecyzowania/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/doprecyzowanie problemu/i), {
      target: {
        value: "Rama pękła podczas normalnej jazdy po równej drodze.",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /wyślij doprecyzowanie/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/claims/claim-clarification/clarifications",
        expect.objectContaining({
          method: "POST",
          body: expect.any(FormData),
        }),
      ),
    );
    expect(
      await screen.findByText(/wstępnie podlega reklamacji/i),
    ).toBeInTheDocument();
  });
});

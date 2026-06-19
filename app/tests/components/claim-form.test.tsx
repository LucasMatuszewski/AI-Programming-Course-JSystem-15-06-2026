import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClaimSubmissionApp } from "@/components/claims/claim-submission-app";

function imageFile(name = "rama.jpg") {
  return new File(["image-bytes"], name, { type: "image/jpeg" });
}

describe("formularz reklamacji", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("nie pokazuje linku Decyzja przed otrzymaniem decyzji", () => {
    render(<ClaimSubmissionApp />);

    expect(screen.getByRole("link", { name: /zgłoszenie/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /decyzja/i })).not.toBeInTheDocument();
  });

  it("pokazuje polskie walidacje i blokuje wysyłkę pustego formularza", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(<ClaimSubmissionApp />);

    fireEvent.click(screen.getByRole("button", { name: /wyślij zgłoszenie/i }));

    expect(await screen.findByText("Podaj markę roweru.")).toBeInTheDocument();
    expect(screen.getByText("Podaj model roweru.")).toBeInTheDocument();
    expect(screen.getByText("Opisz problem.")).toBeInTheDocument();
    expect(
      screen.getByText("Opisz okoliczności powstania uszkodzenia."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Dodaj co najmniej jedno zdjęcie uszkodzenia."),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blokuje upload powyżej 5 zdjęć", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(<ClaimSubmissionApp />);

    fireEvent.change(screen.getByLabelText(/zdjęcia/i), {
      target: {
        files: [
          imageFile("1.jpg"),
          imageFile("2.jpg"),
          imageFile("3.jpg"),
          imageFile("4.jpg"),
          imageFile("5.jpg"),
          imageFile("6.jpg"),
        ],
      },
    });

    expect(
      await screen.findByText("Możesz dodać maksymalnie 5 zdjęć."),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("wysyła kompletne zgłoszenie jako multipart do POST /api/claims", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          claimId: "claim-1",
          status: "preliminarily_accepted",
          assessment: {
            decision: "accepted",
            damageType: "mechanical",
            confidence: "medium",
            reasoningSummary:
              "Opis wskazuje, że uszkodzenie mogło powstać podczas normalnej jazdy.",
            photoEvidenceSummary: "Dodano 1 zdjęcie pokazujące uszkodzenie.",
            descriptionEvidenceSummary:
              "Klient opisał normalną jazdę jako okoliczność uszkodzenia.",
            serviceReviewRecommended: true,
          },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(<ClaimSubmissionApp />);

    fireEvent.change(screen.getByLabelText(/marka/i), {
      target: { value: "Trek" },
    });
    fireEvent.change(screen.getByLabelText(/model/i), {
      target: { value: "Marlin 7" },
    });
    fireEvent.change(screen.getByLabelText(/opis problemu/i), {
      target: { value: "Rama pękła przy suporcie." },
    });
    fireEvent.change(screen.getByLabelText(/okoliczności uszkodzenia/i), {
      target: { value: "Rama pękła podczas normalnej jazdy po równej drodze." },
    });
    fireEvent.change(screen.getByLabelText(/zdjęcia/i), {
      target: { files: [imageFile()] },
    });

    fireEvent.click(screen.getByRole("button", { name: /wyślij zgłoszenie/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/claims");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
    expect((init?.body as FormData).get("brand")).toBe("Trek");
    expect(
      await screen.findByText(/wstępnie podlega reklamacji/i),
    ).toBeInTheDocument();
  });
});

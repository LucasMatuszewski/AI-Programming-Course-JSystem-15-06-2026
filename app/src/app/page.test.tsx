import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Home from "./page";

const successResponse = {
  caseId: "case-123",
  submission: {
    requestType: "RETURN",
    equipmentCategory: "Smartfon",
    equipmentName: "Pixel 9",
    purchaseDate: "2026-06-10",
    reason: "",
    images: [{ name: "telefon.jpg", mimeType: "image/jpeg", sizeBytes: 1024 }]
  },
  imageAnalysis: {
    usable: true,
    description: "Telefon jest widoczny i nie ma pekniec.",
    visibleDamage: [],
    conditionSignals: ["brak sladow uzycia"],
    likelyCause: "unclear",
    missingItems: [],
    confidence: "high"
  },
  decision: {
    outcome: "APPROVE",
    title: "Zwrot moze zostac przyjety",
    justification: "Produkt miesci sie w terminie zwrotu i wyglada na nieuzywany.",
    policyReferences: ["Zwrot w terminie 14 dni"],
    nextSteps: ["Spakuj kompletne urzadzenie i poczekaj na instrukcje."],
    missingInformation: [],
    changedFromPrevious: false,
    disclaimer: "To wstepna, niewiazaca ocena. Ostateczna decyzje podejmuje zespol serwisu."
  },
  firstAssistantMessage: {
    role: "assistant",
    type: "decision-card",
    content: "Dzien dobry",
    card: {
      greeting: "Dzien dobry, przygotowalem wstepna ocene zgloszenia.",
      outcome: "APPROVE",
      title: "Zwrot moze zostac przyjety",
      justification: "Produkt miesci sie w terminie zwrotu i wyglada na nieuzywany.",
      policyReferences: ["Zwrot w terminie 14 dni"],
      nextSteps: ["Spakuj kompletne urzadzenie i poczekaj na instrukcje."],
      missingInformation: [],
      disclaimer: "To wstepna, niewiazaca ocena. Ostateczna decyzje podejmuje zespol serwisu."
    }
  }
};

describe("strona startowa", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal(
      "URL",
      Object.assign(URL, {
        createObjectURL: vi.fn(() => "blob:preview"),
        revokeObjectURL: vi.fn()
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renderuje formularz intake w shellu aplikacji", () => {
    render(<Home />);

    expect(screen.getByRole("banner", { name: "Nagłówek aplikacji" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Copilot ds. decyzji o serwisie sprzętu" })
    ).toBeInTheDocument();
    expect(screen.getByRole("main", { name: "Obszar roboczy zgłoszenia" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Reklamacja" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Zwrot" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Przygotuj ocenę" })).toBeDisabled();
  });

  it("pokazuje walidacje, dynamiczny powod reklamacji i blokuje wysylke bez zdjecia", async () => {
    render(<Home />);

    fireEvent.click(screen.getByRole("radio", { name: "Reklamacja" }));
    expect(screen.getByLabelText(/Powód reklamacji/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Przygotuj ocenę" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Kategoria sprzętu/), { target: { value: "Smartfon" } });
    fireEvent.change(screen.getByLabelText(/Nazwa lub model sprzętu/), { target: { value: "Pixel 9" } });
    fireEvent.change(screen.getByLabelText(/Data zakupu/), { target: { value: "2999-01-01" } });
    fireEvent.change(screen.getByLabelText(/Powód reklamacji/), { target: { value: " " } });

    expect(await screen.findByText("Data zakupu nie może być z przyszłości.")).toBeInTheDocument();
    expect(screen.getByText("Opisz powód reklamacji.")).toBeInTheDocument();
    expect(screen.getByText("Dodaj dokładnie jedno zdjęcie sprzętu.")).toBeInTheDocument();
  });

  it("obsluguje wybor, podmiane i usuniecie jednego zdjecia", () => {
    render(<Home />);

    const picker = screen.getByLabelText(/Zdjęcie sprzętu/);
    const firstFile = new File(["a"], "telefon.jpg", { type: "image/jpeg" });
    const secondFile = new File(["b"], "tablet.webp", { type: "image/webp" });

    fireEvent.change(picker, { target: { files: [firstFile] } });
    expect(screen.getByText("telefon.jpg")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Podgląd zdjęcia sprzętu" })).toHaveAttribute("src", "blob:preview");

    fireEvent.change(picker, { target: { files: [secondFile] } });
    expect(screen.queryByText("telefon.jpg")).not.toBeInTheDocument();
    expect(screen.getByText("tablet.webp")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Usuń zdjęcie" }));
    expect(screen.queryByText("tablet.webp")).not.toBeInTheDocument();
    expect(screen.getByText("Dodaj dokładnie jedno zdjęcie sprzętu.")).toBeInTheDocument();
  });

  it("pokazuje blad dla zlego typu i pliku powyzej 10 MB", () => {
    render(<Home />);

    const picker = screen.getByLabelText(/Zdjęcie sprzętu/);

    fireEvent.change(picker, {
      target: { files: [new File(["pdf"], "faktura.pdf", { type: "application/pdf" })] }
    });
    expect(screen.getByText("Zdjęcie musi być w formacie JPEG, PNG albo WebP.")).toBeInTheDocument();

    const tooLargeFile = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "duze.png", {
      type: "image/png"
    });
    fireEvent.change(picker, { target: { files: [tooLargeFile] } });
    expect(screen.getByText("Zdjęcie może mieć maksymalnie 10 MB.")).toBeInTheDocument();
  });

  it("wysyla multipart do /api/assess i przechodzi do wstepnej decyzji", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(successResponse), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    render(<Home />);
    fillValidReturnForm();

    fireEvent.click(screen.getByRole("button", { name: "Przygotuj ocenę" }));

    expect(screen.getByText("Analizujemy zdjęcie i przygotowujemy ocenę...")).toBeInTheDocument();
    await screen.findByText("Zwrot moze zostac przyjety");

    expect(fetchMock).toHaveBeenCalledWith("/api/assess", {
      method: "POST",
      body: expect.any(FormData)
    });
    expect(screen.getByText("Decyzja wstępna")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Wiadomość" })).not.toBeInTheDocument();
  });

  it("pokazuje stan bledu i pozwala wrocic do formularza", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            kind: "AI_PROVIDER",
            retryable: true,
            message: "Nie udało się uzyskać odpowiedzi od modelu AI. Spróbuj ponownie."
          }
        }),
        { status: 503, headers: { "content-type": "application/json" } }
      )
    );

    render(<Home />);
    fillValidReturnForm();
    fireEvent.click(screen.getByRole("button", { name: "Przygotuj ocenę" }));

    expect(await screen.findByText("Nie możemy teraz dokończyć oceny.")).toBeInTheDocument();
    expect(screen.getByText("Nie udało się uzyskać odpowiedzi od modelu AI. Spróbuj ponownie.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Wróć do formularza" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Przygotuj ocenę" })).toBeEnabled());
  });
});

function fillValidReturnForm() {
  fireEvent.click(screen.getByRole("radio", { name: "Zwrot" }));
  fireEvent.change(screen.getByLabelText(/Kategoria sprzętu/), { target: { value: "Smartfon" } });
  fireEvent.change(screen.getByLabelText(/Nazwa lub model sprzętu/), { target: { value: "Pixel 9" } });
  fireEvent.change(screen.getByLabelText(/Data zakupu/), { target: { value: "2026-06-10" } });
  fireEvent.change(screen.getByLabelText(/Zdjęcie sprzętu/), {
    target: { files: [new File(["image"], "telefon.jpg", { type: "image/jpeg" })] }
  });
}

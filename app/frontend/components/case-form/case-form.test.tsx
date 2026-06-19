import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CaseForm } from "./case-form";
import type { CreateSessionInput } from "@/lib/api/sessions";

function imageFile(name = "sprzet.jpg", type = "image/jpeg") {
  return new File(["obraz"], name, { type });
}

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText("Model lub nazwa sprzętu"), {
    target: { value: "ThinkPad T14" }
  });
  fireEvent.change(screen.getByLabelText("Data zakupu"), {
    target: { value: "2026-06-01" }
  });
  fireEvent.change(screen.getByLabelText("Zdjęcie sprzętu"), {
    target: { files: [imageFile()] }
  });
}

describe("formularz zgłoszenia", () => {
  it("wymaga powodu dla reklamacji", async () => {
    const submitSession = vi.fn();
    render(<CaseForm submitSession={submitSession} />);

    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Wyślij zgłoszenie" }));

    expect(
      await screen.findByText("Podaj powód reklamacji.")
    ).toBeInTheDocument();
    expect(submitSession).not.toHaveBeenCalled();
  });

  it("pozwala wysłać zwrot bez powodu", async () => {
    const submitSession = vi.fn().mockResolvedValue({ sessionId: "session-1" });
    render(<CaseForm submitSession={submitSession} />);

    fireEvent.click(screen.getByRole("radio", { name: "Zwrot" }));
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Wyślij zgłoszenie" }));

    await waitFor(() => expect(submitSession).toHaveBeenCalledTimes(1));
    expect(submitSession.mock.calls[0][0]).toMatchObject({
      requestType: "return",
      equipmentCategory: "laptop",
      equipmentNameOrModel: "ThinkPad T14",
      purchaseDate: "2026-06-01",
      reason: ""
    });
  });

  it("pokazuje polskie walidacje dla brakujących pól", async () => {
    render(<CaseForm submitSession={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Wyślij zgłoszenie" }));

    expect(
      await screen.findByText("Podaj nazwę lub model sprzętu.")
    ).toBeInTheDocument();
    expect(screen.getByText("Podaj datę zakupu.")).toBeInTheDocument();
    expect(screen.getByText("Podaj powód reklamacji.")).toBeInTheDocument();
    expect(screen.getByText("Dodaj jedno zdjęcie sprzętu.")).toBeInTheDocument();
  });

  it("odrzuca wybór wielu plików", async () => {
    render(<CaseForm submitSession={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Zdjęcie sprzętu"), {
      target: {
        files: [imageFile("pierwszy.jpg"), imageFile("drugi.jpg")]
      }
    });

    expect(
      await screen.findByText("Dodaj tylko jedno zdjęcie sprzętu.")
    ).toBeInTheDocument();
  });

  it("wyświetla błędy pól zwrócone przez backend", async () => {
    const submitSession = vi.fn().mockRejectedValue({
      code: "VALIDATION_FAILED",
      messagePl: "Popraw błędy w formularzu.",
      fieldErrors: {
        equipmentNameOrModel: "Backend: podaj model.",
        image: "Backend: dodaj zdjęcie."
      },
      traceId: "trace-1"
    });
    render(<CaseForm submitSession={submitSession} />);

    fireEvent.change(screen.getByLabelText("Powód zgłoszenia"), {
      target: { value: "Ekran nie działa" }
    });
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Wyślij zgłoszenie" }));

    expect(await screen.findByText("Backend: podaj model.")).toBeInTheDocument();
    expect(screen.getByText("Backend: dodaj zdjęcie.")).toBeInTheDocument();
  });

  it("blokuje przycisk podczas wysyłki", async () => {
    let resolveSubmit: (value: unknown) => void = () => undefined;
    const submitSession = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveSubmit = resolve;
        })
    );
    render(<CaseForm submitSession={submitSession} />);

    fireEvent.change(screen.getByLabelText("Powód zgłoszenia"), {
      target: { value: "Laptop nie uruchamia się" }
    });
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Wyślij zgłoszenie" }));

    expect(
      await screen.findByRole("button", { name: "Wysyłanie..." })
    ).toBeDisabled();

    resolveSubmit({ sessionId: "session-1" });
  });

  it("wysyła wartości zgodne z kontraktem backendu", async () => {
    const submitSession = vi.fn().mockResolvedValue({ sessionId: "session-1" });
    render(<CaseForm submitSession={submitSession} />);

    fireEvent.change(screen.getByLabelText("Kategoria sprzętu"), {
      target: { value: "gaming_console" }
    });
    fireEvent.change(screen.getByLabelText("Model lub nazwa sprzętu"), {
      target: { value: "PlayStation 5" }
    });
    fireEvent.change(screen.getByLabelText("Data zakupu"), {
      target: { value: "2026-05-12" }
    });
    fireEvent.change(screen.getByLabelText("Powód zgłoszenia"), {
      target: { value: "Konsola wyłącza się po starcie" }
    });
    const image = imageFile("konsola.webp", "image/webp");
    fireEvent.change(screen.getByLabelText("Zdjęcie sprzętu"), {
      target: { files: [image] }
    });
    fireEvent.click(screen.getByRole("button", { name: "Wyślij zgłoszenie" }));

    await waitFor(() => expect(submitSession).toHaveBeenCalledTimes(1));
    const payload = submitSession.mock.calls[0][0] as CreateSessionInput;
    expect(payload).toEqual({
      requestType: "complaint",
      equipmentCategory: "gaming_console",
      equipmentNameOrModel: "PlayStation 5",
      purchaseDate: "2026-05-12",
      reason: "Konsola wyłącza się po starcie",
      image
    });
  });
});

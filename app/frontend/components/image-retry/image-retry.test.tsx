import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ImageRetry } from "./image-retry";

function imageFile(name = "ponowne-zdjecie.png") {
  return new File(["obraz"], name, { type: "image/png" });
}

describe("ponowna próba zdjęcia", () => {
  it("pokazuje polski powód i liczbę pozostałych prób", () => {
    render(
      <ImageRetry
        onRetry={vi.fn()}
        retry={{ reasonPl: "Zdjęcie jest nieczytelne.", remainingAttempts: 2 }}
      />
    );

    expect(screen.getByText("Zdjęcie jest nieczytelne.")).toBeInTheDocument();
    expect(screen.getByText("Pozostałe próby: 2")).toBeInTheDocument();
  });

  it("wysyła dokładnie jedno nowe zdjęcie", async () => {
    const onRetry = vi.fn().mockResolvedValue(undefined);
    render(
      <ImageRetry
        onRetry={onRetry}
        retry={{ reasonPl: "Zdjęcie jest nieczytelne.", remainingAttempts: 2 }}
      />
    );

    fireEvent.change(screen.getByLabelText("Nowe zdjęcie sprzętu"), {
      target: { files: [imageFile()] }
    });
    fireEvent.click(screen.getByRole("button", { name: "Wyślij nowe zdjęcie" }));

    await waitFor(() => expect(onRetry).toHaveBeenCalledWith(expect.any(File)));
  });

  it("pokazuje weryfikację osobistą po trzeciej nieudanej próbie", () => {
    render(
      <ImageRetry
        onRetry={vi.fn()}
        retry={{ reasonPl: "Zdjęcie nadal jest nieczytelne.", remainingAttempts: 0 }}
        terminalState="IN_PERSON_VERIFICATION_REQUIRED"
      />
    );

    expect(screen.getByText("Wymagana weryfikacja osobista.")).toBeInTheDocument();
  });
});

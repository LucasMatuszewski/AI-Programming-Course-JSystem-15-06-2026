import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

describe("strona startowa", () => {
  it("pokazuje formularz reklamacji na pierwszym ekranie", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: /zgłoś reklamację roweru/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/marka/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/opis problemu/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /wyślij zgłoszenie/i }),
    ).toBeInTheDocument();
  });
});

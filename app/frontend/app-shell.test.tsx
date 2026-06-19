import { render, screen } from "@testing-library/react";
import Home from "./app/page";
import { githubTheme } from "./lib/design-tokens";

describe("szkielet aplikacji", () => {
  it("renderuje podstawowa powloke aplikacji", () => {
    render(<Home />);

    expect(
      screen.getByRole("banner", { name: "Nagłówek aplikacji" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Zgłoszenie reklamacji lub zwrotu" })
    ).toBeInTheDocument();
    expect(screen.getByText("Reklamacja")).toBeInTheDocument();
    expect(screen.getByText("Zwrot")).toBeInTheDocument();
  });

  it("mapuje tokeny projektu bez bledu", () => {
    expect(githubTheme.colors.background.dark).toBe("#0d1117");
    expect(githubTheme.borderRadius.md).toBe("6px");
    expect(githubTheme.components.button.primary.backgroundColor).toBe(
      "#1f883d"
    );
  });
});

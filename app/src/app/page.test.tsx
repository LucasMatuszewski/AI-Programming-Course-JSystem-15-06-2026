import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("strona startowa", () => {
  it("renderuje markowy shell aplikacji z polskimi landmarkami", () => {
    render(<Home />);

    expect(screen.getByRole("banner", { name: "Nagłówek aplikacji" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Copilot ds. decyzji o serwisie sprzętu" })
    ).toBeInTheDocument();
    expect(screen.getByRole("main", { name: "Obszar roboczy zgłoszenia" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Proces zgłoszenia" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rozpocznij zgłoszenie" })).toBeInTheDocument();
  });
});

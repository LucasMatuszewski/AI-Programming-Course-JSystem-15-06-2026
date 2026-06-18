import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("strona startowa", () => {
  it("renderuje polski komunikat smoke", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: "Aplikacja działa" })
    ).toBeInTheDocument();
  });
});

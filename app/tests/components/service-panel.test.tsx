import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LoginPanel, ServiceDashboard } from "@/components/service/service-panel";

describe("service panel", () => {
  it("renders staff login form in Polish", () => {
    render(<LoginPanel />);

    expect(
      screen.getByRole("heading", { name: /panel obsługi/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/hasło/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /zaloguj/i })).toBeInTheDocument();
  });

  it("renders service claim details with latest AI assessment", () => {
    render(
      <ServiceDashboard
        claims={[
          {
            id: "claim-1",
            brand: "Trek",
            model: "Marlin 7",
            status: "preliminarily_rejected",
            damageType: "mechanical",
            problemDescription: "Uszkodzona rama.",
            damageCircumstances: "Rower przewrócił się podczas jazdy.",
            latestAssessment: {
              decision: "rejected",
              reasoningSummary: "Opis wskazuje na zdarzenie zewnętrzne.",
            },
          },
        ]}
      />,
    );

    expect(screen.getByText(/Trek Marlin 7/i)).toBeInTheDocument();
    expect(screen.getAllByText(/nie podlega reklamacji/i)).toHaveLength(2);
    expect(
      screen.getByText(/Opis wskazuje na zdarzenie zewnętrzne/i),
    ).toBeInTheDocument();
  });
});

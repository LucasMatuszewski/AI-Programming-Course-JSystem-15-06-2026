import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  LoginPanel,
  ServiceDashboard,
  ServicePanelApp,
} from "@/components/service/service-panel";

describe("service panel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it("logs in and loads service claims from API", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ user: { email: "serwis@example.com" } }), {
        status: 200,
      }),
    ).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [
            {
              id: "claim-1",
              brand: "Trek",
              model: "Marlin 7",
              status: "preliminarily_accepted",
              damageType: "mechanical",
              problemDescription: "Pęknięta rama.",
              damageCircumstances: "Podczas normalnej jazdy.",
              latestAssessment: {
                decision: "accepted",
                reasoningSummary: "Opis wskazuje na normalną jazdę.",
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    render(<ServicePanelApp />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "serwis@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/hasło/i), {
      target: { value: "tajne-haslo" },
    });
    fireEvent.click(screen.getByRole("button", { name: /zaloguj/i }));

    await waitFor(() => {
      expect(screen.getByText(/Trek Marlin 7/i)).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/service/claims");
  });
});

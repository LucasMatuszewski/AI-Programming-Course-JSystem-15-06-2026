import { fireEvent, render, screen } from "@testing-library/react";
import { AssistantChat } from "./assistant-chat";
import type { SessionResponse } from "@/lib/api/sessions";

const baseSession: SessionResponse = {
  sessionId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  requestType: "return",
  status: "DECIDED",
  terminalState: "REJECTED",
  imageAttemptCount: 1,
  remainingImageAttempts: 2,
  latestDecision: {
    status: "rejected",
    rejectionType: "signs_of_use",
    rejectionReasonPl: "Widoczne są ślady użycia produktu.",
    justificationPl: "Produkt nosi ślady użycia.",
    nextStepsPl: "Opisz dodatkowe informacje w czacie.",
    ruleCategory: "return.signs_of_use",
    version: 1
  },
  imageRetry: null,
  messages: [
    {
      messageId: "m1",
      role: "SYSTEM",
      contentPl: "Dzień dobry. Decyzja: rejected.",
      sequenceNumber: 1,
      messageType: "INITIAL_DECISION",
      createdAt: "2026-06-19T08:00:00Z"
    }
  ]
};

describe("czat asystenta", () => {
  it("renderuje pierwszą wiadomość systemową", () => {
    render(<AssistantChat onSend={vi.fn()} session={baseSession} />);

    expect(screen.getByText("Dzień dobry. Decyzja: rejected.")).toBeInTheDocument();
    expect(screen.getByText("Asystent")).toBeInTheDocument();
  });

  it("mapuje wiadomości klienta i systemu na role czatu", () => {
    render(
      <AssistantChat
        onSend={vi.fn()}
        session={{
          ...baseSession,
          messages: [
            ...baseSession.messages,
            {
              messageId: "m2",
              role: "CUSTOMER",
              contentPl: "Nie zgadzam się z decyzją.",
              sequenceNumber: 2,
              messageType: "FOLLOW_UP",
              createdAt: "2026-06-19T08:01:00Z"
            },
            {
              messageId: "m3",
              role: "SYSTEM",
              contentPl: "Sprawa trafi do pracownika.",
              sequenceNumber: 3,
              messageType: "DECISION_UPDATE",
              createdAt: "2026-06-19T08:02:00Z"
            }
          ]
        }}
      />
    );

    expect(screen.getByText("Klient")).toBeInTheDocument();
    expect(screen.getAllByText("Asystent")).toHaveLength(2);
  });

  it("blokuje kompozytor podczas odpowiedzi asystenta", async () => {
    let resolveSend: (session: SessionResponse) => void = () => undefined;
    const onSend = vi.fn(
      () =>
        new Promise<SessionResponse>((resolve) => {
          resolveSend = resolve;
        })
    );
    render(<AssistantChat onSend={onSend} session={baseSession} />);

    fireEvent.change(screen.getByLabelText("Wiadomość do asystenta"), {
      target: { value: "Mam dodatkową informację." }
    });
    fireEvent.click(screen.getByRole("button", { name: "Wyślij" }));

    expect(await screen.findByRole("button", { name: "Wysyłanie..." })).toBeDisabled();
    resolveSend(baseSession);
  });

  it("renderuje aktualizację decyzji z poprzednią i nową decyzją", () => {
    render(
      <AssistantChat
        onSend={vi.fn()}
        session={{
          ...baseSession,
          latestDecision: {
            ...baseSession.latestDecision,
            status: "approved",
            version: 2,
            ruleCategory: "chat.relevant_return_explanation"
          },
          messages: [
            ...baseSession.messages,
            {
              messageId: "m4",
              role: "SYSTEM",
              contentPl: "Poprzednia decyzja: rejected. Nowa decyzja: approved.",
              sequenceNumber: 2,
              messageType: "DECISION_UPDATE",
              createdAt: "2026-06-19T08:03:00Z"
            }
          ]
        }}
      />
    );

    expect(screen.getByText("Decyzja zaktualizowana")).toBeInTheDocument();
    expect(
      screen.getByText("Poprzednia decyzja: rejected. Nowa decyzja: approved.")
    ).toBeInTheDocument();
  });
});

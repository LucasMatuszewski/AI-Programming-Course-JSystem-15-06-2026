import type { SessionResponse } from "@/lib/api/sessions";

type DecisionSummaryProps = {
  session: SessionResponse;
};

export function DecisionSummary({ session }: DecisionSummaryProps) {
  const decision = session.latestDecision;

  if (!decision) {
    return (
      <div className="grid gap-2 p-4 text-sm text-muted">
        <p>Decyzja nie jest jeszcze dostępna.</p>
      </div>
    );
  }

  const label = statusLabel(session.terminalState ?? decision.status);

  return (
    <div className="grid gap-3 p-4 text-sm">
      {decision.version > 1 ? (
        <p className="rounded-md border border-warning bg-[#fff8c5] px-3 py-2 font-medium text-[#7d4e00]">
          Decyzja zaktualizowana
        </p>
      ) : null}
      <div>
        <p className="text-xs font-medium uppercase text-muted">Status</p>
        <p className="text-lg font-semibold text-foreground">{label}</p>
      </div>
      {decision.rejectionReasonPl ? (
        <div>
          <p className="text-xs font-medium uppercase text-muted">
            Powód odrzucenia
          </p>
          <p>{decision.rejectionReasonPl}</p>
        </div>
      ) : null}
      <div>
        <p className="text-xs font-medium uppercase text-muted">Uzasadnienie</p>
        <p>{decision.justificationPl}</p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase text-muted">Dalsze kroki</p>
        <p>{decision.nextStepsPl}</p>
      </div>
      <p className="text-xs text-muted">Reguła: {decision.ruleCategory}</p>
    </div>
  );
}

function statusLabel(status: string) {
  switch (status) {
    case "APPROVED":
    case "approved":
      return "Zaakceptowano";
    case "REJECTED":
    case "rejected":
      return "Odrzucono";
    case "HUMAN_VERIFICATION_REQUIRED":
    case "human_verification_required":
      return "Wymagana weryfikacja pracownika";
    case "IN_PERSON_VERIFICATION_REQUIRED":
      return "Wymagana weryfikacja osobista";
    default:
      return "W trakcie obsługi";
  }
}

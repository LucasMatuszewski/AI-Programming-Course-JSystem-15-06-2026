"use client";

type ServiceClaim = {
  id: string;
  brand: string;
  model: string;
  status: string;
  damageType: string;
  problemDescription: string;
  damageCircumstances: string;
  latestAssessment?: {
    decision: string;
    reasoningSummary: string;
  } | null;
};

export function LoginPanel() {
  return (
    <section className="mx-auto grid min-h-screen max-w-md content-center px-5 py-10 text-text-primary">
      <form className="rounded-lg border border-border-default bg-background-panel p-6">
        <p className="text-xs font-black uppercase text-brand-primary">
          Serwis
        </p>
        <h1 className="mt-2 font-display text-4xl font-black uppercase">
          Panel obsługi
        </h1>
        <label className="mt-6 grid gap-2 text-sm font-bold uppercase">
          Email
          <input
            className="h-12 rounded-sm border border-border-default bg-background-elevated px-4 text-text-primary"
            name="email"
            type="email"
          />
        </label>
        <label className="mt-4 grid gap-2 text-sm font-bold uppercase">
          Hasło
          <input
            className="h-12 rounded-sm border border-border-default bg-background-elevated px-4 text-text-primary"
            name="password"
            type="password"
          />
        </label>
        <button
          className="mt-6 h-12 w-full rounded-sm bg-brand-primary px-4 text-sm font-black uppercase text-text-on-accent"
          type="submit"
        >
          Zaloguj
        </button>
      </form>
    </section>
  );
}

export function ServiceDashboard({ claims }: { claims: ServiceClaim[] }) {
  return (
    <section className="min-h-screen px-5 py-8 text-text-primary lg:px-12">
      <header className="mx-auto mb-8 max-w-6xl">
        <p className="text-xs font-black uppercase text-brand-primary">
          Zgłoszenia
        </p>
        <h1 className="font-display text-4xl font-black uppercase">
          Panel sprzedawcy i serwisu
        </h1>
      </header>
      <div className="mx-auto grid max-w-6xl gap-4">
        {claims.map((claim) => (
          <article
            className="rounded-lg border border-border-default bg-background-panel p-5"
            key={claim.id}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-2xl font-black uppercase">
                  {claim.brand} {claim.model}
                </h2>
                <p className="mt-2 text-sm text-text-secondary">
                  {claim.problemDescription}
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  {claim.damageCircumstances}
                </p>
              </div>
              <span className="rounded-xs border border-brand-primary px-3 py-2 text-xs font-black uppercase text-brand-primary">
                {statusLabel(claim.status)}
              </span>
            </div>
            <dl className="mt-5 grid gap-3 text-sm md:grid-cols-3">
              <div>
                <dt className="font-black uppercase text-text-muted">
                  Typ uszkodzenia
                </dt>
                <dd className="mt-1">{damageLabel(claim.damageType)}</dd>
              </div>
              <div>
                <dt className="font-black uppercase text-text-muted">
                  Decyzja AI
                </dt>
                <dd className="mt-1">
                  {claim.latestAssessment
                    ? decisionLabel(claim.latestAssessment.decision)
                    : "Brak oceny"}
                </dd>
              </div>
              <div>
                <dt className="font-black uppercase text-text-muted">
                  Uzasadnienie
                </dt>
                <dd className="mt-1">
                  {claim.latestAssessment?.reasoningSummary ?? "Brak danych"}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    preliminarily_accepted: "Podlega reklamacji",
    preliminarily_rejected: "Nie podlega reklamacji",
    needs_clarification: "Wymaga doprecyzowania",
    service_review_requested: "Weryfikacja serwisu",
    submitted: "Zgłoszone",
  };
  return labels[status] ?? status;
}

function decisionLabel(decision: string) {
  const labels: Record<string, string> = {
    accepted: "Podlega reklamacji",
    rejected: "Nie podlega reklamacji",
    needs_clarification: "Wymaga doprecyzowania",
  };
  return labels[decision] ?? decision;
}

function damageLabel(damageType: string) {
  return damageType === "mechanical" ? "Mechaniczne" : "Nieznane";
}

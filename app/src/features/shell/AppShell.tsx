import { AssessmentFlow } from "@/features/assessment/AssessmentFlow";

const steps = ["Zgłoszenie", "Decyzja", "Rozmowa"] as const;

function BrandMark() {
  return (
    <svg
      aria-hidden="true"
      className="shell-brand-mark"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M13.427.01C6.805-.253 1.224 4.902.961 11.524.698 18.147 5.853 23.728 12.476 23.99c6.622.263 12.203-4.892 12.466-11.514S20.049.272 13.427.01m5.066 17.579a.717.717 0 0 1-.977.268 14.4 14.4 0 0 0-5.138-1.747 14.4 14.4 0 0 0-5.42.263.717.717 0 0 1-.338-1.392c1.95-.474 3.955-.571 5.958-.29 2.003.282 3.903.928 5.647 1.92a.717.717 0 0 1 .268.978m1.577-3.15a.93.93 0 0 1-1.262.376 17.7 17.7 0 0 0-5.972-1.96 17.7 17.7 0 0 0-6.281.238.93.93 0 0 1-1.11-.71.93.93 0 0 1 .71-1.11 19.5 19.5 0 0 1 6.94-.262 19.5 19.5 0 0 1 6.599 2.165c.452.245.62.81.376 1.263m1.748-3.551a1.147 1.147 0 0 1-1.546.488 21.4 21.4 0 0 0-6.918-2.208 21.4 21.4 0 0 0-7.259.215 1.146 1.146 0 0 1-.456-2.246 23.7 23.7 0 0 1 8.034-.24 23.7 23.7 0 0 1 7.657 2.445c.561.292.78.984.488 1.546" />
    </svg>
  );
}

export function AppShell() {
  return (
    <div className="app-shell">
      <header className="shell-header" aria-label="Nagłówek aplikacji">
        <div className="shell-brand">
          <BrandMark />
          <span>Asystent serwisowy</span>
        </div>
        <nav className="shell-nav" aria-label="Etapy obsługi">
          {steps.map((step, index) => (
            <span
              className={index === 0 ? "shell-nav-item shell-nav-item-active" : "shell-nav-item"}
              aria-current={index === 0 ? "step" : undefined}
              key={step}
            >
              {step}
            </span>
          ))}
        </nav>
      </header>

      <main className="shell-main" aria-label="Obszar roboczy zgłoszenia">
        <section className="shell-hero" aria-labelledby="shell-title">
          <p className="shell-kicker">Wstępna ocena zgłoszenia</p>
          <h1 id="shell-title">Copilot ds. decyzji o serwisie sprzętu</h1>
          <p className="shell-lead">
            Jedna ścieżka do zebrania danych, oceny zdjęcia i rozmowy z asystentem.
          </p>
        </section>

        <section className="shell-workspace" aria-label="Proces zgłoszenia">
          <AssessmentFlow />

          <aside className="shell-status" aria-label="Status sesji">
            <h2>Aktywna sesja</h2>
            <p>Dane są przechowywane tylko w bieżącej sesji przeglądarki.</p>
          </aside>
        </section>
      </main>
    </div>
  );
}

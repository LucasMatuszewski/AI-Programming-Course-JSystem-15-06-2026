import { SessionWorkspace } from "@/components/session-workspace/session-workspace";

export default function Home() {
  return (
    <main className="min-h-screen bg-subtle text-foreground">
      <header
        aria-label="Nagłówek aplikacji"
        className="border-b border-[#30363d] bg-githubDark text-onDark"
      >
        <div className="mx-auto flex min-h-16 max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-md border border-[#30363d] bg-githubDarkElevated text-sm font-semibold"
            >
              BS
            </div>
            <div>
              <p className="text-base font-semibold leading-6">
                Best Service Decision
              </p>
              <p className="text-sm text-onDarkMuted">
                Asystent reklamacji i zwrotów
              </p>
            </div>
          </div>
          <nav aria-label="Nawigacja główna" className="flex gap-2 text-sm">
            <a
              className="rounded-md px-2 py-1 text-onDark hover:bg-white/10"
              href="#formularz"
            >
              Formularz
            </a>
            <a
              className="rounded-md px-2 py-1 text-onDark hover:bg-white/10"
              href="#status"
            >
              Status
            </a>
          </nav>
        </div>
      </header>

      <section className="border-b border-borderDefault bg-canvas">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="max-w-3xl">
            <p className="mb-2 text-sm font-medium text-muted">
              Elektronika konsumencka
            </p>
            <h1 className="text-2xl font-semibold leading-9 text-foreground">
              Zgłoszenie reklamacji lub zwrotu
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Wypełnij dane sprawy i dodaj jedno zdjęcie sprzętu. Po analizie
              zobaczysz decyzję oraz dalsze kroki w czacie.
            </p>
          </div>
        </div>
      </section>

      <SessionWorkspace />
    </main>
  );
}

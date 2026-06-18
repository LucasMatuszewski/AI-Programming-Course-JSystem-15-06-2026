const categories = ["Laptop", "Smartfon", "Monitor", "Akcesoria"];

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
            <a className="rounded-md px-2 py-1 text-onDark hover:bg-white/10" href="#formularz">
              Formularz
            </a>
            <a className="rounded-md px-2 py-1 text-onDark hover:bg-white/10" href="#status">
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

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div
          id="formularz"
          className="rounded-md border border-borderDefault bg-canvas shadow-card"
        >
          <div className="border-b border-borderDefault px-4 py-3">
            <h2 className="text-xl font-semibold leading-8">Nowe zgłoszenie</h2>
          </div>
          <div className="grid gap-4 p-4">
            <div>
              <p className="mb-2 text-sm font-medium">Typ sprawy</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button className="min-h-[43px] rounded-md border border-transparent bg-success px-5 py-2 text-base leading-6 text-white">
                  Reklamacja
                </button>
                <button className="min-h-[43px] rounded-md border border-borderDefault bg-subtle px-5 py-2 text-base leading-6 text-foreground">
                  Zwrot
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium">
                Kategoria sprzętu
                <select className="rounded-md border border-borderDefault bg-canvas px-3 py-2 font-normal">
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Model lub nazwa
                <input
                  className="rounded-md border border-borderDefault bg-canvas px-3 py-2 font-normal"
                  placeholder="np. Monitor 27 cali"
                  type="text"
                />
              </label>
            </div>

            <div className="rounded-md border border-dashed border-borderDefault bg-subtle px-4 py-5 text-sm text-muted">
              Miejsce na przesłanie jednego zdjęcia sprzętu pojawi się w
              kolejnym kroku implementacji.
            </div>
          </div>
        </div>

        <aside
          id="status"
          className="rounded-md border border-borderDefault bg-canvas"
        >
          <div className="border-b border-borderDefault px-4 py-3">
            <h2 className="text-xl font-semibold leading-8">Status sprawy</h2>
          </div>
          <div className="grid gap-3 p-4 text-sm text-muted">
            <p>Brak aktywnej sesji.</p>
            <p>
              Po wysłaniu formularza tutaj pojawi się decyzja, uzasadnienie i
              historia rozmowy.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}

const photoSlots = ["1", "2", "3", "4", "5"];

export default function Home() {
  return (
    <main className="min-h-screen px-5 py-6 text-[#f4f4ed] md:px-10 md:py-8">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div className="text-sm font-black uppercase tracking-normal text-[#d2ff00]">
          Bike Claims AI
        </div>
        <a
          className="rounded-[0.54rem] border border-[#f4f4ed] px-4 py-2 text-sm font-black uppercase"
          href="/service"
        >
          Panel obsługi
        </a>
      </header>

      <section className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="space-y-5 pt-3">
          <p className="text-xs font-black uppercase text-[#b9bbad]">
            Wstępna ocena reklamacji
          </p>
          <h1 className="max-w-3xl text-5xl font-black uppercase leading-none tracking-normal md:text-7xl">
            Zgłoś reklamację roweru
          </h1>
          <p className="max-w-xl text-base leading-7 text-[#dde1d2]">
            Opisz uszkodzenie, dodaj zdjęcia i podaj okoliczności zdarzenia.
            AI przygotuje wstępną ocenę, którą może zweryfikować serwis.
          </p>
        </div>

        <form className="rounded-2xl border border-[rgba(244,244,237,0.16)] bg-[#111112] p-5 shadow-2xl md:p-7">
          <div className="grid gap-5">
            <label className="grid gap-2 text-sm font-bold uppercase">
              Rodzaj sprzętu
              <select
                className="h-12 rounded-[0.54rem] border border-[rgba(244,244,237,0.16)] bg-[#111112] px-4 text-base font-medium normal-case text-[#f4f4ed]"
                defaultValue="bicycle"
                name="equipmentType"
              >
                <option value="bicycle">Rower</option>
              </select>
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold uppercase">
                Marka
                <input
                  className="h-12 rounded-[0.54rem] border border-[rgba(244,244,237,0.16)] bg-[#111112] px-4 text-base font-medium normal-case text-[#f4f4ed]"
                  name="brand"
                  placeholder="np. Trek"
                />
              </label>
              <label className="grid gap-2 text-sm font-bold uppercase">
                Model
                <input
                  className="h-12 rounded-[0.54rem] border border-[rgba(244,244,237,0.16)] bg-[#111112] px-4 text-base font-medium normal-case text-[#f4f4ed]"
                  name="model"
                  placeholder="np. Marlin 7"
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm font-bold uppercase">
              Opis problemu
              <textarea
                className="min-h-28 rounded-[0.54rem] border border-[rgba(244,244,237,0.16)] bg-[#111112] px-4 py-3 text-base font-medium normal-case leading-6 text-[#f4f4ed]"
                name="problemDescription"
                placeholder="Co jest uszkodzone i jakie objawy widzisz?"
              />
            </label>

            <label className="grid gap-2 text-sm font-bold uppercase">
              Okoliczności powstania uszkodzenia
              <textarea
                className="min-h-28 rounded-[0.54rem] border border-[rgba(244,244,237,0.16)] bg-[#111112] px-4 py-3 text-base font-medium normal-case leading-6 text-[#f4f4ed]"
                name="damageCircumstances"
                placeholder="Opisz, czy uszkodzenie powstało podczas normalnej jazdy, upadku, kolizji albo innej sytuacji."
              />
            </label>

            <fieldset className="grid gap-3">
              <legend className="text-sm font-bold uppercase">
                Zdjęcia uszkodzenia
              </legend>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                {photoSlots.map((slot) => (
                  <label
                    className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-[0.74rem] border border-dashed border-[rgba(244,244,237,0.28)] bg-[#3b3c38] text-center text-sm font-bold text-[#dde1d2]"
                    key={slot}
                  >
                    <span>Zdjęcie {slot}</span>
                    <input
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      name="photos"
                      type="file"
                    />
                  </label>
                ))}
              </div>
              <p className="text-sm text-[#b9bbad]">
                Dodaj od 1 do 5 zdjęć. Zdjęcie jest obowiązkowe.
              </p>
            </fieldset>

            <button
              className="h-12 rounded-[0.54rem] border border-[#d2ff00] bg-[#d2ff00] px-5 text-base font-black uppercase text-[#282c20]"
              type="submit"
            >
              Wyślij zgłoszenie
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

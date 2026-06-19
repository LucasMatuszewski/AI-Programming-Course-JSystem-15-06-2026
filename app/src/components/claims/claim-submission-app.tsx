"use client";

import { type FormEvent, useMemo, useState } from "react";
import Link from "next/link";

import {
  type AssessmentResult,
  type ChatMessage,
  type ClaimDecisionResponse,
  requestServiceReview,
  sendRejectedClaimChatMessage,
  submitClaim,
  submitClarification,
} from "@/lib/client/claims-api";

const PHOTO_LIMIT = 5;
const DISCLAIMER =
  "To jest wstępna ocena wygenerowana automatycznie. Ostateczna decyzja może wymagać weryfikacji przez sprzedawcę lub serwis.";

type ClaimFormState = {
  brand: string;
  model: string;
  problemDescription: string;
  damageCircumstances: string;
  photos: File[];
};

type ValidationErrors = Partial<Record<keyof ClaimFormState, string>>;

const initialForm: ClaimFormState = {
  brand: "",
  model: "",
  problemDescription: "",
  damageCircumstances: "",
  photos: [],
};

export function ClaimSubmissionApp() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [decision, setDecision] = useState<ClaimDecisionResponse | null>(null);
  const [phase, setPhase] = useState<"form" | "analysis" | "decision">("form");
  const [apiError, setApiError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateClaimForm(form);
    setErrors(nextErrors);
    setApiError("");
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setPhase("analysis");
    try {
      const formData = new FormData();
      formData.set("equipmentType", "bicycle");
      formData.set("brand", form.brand.trim());
      formData.set("model", form.model.trim());
      formData.set("problemDescription", form.problemDescription.trim());
      formData.set("damageCircumstances", form.damageCircumstances.trim());
      form.photos.forEach((photo) => formData.append("photos", photo));
      setDecision(await submitClaim(formData));
      setPhase("decision");
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Nie udało się wysłać zgłoszenia.");
      setPhase("form");
    }
  }

  function updateField(field: keyof Omit<ClaimFormState, "photos">, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function updatePhotos(files: FileList | null) {
    const photos = Array.from(files ?? []);
    if (photos.length > PHOTO_LIMIT) {
      setErrors((current) => ({
        ...current,
        photos: "Możesz dodać maksymalnie 5 zdjęć.",
      }));
      return;
    }
    setForm((current) => ({ ...current, photos }));
    setErrors((current) => ({ ...current, photos: undefined }));
  }

  function resetFlow() {
    setForm(initialForm);
    setErrors({});
    setDecision(null);
    setApiError("");
    setPhase("form");
  }

  if (phase === "decision" && decision) {
    return (
      <main className="min-h-screen px-5 py-6 text-text-primary sm:px-8 lg:px-12">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-5 py-3">
          <Link className="font-display text-xl font-black uppercase text-text-primary" href="/">
            ClaimRide
          </Link>
          <nav aria-label="Główne" className="hidden items-center gap-5 sm:flex">
            <button className="nav-link" onClick={resetFlow} type="button">
              Nowe zgłoszenie
            </button>
            <Link className="nav-link" href="/service">
              Panel obsługi
            </Link>
          </nav>
        </header>

        <section className="mx-auto w-full max-w-6xl py-10 lg:py-16" id="decyzja">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">Decyzja</p>
              <h1 className="font-display text-5xl font-black uppercase leading-none text-text-primary sm:text-6xl">
                Wynik wstępnej oceny
              </h1>
            </div>
            <button className="secondary-button" onClick={resetFlow} type="button">
              Nowe zgłoszenie
            </button>
          </div>
          <DecisionFlow
            decision={decision}
            originalPhotoCount={form.photos.length}
            onDecisionChange={setDecision}
          />
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 py-6 text-text-primary sm:px-8 lg:px-12">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-5 py-3">
        <Link className="font-display text-xl font-black uppercase text-text-primary" href="/">
          ClaimRide
        </Link>
        <nav aria-label="Główne" className="hidden items-center gap-5 sm:flex">
          <a className="nav-link" href="#formularz">Zgłoszenie</a>
          <a className="nav-link" href="#decyzja">Decyzja</a>
        </nav>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-8 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:py-16">
        <IntroPanel />
        {phase === "analysis" ? (
          <AnalysisPanel />
        ) : (
          <form className="app-panel p-5 sm:p-8" id="formularz" onSubmit={handleSubmit}>
            <div className="mb-8 flex flex-col gap-2">
              <p className="eyebrow">Formularz reklamacji</p>
              <h2 className="font-display text-3xl font-black uppercase text-text-primary">
                Dane roweru
              </h2>
            </div>

            <label className="field-label" htmlFor="equipmentType">
              <span>Rodzaj sprzętu</span>
              <select className="control" id="equipmentType" name="equipmentType" value="bicycle" disabled>
                <option value="bicycle">Rower</option>
              </select>
            </label>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <TextField error={errors.brand} id="brand" label="Marka" onChange={(value) => updateField("brand", value)} placeholder="np. Trek" value={form.brand} />
              <TextField error={errors.model} id="model" label="Model" onChange={(value) => updateField("model", value)} placeholder="np. Marlin 7" value={form.model} />
            </div>

            <TextAreaField error={errors.problemDescription} id="problemDescription" label="Opis problemu" onChange={(value) => updateField("problemDescription", value)} placeholder="Co dokładnie się stało i jaki element roweru jest uszkodzony?" value={form.problemDescription} />
            <TextAreaField error={errors.damageCircumstances} id="damageCircumstances" label="Okoliczności uszkodzenia" onChange={(value) => updateField("damageCircumstances", value)} placeholder="Opisz kiedy i w jakich warunkach powstało uszkodzenie." value={form.damageCircumstances} />

            <label className="field-label mt-5" htmlFor="photos">
              <span>Zdjęcia</span>
              <input accept="image/jpeg,image/png,image/webp" className="file-control" id="photos" multiple name="photos" onChange={(event) => updatePhotos(event.currentTarget.files)} type="file" />
              <span className="text-sm text-text-muted">Dodaj od 1 do 5 zdjęć. Wybrano: {form.photos.length}.</span>
              {errors.photos ? <FieldError>{errors.photos}</FieldError> : null}
            </label>

            {apiError ? <p className="mt-5 text-sm font-bold text-brand-error">{apiError}</p> : null}
            <button className="primary-button mt-8 w-full" type="submit">Wyślij zgłoszenie</button>
          </form>
        )}
      </section>

      {decision ? (
        <section className="mx-auto w-full max-w-6xl pb-12" id="decyzja">
          <DecisionFlow decision={decision} originalPhotoCount={form.photos.length} onDecisionChange={setDecision} />
        </section>
      ) : null}
    </main>
  );
}

function IntroPanel() {
  return (
    <div className="space-y-6">
      <p className="eyebrow">Wstępna ocena AI</p>
      <div className="space-y-5">
        <h1 className="font-display text-5xl font-black uppercase leading-none text-text-primary sm:text-6xl lg:text-7xl">
          Zgłoś reklamację roweru
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg">
          Opisz uszkodzenie, dodaj zdjęcia i przekaż kompletne zgłoszenie do wstępnej analizy. Formularz jest pierwszym ekranem procesu.
        </p>
      </div>
      <div className="grid gap-3 border-l border-border-default pl-5 text-sm text-text-muted">
        <span>1-5 zdjęć uszkodzenia</span>
        <span>Opis problemu i okoliczności</span>
        <span>Wstępna decyzja przed obsługą serwisową</span>
      </div>
    </div>
  );
}

function AnalysisPanel() {
  return (
    <section className="app-panel grid min-h-96 place-items-center p-8 text-center" aria-live="polite">
      <div className="space-y-4">
        <p className="eyebrow">Analiza zgłoszenia</p>
        <h2 className="font-display text-3xl font-black uppercase">Sprawdzamy opis i zdjęcia</h2>
        <p className="mx-auto max-w-lg text-text-secondary">
          Analizujemy widoczne uszkodzenia, opis problemu oraz okoliczności jego powstania.
        </p>
      </div>
    </section>
  );
}

function DecisionFlow({
  decision,
  originalPhotoCount,
  onDecisionChange,
}: {
  decision: ClaimDecisionResponse;
  originalPhotoCount: number;
  onDecisionChange: (decision: ClaimDecisionResponse) => void;
}) {
  const [serviceMessage, setServiceMessage] = useState("");
  const [serviceError, setServiceError] = useState("");
  const [chatOpen, setChatOpen] = useState(false);

  async function handleServiceReview() {
    setServiceError("");
    try {
      await requestServiceReview(decision.claimId);
      setServiceMessage("Sprawa została przekazana do serwisu.");
    } catch (error) {
      setServiceError(error instanceof Error ? error.message : "Nie udało się przekazać sprawy.");
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
      <DecisionPanel assessment={decision.assessment} />
      {decision.assessment.decision === "needs_clarification" ? (
        <ClarificationForm claimId={decision.claimId} originalPhotoCount={originalPhotoCount} onDecisionChange={onDecisionChange} />
      ) : (
        <aside className="app-panel p-5 sm:p-6">
          <p className="eyebrow">Dalsze kroki</p>
          <div className="mt-5 grid gap-3">
            {decision.assessment.decision === "rejected" ? (
              <button className="secondary-button" onClick={() => setChatOpen(true)} type="button">Rozpocznij rozmowę z AI</button>
            ) : null}
            <button className="secondary-button" onClick={handleServiceReview} type="button">Przekaż do serwisu</button>
          </div>
          {serviceMessage ? <p className="mt-4 text-sm font-bold text-brand-primary">{serviceMessage}</p> : null}
          {serviceError ? <p className="mt-4 text-sm font-bold text-brand-error">{serviceError}</p> : null}
          {chatOpen ? <RejectedClaimChat claimId={decision.claimId} assessment={decision.assessment} /> : null}
        </aside>
      )}
    </div>
  );
}

function DecisionPanel({ assessment }: { assessment: AssessmentResult }) {
  const meta = decisionMeta(assessment.decision);
  return (
    <article className="app-panel p-5 sm:p-6" aria-live="polite">
      <p className="eyebrow">Wstępna decyzja AI</p>
      <h2 className={`mt-4 font-display text-3xl font-black uppercase ${meta.className}`}>{meta.label}</h2>
      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
        <div className="info-tile">
          <dt>Typ uszkodzenia</dt>
          <dd>{assessment.damageType === "mechanical" ? "Mechaniczne" : "Nieustalony"}</dd>
        </div>
        <div className="info-tile">
          <dt>Pewność oceny</dt>
          <dd>{confidenceLabel(assessment.confidence)}</dd>
        </div>
      </dl>
      <div className="mt-6 grid gap-4 text-text-secondary">
        <p>{assessment.reasoningSummary}</p>
        <p>{assessment.photoEvidenceSummary}</p>
        <p>{assessment.descriptionEvidenceSummary}</p>
      </div>
      <p className="mt-6 rounded-sm border border-border-default bg-background-elevated p-4 text-sm text-text-secondary">
        {DISCLAIMER}
      </p>
    </article>
  );
}

function ClarificationForm({
  claimId,
  originalPhotoCount,
  onDecisionChange,
}: {
  claimId: string;
  originalPhotoCount: number;
  onDecisionChange: (decision: ClaimDecisionResponse) => void;
}) {
  const [clarification, setClarification] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState("");
  const remainingPhotos = PHOTO_LIMIT - originalPhotoCount;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clarification.trim()) {
      setError("Dodaj doprecyzowanie problemu.");
      return;
    }
    if (photos.length > remainingPhotos) {
      setError("Możesz dodać maksymalnie 5 zdjęć łącznie.");
      return;
    }
    const formData = new FormData();
    formData.set("clarification", clarification.trim());
    photos.forEach((photo) => formData.append("photos", photo));
    try {
      onDecisionChange(await submitClarification(claimId, formData));
      setError("");
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Nie udało się wysłać doprecyzowania.");
    }
  }

  return (
    <form className="app-panel p-5 sm:p-6" onSubmit={handleSubmit}>
      <p className="eyebrow">Doprecyzowanie</p>
      <label className="field-label mt-5" htmlFor="clarification">
        <span>Doprecyzowanie problemu</span>
        <textarea className="control min-h-32 py-3" id="clarification" onChange={(event) => setClarification(event.currentTarget.value)} placeholder="Opisz dokładniej, czy doszło do upadku, kolizji albo normalnej jazdy." value={clarification} />
      </label>
      <label className="field-label mt-5" htmlFor="clarificationPhotos">
        <span>Dodatkowe zdjęcia</span>
        <input accept="image/jpeg,image/png,image/webp" className="file-control" id="clarificationPhotos" multiple onChange={(event) => setPhotos(Array.from(event.currentTarget.files ?? []))} type="file" />
        <span className="text-sm text-text-muted">Możesz dodać jeszcze {Math.max(remainingPhotos, 0)} zdjęć.</span>
      </label>
      {error ? <p className="mt-4 text-sm font-bold text-brand-error">{error}</p> : null}
      <button className="primary-button mt-6 w-full" type="submit">Wyślij doprecyzowanie</button>
    </form>
  );
}

function RejectedClaimChat({ claimId, assessment }: { claimId: string; assessment: AssessmentResult }) {
  const initialMessage = useMemo<ChatMessage>(
    () => ({
      role: "assistant",
      content: `Mogę wyjaśnić powód odmowy: ${assessment.reasoningSummary} Dalsza weryfikacja może zostać przekazana do sprzedawcy lub serwisu.`,
    }),
    [assessment.reasoningSummary],
  );
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [draft, setDraft] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim()) {
      return;
    }
    const userMessage: ChatMessage = { role: "user", content: draft.trim() };
    setMessages((current) => [...current, userMessage]);
    setDraft("");
    const assistantMessage = await sendRejectedClaimChatMessage({
      claimId,
      messages,
      message: userMessage.content,
    });
    setMessages((current) => [...current, assistantMessage]);
  }

  return (
    <section className="mt-6 border-t border-border-default pt-5">
      <p className="eyebrow">Chat po odmowie</p>
      <div className="mt-4 grid max-h-80 gap-3 overflow-auto pr-1">
        {messages.map((message, index) => (
          <p className={`chat-bubble ${message.role}`} key={`${message.role}-${index}`}>{message.content}</p>
        ))}
      </div>
      <form className="mt-4 flex gap-2" onSubmit={handleSubmit}>
        <input className="control min-w-0 flex-1" onChange={(event) => setDraft(event.currentTarget.value)} placeholder="Napisz wiadomość" value={draft} />
        <button className="primary-button px-4" type="submit">Wyślij</button>
      </form>
    </section>
  );
}

function TextField({ error, id, label, onChange, placeholder, value }: { error?: string; id: string; label: string; onChange: (value: string) => void; placeholder: string; value: string }) {
  return (
    <label className="field-label" htmlFor={id}>
      <span>{label}</span>
      <input className="control" id={id} name={id} onChange={(event) => onChange(event.currentTarget.value)} placeholder={placeholder} type="text" value={value} />
      {error ? <FieldError>{error}</FieldError> : null}
    </label>
  );
}

function TextAreaField({ error, id, label, onChange, placeholder, value }: { error?: string; id: string; label: string; onChange: (value: string) => void; placeholder: string; value: string }) {
  return (
    <label className="field-label mt-5" htmlFor={id}>
      <span>{label}</span>
      <textarea className="control min-h-28 py-3" id={id} name={id} onChange={(event) => onChange(event.currentTarget.value)} placeholder={placeholder} value={value} />
      {error ? <FieldError>{error}</FieldError> : null}
    </label>
  );
}

function FieldError({ children }: { children: string }) {
  return <span className="text-sm font-bold text-brand-error">{children}</span>;
}

function validateClaimForm(form: ClaimFormState) {
  const errors: ValidationErrors = {};
  if (!form.brand.trim()) errors.brand = "Podaj markę roweru.";
  if (!form.model.trim()) errors.model = "Podaj model roweru.";
  if (!form.problemDescription.trim()) errors.problemDescription = "Opisz problem.";
  if (!form.damageCircumstances.trim()) errors.damageCircumstances = "Opisz okoliczności powstania uszkodzenia.";
  if (form.photos.length < 1) errors.photos = "Dodaj co najmniej jedno zdjęcie uszkodzenia.";
  if (form.photos.length > PHOTO_LIMIT) errors.photos = "Możesz dodać maksymalnie 5 zdjęć.";
  return errors;
}

function decisionMeta(decision: AssessmentResult["decision"]) {
  if (decision === "accepted") {
    return { label: "Wstępnie podlega reklamacji", className: "text-brand-primary" };
  }
  if (decision === "rejected") {
    return { label: "Nie podlega reklamacji", className: "text-brand-accent" };
  }
  return { label: "Wymaga doprecyzowania", className: "text-text-primary" };
}

function confidenceLabel(confidence: AssessmentResult["confidence"]) {
  if (confidence === "high") return "Wysoka";
  if (confidence === "medium") return "Średnia";
  return "Niska";
}

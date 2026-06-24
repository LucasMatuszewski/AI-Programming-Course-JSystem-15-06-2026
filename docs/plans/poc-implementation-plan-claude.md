# PoC Implementation Plan — Hardware Service Decision Copilot

> **Final filename on approval:** this plan will be saved as
> `docs/plans/poc-implementation-plan-claude.md` (per the requested `*-claude.md` suffix).
> During plan mode the harness pins editing to this auto-named file; it is copied to the
> final name once approved.

---

## Context

We are building a **fully working Proof of Concept** of the *Hardware Service Decision
Copilot* — a Polish-language, self-service web app that gives customers an **instant,
preliminary (non-binding)** assessment of whether a **return (Zwrot)** or **complaint
(Reklamacja)** is likely to be accepted. The customer fills a short intake form and
uploads **one** product photo; a multimodal model analyses the image, a reasoning model
combines that analysis with the form data and the matching policy document to produce a
structured decision (`APPROVE / REJECT / NEEDS_MORE_INFO / CONDITIONAL / ESCALATE`), and a
chat lets the customer ask follow-ups and supply missing info.

Everything functional is already specified:
- **PRD** — `docs/PRD-Product-Requirements-Document.md` (AC-01…AC-31, flows, agent behavior).
- **ADRs** — `docs/ADR/000-main-architecture.md`, `001-ai-orchestration.md`,
  `002-frontend-session-ux.md`, `003-validation-image-handling-testing.md` (TAC-* criteria).
- **Design** — `docs/design-guidelines.md` + `assets/design-tokens.json` (Spotify-inspired
  dark theme) and wireframes `assets/Wireframe-Step-{1,2,3}.png`.
- **Policies (rule source)** — `docs/policies/polityka-zwrotow.md`, `polityka-reklamacji.md`.

The `app/` folder is an empty scaffold (only `README.md` + empty `AGENTS.md`). Nothing is
built yet. This plan delivers the PoC end-to-end via **delegation only** — the orchestrator
(me) writes no production code. All work is split into **small, TDD-first steps, each ending
in its own commit**, delegated to the three specialised subagents.

### My role
I am **orchestrator/manager only**. For each step I launch the named subagent with the
ready-to-use prompt, wait for it to finish, confirm the step is green (tests/lint/build) and
committed, then start the next step. I implement nothing myself.

---

## Decisions locked (from user)

| Decision | Choice |
|---|---|
| Stack | Next.js 16 App Router + TypeScript + Vercel AI SDK + OpenRouter + Sharp + Tailwind (per ADR-000). |
| **App location** | **Subfolder**: the Next project root is `app/`. `package.json` in `app/`, routes in `app/app/`, code in `app/src/`. |
| **Policies/assets** | Stay at **repo root** (`docs/policies/`, `assets/`). App code resolves them **up one level** from its cwd. |
| **Unit/integration runner** | **Vitest** + React Testing Library + jsdom. AI SDK boundary mocked with `vi.mock`. |
| **E2E** | **Playwright against the real stack + real OpenRouter.** Assertions are **tolerant**: assert UI presence (decision card / chat bubble), a **Polish keyword allowlist** (≥1 match), and a **min response length (~50 chars)**. **Never assert decision correctness.** |
| **Scope** | **Full PoC** — every AC-01…AC-31 and all TAC-* across the 4 ADRs. |
| **Models** | Split env vars `OPENROUTER_VISION_MODEL` / `OPENROUTER_TEXT_MODEL`, default both to `openai/gpt-5.4-mini`, fallback to `OPENROUTER_MODEL` + a startup console warning (ADR-000 §8). |

> ⚠️ **Pre-E2E check (orchestrator):** before Phase 12, confirm `openai/gpt-5.4-mini`
> actually accepts image input on OpenRouter. If not, set `OPENROUTER_VISION_MODEL` in
> `.env` to a known multimodal id. This only affects the real-API E2E run.

---

## Repository layout this plan creates (subfolder mode)

```
/ (repo root)
├─ .env / .env.example         # split model vars added (Step 0.3)
├─ docs/policies/*.md          # rule source — read by server at runtime (../docs/policies)
├─ assets/design-tokens.json   # transcribed into Tailwind theme (Step 8.1)
└─ app/                        # ← Next.js project ROOT (cwd for all npm scripts)
   ├─ package.json
   ├─ AGENTS.md                # stack-specific rules (Step 0.4)
   ├─ app/                     # App Router
   │  ├─ layout.tsx  page.tsx  globals.css
   │  └─ api/assess/route.ts   api/chat/route.ts
   ├─ src/
   │  ├─ shared/contracts/     # types, enums, Zod schemas
   │  ├─ shared/i18n/          # Polish copy + decision labels
   │  ├─ shared/validation/    # form validators (client+server)
   │  ├─ server/ai/            # provider, prompts, orchestrator ops
   │  ├─ server/policies/      # policy loader
   │  ├─ server/image/         # validate + Sharp compress
   │  ├─ features/intake/      # form UI
   │  └─ features/chat/        # chat UI + DecisionCard
   ├─ tests/ or *.test.ts      # Vitest unit/integration
   └─ e2e/                     # Playwright specs
```

**Path facts every agent needs:**
- npm scripts run from `app/`, so `process.cwd()` ≈ `app/`. Policies resolve via
  `path.join(process.cwd(), "..", "docs", "policies")`. The policy loader must take an
  overridable base dir (default that path) so tests can point at the real files.
- Design tokens live outside the app bundle. **Transcribe** token values into Tailwind
  theme + CSS variables (do not import the JSON across the project boundary).

---

## Shared context block (give to every dev task, verbatim once per agent session)

> Project = Polish self-service web app for preliminary return/complaint assessment.
> Stack: Next.js 16 App Router, TypeScript, Vercel AI SDK (`ai`, `@ai-sdk/react`),
> OpenRouter via `@openrouter/ai-sdk-provider`, Sharp, Tailwind. Next project root is the
> `app/` folder; routes in `app/app/`, code in `app/src/`. All **user-facing text is
> Polish**; code identifiers English. Tests use Vitest (`*.test.ts`) + RTL; mock only the
> AI SDK provider boundary. No `any` without justification. Follow `app/AGENTS.md` +
> repo `AGENTS.md`. **TDD: write failing tests first, confirm they fail, implement minimum,
> run `npm test`/`npm run lint`/`npm run build` from `app/`, commit with the given message.
> Use Context7 (`resolve-library-id` + `query-docs`) before using any library.** Do **not**
> push to remote.

Each task below lists only the **extra, task-specific context** to append to that block.

---

## Phase 0 — Scaffold & tooling  (agent: **be-developer**)

### Step 0.1 — Scaffold Next.js 16 in `app/`
- **Goal:** Working Next.js 16 App Router + TS + Tailwind project rooted at `app/`, dev
  server and build succeed. Router at `app/app/`, manual `app/src/` dir created.
- **Task context:** `app/` already contains `README.md` and an empty `AGENTS.md`. Scaffold
  with `create-next-app@latest` (TypeScript, Tailwind, ESLint, App Router, **no** `--src-dir`
  so the router stays at `app/app/`; npm). If the tool refuses the non-empty dir, scaffold
  into a temp sibling and move files in, **preserving** the existing `README.md` and the
  `AGENTS.md` placeholder. Then create empty `app/src/{shared,server,features}` dirs. Pin
  Node runtime expectations. Read ADR-000 §4 (Repository Structure / Technology Stack).
- **TDD/verify:** No feature tests yet — verification is `npm run build` succeeds and
  `npm run dev` serves the default page (confirm with a quick `curl`/log, then stop).
- **Commit:** `Backend: scaffold Next.js 16 App Router app in app/`

### Step 0.2 — Test infrastructure (Vitest + RTL + Playwright)
- **Goal:** Runnable test stack and npm scripts before any feature code.
- **Task context:** Add Vitest + `@testing-library/react` + `@testing-library/jest-dom` +
  jsdom + `@vitejs/plugin-react`; a `vitest.config.ts` (jsdom for components, node for
  server) and a setup file. Add Playwright (`@playwright/test`) with `playwright.config.ts`
  (baseURL from `PORT`, `webServer` running `npm run dev`). Add scripts: `test`,
  `test:watch`, `test:e2e`, `lint`, `build`, `dev`, `start`. Include one trivial passing
  unit test and one trivial Playwright test (`@smoke`) to prove both runners work. Use
  Context7 for Vitest + Playwright config specifics.
- **Verify:** `npm test` green; `npm run test:e2e` green (against dev server); `npm run lint`.
- **Commit:** `Backend: add Vitest + RTL + Playwright test infrastructure`

### Step 0.3 — Split model env vars  *(edits repo-root `.env.example`)*
- **Goal:** `.env.example` documents `OPENROUTER_VISION_MODEL` and `OPENROUTER_TEXT_MODEL`
  per ADR-000 §8, both defaulting to `openai/gpt-5.4-mini`, with the `OPENROUTER_MODEL`
  fallback note (+ "production requires both split vars").
- **Task context:** Read ADR-000 §8. Append the two vars with examples and the fallback
  rule. Do not touch real `.env`. (Orchestrator updates local `.env` separately if needed.)
- **Verify:** lint/build unaffected (doc-only).
- **Commit:** `Docs: add split OpenRouter vision/text model env vars`

### Step 0.4 — Fill `app/AGENTS.md`
- **Goal:** Stack-specific rules so later agents have a single source: commands (run from
  `app/`), the `app/app` + `app/src` layout, policy path rule (`../docs/policies`), Vitest
  conventions, Polish-only UI, "mock only AI boundary", commit format.
- **Verify:** doc-only; build/lint unaffected.
- **Commit:** `Docs: app/AGENTS.md stack rules and conventions`

---

## Phase 1 — Shared contracts & i18n  (agent: **be-developer**)

### Step 1.1 — Contracts & schemas  → `app/src/shared/contracts/`
- **Goal:** Single source of types + **Zod** schemas reused by client and server.
- **Task context — provide these exact specs (from ADR-000 §6, ADR-001 §4):**
  - `RequestType` enum: `RETURN` (UI `Zwrot`), `COMPLAINT` (UI `Reklamacja`).
  - `EquipmentCategory` enum (PRD AC-02, exact list): Smartfon, Laptop, Tablet,
    Telewizor/Monitor, Audio/Słuchawki, Smartwatch/Wearable, Aparat/Kamera, Konsola do gier,
    Sprzęt AGD, Inne.
  - `DecisionOutcome` enum: `APPROVE, REJECT, NEEDS_MORE_INFO, CONDITIONAL, ESCALATE`.
  - `IntakeSubmission`, `ImageAnalysis` (usable, description, visibleDamage[],
    conditionSignals[], likelyCause, missingItems[], confidence low|medium|high),
    `DecisionResult` (outcome, title, justification, policyReferences[], nextSteps[],
    missingInformation[], changedFromPrevious, disclaimer), `ActiveCaseContext`,
    `ValidationError` (code, field|null, message), `AssessmentError`
    (kind: VALIDATION|IMAGE_PROCESSING|AI_PROVIDER|CONFIG|UNKNOWN; retryable; message;
    fieldErrors[]).
- **TDD first:** schema parse-accept valid samples, parse-reject bad enum/missing fields;
  `missingInformation` required when outcome `NEEDS_MORE_INFO`.
- **Commit:** `Backend: shared contracts and Zod schemas`

### Step 1.2 — Polish copy & decision labels  → `app/src/shared/i18n/`
- **Goal:** All Polish UI strings centralised (TAC-002-01 enabler): app title
  `"Copilot ds. Decyzji o Serwisie Sprzętu"`, form labels (Rodzaj zgłoszenia, Kategoria
  sprzętu, Model urządzenia, Data zakupu, Powód, Zdjęcie urządzenia, Wyślij zgłoszenie),
  validation messages, processing text (`"Analizujemy zdjęcie i przygotowujemy ocenę…"`),
  chat placeholder (`"Wpisz wiadomość…"`), error copy, the mandatory disclaimer
  (`"To wstępna, niewiążąca ocena. Ostateczną decyzję podejmuje zespół serwisu."`), and a
  `DecisionOutcome → {label, visualVariant}` map (APPROVE positive, REJECT negative,
  NEEDS_MORE_INFO info, CONDITIONAL warning, ESCALATE neutral — ADR-002 §4).
- **TDD first:** every `DecisionOutcome` has a non-empty Polish label + variant; disclaimer
  constant present.
- **Commit:** `Backend: Polish i18n copy and decision labels`

---

## Phase 2 — Form validation  (agent: **be-developer**)

### Step 2.1 — Validators  → `app/src/shared/validation/`
- **Goal:** Pure functions reused client + server; return `ValidationError[]` with Polish
  messages + stable codes (ADR-003 §5 Form Validation Contract; PRD AC-01…AC-09, AC-11).
- **Task context — rules:** request type ∈ {RETURN, COMPLAINT}; category ∈ list; equipment
  name required after trim; purchase date required and **not in the future**; reason
  **required for COMPLAINT**, optional for RETURN; exactly one image; image MIME ∈
  {jpeg, png, webp}; size ≤ 10 MB. Provide a single `validateIntake(fields, file)` plus
  granular field validators.
- **TDD first:** one test per AC (future date, missing complaint reason, wrong format names
  accepted formats, >10 MB states limit, missing image, blank name, etc.) asserting the
  Polish message + code.
- **Commit:** `Backend: shared intake validation with Polish errors`

---

## Phase 3 — Policy loader  (agent: **be-developer**)

### Step 3.1 — `loadPolicy(requestType)`  → `app/src/server/policies/`
- **Goal:** Server-only loader returning the exact Markdown + metadata for the matching
  policy; **fail closed** (throw CONFIG error) if a file is missing (ADR-000 §7, ADR-001 §3).
- **Task context:** RETURN → `polityka-zwrotow.md`, COMPLAINT → `polityka-reklamacji.md`.
  Base dir = `path.join(process.cwd(), "..", "docs", "policies")`, **overridable** via param/
  env for tests. Never import policy text into client bundles (TAC-000-01).
- **TDD first:** loads each real file and returns non-empty content; wrong/missing dir throws
  a CONFIG-kind error; correct file chosen per request type.
- **Commit:** `Backend: policy loader with fail-closed behavior`

---

## Phase 4 — Image service  (agent: **be-developer**)

### Step 4.1 — Validate + compress  → `app/src/server/image/`
- **Goal:** `validateImageFile()` (MIME allowlist + ≤10 MB, real-bytes check where possible)
  and `compressImage()` (Sharp resize/compress in memory → `ImageProcessingResult`
  {mimeType, byteLength, width, height, payload base64}). No persistence (TAC-003-05/06).
- **Task context:** ADR-003 §3–§5; accepted JPEG/PNG/WebP; corrupt bytes → IMAGE_PROCESSING
  error and **no** vision call. Use Context7 `/lovell/sharp`.
- **TDD first:** generate fixtures with Sharp in-test — valid JPEG/PNG/WebP compress to a
  smaller/resized payload; PDF/txt rejected; >10 MB rejected at boundary; corrupt bytes
  throw; output never written to disk.
- **Commit:** `Backend: image validation and Sharp compression`

---

## Phase 5 — AI orchestrator  (agent: **be-developer**)

> Tests mock the AI SDK boundary (`vi.mock` on the provider / `generateObject` /
> `streamText`). Use Context7 `/vercel/ai` and `/openrouterteam/ai-sdk-provider`.

### Step 5.1 — Provider factory  → `app/src/server/ai/provider.ts`
- **Goal:** Server-only `createOpenRouter` from env; `getVisionModel()` / `getTextModel()`
  reading `OPENROUTER_VISION_MODEL` / `OPENROUTER_TEXT_MODEL`, fallback to `OPENROUTER_MODEL`
  + a one-time console warning; validate key/base URL present (ADR-001 §5, TAC-001-01/02).
- **TDD first:** model selectors return the right env value; fallback warns once; missing key
  throws CONFIG; module imported in client context exposes no key.
- **Commit:** `Backend: OpenRouter provider factory with split models`

### Step 5.2 — Prompt inventory  → `app/src/server/ai/prompts/`
- **Goal:** Five versioned server-side prompts (ADR-001 §3): return image-analysis, complaint
  image-analysis, return decision, complaint decision, chat continuation. Each enforces:
  Polish user-facing output, the decision enum, the non-binding disclaimer, "use only the
  injected policy — never invent rules", off-topic refusal + revision rules (chat), and the
  `usable=false`/`confidence=low` guardrail (no APPROVE/REJECT unless a non-visual rule like
  a missed deadline applies). Provide builders that inject policy text + form summary + image
  analysis.
- **TDD first:** the assembled prompt for each path contains the policy text, the form
  summary fields, decision enum, disclaimer instruction, and guardrail text; return vs
  complaint selects the correct prompt.
- **Commit:** `Backend: AI prompt inventory for analysis/decision/chat`

### Step 5.3 — `analyzeImageForCase`  → `app/src/server/ai/`
- **Goal:** Vision call via structured output → validated `ImageAnalysis`; request-type
  selects the image prompt; uses **vision** model; fail closed on invalid output (no
  fabrication — ADR-001 "Fail Closed").
- **TDD first (mocked):** vision model used; RETURN/COMPLAINT prompt selected; invalid
  structured output rejected; `usable=false` returns a usable=false analysis (not an error).
- **Commit:** `Backend: image analysis AI operation`

### Step 5.4 — `generateInitialDecision`  → `app/src/server/ai/`
- **Goal:** Text call → validated `DecisionResult` from submission + image analysis + selected
  policy; uses **text** model; enforces exactly one outcome, mandatory disclaimer, guardrail
  (ADR-001 §4, TAC-000-04, TAC-001-03/05).
- **TDD first (mocked):** invalid/unknown outcome rejected; exactly one policy injected (never
  both); `NEEDS_MORE_INFO` carries `missingInformation`; `usable=false`+attempted APPROVE is
  blocked/coerced to safe path; disclaimer always present.
- **Commit:** `Backend: initial decision AI operation`

### Step 5.5 — `streamCaseChatReply`  → `app/src/server/ai/`
- **Goal:** Streaming reply (AI SDK UI message stream) with full case context + policy +
  message history; **text** model; off-topic refusal in Polish; revision allowed only when
  new info affects a rule/evidence, and must state it changed + why (ADR-001 §6, AC-25/26).
- **TDD first (mocked):** server prompt includes submission + image analysis + initial
  decision + policy + history (TAC-001-06); off-topic → Polish refusal/redirect; revision
  wording present when new info changes outcome; irrelevant info → no revision.
- **Commit:** `Backend: chat continuation AI operation`

---

## Phase 6 — `POST /api/assess`  (agent: **be-developer**)

### Step 6.1 — Assessment route  → `app/app/api/assess/route.ts`
- **Goal:** Node-runtime route: parse `multipart/form-data` → **server validation** (Phase 2)
  → image validate+compress (Phase 4) → load policy (Phase 3) → `analyzeImageForCase` →
  `generateInitialDecision` → respond `{caseId, submission snapshot (no raw file),
  imageAnalysis, decision, firstMessage}`. Error shapes: 400 field errors;
  502/503-style AI error (retryable, **no** decision); IMAGE_PROCESSING error. Validation runs
  **before** any compression/LLM call (TAC-003-02). No image persisted (TAC-003-06).
- **Task context:** ADR-000 §7 (`/api/assess` contract) + ADR-003 §3 error categories.
  `export const runtime = "nodejs"`.
- **TDD first (integration, AI provider mocked):** invalid input → 400 before any AI call
  (TAC-000-02); missing/oversized/wrong-format image → 400; vision failure → retryable error,
  no decision (TAC-000-03); success → decision with exactly one outcome + Polish disclaimer
  (TAC-000-04).
- **Commit:** `Backend: /api/assess route with validation and decision pipeline`

---

## Phase 7 — `POST /api/chat`  (agent: **be-developer**)

### Step 7.1 — Chat route  → `app/app/api/chat/route.ts`
- **Goal:** Node-runtime streaming route: accept `{caseContext, messages}`, rebuild full
  server-side prompt context (submission + image analysis + initial decision + policy +
  history), stream via `streamCaseChatReply`. Turn-level error shape; existing thread stays
  visible (ADR-000 §7, ADR-002 §5).
- **TDD first (integration, AI mocked):** full context forwarded every request (TAC-000-05/
  TAC-001-06); off-topic refusal; missing context → error (not a fabricated reply).
- **Commit:** `Backend: /api/chat streaming route with full case context`

---

## Phase 8 — Design system foundation  (agent: **fe-developer**)

### Step 8.1 — Tailwind theme + layout + base components
- **Goal:** Dark Spotify-inspired theme wired into Tailwind + CSS variables; app shell.
- **Task context — provide design tokens inline (from `assets/design-tokens.json` /
  `docs/design-guidelines.md`):** bg `#121212`/`#181818`/`#1F1F1F`; text `#FFFFFF`/`#B3B3B3`/
  `#7C7C7C`; brand `#1ED760` (hover `#3BE477`, active `#1AAF4E`); error `#E22134`; warning
  `#FFA42B`; radius pill `9999px` / card `6px` / md `8px`; font stack `"Spotify Mix",
  "Circular", "Helvetica Neue", Helvetica, Arial, sans-serif`; primary button = green pill,
  **black** text, weight 700, grow-on-hover `scale(1.04)`. **ADR-002 constraint:** use the
  dark theme/green accent/tone **but no music metaphors** — domain language is hardware
  service. Set `<html lang="pl">`, app title (i18n), favicon/logo from `assets/`
  (copy into `app/public/`). Build small primitives: `Button` (primary/secondary/text),
  `Card`, `StatusBadge` (maps decision variants → colors), `Field` wrapper.
- **TDD first:** `Button` renders variants/disabled; `StatusBadge` renders each decision
  variant with its Polish label + expected style hook; layout sets `lang="pl"` and the title.
- **Commit:** `Frontend: Tailwind dark theme, app shell, base UI primitives`

---

## Phase 9 — Intake feature  (agent: **fe-developer**)

### Step 9.1 — Form field components
- **Goal:** `RequestTypeSelector` (Reklamacja/Zwrot, mutually exclusive),
  `EquipmentCategorySelect` (fixed list), equipment-name input, date picker (future blocked),
  reason textarea (label shows required/optional, toggling with request type), `ImageUpload`
  (single file, drag-drop, preview + remove, helper text "JPEG/PNG/WebP, max 10 MB", second
  file **replaces** the first). Client validation uses Phase 2 validators + Phase 1.2 copy.
- **Task context:** PRD §9.1 + AC-01…AC-11; ADR-002 §3 components + §8 scenarios; Wireframe
  `assets/Wireframe-Step-1.png`.
- **TDD first (RTL):** empty form blocks submit with Polish required errors + first-invalid
  focus; complaint requires reason, switching to return makes it optional; image A then B →
  A replaced; remove → missing-image state; wrong format/oversize show the right message.
- **Commit:** `Frontend: intake form field components with client validation`

### Step 9.2 — `IntakeForm` container
- **Goal:** Assemble fields; submit enablement; dynamic reason requirement; first-invalid
  focus; lock + processing text while submitting; emits validated `multipart/form-data`.
- **TDD first (RTL):** submit blocked while invalid/processing (TAC-002-02); duplicate submit
  blocked; valid submit produces the multipart payload.
- **Commit:** `Frontend: IntakeForm container with submit and processing states`

---

## Phase 10 — Chat feature  (agent: **fe-developer**)

### Step 10.1 — `DecisionCard`
- **Goal:** Render a `DecisionResult` (not parsed markdown — TAC-002-03): greeting → prominent
  status label (StatusBadge) → justification → next steps → disclaimer, **in that order**
  (AC-21/22). Revised decisions show an "Zaktualizowana decyzja" marker.
- **TDD first (RTL):** order asserted; each outcome → correct Polish label + variant;
  disclaimer always shown; `changedFromPrevious` shows the update marker.
- **Commit:** `Frontend: DecisionCard rendering from structured result`

### Step 10.2 — `ChatThread` + `MessageList` + `ChatComposer`
- **Goal:** `@ai-sdk/react` chat against `/api/chat`; user/assistant bubbles (wireframe
  Step-3); streaming/typing indicator; send disabled/queued while streaming; turn-level
  retry that does not duplicate prior messages (TAC-002-05); first message slot = DecisionCard.
- **Task context:** ADR-002 §3/§5; Context7 `/vercel/ai` (`@ai-sdk/react`).
- **TDD first (RTL, mocked transport):** partial stream renders then persists; composer
  disabled while streaming; failed turn shows inline retry without duplicating messages.
- **Commit:** `Frontend: chat thread, message list, and composer`

---

## Phase 11 — Screen state machine & page wiring  (agent: **fe-developer**)

### Step 11.1 — `app/app/page.tsx` (client) state machine
- **Goal:** `FORM → PROCESSING → CHAT | ERROR` (ADR-002 §3 diagram). Submit calls
  `/api/assess` (multipart); on success seed first assistant message = DecisionCard and enter
  CHAT; on failure enter ERROR (`AssessmentErrorView` with retry + back, **no** partial
  decision). `NewRequestButton` clears all state → FORM; reload clears (AC-27/28,
  TAC-000-06, TAC-002-04). Active-session state in React only (no localStorage).
- **TDD first (RTL/integration, fetch mocked):** valid submit → processing → chat with card;
  failure → error+retry, no decision shown; retry re-sends same values; new request resets
  form + chat + image preview.
- **Commit:** `Frontend: main page state machine and assess/chat wiring`

---

## Phase 12 — QA: manual smoke + automated E2E  (agent: **qa-engineer**)

> Real stack + **real OpenRouter**. Orchestrator confirms `.env` has working keys and a
> vision-capable model before this phase.

### Step 12.1 — Manual smoke (Playwright MCP) + screenshots
- **Goal:** Start the app, walk the full flow (form → processing → decision card → chat →
  new request) for a return and a complaint, screenshot each step, compare against
  `assets/Wireframe-Step-{1,2,3}.png` and the design system. **Document bugs only** — do not
  write automated tests yet. Return a defect report; orchestrator routes fixes back to
  fe/be-developer, then re-runs this step.
- **Commit:** none (report) unless config tweaks needed → `QA: manual smoke findings`.

### Step 12.2 — Automated Playwright E2E  → `app/e2e/`
- **Goal:** Codify verified flows with **tolerant assertions** (user's rule):
  - Assert UI presence: decision card visible, chat bubble with assistant text appears.
  - **Polish keyword allowlist**, expect **≥1** match in the assistant/decision text, e.g.
    `["ocena","decyzja","zwrot","reklamacj","odrzuc","zatwierdz","serwis","niewiążąc",
    "zdjęci","gwarancj","14 dni","2 lat"]` (case-insensitive). Do **not** assert which
    outcome.
  - **Min length** ~50 chars on the decision/justification text (shorter ⇒ treat as failed
    generation).
  - The mandatory disclaimer phrase is present.
  - **Scenarios:** return happy path; complaint happy path; client-validation blocks
    (future date, missing complaint reason, missing image, wrong format, >10 MB) → inline
    Polish error, **no** network call; **new request** resets state; chat follow-up renders a
    streamed reply. **Error/retry path:** a dedicated spec runs the server with an invalid
    `OPENROUTER_VISION_MODEL` to deterministically force an AI failure → assert error state +
    retry control (no decision shown).
- **Task context:** ADR-003 §8 + ADR-002 §8 scenarios; PRD §6. Use the `qa-engineer`
  `playwright-best-practices` skill. Tag fast checks `@smoke`.
- **Verify:** `npm run test:e2e` green; app started during the run.
- **Commit:** `QA: Playwright E2E for core flows with tolerant assertions`

---

## Phase 13 — Final verification & AC sign-off  (orchestrator + fix-it delegations)

- Run from `app/`: `npm test`, `npm run lint`, `npm run build`, `npm run test:e2e`; start the
  app and walk the flow once.
- Cross-check the **AC/TAC coverage map** below; any gap → a targeted fix task to the owning
  agent (TDD, its own commit), then re-verify.
- Confirm **no secret/policy leakage** into the client bundle (TAC-000-01): search the built
  client chunks for `OPENROUTER`, the API key, and policy text — must be absent.

---

## End-to-end verification (how to prove the PoC works)

1. `cd app && npm install` (first run also `npx playwright install`).
2. Ensure repo-root `.env` has `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL`, and a
   vision-capable `OPENROUTER_VISION_MODEL` + `OPENROUTER_TEXT_MODEL`.
3. `npm test` (unit+integration), `npm run lint`, `npm run build` → all green.
4. `npm run dev`, open the app: submit a **Zwrot** within 14 days with a clean photo →
   decision card (Polish) + disclaimer → ask a follow-up → streamed reply → **new request**
   resets. Repeat for **Reklamacja** with a defect photo + mandatory reason.
5. Trigger validation errors (future date, missing reason, wrong format, >10 MB, no image) →
   inline Polish errors, submission blocked.
6. Force an AI failure (invalid vision model id) → error state + retry, no decision.
7. `npm run test:e2e` → Playwright green against the real stack.

---

## AC / TAC coverage map

| Area | Criteria | Delivered by |
|---|---|---|
| Form & validation | AC-01…AC-07, AC-11; TAC-003-01/03/04 | 1.1, 2.1, 9.1, 9.2 |
| Image handling | AC-08…AC-11; TAC-003-02/05/06 | 2.1, 4.1, 6.1 |
| Image analysis | AC-12…AC-14; TAC-001-02 | 5.2, 5.3 |
| Decision | AC-15…AC-19; TAC-000-04, TAC-001-03/05 | 5.2, 5.4, 6.1 |
| Decision presentation | AC-20…AC-22; TAC-002-03 | 10.1, 11.1 |
| Chat | AC-23…AC-26; TAC-000-05, TAC-001-06 | 5.5, 7.1, 10.2 |
| Session/state | AC-27, AC-28; TAC-000-06, TAC-002-04 | 11.1 |
| Errors | AC-29, AC-30; ADR-003 categories | 4.1, 5.x, 6.1, 11.1, 12.2 |
| Polish everywhere | AC-31; TAC-001-04, TAC-002-01 | 1.2 + all UI/AI steps |
| No secret/policy leak | TAC-000-01, TAC-001-01 | 3.1, 5.1, 13 |
| Server validation before AI | TAC-000-02, TAC-003-02 | 6.1 |
| Verified by running app | TAC-003-07 | 12.1, 12.2, 13 |

---

## Orchestration notes & risks

- **Order is dependency-driven and mostly sequential.** Backend Phases 1–7 must precede the
  FE wiring in Phase 11. Phases 8–10 (FE) can run in parallel with Phases 3–7 (BE) **after**
  Phase 1 (contracts) + Phase 2 (validation) land, since both sides depend on those. I will
  parallelise only where the shared contracts are already committed.
- **Each step = its own subagent invocation + its own commit.** I give the agent the shared
  context block + the task-specific context above, nothing more, so contexts stay lean.
- **TDD honesty:** every step writes failing tests first; I confirm the agent reported the
  red→green transition before accepting the commit.
- **Risk — vision model:** if `openai/gpt-5.4-mini` rejects images on OpenRouter, image
  analysis fails; mitigation = swap `OPENROUTER_VISION_MODEL` (orchestrator, pre-Phase 12).
- **Risk — Sharp native build** on Windows/serverless; mitigation = verify `npm run build`
  in Step 4.1 and keep Node runtime on the routes.
- **Risk — policy path** in subfolder mode; mitigation = overridable base dir + a test that
  loads the real files (Step 3.1).
- **Risk — real-API E2E flakiness/cost;** mitigated by tolerant assertions + tagging heavy
  specs so the `@smoke` subset can run quickly.

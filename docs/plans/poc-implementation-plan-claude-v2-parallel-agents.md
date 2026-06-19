# PoC Implementation Plan — Hardware Service Decision Copilot (Parallel Multi-Agent Workflow)

> **Final filename on approval:** saved as `docs/plans/poc-implementation-plan-claude.md`
> (the requested `*-claude.md` suffix). Plan mode pins editing to the auto-named file; it is
> copied to the final name once approved.

---

## Context

We are building a **fully working Proof of Concept** of the *Hardware Service Decision
Copilot* — a Polish-language self-service web app that gives customers an **instant,
preliminary (non-binding)** assessment of whether a **return (Zwrot)** or **complaint
(Reklamacja)** is likely to be accepted. The customer fills a short intake form and uploads
**one** product photo; a multimodal model analyses the image, a reasoning model combines that
with the form data and the matching policy to produce a structured decision
(`APPROVE / REJECT / NEEDS_MORE_INFO / CONDITIONAL / ESCALATE`), and a chat lets the customer
ask follow-ups and supply missing info.

The spec is complete: **PRD** (`docs/PRD-Product-Requirements-Document.md`, AC-01…AC-31),
**4 ADRs** (`docs/ADR/000…003`, TAC-* criteria), **design** (`docs/design-guidelines.md` +
`assets/design-tokens.json` + wireframes), and **policy rule sources**
(`docs/policies/polityka-{zwrotow,reklamacji}.md`). The `app/` folder is an empty scaffold.

**This rewrite reorganises the build as a parallel multi-agent workflow.** The work is
decomposed into 24 atomic, TDD-first tasks; a dependency matrix determines which tasks block
which; tasks with no remaining dependencies run **concurrently** across a pool of subagents,
synchronised at **wave gates**. The orchestrator (me) writes no production code — I only
decompose, dispatch parallel subagents, integrate their branches, and gate each wave.

### Agent pool
- **BE-1, BE-2, BE-3** — `be-developer` instances (backend/server/contracts).
- **FE-1, FE-2, FE-3** — `fe-developer` instances (UI).
- **QA** — one `qa-engineer` instance.

Concurrency may be capped (e.g. to 3–4) for machine resources; the waves below remain valid
at any cap — fewer agents just means a wave runs in a couple of batches.

---

## Decisions locked (from user)

| Decision | Choice |
|---|---|
| Stack | Next.js 16 App Router + TypeScript + Vercel AI SDK + OpenRouter + Sharp + Tailwind. |
| **App location** | **Subfolder**: Next root = `app/`; `package.json` in `app/`, routes in `app/app/`, code in `app/src/`. |
| **Policies/assets** | Stay at **repo root**; app resolves them **up one level** (`../docs/policies`, `../assets`). |
| **Unit/integration runner** | **Vitest** + RTL + jsdom; mock **only** the AI SDK provider boundary. |
| **E2E** | Playwright vs **real stack + real OpenRouter**; **tolerant assertions**: UI presence + Polish keyword allowlist (≥1) + min length ~50 chars; **never assert decision correctness**. |
| **Scope** | **Full PoC** — every AC-01…AC-31 and all TAC-*. |
| **Models** | Split `OPENROUTER_VISION_MODEL` / `OPENROUTER_TEXT_MODEL`, default both `openai/gpt-5.4-mini`, fallback `OPENROUTER_MODEL` + startup warning. |

> ⚠️ **Pre-Wave-8 check (orchestrator):** confirm `openai/gpt-5.4-mini` accepts image input on
> OpenRouter; if not, set a multimodal `OPENROUTER_VISION_MODEL` in `.env`. Only affects QA.

---

## Repository layout (subfolder mode)

```
/ (repo root)
├─ .env / .env.example         # split model vars (T0.3)
├─ docs/policies/*.md          # rule source — read at runtime via ../docs/policies
├─ assets/design-tokens.json   # transcribed into Tailwind theme (T8.1)
└─ app/                        # Next.js project ROOT (cwd for all npm scripts)
   ├─ package.json  AGENTS.md
   ├─ app/{layout,page}.tsx  app/globals.css  app/api/{assess,chat}/route.ts
   ├─ src/shared/{contracts,i18n,validation}
   ├─ src/server/{ai,policies,image}
   ├─ src/features/{intake,chat}
   └─ e2e/
```

**Path facts for every agent:** npm scripts run from `app/`, so `process.cwd()` ≈ `app/`;
policies resolve via `path.join(process.cwd(),"..","docs","policies")` with an **overridable
base dir** for tests. **Transcribe** design tokens into Tailwind theme + CSS vars (don't
import the JSON across the project boundary).

---

## Shared context block (prepended to every dev-task prompt)

> Polish self-service web app for preliminary return/complaint assessment. Next.js 16 App
> Router + TS, Vercel AI SDK (`ai`, `@ai-sdk/react`), OpenRouter (`@openrouter/ai-sdk-provider`),
> Sharp, Tailwind. Next root = `app/`; routes in `app/app/`, code in `app/src/`. **All
> user-facing text is Polish**; identifiers English. Vitest (`*.test.ts`) + RTL; mock only the
> AI SDK provider. No `any` without justification. Follow `app/AGENTS.md` + repo `AGENTS.md`.
> **TDD: write failing tests first, confirm red, implement minimum, run `npm test` +
> `npm run lint` + `npm run build` from `app/`, commit with the given message. Use Context7
> before using any library. Do NOT push to remote.** You are working in an isolated git
> worktree on the branch you were given — commit only files under your assigned directories.

Each task lists only the **extra task-specific context** to append.

---

## Task catalog (atomic, TDD-first, one commit each)

> Format: **ID — title** · agent · `dir` · deps → goal / key spec / first tests / commit.

### Foundation (serial-ish; gates everything)
- **T0.1 — Scaffold Next.js 16** · BE · `app/` · deps: — → create-next-app (TS, Tailwind,
  ESLint, App Router, **no** `--src-dir`; npm). If dir non-empty, scaffold in temp + move,
  preserving `README.md`/`AGENTS.md`. Create empty `src/{shared,server,features}`. Verify
  `build` + `dev`. *Commit:* `Backend: scaffold Next.js 16 App Router app in app/`
- **T0.2 — Test infra + front-load deps** · BE · `app/` · deps: T0.1 → add **all runtime
  deps now** (`ai`, `@ai-sdk/react`, `@openrouter/ai-sdk-provider`, `sharp`, `zod`) **and**
  dev deps (Vitest, `@testing-library/react`, `@testing-library/jest-dom`, jsdom,
  `@vitejs/plugin-react`, `@playwright/test`). Add `vitest.config.ts` (jsdom+node projects),
  setup file, `playwright.config.ts` (webServer = `npm run dev`), scripts (`test`,
  `test:watch`, `test:e2e`, `lint`, `build`, `dev`, `start`). One trivial unit + one `@smoke`
  e2e prove both runners. **Front-loading deps here means no later task edits package.json →
  near-zero merge conflicts.** *Commit:* `Backend: add Vitest + RTL + Playwright + project deps`
- **T0.3 — Split model env vars** · BE · root `.env.example` · deps: T0.1 → document
  `OPENROUTER_VISION_MODEL`/`OPENROUTER_TEXT_MODEL` (default `openai/gpt-5.4-mini`) + fallback
  rule (ADR-000 §8). *Commit:* `Docs: add split OpenRouter vision/text model env vars`
- **T0.4 — app/AGENTS.md** · BE · `app/AGENTS.md` · deps: T0.1 → commands (run from `app/`),
  `app/app`+`app/src` layout, policy path rule, Vitest conventions, Polish-only, "mock only AI
  boundary". *Commit:* `Docs: app/AGENTS.md stack rules and conventions`

### Core shared (gates both tracks)
- **T1.1 — Contracts & Zod schemas** · BE · `src/shared/contracts` · deps: T0.2 → enums
  `RequestType{RETURN=Zwrot,COMPLAINT=Reklamacja}`, `EquipmentCategory` (PRD AC-02 exact 10),
  `DecisionOutcome{APPROVE,REJECT,NEEDS_MORE_INFO,CONDITIONAL,ESCALATE}`; types+schemas
  `IntakeSubmission`, `ImageAnalysis`, `DecisionResult`, `ActiveCaseContext`,
  `ValidationError`, `AssessmentError` (ADR-000 §6, ADR-001 §4). *Tests:* accept valid /
  reject bad enums+missing; `missingInformation` required iff `NEEDS_MORE_INFO`. *Commit:*
  `Backend: shared contracts and Zod schemas`
- **T1.2 — Polish i18n + decision labels** · BE · `src/shared/i18n` · deps: T1.1 → app title
  `"Copilot ds. Decyzji o Serwisie Sprzętu"`, all form/validation/processing/chat/error copy,
  disclaimer `"To wstępna, niewiążąca ocena. Ostateczną decyzję podejmuje zespół serwisu."`,
  `DecisionOutcome → {label, visualVariant}` map (ADR-002 §4). *Tests:* every outcome has a
  non-empty label+variant; disclaimer present. *Commit:* `Backend: Polish i18n copy and decision labels`
- **T2.1 — Form validation** · BE · `src/shared/validation` · deps: T1.1,T1.2 → pure
  `validateIntake(fields,file)` + field validators returning `ValidationError[]` (codes +
  Polish msgs): type∈enum, category∈list, name trimmed non-empty, date not future, reason
  required for COMPLAINT, exactly one image, MIME∈{jpeg,png,webp}, ≤10 MB (PRD AC-01…09,11;
  ADR-003 §5). *Tests:* one per AC. *Commit:* `Backend: shared intake validation with Polish errors`

### Backend services & routes
- **T3.1 — Policy loader** · BE · `src/server/policies` · deps: T1.1 → `loadPolicy(type)`,
  fail-closed if missing; base dir overridable (default `../docs/policies`); never bundled
  client-side. *Tests:* loads each real file; missing dir → CONFIG error; correct file per
  type. *Commit:* `Backend: policy loader with fail-closed behavior`
- **T4.1 — Image service** · BE · `src/server/image` · deps: T1.1 → `validateImageFile()` +
  `compressImage()` (Sharp, in-memory → `{mimeType,byteLength,width,height,payload}`); corrupt
  → IMAGE_PROCESSING error, no vision call; no persistence (ADR-003; TAC-003-05/06). *Tests
  (Sharp fixtures):* valid jpeg/png/webp shrink; pdf/txt rejected; >10 MB rejected; corrupt
  throws. *Commit:* `Backend: image validation and Sharp compression`
- **T5.1 — Provider factory** · BE · `src/server/ai/provider.ts` · deps: T0.2,T0.3 →
  server-only `createOpenRouter`; `getVisionModel()/getTextModel()` with fallback+warning;
  validate key/baseURL (TAC-001-01/02). *Tests:* selectors map to env; fallback warns once;
  missing key → CONFIG. *Commit:* `Backend: OpenRouter provider factory with split models`
- **T5.2 — Prompt inventory** · BE · `src/server/ai/prompts` · deps: T1.1,T1.2 → 5 prompts
  (return/complaint image-analysis, return/complaint decision, chat) enforcing Polish output,
  decision enum, disclaimer, "use only injected policy", off-topic refusal + revision rules,
  `usable=false`/`confidence=low` guardrail; builders inject policy+form+analysis (ADR-001 §3).
  *Tests:* assembled prompt contains policy text (fixture), form summary, enum, disclaimer,
  guardrail; correct prompt per type. *Commit:* `Backend: AI prompt inventory for analysis/decision/chat`
- **T5.3 — analyzeImageForCase** · BE · `src/server/ai` · deps: T5.1,T5.2 → vision structured
  output → validated `ImageAnalysis`; type selects prompt; vision model; fail-closed on invalid
  (mock AI). *Commit:* `Backend: image analysis AI operation`
- **T5.4 — generateInitialDecision** · BE · `src/server/ai` · deps: T5.1,T5.2,T3.1 → text
  structured output → `DecisionResult`; exactly one policy; one outcome; disclaimer; guardrail
  (TAC-000-04, TAC-001-03/05). *Commit:* `Backend: initial decision AI operation`
- **T5.5 — streamCaseChatReply** · BE · `src/server/ai` · deps: T5.1,T5.2,T3.1 → UI-message
  stream with full context+policy+history; off-topic refusal; explained revision (AC-25/26).
  *Commit:* `Backend: chat continuation AI operation`
- **T6.1 — POST /api/assess** · BE · `app/app/api/assess` · deps: T2.1,T3.1,T4.1,T5.3,T5.4 →
  Node runtime; multipart → server validation (before any AI) → compress → policy → analyze →
  decide → `{caseId,submission,imageAnalysis,decision,firstMessage}`; 400/AI/IMAGE errors
  (TAC-000-02/03/04, TAC-003-02). *Tests (AI mocked):* invalid→400 pre-AI; vision fail→retryable
  no decision; success→one outcome+disclaimer. *Commit:* `Backend: /api/assess route with validation and decision pipeline`
- **T7.1 — POST /api/chat** · BE · `app/app/api/chat` · deps: T5.5,T3.1 → Node runtime;
  `{caseContext,messages}` → rebuild full context → stream; turn-level errors (TAC-000-05,
  TAC-001-06). *Commit:* `Backend: /api/chat streaming route with full case context`

### Frontend
- **T8.1 — Design system + shell + primitives** · FE · `app/app/{layout,globals}` +
  `src/features/.../ui` · deps: T1.1,T1.2 → transcribe tokens (bg `#121212/#181818/#1F1F1F`,
  text `#FFFFFF/#B3B3B3/#7C7C7C`, brand `#1ED760` hover `#3BE477`, error `#E22134`, pill/card
  radii, font stack) into Tailwind+CSS vars; `<html lang="pl">`, title, favicon/logo→`public/`;
  primitives `Button`(primary green pill/black text/grow-on-hover)/`Card`/`StatusBadge`(decision
  variants)/`Field`. **No music metaphors** (ADR-002). *Tests:* button variants/disabled;
  StatusBadge per outcome; layout sets lang+title. *Commit:* `Frontend: Tailwind dark theme, app shell, base UI primitives`
- **T9.1 — Intake field components** · FE · `src/features/intake` · deps: T8.1,T2.1 →
  `RequestTypeSelector`, `EquipmentCategorySelect`, name input, date picker (future blocked),
  reason textarea (dynamic required label), `ImageUpload` (single, drag-drop, preview, remove,
  helper text, replace-on-second); client validation via T2.1 (PRD §9.1, AC-01…11; Wireframe-1).
  *Tests:* empty→blocked+first-invalid focus; complaint requires reason, return optional; A→B
  replace; remove→missing; bad format/size msgs. *Commit:* `Frontend: intake form field components with client validation`
- **T9.2 — IntakeForm container** · FE · `src/features/intake` · deps: T9.1 → assemble; submit
  enablement; lock+processing text; emits multipart (TAC-002-02). *Tests:* blocked while
  invalid/processing; dup submit blocked; valid→payload. *Commit:* `Frontend: IntakeForm container with submit and processing states`
- **T10.1 — DecisionCard** · FE · `src/features/chat` · deps: T8.1,T1.1,T1.2 → render
  `DecisionResult` (greeting→StatusBadge→justification→nextSteps→disclaimer, in order;
  TAC-002-03; AC-21/22); "Zaktualizowana decyzja" marker when `changedFromPrevious`. *Tests:*
  order; per-outcome label/variant; disclaimer; update marker. *Commit:* `Frontend: DecisionCard rendering from structured result`
- **T10.2 — ChatThread + composer** · FE · `src/features/chat` · deps: T8.1 → `@ai-sdk/react`
  vs `/api/chat`; bubbles (Wireframe-3); streaming/typing; send disabled while streaming; turn
  retry no-dup (TAC-002-05). *Tests (mock transport):* partial→persist; disabled while
  streaming; failed turn retry no-dup. *Commit:* `Frontend: chat thread, message list, and composer`
- **T11.1 — Main page state machine** · FE · `app/app/page.tsx` · deps: T9.2,T10.1,T10.2
  (build/test) · runtime needs T6.1,T7.1 → `FORM→PROCESSING→CHAT|ERROR`; assess (multipart) →
  seed DecisionCard → CHAT; failure → ERROR (retry/back, no partial decision); NewRequest +
  reload clear all (AC-27/28, TAC-000-06, TAC-002-04). *Tests (fetch mocked):* submit→processing
  →chat+card; fail→error+retry no decision; retry resends; new request resets. *Commit:*
  `Frontend: main page state machine and assess/chat wiring`

### QA
- **T12.1 — Manual smoke (Playwright MCP)** · QA · deps: T11.1,T6.1,T7.1 → run real app+real
  OpenRouter; walk return & complaint flows; screenshot each step vs Wireframes/design; document
  bugs only; route fixes back to owning FE/BE agent, then re-run. *Commit:* `QA: manual smoke findings` (if any config tweak).
- **T12.2 — Automated E2E** · QA · `app/e2e` · deps: T12.1 → **tolerant** specs (real stack):
  decision card visible; **Polish keyword allowlist** `["ocena","decyzja","zwrot","reklamacj",
  "odrzuc","zatwierdz","serwis","niewiążąc","zdjęci","gwarancj","14 dni","2 lat"]` expect **≥1**;
  **min ~50 chars**; disclaimer present; **never assert outcome**. Scenarios: return/complaint
  happy; validation blocks (future date, missing reason, missing image, wrong format, >10 MB)→no
  network; new-request reset; chat follow-up; **error/retry** via dedicated spec running an
  invalid `OPENROUTER_VISION_MODEL`. *Commit:* `QA: Playwright E2E for core flows with tolerant assertions`
- **T13 — Final verification & AC sign-off** · QA/orch · deps: T12.2 → full suite +
  `build` + app start; AC/TAC map check; verify no `OPENROUTER`/key/policy text in client
  bundle (TAC-000-01). Gaps → targeted fix task to owning agent.

---

## Dependency matrix

| Task | Agent | Depends on | Directly blocks |
|---|---|---|---|
| T0.1 Scaffold | BE | — | everything |
| T0.2 Test infra+deps | BE | T0.1 | T1.1, T3.1, T4.1, T5.1, T8.1 |
| T0.3 Env vars | BE | T0.1 | T5.1 |
| T0.4 app/AGENTS | BE | T0.1 | (reference only) |
| T1.1 Contracts | BE | T0.2 | T1.2, T2.1, T3.1, T4.1, T5.2, T8.1, T10.1 |
| T1.2 i18n | BE | T1.1 | T2.1, T5.2, T8.1, T10.1 |
| T2.1 Validation | BE | T1.1, T1.2 | T6.1, T9.1 |
| T3.1 Policy loader | BE | T1.1 | T5.4, T5.5, T6.1, T7.1 |
| T4.1 Image service | BE | T1.1 | T6.1 |
| T5.1 Provider | BE | T0.2, T0.3 | T5.3, T5.4, T5.5 |
| T5.2 Prompts | BE | T1.1, T1.2 | T5.3, T5.4, T5.5 |
| T5.3 analyzeImage | BE | T5.1, T5.2 | T6.1 |
| T5.4 decision | BE | T5.1, T5.2, T3.1 | T6.1 |
| T5.5 chatReply | BE | T5.1, T5.2, T3.1 | T7.1 |
| T6.1 /api/assess | BE | T2.1, T3.1, T4.1, T5.3, T5.4 | T11.1ʳ, T12.1 |
| T7.1 /api/chat | BE | T5.5, T3.1 | T11.1ʳ, T12.1 |
| T8.1 Design system | FE | T1.1, T1.2 | T9.1, T10.1, T10.2 |
| T9.1 Form fields | FE | T8.1, T2.1 | T9.2 |
| T9.2 Intake container | FE | T9.1 | T11.1 |
| T10.1 DecisionCard | FE | T8.1, T1.1, T1.2 | T11.1 |
| T10.2 ChatThread | FE | T8.1 | T11.1 |
| T11.1 Page wiring | FE | T9.2, T10.1, T10.2 (ʳ T6.1, T7.1) | T12.1 |
| T12.1 Manual smoke | QA | T11.1, T6.1, T7.1 | T12.2 |
| T12.2 E2E | QA | T12.1 | T13 |
| T13 Final verify | QA/orch | T12.2 | — |

`ʳ` = runtime dependency only (the build/test version mocks fetch; the real end-to-end run
needs the routes live).

---

## Parallel execution waves (ASAP schedule)

Each wave = all tasks whose dependencies completed in earlier waves. Launch the listed agents
**concurrently**; the wave **gate** (merge + green suite) must pass before the next wave.

| Wave | Tasks run in parallel | Agents | Max concurrency | Unblocks |
|---|---|---|---|---|
| **0** | T0.1 | BE-1 | 1 | the repo |
| **1** | T0.2 ‖ T0.3 ‖ T0.4 | BE-1, BE-2, BE-3 | 3 | TDD infra, env, rules |
| **2** | T1.1 ‖ T5.1 | BE-1, BE-2 | 2 | contracts + provider |
| **3** | T1.2 ‖ T3.1 ‖ T4.1 | BE-1, BE-2, BE-3 | 3 | i18n, policy, image |
| **4** | T2.1 ‖ T5.2 ‖ **T8.1** | BE-1, BE-2, **FE-1** | 3 | validation, prompts, design system (FE track opens) |
| **5** | T5.3 ‖ T5.4 ‖ T5.5 ‖ T9.1 ‖ T10.1 ‖ T10.2 | BE-1, BE-2, BE-3, FE-1, FE-2, FE-3 | **6 (peak)** | AI ops + all leaf UI |
| **6** | T6.1 ‖ T7.1 ‖ T9.2 | BE-1, BE-2, FE-1 | 3 | both routes + intake container |
| **7** | T11.1 | FE-1 | 1 | full app wired |
| **8** | T12.1 | QA | 1 | verified flows |
| **9** | T12.2 | QA | 1 | E2E suite |
| **10** | T13 | QA/orch | 1 | sign-off |

**Peak parallelism = 6** (Wave 5: 3 backend AI ops + 3 frontend leaf components, fully
disjoint directories). Backend and frontend tracks run **simultaneously from Wave 4 onward**.

24 atomic tasks collapse into **11 waves**. A naive one-task-at-a-time build is ~24 serial
steps; the wave schedule’s lower bound is the critical path (below). Real speedup depends on
the concurrency cap actually granted.

---

## Critical path (the long pole)

```
T0.1 → T0.2 → T1.1 → T1.2 → T8.1 → T9.1 → T9.2 → T11.1 → T12.1 → T12.2 → T13
(scaffold→infra→contracts→i18n→design→fields→form→wiring→smoke→E2E→signoff)
```

- **The frontend assembly chain (T8.1→T9.1→T9.2→T11.1) plus QA is the bottleneck**, not the
  backend. The backend route layer (T6.1/T7.1) completes by **Wave 6** and then **waits** for
  the FE wiring (Wave 7) before QA can start.
- An equal-length variant runs through validation: `…T1.2 → T2.1 → T9.1 → …` (T9.1 needs both
  T8.1 and T2.1, both finishing Wave 4, so T9.1 starts Wave 5 either way).
- **To compress the critical path:** front-load reviewer attention on T1.1/T1.2 (they gate the
  most), and consider giving **T8.1 a second FE agent** for its sub-parts (theme vs primitives)
  so the FE track starts producing components a wave earlier. Splitting QA is not possible
  (single ordered chain), so keep T12.x lean (tag a fast `@smoke` subset).

---

## Parallel orchestration mechanics

**Isolation — git worktrees per task.** Each parallel task runs in its own worktree on a
task-scoped branch (`feat/<task-id>`), launched via the Agent tool with
`isolation: "worktree"`. This lets same-type agents (e.g. three `be-developer`s) commit
independently without index contention.

**Conflict avoidance (designed-in):**
1. **All dependencies are installed once in T0.2.** No later task edits `package.json`/lockfile
   → the single largest conflict source is eliminated.
2. **Disjoint directories per task** (see catalog `dir`). No two tasks in the same wave write
   the same file. The only shared roots — `app/app/layout.tsx`, `globals.css`,
   `tailwind.config`, `app/app/page.tsx` — are each owned by exactly one task (T8.1, T11.1).
3. **No shared barrel/index files.** Each module exports from its own file; the orchestrator
   adds any aggregating `index.ts` at a gate if needed.
4. Agents commit **only files under their assigned directories** (stated in the shared block).

**Wave gate protocol (orchestrator, between waves):**
1. Wait for **all** agents in the wave to report green (their own `test`+`lint`+`build`).
2. Merge each task branch into the integration branch in deterministic ID order
   (`git merge --no-ff`). With rules 1–4 these are clean/fast-forward; a genuine conflict is
   delegated back to the owning agent as a short fix task (never silently hand-resolved).
3. Run the **full** `npm test` + `npm run lint` + `npm run build` on the integration branch as
   the gate. Red gate → fix task to the owning agent before proceeding.
4. Only then launch the next wave (worktrees branch off the updated integration branch, so each
   agent starts from all prior waves’ code).

**Dispatch:** within a wave I issue all subagent calls **in a single message** (parallel tool
calls), each with the shared block + that task’s extra context + its branch name. I do not
edit code; I decompose, dispatch, gate, and integrate.

**Lower-concurrency fallback:** if the machine can’t host 6 worktrees+installs at once, run a
wave in batches respecting only intra-wave independence (all intra-wave tasks are independent,
so any batching order is safe). Waves and the gate are unchanged.

**Notes/risks specific to parallelism:**
- Same-type agents share their project **agent-memory** dir — instruct them to append, not
  overwrite, memory notes to avoid races.
- Worktrees each need `npm install` (and Sharp native build / `playwright install`); front-
  loaded, stable deps keep this a one-time cost per worktree.
- Wave 5 is resource-heavy (6 worktrees); cap to 3–4 if needed.

---

## End-to-end verification (proving the PoC works)

1. `cd app && npm install` (first run: `npx playwright install`).
2. Repo-root `.env`: `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL`, vision-capable
   `OPENROUTER_VISION_MODEL` + `OPENROUTER_TEXT_MODEL`.
3. `npm test` + `npm run lint` + `npm run build` → green.
4. `npm run dev`: submit a **Zwrot** (≤14 days, clean photo) → Polish decision card +
   disclaimer → chat follow-up → **new request** resets. Repeat **Reklamacja** (defect photo +
   mandatory reason).
5. Trigger validation errors (future date, missing reason, wrong format, >10 MB, no image) →
   inline Polish errors, submit blocked.
6. Force AI failure (invalid vision model id) → error state + retry, no decision.
7. `npm run test:e2e` → Playwright green vs real stack.

---

## AC / TAC coverage map

| Area | Criteria | Tasks |
|---|---|---|
| Form & validation | AC-01…07, 11; TAC-003-01/03/04 | T1.1, T2.1, T9.1, T9.2 |
| Image handling | AC-08…11; TAC-003-02/05/06 | T2.1, T4.1, T6.1 |
| Image analysis | AC-12…14; TAC-001-02 | T5.2, T5.3 |
| Decision | AC-15…19; TAC-000-04, TAC-001-03/05 | T5.2, T5.4, T6.1 |
| Decision presentation | AC-20…22; TAC-002-03 | T10.1, T11.1 |
| Chat | AC-23…26; TAC-000-05, TAC-001-06 | T5.5, T7.1, T10.2 |
| Session/state | AC-27/28; TAC-000-06, TAC-002-04 | T11.1 |
| Errors | AC-29/30 | T4.1, T5.x, T6.1, T11.1, T12.2 |
| Polish everywhere | AC-31; TAC-001-04, TAC-002-01 | T1.2 + all UI/AI |
| No secret/policy leak | TAC-000-01, TAC-001-01 | T3.1, T5.1, T13 |
| Validation before AI | TAC-000-02, TAC-003-02 | T6.1 |
| Verified by running app | TAC-003-07 | T12.1, T12.2, T13 |

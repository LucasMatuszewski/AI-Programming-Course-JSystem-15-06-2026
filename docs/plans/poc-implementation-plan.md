# PoC Implementation Plan - Hardware Service Decision Copilot

## Summary

Build the full PoC in `app/` as a Next.js 16 + TypeScript + npm application, using Vercel AI SDK, AI SDK React/UI conventions, OpenRouter, Sharp, and Tailwind styled from `docs/design-guidelines.md`.

Execution model: orchestrator delegates all implementation to specialized agents only. Work happens sequentially with one verified commit per task. Unit/integration tests mock external LLM calls; E2E tests use the real OpenRouter API with deterministic UI-level assertions.

Global rules for every agent task:
- Read only the task-specific docs listed in the task brief.
- Write/extend tests first, run them, confirm expected failure, then implement.
- Run scoped verification before commit: `npm test`, `npm run lint`, `npm run build`; start the app when runtime behavior changed.
- Commit format: `Area: short summary`.
- Do not read `.env`; use `.env.example` and runtime env only.

## Agent Roles

- `@be-developer`: Next.js backend-for-frontend, route handlers, validation, image processing, AI orchestration, mocked integration tests.
- `@frontend-nextjs-developer`: Next.js app scaffold, UI, AI SDK React chat UI, design system, frontend/component tests.
- `@e2e-qa-engineer`: Playwright setup and real-stack E2E validation with OpenRouter.

Important note for `@be-developer`: despite the existing example agent profile being Java-oriented, this project's backend is TypeScript/Next.js Route Handlers per ADR. The task prompts must explicitly override the technology scope.

## Dependency Matrix

| ID | Agent | Task | Depends on | Commit |
|---|---|---|---|---|
| P1 | frontend | Scaffold npm Next.js app in `app/` | none | `Frontend: scaffold Next.js app` |
| P2 | be | Shared contracts and validation schemas | P1 | `Backend: add contracts and validation` |
| P3 | frontend | Base design system and layout shell | P1, P2 | `Frontend: add branded app shell` |
| P4 | be | Policy loader and prompt source structure | P2 | `Backend: add policy loading` |
| P5 | be | Image validation/compression service | P2 | `Backend: add image processing` |
| P6 | be | OpenRouter provider, AI schemas, mocked AI services | P4, P5 | `Backend: add AI orchestration` |
| P7 | be | `/api/assess` route integration | P6 | `Backend: add assessment API` |
| P8 | frontend | Intake form connected to `/api/assess` | P3, P7 | `Frontend: add intake assessment flow` |
| P9 | be | `/api/chat` streaming route | P6, P7 | `Backend: add chat API` |
| P10 | frontend | AI SDK chat UI and decision card | P8, P9 | `Frontend: add decision chat experience` |
| P11 | qa | Playwright setup and critical E2E flows | P10 | `QA: add end-to-end coverage` |
| P12 | all | Final stabilization pass | P11 | `App: stabilize proof of concept` |

Sequential commits are required. Agents may prepare notes in parallel, but repo writes must not overlap.

## Phase 1 - Scaffold And Foundation

### P1 - `@frontend-nextjs-developer`: Scaffold app

Task context:
- Read `AGENTS.md`, `app/AGENTS.md`, `docs/ADR/000-main-architecture.md`.
- Use npm.
- App root is `app/`.
- Preserve existing `app/AGENTS.md` and `app/README.md`.

Instructions:
- Create a Next.js 16 App Router TypeScript app in `app/`.
- Use Tailwind, ESLint, TypeScript, `src/` directory, and `@/*` alias.
- Add scripts: `dev`, `test`, `lint`, `build`.
- Install core dependencies: `next`, `react`, `react-dom`, `ai`, `@ai-sdk/react`, `@openrouter/ai-sdk-provider`, `zod`, `sharp`.
- Install test dependencies for unit/component tests.
- Add a minimal smoke test that fails first because no app entry exists, then make it pass.
- Do not build product UI yet.

Verification:
- `npm test`
- `npm run lint`
- `npm run build`
- Start app with `npm run dev` and confirm it serves.

### P2 - `@be-developer`: Contracts and validation

Task context:
- Read `docs/PRD-Product-Requirements-Document.md` sections 6, 8, 11.
- Read `docs/ADR/000-main-architecture.md` sections 6-8.
- Read `docs/ADR/003-validation-image-handling-testing.md`.

Instructions:
- Add shared TypeScript contracts for request type, equipment categories, decision outcomes, intake submission, image analysis, decision result, and validation errors.
- Add Zod validation for client/server shared rules.
- Add Polish validation messages.
- Add `.env.example` entries for `OPENROUTER_TEXT_MODEL` and `OPENROUTER_VISION_MODEL`; keep `OPENROUTER_MODEL` as fallback documentation.
- Tests first for all PRD validation rules: missing required fields, future date, complaint reason, invalid category, one-image requirement metadata.

Verification:
- `npm test`
- `npm run lint`
- `npm run build`

## Phase 2 - Backend Services

### P4 - `@be-developer`: Policy loader and prompt structure

Task context:
- Read `docs/policies/polityka-zwrotow.md`.
- Read `docs/policies/polityka-reklamacji.md`.
- Read `docs/ADR/001-ai-orchestration.md`.

Instructions:
- Implement server-only policy loader.
- Ensure return requests load only return policy and complaint requests load only complaint policy.
- Add server-only prompt modules for:
  - return image analysis,
  - complaint image analysis,
  - return decision,
  - complaint decision,
  - chat continuation.
- Tests first: correct policy selected, missing policy fails closed, prompts include non-binding and no-invented-rules constraints.

Verification:
- `npm test`
- `npm run lint`
- `npm run build`

### P5 - `@be-developer`: Image handling

Task context:
- Read PRD AC-08 to AC-11.
- Read `docs/ADR/003-validation-image-handling-testing.md`.

Instructions:
- Implement server-side image validation and Sharp compression.
- Accept JPEG, PNG, WebP only.
- Reject files larger than 10 MB before compression.
- Keep raw and compressed images in memory only.
- Create tiny test fixtures for valid images and invalid/corrupt files.
- Tests first: valid formats pass, invalid type rejects, oversized rejects, corrupt image rejects before AI call, compression returns image metadata/payload.

Verification:
- `npm test`
- `npm run lint`
- `npm run build`

### P6 - `@be-developer`: AI orchestration

Task context:
- Read `docs/ADR/001-ai-orchestration.md`.
- Use Context7 docs for `/vercel/ai` and `/openrouterteam/ai-sdk-provider`.

Instructions:
- Implement OpenRouter provider factory server-only.
- Use `OPENROUTER_VISION_MODEL` for image analysis.
- Use `OPENROUTER_TEXT_MODEL` for decision and chat.
- Use `OPENROUTER_MODEL` only as local fallback, with production requiring split vars.
- Implement structured AI schemas for `ImageAnalysis` and `DecisionResult`.
- Mock AI SDK/OpenRouter in tests.
- Tests first: correct model selected per operation, invalid structured output fails closed, unusable/low-confidence image cannot become approve/reject unless non-visual deadline rule clearly applies.

Verification:
- `npm test`
- `npm run lint`
- `npm run build`

### P7 - `@be-developer`: Assessment API

Task context:
- Read PRD main flows 4.1-4.8 and AC-01 to AC-22, AC-29 to AC-31.
- Read `docs/ADR/000-main-architecture.md` API section.
- Read backend services from P2/P4/P5/P6.

Instructions:
- Implement `POST /api/assess`.
- Accept `multipart/form-data`.
- Validate server-side before compression or AI calls.
- Run image compression, image analysis, policy loading, decision generation.
- Return sanitized submission, image analysis, decision, and first assistant decision-card data.
- On AI/provider failure, return retryable error and no decision.
- Tests first with mocked AI: approve flow, reject flow, needs-more-info flow, validation failure, image failure, provider failure.

Verification:
- `npm test`
- `npm run lint`
- `npm run build`
- Start app and send one local test request without exposing secrets.

## Phase 3 - Frontend UX

### P3 - `@frontend-nextjs-developer`: Branded shell

Task context:
- Read `docs/design-guidelines.md`.
- Inspect `assets/design-tokens.json`, `assets/logo.svg`, `assets/Wireframe-Step-1.png`, `assets/Wireframe-Step-2.png`, `assets/Wireframe-Step-3.png`.
- Read `docs/ADR/002-frontend-session-ux.md`.

Instructions:
- Add global Tailwind/theme setup using the dark Spotify-inspired tokens.
- Build the one-route app shell with Polish header/title and responsive layout.
- Use brand green only for primary actions/active states.
- No shadcn.
- Tests first for app shell rendering and Polish visible text.

Verification:
- `npm test`
- `npm run lint`
- `npm run build`
- Start app and visually check desktop/mobile basics.

### P8 - `@frontend-nextjs-developer`: Intake assessment flow

Task context:
- Read PRD AC-01 to AC-11 and UI section 9.1-9.4.
- Read `docs/ADR/002-frontend-session-ux.md`.
- Read shared contracts from P2 and `/api/assess` contract from P7.

Instructions:
- Build form with exact fields/order from PRD.
- Polish labels, helper text, and inline errors.
- Request type selector: `Reklamacja`, `Zwrot`.
- Category options exactly from PRD.
- Reason required only for complaint.
- One-image picker with preview, remove, replace/block behavior.
- Submit disabled or blocked until valid.
- On submit: show processing state, call `/api/assess`, transition to chat state on success, error state on failure.
- Tests first: all validation states, file behavior, processing state, error state, successful transition with mocked API.

Verification:
- `npm test`
- `npm run lint`
- `npm run build`
- Start app and manually run form validation flow.

### P9 - `@be-developer`: Chat API

Task context:
- Read PRD AC-23 to AC-26.
- Read `docs/ADR/001-ai-orchestration.md` chat sections.
- Use Context7 `/vercel/ai` docs for route-handler streaming.

Instructions:
- Implement `POST /api/chat`.
- Accept active case context and AI SDK UI messages.
- Include submission snapshot, image analysis, initial decision, relevant policy, and message history in server prompt.
- Use AI SDK `streamText`, `convertToModelMessages`, `toUIMessageStream`, and `createUIMessageStreamResponse` conventions.
- Off-topic requests must be declined in Polish and redirected to the case.
- Tests first with mocked stream: normal question, off-topic refusal, revised recommendation, missing context error.

Verification:
- `npm test`
- `npm run lint`
- `npm run build`
- Start app and verify route responds with mocked/dev-safe test path if available.

### P10 - `@frontend-nextjs-developer`: Decision chat UI

Task context:
- Read PRD AC-20 to AC-28.
- Read `docs/ADR/002-frontend-session-ux.md`.
- Use Context7 `/vercel/ai` docs for `@ai-sdk/react`, `useChat`, `sendMessage`, `status`, and `messages[].parts`.
- Use AI SDK UI components/conventions. If current docs expose official AI Elements components, use them for conversation/message/input. Otherwise create local wrappers on top of `@ai-sdk/react` following AI SDK message-part conventions.

Instructions:
- Render first assistant message as a structured decision card.
- Card order: greeting, decision, justification, next steps, disclaimer.
- Outcome visually distinguishable.
- Chat composer fixed at bottom on chat screen.
- Render streaming messages from `messages[].parts`.
- Disable or queue sends while streaming; choose disable for MVP.
- Implement retry for failed chat turn.
- Implement "new request" clearing all active case state.
- Tests first: decision card order, outcome styling, chat send, streaming status, retry, new request reset.

Verification:
- `npm test`
- `npm run lint`
- `npm run build`
- Start app and manually run a mocked or real chat path depending on env availability.

## Phase 4 - E2E And Stabilization

### P11 - `@e2e-qa-engineer`: Real-stack Playwright coverage

Task context:
- Read PRD main flows and AC-01 to AC-31.
- Read `docs/ADR/003-validation-image-handling-testing.md`.
- Read app UX from P8/P10.
- Use Playwright best practices skill/docs.

Instructions:
- Add Playwright with npm scripts.
- E2E must use real app and real OpenRouter API.
- Do not mock network/LLM in E2E.
- Do not inspect `.env`; rely on runtime env loaded by app.
- Add fixtures for valid image uploads.
- Assertions must be deterministic and UI-level:
  - decision/chat bubble is displayed,
  - response text length is at least 50 characters,
  - response contains at least one Polish keyword from a maintained list such as `decyzja`, `ocena`, `wstępna`, `niewiążąca`, `serwis`, `reklamacja`, `zwrot`, `zaakcept`, `odrzu`, `informacji`,
  - disclaimer area exists,
  - no fabricated decision appears after forced service-error path if that path can be triggered without mocking.
- Cover:
  - valid return submission to chat,
  - valid complaint submission to chat,
  - complaint reason validation,
  - invalid image format,
  - future purchase date,
  - chat follow-up response,
  - new request clears prior state.
- If real API is unavailable, report blocker; do not convert E2E to mocks.

Verification:
- `npm test`
- `npm run lint`
- `npm run build`
- Start app
- `npm run test:e2e`

### P12 - Final stabilization

Agents:
- `@be-developer` for backend failures.
- `@frontend-nextjs-developer` for UI/test/build failures.
- `@e2e-qa-engineer` for E2E flake or coverage gaps.

Instructions:
- Run full verification from `app/`.
- Fix only issues found by verification.
- No scope expansion.
- Confirm all user-facing text is Polish.
- Confirm no client code exposes OpenRouter secrets or raw policies unnecessarily.
- Confirm app starts and supports the full PoC happy path.

Final verification:
- `npm test`
- `npm run lint`
- `npm run build`
- `npm run test:e2e`
- Start app and manually smoke test: form -> processing -> decision card -> chat -> new request.

Final commit:
- `App: stabilize proof of concept`

## Exact Delegation Template

Use this template for every subagent handoff:

```text
You are @<agent-name>. Implement only task <ID>. Do not work on later tasks.

Read only:
- <task-specific docs/files>

Goal:
- <one-paragraph goal>

TDD instructions:
1. Write/extend tests first for the listed behavior.
2. Run the test and confirm it fails for the expected reason.
3. Implement the minimum production code.
4. Run scoped tests, then full required verification.
5. Commit only after verification passes.

Constraints:
- All user-facing text must be Polish.
- Do not read .env.
- Do not push.
- Do not modify unrelated files.
- Preserve previous agents' work.
- If blocked by missing dependency from another task, stop and report.

Required verification:
- npm test
- npm run lint
- npm run build
- Start app if runtime behavior changed
- Additional task-specific command if listed

Commit:
- <exact commit message>
```

## Assumptions Locked

- App lives in `app/`, not repository root.
- Package manager is npm.
- Work is sequential with verified commits after each task.
- UI uses AI SDK React/UI conventions, not shadcn.
- Backend is TypeScript Next.js Route Handlers, even when assigned to `@be-developer`.
- Split model env vars are required: `OPENROUTER_TEXT_MODEL` and `OPENROUTER_VISION_MODEL`.
- Unit and integration tests mock only external LLM/provider calls.
- E2E tests always use the real OpenRouter-backed stack and assert deterministic UI signals, not exact model correctness.

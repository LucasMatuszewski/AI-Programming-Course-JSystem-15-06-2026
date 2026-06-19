# Proof of Concept Implementation Orchestration Plan

## Source Documents

This plan is based on:

- `docs/PRD.md`
- `docs/ADR/000-main-architecture.md`
- `docs/ADR/001-backend-api.md`
- `docs/ADR/002-frontend-chat-ui.md`
- `docs/ADR/003-ai-decision-pipeline.md`
- `docs/ADR/004-persistence-storage-testing.md`
- `docs/design-guidelines.md`

No implementation should start without checking the relevant PRD, ADR, and design sections for the affected area.

## Current State

`app/` contains only `app/README.md`, so this is a greenfield PoC implementation.

The repository may contain unrelated local changes. Agents must not revert, overwrite, or clean up changes outside their assigned scope.

## Global Execution Rules

- Use TDD for every feature and bug fix.
- Write or extend tests before production code.
- Confirm new tests fail for the expected reason.
- Implement the minimum code needed to pass.
- Run scoped verification before every commit.
- Commit after every completed task.
- Commit format: `Backend: short summary`, `Frontend: short summary`, `E2E: short summary`, or `Docs: short summary`.
- Do not push.
- Automated tests must use fake AI, never real OpenAI.
- The frontend must never receive or store OpenAI credentials.
- All customer-facing UI, validation, decision, retry, and chat text must be Polish.
- No controller may expose JPA entities directly.
- All persistence schema changes must use Flyway.
- If library-specific code is needed, agents must consult current documentation for the relevant library before implementation.

## Required Agents

Always delegate implementation to these specialized agents:

- `@be-developer`
- `@frontend-nextjs-developer`
- `@e2e-qa-engineer`

The orchestrator coordinates, reviews, and integrates only. The orchestrator does not implement production code.

## Agent Ownership

| Agent | Owns | Must avoid |
|---|---|---|
| `@be-developer` | `app/backend/**`, backend Docker/Flyway config, backend runtime docs | `app/frontend/**`, Playwright specs |
| `@frontend-nextjs-developer` | `app/frontend/**`, frontend API client, UI, component tests | backend implementation |
| `@e2e-qa-engineer` | `app/frontend/e2e/**`, Playwright config/fixtures, E2E docs | backend/frontend production logic unless testability blocker is agreed |

Shared root files should be edited only by the orchestrator unless explicitly assigned.

## Product Scope For PoC

The PoC must implement:

- Polish form for complaint and return.
- Exactly two request types: `Reklamacja`, `Zwrot`.
- Equipment category selector with the PRD-defined electronics categories.
- Required equipment name/model and purchase date.
- Required reason for complaint, optional reason for return.
- Exactly one image per attempt.
- Up to three image attempts when the image is unclear.
- Initial image analysis through backend-owned AI facade.
- Deterministic backend decision rules.
- Decision statuses: `approved`, `rejected`, `human_verification_required`.
- Terminal state for in-person verification after three failed image attempts.
- Chat after initial decision.
- Follow-up handling, disagreement handling, off-topic refusal.
- Persisted session, image metadata, image analysis, decisions, chat messages.
- Local PostgreSQL through Docker Compose.
- Local filesystem upload storage.
- Frontend in Next.js with assistant-ui custom backend integration.
- GitHub-like visual design from `docs/design-guidelines.md`.

Out of scope:

- Authentication.
- Employee back office.
- Payment/refund execution.
- Shipping labels or logistics.
- ERP/CRM/service integration.
- Internal RAG knowledge base.
- Native mobile app.
- Multilingual UI.

## Phase Overview

| Phase | Tasks | Parallel? | Gate |
|---|---|---:|---|
| 0 | Backend and frontend scaffolding | Yes | backend and frontend skeletons build |
| 1 | Backend API, validation, persistence | Partly | backend tests green |
| 2 | Backend AI facade, fake AI, decision pipeline | No | deterministic rules tested |
| 3 | Frontend form and API client | Starts after backend API contract | component tests green |
| 4 | Chat UI and session resume | After chat contract | frontend tests/build green |
| 5 | E2E flows | After app runnable | Playwright green |
| 6 | Final smoke and stabilization | No | full verification and final commit |

## Dependency Matrix

| Task | Depends on | Blocks |
|---|---|---|
| B0 backend scaffold | none | B1, B2, backend tests |
| F0 frontend scaffold | none | F1, F2, Q1 |
| B1 API contract and errors | B0 | F1 API client, E2E fixtures |
| B2 persistence and storage | B0 | B4 session creation pipeline |
| B3 decision rules | B1 | B4 AI orchestration, B5 chat |
| B4 fake AI and image pipeline | B2, B3 | complete form submission |
| B5 chat follow-up pipeline | B3, B4 | F2 chat, Q2 E2E chat flows |
| F1 Polish case form | F0, B1 contract | Q2 form flows |
| F2 retry, chat, session resume | F1, B5 contract | Q2 chat flows |
| Q1 Playwright harness | F0 | Q2 E2E scenarios |
| Q2 complete E2E flows | B5, F2 | final verification |

## Parallelization Plan

1. Run B0 and F0 in parallel because backend and frontend write scopes are separate.
2. After B1, F1 may start from the API contract while backend continues B2.
3. B3 and F1 may run in parallel.
4. B4 must wait for B2 and B3.
5. Q1 may start after F0 because it can create the Playwright harness and pending specs.
6. F2 may start mock rendering after F1, but backend-integrated chat must wait for B5 contract stability.
7. Q2 waits for B5 and F2.
8. Final stabilization is sequential.

## Conflict Prevention

- Backend agent must not edit frontend files.
- Frontend agent must not edit backend files.
- QA agent owns only Playwright config, E2E specs, and E2E fixtures.
- API contract changes after B1 require an orchestration note before frontend continues.
- Shared root configuration changes must be approved by the orchestrator.
- Agents must not revert unrelated dirty worktree files.
- Each agent must list changed files in its final handoff.

## Task B0 - Backend Scaffold

Agent: `@be-developer`

Write scope:

- `app/backend/**`
- root `docker-compose.yml` only if needed for PostgreSQL local runtime

Required context:

- Java 21.
- Spring Boot 3.x.
- Maven.
- Spring MVC, not WebFlux.
- PostgreSQL.
- Spring Data JPA/Hibernate.
- Flyway.
- Package root: `com.jsystems.bestservice`.
- Backend app lives in `app/backend/`.
- Local backend target port: `localhost:8080`.
- PostgreSQL local runtime through Docker Compose.

Instructions:

1. Create the Spring Boot Maven application.
2. Add dependencies for web, validation, data-jpa, flyway, postgresql, tests, Testcontainers, Mockito, AssertJ.
3. Add basic application configuration for database, upload root, CORS, OpenAI model names, and multipart limits.
4. Add a basic startup or context test first.
5. Confirm the test fails before the app exists or before configuration is complete.
6. Implement the minimum scaffold to pass.
7. Add local Docker Compose PostgreSQL only if not already available.

Verification:

- Run `mvn test` in `app/backend`.
- Run `mvn verify` in `app/backend`.
- Confirm the backend can start when PostgreSQL is available.

Commit:

- `Backend: scaffold Spring Boot application`

## Task B1 - Backend API Contract And Errors

Agent: `@be-developer`

Write scope:

- `app/backend/**`

Required context:

- Implement ADR-001 API contracts.
- Use DTOs for all requests and responses.
- Do not expose JPA entities.
- Use one API error shape:
  - `code`
  - `messagePl`
  - `fieldErrors`
  - `traceId`
- Polish validation messages only.
- Endpoints:
  - `POST /api/sessions`
  - `POST /api/sessions/{sessionId}/image-attempts`
  - `GET /api/sessions/{sessionId}`
  - `POST /api/sessions/{sessionId}/chat/messages`

Tests first:

- Complaint without reason returns `VALIDATION_FAILED`.
- Return without reason passes validation.
- Unsupported image type returns `UNSUPPORTED_IMAGE_TYPE`.
- Too-large image returns `IMAGE_TOO_LARGE`.
- Unknown session returns `SESSION_NOT_FOUND`.
- Retry image for invalid state returns `SESSION_STATE_CONFLICT`.

Implementation:

- Add request DTOs.
- Add response DTOs.
- Add global exception handler.
- Add controller methods.
- Add stub services only where needed to keep the contract testable.

Verification:

- Run `mvn test` in `app/backend`.

Commit:

- `Backend: add API contracts and Polish errors`

## Task B2 - Persistence And Storage

Agent: `@be-developer`

Write scope:

- `app/backend/**`
- `.gitignore` only for upload folders if needed

Required context:

- Use PostgreSQL for structured state.
- Flyway migrations are the schema source of truth.
- Hibernate may validate schema but must not generate it as the source of truth.
- Uploads are stored under configured `UPLOAD_ROOT`.
- Store files under date/session-based folders.
- Never trust original filenames for paths.
- Store relative path and metadata in DB.
- Allowed image formats: JPG, PNG, WebP.

Data model:

- `ServiceSession`
- `UploadedImage`
- `ImageAnalysis`
- `DecisionRecord`
- `ChatMessage`

Tests first:

- Flyway migrates a clean PostgreSQL Testcontainer.
- Full session graph persists and loads correctly.
- Decision versions order correctly per session.
- Chat messages order by sequence number.
- Dangerous filenames cannot affect storage path.
- File cleanup is attempted when DB persistence fails after file write.

Verification:

- Run `mvn test` in `app/backend`.
- Run `mvn verify` in `app/backend`.

Commit:

- `Backend: add persistence and local image storage`

## Task B3 - Deterministic Decision Rules

Agent: `@be-developer`

Write scope:

- `app/backend/src/main/java/**/decision/**`
- matching backend tests

Required context:

- Final decision status and rejection type must be backend-rule validated.
- AI observations are inputs, not final authority.
- Primary decision statuses:
  - `approved`
  - `rejected`
  - `human_verification_required`
- Rejection types:
  - `insufficient_evidence`
  - `mechanical_damage_detected`
  - `usage_or_wear`
  - `visible_damage`
  - `signs_of_use`
  - `not_resellable`
  - `other_policy_reason`
- Polish justification and next steps are required.
- Rule category must identify the exact PRD rule category used.

Tests first:

- Complaint approved with reason and image-supported defect.
- Complaint rejected as `insufficient_evidence`.
- Complaint rejected as `mechanical_damage_detected`.
- Complaint rejected as `usage_or_wear`.
- Complaint routed to human verification when image and form contradict.
- Return approved when unused, undamaged, and resellable.
- Return rejected as `visible_damage`.
- Return rejected as `signs_of_use`.
- Return rejected as `not_resellable`.
- Unclear return evidence does not approve.
- Third failed image attempt routes to in-person verification.

Verification:

- Run `mvn test` in `app/backend`.

Commit:

- `Backend: implement deterministic decision rules`

## Task B4 - AI Facade, Fake AI, And Image Pipeline

Agent: `@be-developer`

Write scope:

- `app/backend/src/main/java/**/ai/**`
- `app/backend/src/main/java/**/imageanalysis/**`
- backend prompt resources
- matching backend tests

Required context:

- Backend owns all OpenAI access.
- Frontend must never call OpenAI.
- Use structured outputs for AI results that affect state.
- Store model name and prompt version for image analysis and decisions.
- Do not request or store chain-of-thought.
- Automated tests must use a fake AI facade.

Image analysis result fields:

- `isEvaluable`
- `notEvaluableReasonPl`
- `visibleDamage`
- `visibleDefectIndicators`
- `visibleUsageSigns`
- `possibleCauseIndicators`
- `missingOrAlteredVisibleParts`
- `resaleCondition`
- `contradictionWithForm`
- `confidence`

Tests first:

- Fake AI returns evaluable image result.
- Malformed AI output maps to `AI_PROVIDER_UNAVAILABLE`.
- Unclear image increments attempt count.
- Unclear image with attempts remaining returns retry state.
- Third unclear image marks `IN_PERSON_VERIFICATION_REQUIRED`.
- Successful form submission persists image analysis, decision, and first system chat message.

Verification:

- Run `mvn test` in `app/backend`.
- Run `mvn verify` in `app/backend`.

Commit:

- `Backend: add AI facade and image decision pipeline`

## Task B5 - Chat Follow-Up Pipeline

Agent: `@be-developer`

Write scope:

- `app/backend/src/main/java/**/chat/**`
- decision integration where needed
- matching backend tests

Required context:

- Chat preserves form data, image analysis, latest decision, and full history.
- Customer follow-up may change decision only when relevant new facts justify it.
- If explicit disagreement cannot be resolved automatically, route to human verification.
- Off-topic or abusive content gets a concise Polish refusal and stays focused on the case.
- Persist customer message and system message in one transactional operation.

Tests first:

- Customer and system messages persist with sequence numbers.
- Relevant new facts can create decision version 2.
- Decision update records previous and updated decision context.
- Unresolved disagreement marks human verification required.
- Off-topic message creates Polish refusal and does not change decision.
- Unknown session returns `SESSION_NOT_FOUND`.
- Invalid terminal state returns `SESSION_STATE_CONFLICT` where applicable.

Verification:

- Run `mvn test` in `app/backend`.
- Run `mvn verify` in `app/backend`.

Commit:

- `Backend: add chat follow-up handling`

## Task F0 - Frontend Scaffold

Agent: `@frontend-nextjs-developer`

Write scope:

- `app/frontend/**`

Required context:

- Next.js.
- React.
- TypeScript.
- Tailwind CSS.
- Use GitHub-like design from `docs/design-guidelines.md`.
- Use tokens from `assets/design-tokens.json`.
- Main app runs on `localhost:3000`.
- The app starts as the real work interface, not a marketing landing page.
- Polish visible text only.

Design constraints:

- Dark GitHub-like header.
- White work surface.
- Dense, readable operational UI.
- Default radius: `6px`.
- Primary action green `#1f883d`.
- Links blue `#0969da`.
- Errors/rejections red `#d1242f`.
- Warnings yellow `#d29922`.

Tests first:

- Initial page renders the app shell.
- Design token import or mapping does not crash.

Implementation:

- Create frontend app.
- Configure Tailwind.
- Add test tooling.
- Add base layout and header.

Verification:

- Run `npm test` in `app/frontend`.
- Run `npm run lint` in `app/frontend`.
- Run `npm run build` in `app/frontend`.

Commit:

- `Frontend: scaffold Next.js application`

## Task F1 - Polish Case Form

Agent: `@frontend-nextjs-developer`

Write scope:

- `app/frontend/**/case-form/**`
- `app/frontend/lib/api/**`
- related component tests

Required context:

- Implement PRD AC-01 through AC-08.
- Form request types:
  - `Reklamacja`
  - `Zwrot`
- Equipment categories:
  - laptop
  - desktop PC
  - smartphone
  - tablet
  - monitor
  - TV
  - printer
  - headphones
  - smartwatch
  - gaming console
  - computer accessory
  - other electronics
- Equipment name/model is required.
- Purchase date is required.
- Reason is required for complaint and optional for return.
- Exactly one image is required.
- Client validation mirrors backend but does not replace backend validation.

Tests first:

- Complaint reason required.
- Return reason optional.
- Missing required fields show Polish validation.
- Multiple files are rejected or only one is accepted according to UI behavior.
- Submit sends multipart data matching ADR-001.
- Submit button is disabled during submission.

Implementation:

- Build form fields.
- Build file upload control.
- Build typed API client for `POST /api/sessions`.
- Display backend field errors next to fields.

Verification:

- Run `npm test` in `app/frontend`.
- Run `npm run lint` in `app/frontend`.
- Run `npm run build` in `app/frontend`.

Commit:

- `Frontend: add Polish case intake form`

## Task F2 - Retry, Chat, And Session Resume

Agent: `@frontend-nextjs-developer`

Write scope:

- `app/frontend/components/image-retry/**`
- `app/frontend/components/assistant-chat/**`
- `app/frontend/components/decision-summary/**`
- `app/frontend/lib/session/**`
- related tests

Required context:

- Use assistant-ui with a custom backend adapter.
- Backend remains source of truth for messages.
- Load persisted messages from `GET /api/sessions/{sessionId}`.
- Send customer follow-up to `POST /api/sessions/{sessionId}/chat/messages`.
- Store only the active anonymous `sessionId` in browser storage.
- No thread list for MVP.
- Do not display hidden model reasoning.

Tests first:

- Retry state displays Polish reason and remaining attempts.
- Third failed image attempt displays in-person verification terminal state.
- Chat renders first system decision message.
- Backend customer/system messages map to user/assistant chat messages.
- Composer is disabled while assistant response is pending.
- Reload restores active session id.
- Decision update renders previous and updated decision summary.

Verification:

- Run `npm test` in `app/frontend`.
- Run `npm run lint` in `app/frontend`.
- Run `npm run build` in `app/frontend`.

Commit:

- `Frontend: add retry and assistant chat flow`

## Task Q1 - Playwright Harness

Agent: `@e2e-qa-engineer`

Write scope:

- `app/frontend/e2e/**`
- Playwright config
- E2E fixtures

Required context:

- E2E must run against local frontend and backend.
- Tests must use fake AI.
- Tests must not require real OpenAI API keys.
- Browser flows should validate PRD behavior, not implementation internals.

Tests or spec skeletons:

- Complaint approved flow.
- Return rejected due signs of use.
- Image retry max attempts.
- Follow-up disagreement to human verification.
- Off-topic chat refusal.

Implementation:

- Configure Playwright.
- Add image fixtures if needed.
- Add commands/scripts in frontend package if needed.
- Add clear local run instructions.

Verification:

- Run the defined Playwright command when app is available.
- If app is not available yet, keep specs prepared and document the blocked runtime dependency.

Commit:

- `E2E: add Playwright harness and flow specs`

## Task Q2 - Complete E2E Flow Coverage

Agent: `@e2e-qa-engineer`

Write scope:

- `app/frontend/e2e/**`
- E2E fixtures only

Required context:

- Use real frontend.
- Use real backend.
- Use PostgreSQL.
- Use fake AI adapter.
- Do not edit production backend/frontend logic unless the orchestrator confirms a testability blocker.

Tests:

- Valid complaint opens chat with Polish decision.
- Valid return opens chat with Polish decision.
- Three unclear images end in in-person verification.
- Customer follow-up can trigger decision update when relevant.
- Unresolved disagreement routes to human verification.
- Off-topic chat gets Polish refusal.

Verification:

- Start PostgreSQL.
- Start backend.
- Start frontend.
- Run full Playwright suite.

Commit:

- `E2E: cover core complaint and return flows`

## Final Orchestrator Gate

After all task commits:

1. Run `mvn test` in `app/backend`.
2. Run `mvn verify` in `app/backend`.
3. Run `npm test` in `app/frontend`.
4. Run `npm run lint` in `app/frontend`.
5. Run `npm run build` in `app/frontend`.
6. Start PostgreSQL.
7. Start backend on `localhost:8080`.
8. Start frontend on `localhost:3000`.
9. Run Playwright E2E.
10. Manually smoke-test one mocked complaint and one mocked return.
11. Commit only final integration fixes, if any, with `PoC: stabilize full local flow`.

## Completion Criteria

The PoC is complete only when:

- Implementation matches PRD, ADRs, and design guidelines.
- Tests were written before implementation for each task.
- Backend unit/integration verification passes.
- Frontend tests, lint, and build pass.
- E2E flows pass.
- Local app starts correctly.
- All customer-facing text is Polish.
- OpenAI secrets remain backend-only.
- The repo contains focused commits for every step.

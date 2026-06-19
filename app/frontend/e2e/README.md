# E2E Playwright Harness

Playwright tests live in this directory and run from `app/frontend`.

```bash
cd app/frontend
npm run test:e2e
```

Local runtime target:

- By default Q1 does not start a web server because all flow specs are skipped until the runtime is ready.
- Set `E2E_START_SERVER=1` to let Playwright start the frontend with `npm run dev -- --hostname 127.0.0.1 --port 3000`.
- Set `PORT=3001` to use a different local frontend port.
- Set `E2E_BASE_URL=http://127.0.0.1:3000` to test an already running frontend and skip Playwright's web server startup.
- Full flow execution requires the backend on `http://127.0.0.1:8080` with the fake AI/runtime path enabled.

The Q1 flow specs are intentionally skipped until the complete form, retry, chat, backend session API, and fake AI pipeline are available. The specs document the user-visible PRD behavior expected in Q2 and should be unskipped as each runtime dependency lands.

Fixture images are small placeholder PNG files under `fixtures/images`. Replace them with scenario-specific test images when the fake AI image pipeline is wired to deterministic fixture behavior.

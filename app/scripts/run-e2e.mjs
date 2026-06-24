import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const npx = isWindows ? "npx.cmd" : "npx";

const server = spawn(
  npx,
  ["next", "dev", "--hostname", "127.0.0.1", "--port", "3000"],
  {
    cwd: process.cwd(),
    stdio: "ignore",
    shell: isWindows,
    windowsHide: true,
  },
);

try {
  await waitForServer("http://127.0.0.1:3000");
  const code = await runPlaywright();
  process.exitCode = code;
} finally {
  server.kill("SIGTERM");
}

async function waitForServer(url) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until the dev server is ready.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Dev server did not become ready for E2E tests.");
}

function runPlaywright() {
  return new Promise((resolve) => {
    const child = spawn(
      npx,
      ["playwright", "test", "--workers=1", "--reporter=list"],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          PLAYWRIGHT_SKIP_WEBSERVER: "1",
        },
        stdio: "inherit",
        shell: isWindows,
        windowsHide: true,
      },
    );

    child.on("exit", (code) => resolve(code ?? 1));
  });
}

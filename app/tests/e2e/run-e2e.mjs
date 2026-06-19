import { spawn } from "node:child_process";
import process from "node:process";

const port = process.env.PORT ?? "3000";
const baseUrl = `http://127.0.0.1:${port}`;
const serverEnv = {
  ...process.env,
  OPENROUTER_TEXT_MODEL:
    process.env.OPENROUTER_TEXT_MODEL ?? process.env.OPENROUTER_MODEL ?? "openai/gpt-5.4-mini",
  OPENROUTER_VISION_MODEL:
    process.env.OPENROUTER_VISION_MODEL ?? process.env.OPENROUTER_MODEL ?? "openai/gpt-5.4",
  PORT: port
};

const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", port],
  {
    cwd: process.cwd(),
    env: serverEnv,
    stdio: ["ignore", "pipe", "pipe"]
  }
);

server.stdout.on("data", (chunk) => process.stdout.write(chunk));
server.stderr.on("data", (chunk) => process.stderr.write(chunk));

try {
  await waitForServer(baseUrl);

  const result = await runCommand(process.execPath, [
    "node_modules/@playwright/test/cli.js",
    "test",
    ...process.argv.slice(2)
  ]);

  process.exitCode = result;
} finally {
  stopServer(server);
  process.exit(process.exitCode ?? 0);
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
      // Server is not ready yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Dev server did not become ready at ${url}`);
}

function runCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit"
    });

    child.on("exit", (code) => resolve(code ?? 1));
  });
}

function stopServer(child) {
  try {
    child.kill("SIGTERM");
  } catch {
    // Process already exited.
  }
}

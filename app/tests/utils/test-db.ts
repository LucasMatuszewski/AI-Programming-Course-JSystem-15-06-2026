import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { createPrismaClient } from "@/lib/db/client";

const execFileAsync = promisify(execFile);

export function createTestPrismaClient(databaseUrl: string) {
  process.env.DATABASE_URL = databaseUrl;
  return createPrismaClient(databaseUrl);
}

export async function resetTestDatabase(databaseUrl: string) {
  const command = process.platform === "win32" ? "cmd.exe" : "npm";
  const args =
    process.platform === "win32"
      ? ["/c", "npm.cmd", "exec", "prisma", "--", "db", "push", "--force-reset"]
      : ["exec", "prisma", "--", "db", "push", "--force-reset"];

  await execFileAsync(
    command,
    args,
    {
      cwd: path.resolve(__dirname, "../.."),
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        NODE_TLS_REJECT_UNAUTHORIZED: "0",
      },
    },
  );
}

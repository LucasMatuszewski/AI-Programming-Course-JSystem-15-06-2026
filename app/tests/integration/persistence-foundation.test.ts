import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { compare } from "bcryptjs";

import { createTestPrismaClient, resetTestDatabase } from "../utils/test-db";
import { seedStaffUser } from "@/lib/db/seed";

describe("persistence foundation", () => {
  let databaseDir: string | undefined;

  afterEach(async () => {
    if (databaseDir) {
      await rm(databaseDir, { recursive: true, force: true });
      databaseDir = undefined;
    }
  });

  it("creates an isolated SQLite database and seeds a hashed staff user", async () => {
    const testDatabaseRoot = path.join(process.cwd(), ".tmp");
    await mkdir(testDatabaseRoot, { recursive: true });
    databaseDir = await mkdtemp(path.join(testDatabaseRoot, "claims-db-"));
    const databasePath = path.join(databaseDir, "test.db");
    await writeFile(databasePath, "");
    const relativeDatabasePath = path.relative(process.cwd(), databasePath).replace(/\\/g, "/");
    const databaseUrl = `file:./${relativeDatabasePath}`;

    await resetTestDatabase(databaseUrl);
    const prisma = createTestPrismaClient(databaseUrl);

    try {
      await seedStaffUser(prisma, {
        email: "serwis@example.com",
        password: "bezpieczne-haslo-testowe",
        role: "technician",
      });

      const users = await prisma.user.findMany();

      expect(users).toHaveLength(1);
      expect(users[0]).toMatchObject({
        email: "serwis@example.com",
        role: "technician",
      });
      expect(users[0].passwordHash).not.toBe("bezpieczne-haslo-testowe");
      await expect(compare("bezpieczne-haslo-testowe", users[0].passwordHash)).resolves.toBe(true);
    } finally {
      await prisma.$disconnect();
    }
  }, 30_000);
});

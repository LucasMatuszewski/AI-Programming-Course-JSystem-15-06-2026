import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTestPrismaClient, resetTestDatabase } from "../utils/test-db";
import { seedStaffUser } from "@/lib/db/seed";

describe("service API", () => {
  let databaseDir: string | undefined;
  let databaseUrl: string;

  beforeEach(async () => {
    vi.resetModules();
    const tmpRoot = path.join(process.cwd(), ".tmp");
    await mkdir(tmpRoot, { recursive: true });
    databaseDir = await mkdtemp(path.join(tmpRoot, "service-api-db-"));
    const databasePath = path.join(databaseDir, "test.db");
    await writeFile(databasePath, "");
    const relativeDatabasePath = path
      .relative(process.cwd(), databasePath)
      .replace(/\\/g, "/");
    databaseUrl = `file:./${relativeDatabasePath}`;
    process.env.DATABASE_URL = databaseUrl;
    process.env.AUTH_SECRET = "test-secret";
    delete (globalThis as { prisma?: unknown }).prisma;
    await resetTestDatabase(databaseUrl);

    const prisma = createTestPrismaClient(databaseUrl);
    try {
      await seedStaffUser(prisma, {
        email: "serwis@example.com",
        password: "tajne-haslo",
        role: "technician",
      });
      await prisma.claim.create({
        data: {
          equipmentType: "bicycle",
          brand: "Trek",
          model: "Marlin 7",
          problemDescription: "Rama pękła.",
          damageCircumstances: "Podczas normalnej jazdy.",
          status: "preliminarily_accepted",
          damageType: "mechanical",
          assessments: {
            create: {
              decision: "accepted",
              damageType: "mechanical",
              confidence: "medium",
              reasoningSummary: "Opis wskazuje na normalną jazdę.",
              photoEvidenceSummary: "Zdjęcie pokazuje ramę.",
              descriptionEvidenceSummary: "Opis wskazuje normalne użycie.",
              serviceReviewRecommended: true,
            },
          },
        },
      });
    } finally {
      await prisma.$disconnect();
    }
  });

  afterEach(async () => {
    const globalPrisma = (globalThis as { prisma?: { $disconnect: () => Promise<void> } }).prisma;
    if (globalPrisma) {
      await globalPrisma.$disconnect();
      delete (globalThis as { prisma?: unknown }).prisma;
    }
    if (databaseDir) {
      await rm(databaseDir, { recursive: true, force: true });
      databaseDir = undefined;
    }
    vi.resetModules();
  });

  it("logs in staff user and returns a session cookie", async () => {
    const { POST } = await import("@/app/api/auth/login/route");

    const response = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "serwis@example.com",
          password: "tajne-haslo",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("staff_session=");
  }, 30_000);

  it("rejects unauthenticated service claim list", async () => {
    const { GET } = await import("@/app/api/service/claims/route");

    const response = await GET(new Request("http://localhost/api/service/claims"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe("UNAUTHORIZED");
  });

  it("returns claims for authenticated staff", async () => {
    const { createStaffSessionCookie } = await import("@/lib/auth/session");
    const cookie = createStaffSessionCookie({
      userId: "test-user",
      email: "serwis@example.com",
      role: "technician",
    });
    const { GET } = await import("@/app/api/service/claims/route");

    const response = await GET(
      new Request("http://localhost/api/service/claims", {
        headers: { cookie },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].latestAssessment.decision).toBe("accepted");
  }, 30_000);
});

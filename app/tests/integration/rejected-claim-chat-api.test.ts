import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AiAdapter } from "@/lib/ai/types";
import { setAiAdapterForTests } from "@/lib/ai/adapter-registry";
import { createClaimRepository } from "@/lib/claims/repository";
import { createTestPrismaClient, resetTestDatabase } from "../utils/test-db";

describe("rejected claim chat API", () => {
  let databaseDir: string | undefined;
  let databaseUrl: string;

  beforeEach(async () => {
    vi.resetModules();
    const tmpRoot = path.join(process.cwd(), ".tmp");
    await mkdir(tmpRoot, { recursive: true });
    databaseDir = await mkdtemp(path.join(tmpRoot, "claim-chat-db-"));
    const databasePath = path.join(databaseDir, "test.db");
    await writeFile(databasePath, "");
    const relativeDatabasePath = path
      .relative(process.cwd(), databasePath)
      .replace(/\\/g, "/");
    databaseUrl = `file:./${relativeDatabasePath}`;
    process.env.DATABASE_URL = databaseUrl;
    process.env.AI_ADAPTER = "test";
    delete (globalThis as { prisma?: unknown }).prisma;
    await resetTestDatabase(databaseUrl);
  });

  afterEach(async () => {
    setAiAdapterForTests(undefined);
    const globalPrisma = (globalThis as { prisma?: { $disconnect: () => Promise<void> } }).prisma;
    if (globalPrisma) {
      await globalPrisma.$disconnect();
      delete (globalThis as { prisma?: unknown }).prisma;
    }
    if (databaseDir) {
      await rm(databaseDir, { recursive: true, force: true });
      databaseDir = undefined;
    }
    delete process.env.AI_ADAPTER;
    vi.resetModules();
  });

  it("streams a guarded Polish explanation and persists both chat messages", async () => {
    const claimId = await createClaim("preliminarily_rejected", "rejected");
    const adapter: AiAdapter = {
      assessClaim: vi.fn(),
      streamRejectedClaimChat: vi.fn(async function* (input) {
        expect(input.policyText).toContain("Polityka reklamacji");
        expect(input.claim.id).toBe(claimId);
        yield "Obiecuję zwrot pieniędzy i wymianę roweru. ";
        yield "Dalszą weryfikację przejmie serwis.";
      }),
    };
    setAiAdapterForTests(adapter);

    const { POST } = await import("@/app/api/claims/[claimId]/chat/route");
    const response = await POST(
      new Request(`http://localhost/api/claims/${claimId}/chat`, {
        method: "POST",
        body: JSON.stringify({ message: "Dlaczego odmówiono reklamacji?" }),
      }),
      { params: Promise.resolve({ claimId }) },
    );
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(text).not.toMatch(/zwrot pieniędzy|wymianę roweru/i);
    expect(text).toMatch(/sprzedawc|serwis/i);

    const prisma = createTestPrismaClient(databaseUrl);
    try {
      const messages = await prisma.chatMessage.findMany({
        where: { claimId },
        orderBy: { createdAt: "asc" },
      });
      expect(messages).toHaveLength(2);
      expect(messages[0]).toMatchObject({
        role: "user",
        content: "Dlaczego odmówiono reklamacji?",
      });
      expect(messages[1].role).toBe("assistant");
      expect(messages[1].content).toBe(text);
    } finally {
      await prisma.$disconnect();
    }
  }, 30_000);

  it("rejects chat when the latest assessment is not rejected", async () => {
    const claimId = await createClaim("preliminarily_accepted", "accepted");
    const adapter: AiAdapter = {
      assessClaim: vi.fn(),
      streamRejectedClaimChat: vi.fn(async function* () {
        yield "Nie powinno zostać wywołane.";
      }),
    };
    setAiAdapterForTests(adapter);

    const { POST } = await import("@/app/api/claims/[claimId]/chat/route");
    const response = await POST(
      new Request(`http://localhost/api/claims/${claimId}/chat`, {
        method: "POST",
        body: JSON.stringify({ message: "Wyjaśnij decyzję." }),
      }),
      { params: Promise.resolve({ claimId }) },
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.code).toBe("CHAT_NOT_ALLOWED");
    expect(adapter.streamRejectedClaimChat).not.toHaveBeenCalled();
  }, 30_000);

  async function createClaim(
    status: "preliminarily_rejected" | "preliminarily_accepted",
    decision: "rejected" | "accepted",
  ) {
    const prisma = createTestPrismaClient(databaseUrl);
    const repository = createClaimRepository(prisma);
    try {
      const claim = await repository.createClaimWithAssessment({
        claim: {
          equipmentType: "bicycle",
          brand: "Trek",
          model: "Marlin 7",
          problemDescription: "Rama jest uszkodzona.",
          damageCircumstances:
            decision === "rejected"
              ? "Rower przewrócił się podczas upadku."
              : "Rama pękła podczas normalnej jazdy.",
          status,
          damageType: "mechanical",
        },
        photos: [
          {
            fileName: "rama.jpg",
            originalFileName: "rama.jpg",
            mimeType: "image/jpeg",
            sizeBytes: 100,
            localPath: "uploads/rama.jpg",
          },
        ],
        assessment: {
          decision,
          damageType: "mechanical",
          confidence: "medium",
          reasoningSummary:
            decision === "rejected"
              ? "Opis wskazuje na zdarzenie zewnętrzne."
              : "Opis wskazuje na normalne użytkowanie.",
          photoEvidenceSummary: "Zdjęcie pokazuje uszkodzenie ramy.",
          descriptionEvidenceSummary:
            decision === "rejected"
              ? "Klient opisał upadek."
              : "Klient opisał normalną jazdę.",
          serviceReviewRecommended: true,
        },
      });
      return claim.id;
    } finally {
      await prisma.$disconnect();
    }
  }
});

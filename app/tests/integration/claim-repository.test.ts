import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createTestPrismaClient, resetTestDatabase } from "../utils/test-db";
import { createClaimRepository } from "@/lib/claims/repository";

describe("claim repository", () => {
  let databaseDir: string | undefined;

  afterEach(async () => {
    if (databaseDir) {
      await rm(databaseDir, { recursive: true, force: true });
      databaseDir = undefined;
    }
  });

  it("creates a claim with photo metadata and latest assessment", async () => {
    const testDatabaseRoot = path.join(process.cwd(), ".tmp");
    await mkdir(testDatabaseRoot, { recursive: true });
    databaseDir = await mkdtemp(path.join(testDatabaseRoot, "claims-repo-"));
    const databasePath = path.join(databaseDir, "test.db");
    await writeFile(databasePath, "");
    const relativeDatabasePath = path
      .relative(process.cwd(), databasePath)
      .replace(/\\/g, "/");
    const databaseUrl = `file:./${relativeDatabasePath}`;

    await resetTestDatabase(databaseUrl);
    const prisma = createTestPrismaClient(databaseUrl);
    const repository = createClaimRepository(prisma);

    try {
      const claim = await repository.createClaimWithAssessment({
        claim: {
          equipmentType: "bicycle",
          brand: "Trek",
          model: "Marlin 7",
          problemDescription: "Rama pękła przy suporcie.",
          damageCircumstances: "Rama pękła podczas normalnej jazdy.",
          status: "preliminarily_accepted",
          damageType: "mechanical",
        },
        photos: [
          {
            fileName: "claim-photo.jpg",
            originalFileName: "rama.jpg",
            mimeType: "image/jpeg",
            sizeBytes: 1024,
            localPath: "uploads/claim-photo.jpg",
          },
        ],
        assessment: {
          decision: "accepted",
          damageType: "mechanical",
          confidence: "medium",
          reasoningSummary: "Opis wskazuje na awarię podczas normalnej jazdy.",
          photoEvidenceSummary: "Zdjęcie pokazuje uszkodzenie ramy.",
          descriptionEvidenceSummary:
            "Klient wskazał normalne użytkowanie bez upadku.",
          serviceReviewRecommended: true,
        },
      });

      expect(claim.status).toBe("preliminarily_accepted");
      expect(claim.photos).toHaveLength(1);
      expect(claim.assessments).toHaveLength(1);

      const listed = await repository.listClaims();
      expect(listed.items).toHaveLength(1);
      expect(listed.items[0].latestAssessment?.decision).toBe("accepted");
    } finally {
      await prisma.$disconnect();
    }
  }, 30_000);
});

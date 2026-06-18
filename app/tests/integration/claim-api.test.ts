import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTestPrismaClient, resetTestDatabase } from "../utils/test-db";

describe("claim API", () => {
  let databaseDir: string | undefined;
  let uploadDir: string | undefined;
  let databaseUrl: string;

  beforeEach(async () => {
    vi.resetModules();
    const tmpRoot = path.join(process.cwd(), ".tmp");
    await mkdir(tmpRoot, { recursive: true });
    databaseDir = await mkdtemp(path.join(tmpRoot, "claim-api-db-"));
    uploadDir = await mkdtemp(path.join(tmpRoot, "claim-api-uploads-"));
    const databasePath = path.join(databaseDir, "test.db");
    await writeFile(databasePath, "");
    const relativeDatabasePath = path
      .relative(process.cwd(), databasePath)
      .replace(/\\/g, "/");
    databaseUrl = `file:./${relativeDatabasePath}`;
    process.env.DATABASE_URL = databaseUrl;
    process.env.UPLOAD_DIR = uploadDir;
    delete (globalThis as { prisma?: unknown }).prisma;
    await resetTestDatabase(databaseUrl);
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
    if (uploadDir) {
      await rm(uploadDir, { recursive: true, force: true });
      uploadDir = undefined;
    }
    vi.resetModules();
  });

  it("creates a claim, stores a photo and returns a preliminary assessment", async () => {
    const { POST } = await import("@/app/api/claims/route");
    const formData = new FormData();
    formData.set("equipmentType", "bicycle");
    formData.set("brand", "Trek");
    formData.set("model", "Marlin 7");
    formData.set("problemDescription", "Rama pękła przy suporcie.");
    formData.set(
      "damageCircumstances",
      "Rama pękła podczas normalnej jazdy na rowerze.",
    );
    formData.append(
      "photos",
      new File(["image-bytes"], "rama.jpg", { type: "image/jpeg" }),
    );

    const response = await POST(
      new Request("http://localhost/api/claims", {
        method: "POST",
        body: formData,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.status).toBe("preliminarily_accepted");
    expect(body.assessment.decision).toBe("accepted");
    expect(body.assessment.descriptionEvidenceSummary).toMatch(/normalnej jazdy/i);

    const prisma = createTestPrismaClient(databaseUrl);
    try {
      await expect(prisma.claim.count()).resolves.toBe(1);
      await expect(prisma.claimPhoto.count()).resolves.toBe(1);
      await expect(prisma.aiAssessment.count()).resolves.toBe(1);
    } finally {
      await prisma.$disconnect();
    }
  }, 30_000);

  it("rejects a submission without photos before creating a claim", async () => {
    const { POST } = await import("@/app/api/claims/route");
    const formData = new FormData();
    formData.set("equipmentType", "bicycle");
    formData.set("brand", "Trek");
    formData.set("model", "Marlin 7");
    formData.set("problemDescription", "Rama jest uszkodzona.");
    formData.set("damageCircumstances", "Nie wiem, kiedy powstało uszkodzenie.");

    const response = await POST(
      new Request("http://localhost/api/claims", {
        method: "POST",
        body: formData,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("PHOTO_REQUIRED");

    const prisma = createTestPrismaClient(databaseUrl);
    try {
      await expect(prisma.claim.count()).resolves.toBe(0);
    } finally {
      await prisma.$disconnect();
    }
  }, 30_000);

  it("adds clarification and reruns the preliminary assessment", async () => {
    const { POST } = await import("@/app/api/claims/route");
    const formData = new FormData();
    formData.set("equipmentType", "bicycle");
    formData.set("brand", "Trek");
    formData.set("model", "Marlin 7");
    formData.set("problemDescription", "Rama jest uszkodzona.");
    formData.set("damageCircumstances", "Nie wiem.");
    formData.append(
      "photos",
      new File(["image-bytes"], "rama.jpg", { type: "image/jpeg" }),
    );
    const submissionResponse = await POST(
      new Request("http://localhost/api/claims", {
        method: "POST",
        body: formData,
      }),
    );
    const submissionBody = await submissionResponse.json();
    expect(submissionBody.status).toBe("needs_clarification");

    const { POST: clarify } = await import(
      "@/app/api/claims/[claimId]/clarifications/route"
    );
    const clarificationData = new FormData();
    clarificationData.set(
      "clarification",
      "Rama pękła podczas normalnej jazdy po równej drodze.",
    );

    const clarificationResponse = await clarify(
      new Request(
        `http://localhost/api/claims/${submissionBody.claimId}/clarifications`,
        {
          method: "POST",
          body: clarificationData,
        },
      ),
      { params: Promise.resolve({ claimId: submissionBody.claimId }) },
    );
    const clarificationBody = await clarificationResponse.json();

    expect(clarificationResponse.status).toBe(200);
    expect(clarificationBody.status).toBe("preliminarily_accepted");
    expect(clarificationBody.assessment.decision).toBe("accepted");
  }, 30_000);

  it("marks a rejected claim for service review", async () => {
    const { POST } = await import("@/app/api/claims/route");
    const formData = new FormData();
    formData.set("equipmentType", "bicycle");
    formData.set("brand", "Trek");
    formData.set("model", "Marlin 7");
    formData.set("problemDescription", "Rama jest uszkodzona.");
    formData.set(
      "damageCircumstances",
      "Rower przewrócił się podczas upadku na trasie.",
    );
    formData.append(
      "photos",
      new File(["image-bytes"], "rama.jpg", { type: "image/jpeg" }),
    );
    const submissionResponse = await POST(
      new Request("http://localhost/api/claims", {
        method: "POST",
        body: formData,
      }),
    );
    const submissionBody = await submissionResponse.json();
    expect(submissionBody.status).toBe("preliminarily_rejected");

    const { POST: serviceReview } = await import(
      "@/app/api/claims/[claimId]/service-review/route"
    );
    const serviceReviewResponse = await serviceReview(
      new Request(
        `http://localhost/api/claims/${submissionBody.claimId}/service-review`,
        { method: "POST" },
      ),
      { params: Promise.resolve({ claimId: submissionBody.claimId }) },
    );
    const serviceReviewBody = await serviceReviewResponse.json();

    expect(serviceReviewResponse.status).toBe(200);
    expect(serviceReviewBody.status).toBe("service_review_requested");
  }, 30_000);
});

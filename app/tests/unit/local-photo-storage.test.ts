import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  LocalPhotoStorage,
  validatePhotoFiles,
} from "@/lib/storage/local-photo-storage";

describe("local photo storage", () => {
  let uploadDir: string | undefined;

  afterEach(async () => {
    if (uploadDir) {
      await rm(uploadDir, { recursive: true, force: true });
      uploadDir = undefined;
    }
  });

  it("stores an uploaded image under a safe generated file name", async () => {
    const tmpRoot = path.join(process.cwd(), ".tmp");
    await mkdir(tmpRoot, { recursive: true });
    uploadDir = await mkdtemp(path.join(tmpRoot, "uploads-"));
    const storage = new LocalPhotoStorage(uploadDir);
    const file = new File(["bike-frame"], "../rama uszkodzona.jpg", {
      type: "image/jpeg",
    });

    const [stored] = await storage.storeClaimPhotos("claim-123", [file]);

    expect(stored.originalFileName).toBe("../rama uszkodzona.jpg");
    expect(stored.fileName).toMatch(/^claim-123-[a-f0-9-]+\.jpg$/);
    expect(stored.localPath).toContain("claim-123");
    await expect(readFile(stored.localPath, "utf8")).resolves.toBe(
      "bike-frame",
    );
  });

  it("rejects more than five photos", () => {
    const files = Array.from(
      { length: 6 },
      (_, index) =>
        new File(["x"], `photo-${index}.jpg`, { type: "image/jpeg" }),
    );

    const result = validatePhotoFiles(files);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("PHOTO_LIMIT_EXCEEDED");
  });

  it("rejects unsupported photo mime types", () => {
    const result = validatePhotoFiles([
      new File(["x"], "photo.gif", { type: "image/gif" }),
    ]);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("UNSUPPORTED_PHOTO_TYPE");
  });
});

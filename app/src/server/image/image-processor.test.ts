import { describe, expect, it } from "vitest";

import { IMAGE_MAX_SIZE_BYTES } from "../../shared/contracts";
import { corruptImage, textFile, tinyJpeg, tinyPng, tinyWebp } from "./__fixtures__/images";
import { ImageProcessingError, processUploadedImage } from "./image-processor";

describe("processUploadedImage", () => {
  it.each([tinyJpeg, tinyPng, tinyWebp])("accepts and compresses $mimeType images", async (fixture) => {
    const result = await processUploadedImage({
      bytes: fixture.bytes,
      mimeType: fixture.mimeType
    });

    expect(result.mimeType).toBe("image/jpeg");
    expect(result.byteLength).toBe(result.payload.byteLength);
    expect(result.byteLength).toBeGreaterThan(0);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(result.payload).toBeInstanceOf(Buffer);
  });

  it("rejects unsupported declared MIME types before processing", async () => {
    await expect(
      processUploadedImage({
        bytes: textFile.bytes,
        mimeType: textFile.mimeType
      })
    ).rejects.toMatchObject({
      code: "invalid_image_type",
      kind: "VALIDATION"
    });
  });

  it("rejects images larger than 10 MB before compression", async () => {
    await expect(
      processUploadedImage({
        bytes: Buffer.alloc(IMAGE_MAX_SIZE_BYTES + 1),
        mimeType: tinyPng.mimeType
      })
    ).rejects.toMatchObject({
      code: "image_too_large",
      kind: "VALIDATION"
    });
  });

  it("rejects corrupt image payloads as image-processing errors", async () => {
    await expect(
      processUploadedImage({
        bytes: corruptImage.bytes,
        mimeType: corruptImage.mimeType
      })
    ).rejects.toMatchObject({
      code: "image_corrupt",
      kind: "IMAGE_PROCESSING"
    });
  });

  it("rejects a spoofed MIME type when actual image metadata is unsupported", async () => {
    await expect(
      processUploadedImage({
        bytes: textFile.bytes,
        mimeType: tinyPng.mimeType
      })
    ).rejects.toBeInstanceOf(ImageProcessingError);
  });
});

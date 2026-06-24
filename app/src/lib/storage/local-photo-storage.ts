import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import {
  CLAIM_PHOTO_LIMIT,
  CLAIM_PHOTO_MIN,
  type ValidationResult,
} from "@/lib/claims/domain";

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type StoredPhoto = {
  fileName: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  localPath: string;
};

export function validatePhotoFiles(files: File[]): ValidationResult<File[]> {
  if (files.length < CLAIM_PHOTO_MIN) {
    return {
      success: false,
      error: {
        code: "PHOTO_REQUIRED",
        message: "Dodaj co najmniej jedno zdjęcie uszkodzenia.",
      },
    };
  }

  if (files.length > CLAIM_PHOTO_LIMIT) {
    return {
      success: false,
      error: {
        code: "PHOTO_LIMIT_EXCEEDED",
        message: "Możesz dodać maksymalnie 5 zdjęć.",
      },
    };
  }

  const unsupportedFile = files.find((file) => !ACCEPTED_IMAGE_TYPES.has(file.type));
  if (unsupportedFile) {
    return {
      success: false,
      error: {
        code: "UNSUPPORTED_PHOTO_TYPE",
        message: "Dodaj zdjęcia w formacie JPG, PNG albo WebP.",
      },
    };
  }

  return { success: true, data: files };
}

export class LocalPhotoStorage {
  constructor(private readonly uploadDir: string) {}

  async storeClaimPhotos(claimId: string, files: File[]): Promise<StoredPhoto[]> {
    const validation = validatePhotoFiles(files);
    if (!validation.success) {
      throw Object.assign(new Error(validation.error.message), {
        code: validation.error.code,
      });
    }

    const claimUploadDir = path.join(this.uploadDir, claimId);
    await mkdir(claimUploadDir, { recursive: true });

    return Promise.all(
      files.map(async (file) => {
        const extension = extensionForMimeType(file.type);
        const fileName = `${claimId}-${randomUUID()}${extension}`;
        const localPath = path.join(claimUploadDir, fileName);
        const bytes = Buffer.from(await file.arrayBuffer());
        await writeFile(localPath, bytes);

        return {
          fileName,
          originalFileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          localPath,
        };
      }),
    );
  }
}

function extensionForMimeType(mimeType: string) {
  if (mimeType === "image/png") {
    return ".png";
  }
  if (mimeType === "image/webp") {
    return ".webp";
  }
  return ".jpg";
}

import sharp from "sharp";

import {
  IMAGE_MAX_SIZE_BYTES,
  IMAGE_MIME_TYPES,
  type AssessmentErrorKind,
  type ImageMimeType
} from "../../shared/contracts";

const OUTPUT_MIME_TYPE = "image/jpeg" satisfies ImageMimeType;
const MAX_OUTPUT_DIMENSION = 1536;
const JPEG_QUALITY = 80;

const allowedMimeTypes = new Set<string>(IMAGE_MIME_TYPES);
const sharpFormatToMimeType: Readonly<Record<string, ImageMimeType | undefined>> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp"
};

export type UploadedImageInput = {
  bytes: Buffer;
  mimeType: string;
};

export type ProcessedImage = {
  mimeType: ImageMimeType;
  byteLength: number;
  width: number;
  height: number;
  payload: Buffer;
};

export class ImageProcessingError extends Error {
  readonly code: string;
  readonly kind: AssessmentErrorKind;
  readonly retryable: boolean;

  constructor(params: {
    code: string;
    kind: AssessmentErrorKind;
    message: string;
    retryable?: boolean;
    cause?: unknown;
  }) {
    super(params.message, { cause: params.cause });
    this.name = "ImageProcessingError";
    this.code = params.code;
    this.kind = params.kind;
    this.retryable = params.retryable ?? false;
  }
}

export const processUploadedImage = async (input: UploadedImageInput): Promise<ProcessedImage> => {
  validateDeclaredImage(input);

  const metadata = await readMetadata(input.bytes);
  const actualMimeType = metadata.format ? sharpFormatToMimeType[metadata.format] : undefined;

  if (!actualMimeType || actualMimeType !== input.mimeType) {
    throw new ImageProcessingError({
      code: "image_corrupt",
      kind: "IMAGE_PROCESSING",
      message: "Nie udało się odczytać zdjęcia. Dodaj plik JPEG, PNG albo WebP."
    });
  }

  const { data, info } = await compressImage(input.bytes);

  return {
    mimeType: OUTPUT_MIME_TYPE,
    byteLength: data.byteLength,
    width: info.width,
    height: info.height,
    payload: data
  };
};

const validateDeclaredImage = (input: UploadedImageInput) => {
  if (!allowedMimeTypes.has(input.mimeType)) {
    throw new ImageProcessingError({
      code: "invalid_image_type",
      kind: "VALIDATION",
      message: "Zdjęcie musi być w formacie JPEG, PNG albo WebP."
    });
  }

  if (input.bytes.byteLength > IMAGE_MAX_SIZE_BYTES) {
    throw new ImageProcessingError({
      code: "image_too_large",
      kind: "VALIDATION",
      message: "Zdjęcie może mieć maksymalnie 10 MB."
    });
  }

  if (input.bytes.byteLength === 0) {
    throw new ImageProcessingError({
      code: "image_empty",
      kind: "VALIDATION",
      message: "Dodaj poprawne zdjęcie sprzętu."
    });
  }
};

const readMetadata = async (bytes: Buffer) => {
  try {
    return await sharp(bytes, { failOn: "warning" }).metadata();
  } catch (error) {
    throw new ImageProcessingError({
      code: "image_corrupt",
      kind: "IMAGE_PROCESSING",
      message: "Nie udało się odczytać zdjęcia. Dodaj plik JPEG, PNG albo WebP.",
      cause: error
    });
  }
};

const compressImage = async (bytes: Buffer) => {
  try {
    return await sharp(bytes, { failOn: "warning" })
      .rotate()
      .resize({
        width: MAX_OUTPUT_DIMENSION,
        height: MAX_OUTPUT_DIMENSION,
        fit: "inside",
        withoutEnlargement: true
      })
      .jpeg({
        quality: JPEG_QUALITY,
        mozjpeg: true
      })
      .toBuffer({ resolveWithObject: true });
  } catch (error) {
    throw new ImageProcessingError({
      code: "image_corrupt",
      kind: "IMAGE_PROCESSING",
      message: "Nie udało się przetworzyć zdjęcia. Dodaj inny plik JPEG, PNG albo WebP.",
      cause: error
    });
  }
};

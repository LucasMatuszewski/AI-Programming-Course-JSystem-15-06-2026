import { describe, expect, it } from "vitest";

import {
  decisionResultSchema,
  formatValidationErrors,
  intakeSubmissionSchema,
  imageAnalysisSchema,
  validationErrorSchema
} from "@/shared/contracts";

const validImageMetadata = {
  name: "telefon.jpg",
  mimeType: "image/jpeg",
  sizeBytes: 1024
};

const validReturnSubmission = {
  requestType: "RETURN",
  equipmentCategory: "Smartfon",
  equipmentName: "Pixel 9",
  purchaseDate: "2026-01-10",
  reason: "",
  images: [validImageMetadata]
};

describe("intakeSubmissionSchema", () => {
  it("odrzuca brak wymaganych pól z polskimi komunikatami", () => {
    const result = intakeSubmissionSchema.safeParse({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(formatValidationErrors(result.error)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "invalid_request_type",
            field: "requestType",
            message: "Wybierz typ zgłoszenia."
          }),
          expect.objectContaining({
            code: "invalid_equipment_category",
            field: "equipmentCategory",
            message: "Wybierz kategorię sprzętu z listy."
          }),
          expect.objectContaining({
            code: "required_equipment_name",
            field: "equipmentName",
            message: "Podaj nazwę lub model sprzętu."
          }),
          expect.objectContaining({
            code: "required_purchase_date",
            field: "purchaseDate",
            message: "Podaj datę zakupu."
          }),
          expect.objectContaining({
            code: "required_image",
            field: "images",
            message: "Dodaj dokładnie jedno zdjęcie sprzętu."
          })
        ])
      );
    }
  });

  it("odrzuca datę zakupu z przyszłości", () => {
    const result = intakeSubmissionSchema.safeParse({
      ...validReturnSubmission,
      purchaseDate: "2999-01-01"
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(formatValidationErrors(result.error)).toContainEqual(
        expect.objectContaining({
          code: "future_purchase_date",
          field: "purchaseDate",
          message: "Data zakupu nie może być z przyszłości."
        })
      );
    }
  });

  it("wymaga powodu dla reklamacji", () => {
    const result = intakeSubmissionSchema.safeParse({
      ...validReturnSubmission,
      requestType: "COMPLAINT",
      reason: "   "
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(formatValidationErrors(result.error)).toContainEqual(
        expect.objectContaining({
          code: "required_complaint_reason",
          field: "reason",
          message: "Opisz powód reklamacji."
        })
      );
    }
  });

  it("odrzuca kategorię spoza listy PRD", () => {
    const result = intakeSubmissionSchema.safeParse({
      ...validReturnSubmission,
      equipmentCategory: "Drukarka"
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(formatValidationErrors(result.error)).toContainEqual(
        expect.objectContaining({
          code: "invalid_equipment_category",
          field: "equipmentCategory",
          message: "Wybierz kategorię sprzętu z listy."
        })
      );
    }
  });

  it("wymaga metadanych dokładnie jednego obsługiwanego obrazu do 10 MB", () => {
    const noImage = intakeSubmissionSchema.safeParse({
      ...validReturnSubmission,
      images: []
    });
    const multipleImages = intakeSubmissionSchema.safeParse({
      ...validReturnSubmission,
      images: [validImageMetadata, { ...validImageMetadata, name: "bok.webp", mimeType: "image/webp" }]
    });
    const unsupportedImage = intakeSubmissionSchema.safeParse({
      ...validReturnSubmission,
      images: [{ ...validImageMetadata, mimeType: "application/pdf" }]
    });
    const tooLargeImage = intakeSubmissionSchema.safeParse({
      ...validReturnSubmission,
      images: [{ ...validImageMetadata, sizeBytes: 10 * 1024 * 1024 + 1 }]
    });

    expect(noImage.success).toBe(false);
    expect(multipleImages.success).toBe(false);
    expect(unsupportedImage.success).toBe(false);
    expect(tooLargeImage.success).toBe(false);

    if (!noImage.success) {
      expect(formatValidationErrors(noImage.error)).toContainEqual(
        expect.objectContaining({ code: "required_image", field: "images" })
      );
    }
    if (!multipleImages.success) {
      expect(formatValidationErrors(multipleImages.error)).toContainEqual(
        expect.objectContaining({ code: "single_image_only", field: "images" })
      );
    }
    if (!unsupportedImage.success) {
      expect(formatValidationErrors(unsupportedImage.error)).toContainEqual(
        expect.objectContaining({
          code: "invalid_image_type",
          field: "images.0.mimeType",
          message: "Zdjęcie musi być w formacie JPEG, PNG albo WebP."
        })
      );
    }
    if (!tooLargeImage.success) {
      expect(formatValidationErrors(tooLargeImage.error)).toContainEqual(
        expect.objectContaining({
          code: "image_too_large",
          field: "images.0.sizeBytes",
          message: "Zdjęcie może mieć maksymalnie 10 MB."
        })
      );
    }
  });

  it("akceptuje poprawny zwrot bez powodu", () => {
    const result = intakeSubmissionSchema.safeParse(validReturnSubmission);

    expect(result.success).toBe(true);
  });
});

describe("pozostałe kontrakty P2", () => {
  it("waliduje analizę obrazu, decyzję i kształt błędu walidacji", () => {
    expect(
      imageAnalysisSchema.safeParse({
        usable: true,
        description: "Urządzenie jest widoczne i bez wyraźnych uszkodzeń.",
        visibleDamage: [],
        conditionSignals: ["brak widocznych śladów użycia"],
        likelyCause: "unclear",
        missingItems: [],
        confidence: "medium"
      }).success
    ).toBe(true);

    expect(
      decisionResultSchema.safeParse({
        outcome: "NEEDS_MORE_INFO",
        title: "Potrzebujemy dodatkowych informacji",
        justification: "Zdjęcie nie pokazuje wszystkich elementów zestawu.",
        policyReferences: ["Zasady zwrotu - stan produktu"],
        nextSteps: ["Dodaj wyraźniejsze zdjęcie zestawu."],
        missingInformation: ["Wyraźne zdjęcie akcesoriów"],
        changedFromPrevious: false,
        disclaimer:
          "To wstępna, niewiążąca ocena. Ostateczną decyzję podejmuje zespół serwisu."
      }).success
    ).toBe(true);

    expect(
      validationErrorSchema.safeParse({
        code: "required_image",
        field: "images",
        message: "Dodaj dokładnie jedno zdjęcie sprzętu."
      }).success
    ).toBe(true);
  });
});

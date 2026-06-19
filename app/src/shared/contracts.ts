import { z, type ZodError, type ZodIssue } from "zod";

export const REQUEST_TYPES = ["RETURN", "COMPLAINT"] as const;
export const EQUIPMENT_CATEGORIES = [
  "Smartfon",
  "Laptop",
  "Tablet",
  "Telewizor/Monitor",
  "Audio/Słuchawki",
  "Smartwatch/Wearable",
  "Aparat/Kamera",
  "Konsola do gier",
  "Sprzęt AGD",
  "Inne"
] as const;
export const DECISION_OUTCOMES = [
  "APPROVE",
  "REJECT",
  "NEEDS_MORE_INFO",
  "CONDITIONAL",
  "ESCALATE"
] as const;
export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const IMAGE_MAX_SIZE_BYTES = 10 * 1024 * 1024;

export type RequestType = (typeof REQUEST_TYPES)[number];
export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number];
export type DecisionOutcome = (typeof DECISION_OUTCOMES)[number];
export type ImageMimeType = (typeof IMAGE_MIME_TYPES)[number];

export type ImageUploadMetadata = {
  name: string;
  mimeType: ImageMimeType;
  sizeBytes: number;
};

export type IntakeSubmission = {
  requestType: RequestType;
  equipmentCategory: EquipmentCategory;
  equipmentName: string;
  purchaseDate: string;
  reason: string;
  images: [ImageUploadMetadata];
};

export type ImageAnalysis = {
  usable: boolean;
  description: string;
  visibleDamage: string[];
  conditionSignals: string[];
  likelyCause: "manufacturing" | "mechanical" | "liquid" | "wear" | "unclear";
  missingItems: string[];
  confidence: "low" | "medium" | "high";
};

export type DecisionResult = {
  outcome: DecisionOutcome;
  title: string;
  justification: string;
  policyReferences: string[];
  nextSteps: string[];
  missingInformation: string[];
  changedFromPrevious: boolean;
  disclaimer: string;
};

export type ValidationError = {
  code: string;
  field: string | null;
  message: string;
};

export type AssessmentErrorKind =
  | "VALIDATION"
  | "IMAGE_PROCESSING"
  | "AI_PROVIDER"
  | "CONFIG"
  | "UNKNOWN";

export type AssessmentError = {
  kind: AssessmentErrorKind;
  retryable: boolean;
  message: string;
  fieldErrors?: ValidationError[];
};

const validationMessages = {
  invalidRequestType: "Wybierz typ zgłoszenia.",
  invalidEquipmentCategory: "Wybierz kategorię sprzętu z listy.",
  requiredEquipmentName: "Podaj nazwę lub model sprzętu.",
  requiredPurchaseDate: "Podaj datę zakupu.",
  invalidPurchaseDate: "Podaj datę zakupu w formacie RRRR-MM-DD.",
  futurePurchaseDate: "Data zakupu nie może być z przyszłości.",
  requiredComplaintReason: "Opisz powód reklamacji.",
  requiredImage: "Dodaj dokładnie jedno zdjęcie sprzętu.",
  singleImageOnly: "Możesz dodać tylko jedno zdjęcie sprzętu.",
  invalidImageType: "Zdjęcie musi być w formacie JPEG, PNG albo WebP.",
  imageTooLarge: "Zdjęcie może mieć maksymalnie 10 MB.",
  requiredImageName: "Brakuje nazwy pliku zdjęcia.",
  invalidImageSize: "Brakuje poprawnego rozmiaru zdjęcia."
} as const;

const requestTypeValues = new Set<string>(REQUEST_TYPES);
const equipmentCategoryValues = new Set<string>(EQUIPMENT_CATEGORIES);
const imageMimeTypeValues = new Set<string>(IMAGE_MIME_TYPES);

const addValidationIssue = (
  context: z.RefinementCtx,
  path: Array<string | number>,
  code: string,
  message: string
) => {
  context.addIssue({
    code: "custom",
    path,
    message,
    params: { validationCode: code }
  });
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseIsoDateOnly = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    return null;
  }

  return parsedDate;
};

const isFutureDate = (isoDate: string) => {
  const parsedDate = parseIsoDateOnly(isoDate);
  if (!parsedDate) {
    return false;
  }

  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  return parsedDate.getTime() > todayUtc.getTime();
};

const imageUploadMetadataBaseSchema = z
  .object({
    name: z.unknown().optional(),
    mimeType: z.unknown().optional(),
    sizeBytes: z.unknown().optional()
  })
  .superRefine((value, context) => {
    if (typeof value.name !== "string" || value.name.trim().length === 0) {
      addValidationIssue(context, ["name"], "required_image_name", validationMessages.requiredImageName);
    }

    if (typeof value.mimeType !== "string" || !imageMimeTypeValues.has(value.mimeType)) {
      addValidationIssue(context, ["mimeType"], "invalid_image_type", validationMessages.invalidImageType);
    }

    const sizeBytes = value.sizeBytes;

    if (typeof sizeBytes !== "number" || !Number.isInteger(sizeBytes) || sizeBytes <= 0) {
      addValidationIssue(context, ["sizeBytes"], "invalid_image_size", validationMessages.invalidImageSize);
      return;
    }

    if (sizeBytes > IMAGE_MAX_SIZE_BYTES) {
      addValidationIssue(context, ["sizeBytes"], "image_too_large", validationMessages.imageTooLarge);
    }
  })
  .transform(
    (value): ImageUploadMetadata => ({
      name: String(value.name).trim(),
      mimeType: value.mimeType as ImageMimeType,
      sizeBytes: Number(value.sizeBytes)
    })
  );

export const imageUploadMetadataSchema: z.ZodType<ImageUploadMetadata> = imageUploadMetadataBaseSchema;

const intakeSubmissionBaseSchema = z
  .object({
    requestType: z.unknown().optional(),
    equipmentCategory: z.unknown().optional(),
    equipmentName: z.unknown().optional(),
    purchaseDate: z.unknown().optional(),
    reason: z.unknown().optional(),
    images: z.unknown().optional()
  })
  .superRefine((value, context) => {
    if (typeof value.requestType !== "string" || !requestTypeValues.has(value.requestType)) {
      addValidationIssue(context, ["requestType"], "invalid_request_type", validationMessages.invalidRequestType);
    }

    if (
      typeof value.equipmentCategory !== "string" ||
      !equipmentCategoryValues.has(value.equipmentCategory)
    ) {
      addValidationIssue(
        context,
        ["equipmentCategory"],
        "invalid_equipment_category",
        validationMessages.invalidEquipmentCategory
      );
    }

    if (typeof value.equipmentName !== "string" || value.equipmentName.trim().length === 0) {
      addValidationIssue(
        context,
        ["equipmentName"],
        "required_equipment_name",
        validationMessages.requiredEquipmentName
      );
    }

    if (typeof value.purchaseDate !== "string" || value.purchaseDate.trim().length === 0) {
      addValidationIssue(
        context,
        ["purchaseDate"],
        "required_purchase_date",
        validationMessages.requiredPurchaseDate
      );
    } else if (!parseIsoDateOnly(value.purchaseDate)) {
      addValidationIssue(
        context,
        ["purchaseDate"],
        "invalid_purchase_date",
        validationMessages.invalidPurchaseDate
      );
    } else if (isFutureDate(value.purchaseDate)) {
      addValidationIssue(
        context,
        ["purchaseDate"],
        "future_purchase_date",
        validationMessages.futurePurchaseDate
      );
    }

    if (
      value.requestType === "COMPLAINT" &&
      (typeof value.reason !== "string" || value.reason.trim().length === 0)
    ) {
      addValidationIssue(
        context,
        ["reason"],
        "required_complaint_reason",
        validationMessages.requiredComplaintReason
      );
    }

    if (!Array.isArray(value.images) || value.images.length === 0) {
      addValidationIssue(context, ["images"], "required_image", validationMessages.requiredImage);
      return;
    }

    if (value.images.length > 1) {
      addValidationIssue(context, ["images"], "single_image_only", validationMessages.singleImageOnly);
    }

    value.images.forEach((image, index) => {
      if (!isRecord(image)) {
        addValidationIssue(context, ["images", index], "required_image", validationMessages.requiredImage);
        return;
      }

      const imageResult = imageUploadMetadataSchema.safeParse(image);
      if (!imageResult.success) {
        imageResult.error.issues.forEach((issue) => {
          const issuePath = issue.path.filter(
            (pathPart): pathPart is string | number =>
              typeof pathPart === "string" || typeof pathPart === "number"
          );

          addValidationIssue(
            context,
            ["images", index, ...issuePath],
            getValidationCode(issue),
            issue.message
          );
        });
      }
    });
  })
  .transform((value): IntakeSubmission => {
    const imageResult = imageUploadMetadataSchema.parse((value.images as unknown[])[0]);

    return {
      requestType: value.requestType as RequestType,
      equipmentCategory: value.equipmentCategory as EquipmentCategory,
      equipmentName: String(value.equipmentName).trim(),
      purchaseDate: String(value.purchaseDate),
      reason: typeof value.reason === "string" ? value.reason.trim() : "",
      images: [imageResult]
    };
  });

export const intakeSubmissionSchema: z.ZodType<IntakeSubmission> = intakeSubmissionBaseSchema;

export const requestTypeSchema = z.enum(REQUEST_TYPES);
export const equipmentCategorySchema = z.enum(EQUIPMENT_CATEGORIES);
export const decisionOutcomeSchema = z.enum(DECISION_OUTCOMES);
export const imageMimeTypeSchema = z.enum(IMAGE_MIME_TYPES);

export const imageAnalysisSchema = z.object({
  usable: z.boolean(),
  description: z.string().trim().min(1),
  visibleDamage: z.array(z.string().trim().min(1)),
  conditionSignals: z.array(z.string().trim().min(1)),
  likelyCause: z.enum(["manufacturing", "mechanical", "liquid", "wear", "unclear"]),
  missingItems: z.array(z.string().trim().min(1)),
  confidence: z.enum(["low", "medium", "high"])
}) satisfies z.ZodType<ImageAnalysis>;

export const decisionResultSchema = z
  .object({
    outcome: decisionOutcomeSchema,
    title: z.string().trim().min(1),
    justification: z.string().trim().min(1),
    policyReferences: z.array(z.string().trim().min(1)),
    nextSteps: z.array(z.string().trim().min(1)),
    missingInformation: z.array(z.string().trim().min(1)),
    changedFromPrevious: z.boolean(),
    disclaimer: z.string().trim().min(1)
  })
  .superRefine((value, context) => {
    if (value.outcome === "NEEDS_MORE_INFO" && value.missingInformation.length === 0) {
      addValidationIssue(
        context,
        ["missingInformation"],
        "required_missing_information",
        "Wskaż, jakich informacji brakuje do oceny zgłoszenia."
      );
    }
  }) satisfies z.ZodType<DecisionResult>;

export const validationErrorSchema = z.object({
  code: z.string().trim().min(1),
  field: z.string().trim().min(1).nullable(),
  message: z.string().trim().min(1)
}) satisfies z.ZodType<ValidationError>;

export const assessmentErrorSchema = z.object({
  kind: z.enum(["VALIDATION", "IMAGE_PROCESSING", "AI_PROVIDER", "CONFIG", "UNKNOWN"]),
  retryable: z.boolean(),
  message: z.string().trim().min(1),
  fieldErrors: z.array(validationErrorSchema).optional()
}) satisfies z.ZodType<AssessmentError>;

type IssueWithValidationCode = ZodIssue & {
  params?: {
    validationCode?: unknown;
  };
};

const getValidationCode = (issue: ZodIssue) => {
  const validationCode = (issue as IssueWithValidationCode).params?.validationCode;

  return typeof validationCode === "string" ? validationCode : issue.code;
};

export const formatValidationErrors = (error: ZodError): ValidationError[] =>
  error.issues.map((issue) => ({
    code: getValidationCode(issue),
    field: issue.path.length > 0 ? issue.path.join(".") : null,
    message: issue.message
  }));

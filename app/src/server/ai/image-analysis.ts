import type { ModelMessage } from "ai";

import {
  imageAnalysisSchema,
  type ImageAnalysis,
  type ImageMimeType,
  type IntakeSubmission
} from "../../shared/contracts";
import {
  buildComplaintImageAnalysisPrompt,
  buildReturnImageAnalysisPrompt
} from "../prompts/policy-prompts";
import { invalidStructuredOutputError } from "./errors";
import { createOpenRouterModelFactory, type OpenRouterModelFactory } from "./openrouter-provider";
import { generateStructuredObject, type StructuredOutputGenerator } from "./structured-generation";

export type AnalyzeImageInput = {
  submission: IntakeSubmission;
  image: {
    mimeType: ImageMimeType;
    payload: Buffer;
  };
  modelFactory?: OpenRouterModelFactory;
  generateStructuredObject?: StructuredOutputGenerator;
};

export const analyzeImageForCase = async ({
  submission,
  image,
  modelFactory = createOpenRouterModelFactory(),
  generateStructuredObject: generate = generateStructuredObject
}: AnalyzeImageInput): Promise<ImageAnalysis> => {
  const output = await generate({
    operation: "imageAnalysis",
    model: modelFactory.modelFor("imageAnalysis"),
    schema: imageAnalysisSchema,
    system: selectImagePrompt(submission.requestType),
    messages: buildImageMessages(submission, image)
  });

  const parsed = imageAnalysisSchema.safeParse(output);

  if (!parsed.success) {
    throw invalidStructuredOutputError(parsed.error);
  }

  if (!parsed.data.usable && parsed.data.missingItems.length === 0) {
    throw invalidStructuredOutputError();
  }

  return parsed.data;
};

const selectImagePrompt = (requestType: IntakeSubmission["requestType"]) =>
  requestType === "RETURN" ? buildReturnImageAnalysisPrompt() : buildComplaintImageAnalysisPrompt();

const buildImageMessages = (
  submission: IntakeSubmission,
  image: AnalyzeImageInput["image"]
): ModelMessage[] => [
  {
    role: "user",
    content: [
      {
        type: "text",
        text: [
          `Typ zgłoszenia: ${submission.requestType}`,
          `Kategoria: ${submission.equipmentCategory}`,
          `Sprzęt: ${submission.equipmentName}`,
          `Data zakupu: ${submission.purchaseDate}`,
          `Powód: ${submission.reason || "brak dodatkowego opisu"}`,
          "Zwróć wyłącznie strukturę zgodną ze schematem ImageAnalysis."
        ].join("\n")
      },
      {
        type: "image",
        image: image.payload,
        mediaType: image.mimeType
      }
    ]
  }
];

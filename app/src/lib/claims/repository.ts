import type { Prisma, PrismaClient } from "@prisma/client";

type ClaimCreateInput = {
  equipmentType: "bicycle";
  brand: string;
  model: string;
  problemDescription: string;
  damageCircumstances: string;
  status: Prisma.ClaimCreateInput["status"];
  damageType: Prisma.ClaimCreateInput["damageType"];
};

type PhotoCreateInput = {
  fileName: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  localPath: string;
};

type AssessmentCreateInput = {
  decision: Prisma.AiAssessmentCreateInput["decision"];
  damageType: Prisma.AiAssessmentCreateInput["damageType"];
  confidence: Prisma.AiAssessmentCreateInput["confidence"];
  reasoningSummary: string;
  photoEvidenceSummary: string;
  descriptionEvidenceSummary: string;
  serviceReviewRecommended: boolean;
};

export function createClaimRepository(prisma: PrismaClient) {
  return {
    createClaimWithAssessment(input: {
      claim: ClaimCreateInput;
      photos: PhotoCreateInput[];
      assessment: AssessmentCreateInput;
    }) {
      return prisma.claim.create({
        data: {
          ...input.claim,
          photos: {
            create: input.photos,
          },
          assessments: {
            create: input.assessment,
          },
        },
        include: {
          photos: true,
          assessments: {
            orderBy: { createdAt: "desc" },
          },
        },
      });
    },

    async listClaims(page = 1, pageSize = 20) {
      const skip = (page - 1) * pageSize;
      const [claims, total] = await Promise.all([
        prisma.claim.findMany({
          skip,
          take: pageSize,
          orderBy: { createdAt: "desc" },
          include: {
            photos: true,
            assessments: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        }),
        prisma.claim.count(),
      ]);

      return {
        items: claims.map((claim) => ({
          ...claim,
          latestAssessment: claim.assessments[0] ?? null,
        })),
        total,
        page,
        pageSize,
      };
    },

    getClaimById(id: string) {
      return prisma.claim.findUnique({
        where: { id },
        include: {
          photos: true,
          assessments: {
            orderBy: { createdAt: "desc" },
          },
          chatMessages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });
    },

    updateClaimStatus(id: string, status: Prisma.ClaimUpdateInput["status"]) {
      return prisma.claim.update({
        where: { id },
        data: { status },
      });
    },
  };
}

import { NextResponse } from "next/server";

import { readStaffSession } from "@/lib/auth/session";
import { createClaimRepository } from "@/lib/claims/repository";
import { prisma } from "@/lib/db/client";
import { apiError } from "@/lib/http/api-response";

type RouteContext = {
  params: Promise<{ claimId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const session = readStaffSession(request);
  if (!session) {
    return apiError(401, {
      code: "UNAUTHORIZED",
      message: "Zaloguj się, aby zobaczyć panel obsługi.",
    });
  }

  const { claimId } = await context.params;
  const repository = createClaimRepository(prisma);
  const claim = await repository.getClaimById(claimId);

  if (!claim) {
    return apiError(404, {
      code: "CLAIM_NOT_FOUND",
      message: "Nie znaleziono zgłoszenia.",
    });
  }

  return NextResponse.json(claim);
}

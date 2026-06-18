import { NextResponse } from "next/server";

import { readStaffSession } from "@/lib/auth/session";
import { createClaimRepository } from "@/lib/claims/repository";
import { prisma } from "@/lib/db/client";
import { apiError } from "@/lib/http/api-response";

export async function GET(request: Request) {
  const session = readStaffSession(request);
  if (!session) {
    return apiError(401, {
      code: "UNAUTHORIZED",
      message: "Zaloguj się, aby zobaczyć panel obsługi.",
    });
  }

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Math.min(Number(url.searchParams.get("pageSize") ?? "20"), 50);
  const repository = createClaimRepository(prisma);
  const claims = await repository.listClaims(page, pageSize);

  return NextResponse.json(claims);
}

import { NextResponse } from "next/server";

import { apiError } from "@/lib/http/api-response";
import { clarifyClaim, statusForError } from "@/lib/claims/service";

type RouteContext = {
  params: Promise<{ claimId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { claimId } = await context.params;
  const formData = await request.formData();
  const result = await clarifyClaim(claimId, formData);

  if (!result.success) {
    return apiError(statusForError(result.error), result.error);
  }

  return NextResponse.json(result.data);
}

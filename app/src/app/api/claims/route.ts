import { NextResponse } from "next/server";

import { apiError } from "@/lib/http/api-response";
import { statusForError, submitClaim } from "@/lib/claims/service";

export async function POST(request: Request) {
  const formData = await request.formData();
  const result = await submitClaim(formData);

  if (!result.success) {
    return apiError(statusForError(result.error), result.error);
  }

  return NextResponse.json(result.data, { status: 201 });
}

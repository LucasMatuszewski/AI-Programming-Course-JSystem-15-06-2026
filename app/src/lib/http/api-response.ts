import { NextResponse } from "next/server";

export function apiError(
  status: number,
  error: { code: string; message: string; details?: Record<string, string> },
) {
  return NextResponse.json(error, { status });
}

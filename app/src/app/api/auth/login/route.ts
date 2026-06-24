import { NextResponse } from "next/server";

import { loginStaff } from "@/lib/auth/service";
import { apiError } from "@/lib/http/api-response";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await loginStaff({
    email: String(body.email ?? ""),
    password: String(body.password ?? ""),
  });

  if (!result.success) {
    return apiError(401, result.error);
  }

  const response = NextResponse.json({ user: result.data.user });
  response.headers.set("set-cookie", result.data.cookie);
  return response;
}

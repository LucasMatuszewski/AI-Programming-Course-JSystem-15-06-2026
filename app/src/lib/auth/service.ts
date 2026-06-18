import { compare } from "bcryptjs";

import { prisma } from "@/lib/db/client";
import { createStaffSessionCookie } from "@/lib/auth/session";

export async function loginStaff(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase().trim() },
  });

  if (!user || !(await compare(input.password, user.passwordHash))) {
    return {
      success: false as const,
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Nieprawidłowy email lub hasło.",
      },
    };
  }

  const cookie = createStaffSessionCookie({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    success: true as const,
    data: {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      cookie,
    },
  };
}

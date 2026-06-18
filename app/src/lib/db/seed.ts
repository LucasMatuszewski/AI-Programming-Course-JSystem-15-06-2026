import { hash } from "bcryptjs";
import type { Prisma, PrismaClient } from "@prisma/client";

type SeedStaffUserInput = {
  email: string;
  password: string;
  role: Prisma.UserCreateInput["role"];
};

export async function seedStaffUser(prisma: PrismaClient, input: SeedStaffUserInput) {
  const passwordHash = await hash(input.password, 12);

  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      passwordHash,
      role: input.role,
    },
    create: {
      email: input.email,
      passwordHash,
      role: input.role,
    },
  });
}

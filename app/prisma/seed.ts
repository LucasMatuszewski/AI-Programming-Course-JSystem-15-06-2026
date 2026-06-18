import { createPrismaClient } from "../src/lib/db/client";
import { seedStaffUser } from "../src/lib/db/seed";

const prisma = createPrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required");
  }

  await seedStaffUser(prisma, {
    email,
    password,
    role: "admin",
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

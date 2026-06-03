import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const email = process.argv[2];

if (!email) {
  console.error("Usage: tsx scripts/make-admin.ts <email>");
  process.exit(1);
}

async function main() {
  const customer = await prisma.customer.findUnique({ where: { email } });

  if (!customer) {
    console.error(`Customer with email "${email}" not found.`);
    process.exit(1);
  }

  if (customer.role === "ADMIN") {
    console.log(`${email} is already an ADMIN.`);
    return;
  }

  await prisma.customer.update({
    where: { email },
    data: { role: "ADMIN" },
  });

  console.log(`✅ ${email} promoted to ADMIN successfully!`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient();

try {
  await prisma.$queryRaw`SELECT 1`;
  console.log("Database connection OK");
} catch (error) {
  console.error("Database connection failed");
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

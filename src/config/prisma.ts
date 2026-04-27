import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const isProduction = process.env["NODE_ENV"] === "production";

const pool = new pg.Pool({
  connectionString: process.env["DATABASE_URL"],
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // Neon (and other hosted DBs) require SSL; use verify-full to silence pg deprecation
  ssl: isProduction ? { rejectUnauthorized: true } : undefined,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function connectDB(): Promise<void> {
  await prisma.$connect();
  console.log("Database connected successfully");
}

export default prisma;

// A singleton PrismaClient instance to avoid exhausting DB connections.
// Import this in services to query the database.

import { PrismaClient } from "@prisma/client";
import { getDatabaseUrl } from "./database-config";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
    datasourceUrl: getDatabaseUrl(),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
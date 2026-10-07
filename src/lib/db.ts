import { PrismaClient } from "@prisma/client";

// Une seule instance Prisma par process (évite d'épuiser les connexions en dev avec le hot reload).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

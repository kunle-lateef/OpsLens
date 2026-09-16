import { PrismaClient } from '@prisma/client';

// Singleton Prisma client — see architecture.md's Database Access rules.
// Never instantiate `new PrismaClient()` anywhere else; multiple clients
// exhaust the connection pool in development (Next.js hot-reloads modules,
// so without this the dev server accumulates a new client per reload).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

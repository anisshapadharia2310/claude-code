import { PrismaClient } from '@prisma/client';

/**
 * A single Prisma client per process. Next.js keeps modules alive across hot
 * reloads in development, so the client is cached on globalThis to avoid
 * exhausting the connection pool.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma
  ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

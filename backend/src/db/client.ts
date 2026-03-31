import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: env.isProduction ? ['error'] : ['warn', 'error'],
    datasources: { db: { url: env.DATABASE_URL } },
    transactionOptions: {
      timeout: 10000, // 10s max per transaction
    },
  });

if (!env.isProduction) {
  globalForPrisma.prisma = prisma;
}

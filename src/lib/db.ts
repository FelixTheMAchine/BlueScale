import { PrismaClient } from '@prisma/client';
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient({log: process.env.NODE_ENV === 'development' ? ['error','warn'] : ['error']});
// Reuse one connection pool across route bundles and server-side imports.
globalForPrisma.prisma = prisma;

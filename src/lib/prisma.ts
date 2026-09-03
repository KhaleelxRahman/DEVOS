// Safe Prisma client wrapper
let prismaInstance: any = null;

try {
  const { PrismaClient } = require('@prisma/client');
  const globalForPrisma = global as unknown as { prisma: any };
  prismaInstance =
    globalForPrisma.prisma ||
    new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaInstance;
} catch (e) {
  prismaInstance = {};
}

export const prisma = prismaInstance;
export default prisma;

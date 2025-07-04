import { PrismaClient } from '@prisma/client';

// Main database client (existing)
const mainPrismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
};

// GYG database client (new)
const gygPrismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.GYG_DATABASE_URL,
      },
    },
  });
};

declare global {
  var mainPrisma: undefined | ReturnType<typeof mainPrismaClientSingleton>;
  var gygPrisma: undefined | ReturnType<typeof gygPrismaClientSingleton>;
}

const mainPrisma = globalThis.mainPrisma ?? mainPrismaClientSingleton();
const gygPrisma = globalThis.gygPrisma ?? gygPrismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.mainPrisma = mainPrisma;
  globalThis.gygPrisma = gygPrisma;
}

export { mainPrisma, gygPrisma };

// Utility function to get the appropriate client based on database type
export function getPrismaClient(databaseType: 'main' | 'gyg' = 'main') {
  return databaseType === 'gyg' ? gygPrisma : mainPrisma;
}

// Utility function to test both database connections
export async function testBothDatabases() {
  const results = {
    main: { connected: false, error: null as string | null },
    gyg: { connected: false, error: null as string | null },
  };

  // Test main database
  try {
    await mainPrisma.$connect();
    await mainPrisma.$queryRaw`SELECT 1`;
    results.main.connected = true;
  } catch (error) {
    results.main.error = error instanceof Error ? error.message : 'Unknown error';
  } finally {
    await mainPrisma.$disconnect();
  }

  // Test GYG database
  try {
    await gygPrisma.$connect();
    await gygPrisma.$queryRaw`SELECT 1`;
    results.gyg.connected = true;
  } catch (error) {
    results.gyg.error = error instanceof Error ? error.message : 'Unknown error';
  } finally {
    await gygPrisma.$disconnect();
  }

  return results;
} 
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gygPrisma = exports.mainPrisma = void 0;
exports.getPrismaClient = getPrismaClient;
exports.testBothDatabases = testBothDatabases;
const client_1 = require("@prisma/client");
// Main database client (existing)
const mainPrismaClientSingleton = () => {
    return new client_1.PrismaClient({
        datasources: {
            db: {
                url: process.env.DATABASE_URL,
            },
        },
    });
};
// GYG database client (new)
const gygPrismaClientSingleton = () => {
    return new client_1.PrismaClient({
        datasources: {
            db: {
                url: process.env.GYG_DATABASE_URL,
            },
        },
    });
};
const mainPrisma = globalThis.mainPrisma ?? mainPrismaClientSingleton();
exports.mainPrisma = mainPrisma;
const gygPrisma = globalThis.gygPrisma ?? gygPrismaClientSingleton();
exports.gygPrisma = gygPrisma;
if (process.env.NODE_ENV !== 'production') {
    globalThis.mainPrisma = mainPrisma;
    globalThis.gygPrisma = gygPrisma;
}
// Utility function to get the appropriate client based on database type
function getPrismaClient(databaseType = 'main') {
    return databaseType === 'gyg' ? gygPrisma : mainPrisma;
}
// Utility function to test both database connections
async function testBothDatabases() {
    const results = {
        main: { connected: false, error: null },
        gyg: { connected: false, error: null },
    };
    // Test main database
    try {
        await mainPrisma.$connect();
        await mainPrisma.$queryRaw `SELECT 1`;
        results.main.connected = true;
    }
    catch (error) {
        results.main.error = error instanceof Error ? error.message : 'Unknown error';
    }
    finally {
        await mainPrisma.$disconnect();
    }
    // Test GYG database
    try {
        await gygPrisma.$connect();
        await gygPrisma.$queryRaw `SELECT 1`;
        results.gyg.connected = true;
    }
    catch (error) {
        results.gyg.error = error instanceof Error ? error.message : 'Unknown error';
    }
    finally {
        await gygPrisma.$disconnect();
    }
    return results;
}
//# sourceMappingURL=dual-prisma.js.map
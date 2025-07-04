"use strict";
const { PrismaClient } = require('@prisma/client');
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
let mainPrisma = global.mainPrisma || mainPrismaClientSingleton();
let gygPrisma = global.gygPrisma || gygPrismaClientSingleton();
if (process.env.NODE_ENV !== 'production') {
    global.mainPrisma = mainPrisma;
    global.gygPrisma = gygPrisma;
}
function getPrismaClient(databaseType = 'main') {
    return databaseType === 'gyg' ? gygPrisma : mainPrisma;
}
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
module.exports = {
    mainPrisma,
    gygPrisma,
    getPrismaClient,
    testBothDatabases,
};
//# sourceMappingURL=dual-prisma.js.map
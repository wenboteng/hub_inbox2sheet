"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testDualDatabase = testDualDatabase;
const dual_prisma_1 = require("../lib/dual-prisma");
async function testDualDatabase() {
    console.log('🔍 TESTING DUAL DATABASE CONNECTIONS...\n');
    // Check environment variables
    console.log('1. Checking environment variables...');
    const mainDbUrl = process.env.DATABASE_URL;
    const gygDbUrl = process.env.GYG_DATABASE_URL;
    if (!mainDbUrl) {
        console.error('❌ DATABASE_URL environment variable is not set!');
    }
    else {
        const maskedMainUrl = mainDbUrl.replace(/:([^@]+)@/, ':****@');
        console.log(`✅ DATABASE_URL is set: ${maskedMainUrl}`);
    }
    if (!gygDbUrl) {
        console.error('❌ GYG_DATABASE_URL environment variable is not set!');
        console.log('💡 Please set GYG_DATABASE_URL for your GetYourGuide database');
    }
    else {
        const maskedGygUrl = gygDbUrl.replace(/:([^@]+)@/, ':****@');
        console.log(`✅ GYG_DATABASE_URL is set: ${maskedGygUrl}`);
    }
    // Test both database connections
    console.log('\n2. Testing database connections...');
    const results = await (0, dual_prisma_1.testBothDatabases)();
    console.log('\n📊 CONNECTION RESULTS:');
    if (results.main.connected) {
        console.log('✅ Main database: CONNECTED');
    }
    else {
        console.log('❌ Main database: FAILED');
        console.log(`   Error: ${results.main.error}`);
    }
    if (results.gyg.connected) {
        console.log('✅ GYG database: CONNECTED');
    }
    else {
        console.log('❌ GYG database: FAILED');
        console.log(`   Error: ${results.gyg.error}`);
    }
    // Test data access if connections are successful
    if (results.main.connected) {
        console.log('\n3. Testing main database data access...');
        try {
            await dual_prisma_1.mainPrisma.$connect();
            const articleCount = await dual_prisma_1.mainPrisma.article.count();
            console.log(`✅ Main database: Found ${articleCount} articles`);
            await dual_prisma_1.mainPrisma.$disconnect();
        }
        catch (error) {
            console.error('❌ Main database data access failed:', error);
        }
    }
    if (results.gyg.connected) {
        console.log('\n4. Testing GYG database data access...');
        try {
            await dual_prisma_1.gygPrisma.$connect();
            // Try to get table information
            const tables = await dual_prisma_1.gygPrisma.$queryRaw `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `;
            console.log(`✅ GYG database: Found ${tables.length} tables`);
            console.log('   Tables:', tables.map((t) => t.table_name).join(', '));
            await dual_prisma_1.gygPrisma.$disconnect();
        }
        catch (error) {
            console.error('❌ GYG database data access failed:', error);
        }
    }
    // Summary
    console.log('\n📋 SUMMARY:');
    if (results.main.connected && results.gyg.connected) {
        console.log('🎉 Both databases are connected and ready for use!');
        console.log('💡 You can now use the dual database functionality.');
    }
    else if (results.main.connected) {
        console.log('⚠️  Only main database is connected. GYG database needs configuration.');
    }
    else if (results.gyg.connected) {
        console.log('⚠️  Only GYG database is connected. Main database needs configuration.');
    }
    else {
        console.log('❌ Neither database is connected. Please check your configuration.');
    }
    console.log('\n🔧 NEXT STEPS:');
    console.log('1. If GYG database is connected, you can run data extraction scripts');
    console.log('2. Use the dual-prisma utilities to work with both databases');
    console.log('3. Set up data processing pipelines for GYG data');
}
// Run the test
if (require.main === module) {
    testDualDatabase()
        .catch(console.error)
        .finally(() => {
        console.log('\n🏁 Dual database test completed');
    });
}
//# sourceMappingURL=test-dual-database.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const expedia_1 = require("../crawlers/expedia");
const prisma = new client_1.PrismaClient();
async function testNewSources() {
    console.log('🧪 TESTING NEW SOURCES');
    console.log('======================\n');
    try {
        const existingArticles = await prisma.article.findMany({
            select: { url: true },
        });
        const existingUrlSet = new Set(existingArticles.map(a => a.url));
        console.log(`📊 Found ${existingUrlSet.size} existing articles`);
        // Test Expedia
        console.log('\n🔧 Testing Expedia...');
        try {
            const expediaArticles = await (0, expedia_1.crawlExpedia)();
            console.log(`✅ Expedia: ${expediaArticles.length} articles found`);
            if (expediaArticles.length > 0) {
                console.log('📋 Sample Expedia articles:');
                expediaArticles.slice(0, 3).forEach(article => {
                    console.log(`   - ${article.question}`);
                });
            }
        }
        catch (error) {
            console.log(`❌ Expedia test failed: ${error}`);
        }
        console.log('\n✅ Test completed');
    }
    catch (error) {
        console.error('❌ Test failed:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
testNewSources();
//# sourceMappingURL=test-new-sources.js.map
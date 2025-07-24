"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function testRedditFallback() {
    console.log('🧪 TESTING REDDIT FALLBACK MECHANISM');
    console.log('=====================================\n');
    try {
        // Get current Reddit article count
        const currentCount = await prisma.article.count({
            where: { platform: 'Reddit' }
        });
        console.log(`📊 Current Reddit articles in database: ${currentCount.toLocaleString()}`);
        console.log('');
        // Test OAuth crawler first
        console.log('🔐 Testing OAuth Reddit crawler...');
        try {
            const { crawlRedditOAuth } = await Promise.resolve().then(() => __importStar(require('../src/crawlers/reddit-oauth')));
            const oauthStats = await crawlRedditOAuth();
            console.log('✅ OAuth Reddit crawler SUCCESSFUL');
            console.log(`   - Subreddits processed: ${oauthStats.subredditsProcessed}`);
            console.log(`   - Posts extracted: ${oauthStats.postsExtracted}`);
            console.log(`   - Comments extracted: ${oauthStats.commentsExtracted}`);
        }
        catch (oauthError) {
            console.log('❌ OAuth Reddit crawler FAILED');
            console.log(`   - Error: ${oauthError.message}`);
            // Test basic crawler as fallback
            console.log('\n🔄 Testing basic Reddit crawler as fallback...');
            try {
                const { crawlReddit } = await Promise.resolve().then(() => __importStar(require('../src/crawlers/reddit')));
                const basicStats = await crawlReddit();
                console.log('✅ Basic Reddit crawler SUCCESSFUL');
                console.log(`   - Subreddits processed: ${basicStats.subredditsProcessed}`);
                console.log(`   - Posts extracted: ${basicStats.postsExtracted}`);
                console.log(`   - Comments extracted: ${basicStats.commentsExtracted}`);
            }
            catch (basicError) {
                console.log('❌ Basic Reddit crawler also FAILED');
                console.log(`   - Error: ${basicError.message}`);
            }
        }
        // Get final count
        const finalCount = await prisma.article.count({
            where: { platform: 'Reddit' }
        });
        console.log('\n📈 RESULTS:');
        console.log('===========');
        console.log(`Articles before: ${currentCount.toLocaleString()}`);
        console.log(`Articles after: ${finalCount.toLocaleString()}`);
        console.log(`New articles: ${(finalCount - currentCount).toLocaleString()}`);
    }
    catch (error) {
        console.error('❌ Test failed:', error.message);
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run the test if this file is executed directly
if (require.main === module) {
    testRedditFallback()
        .then(() => {
        console.log('\n✅ Reddit fallback test completed');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n❌ Reddit fallback test failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=test-reddit-fallback.js.map
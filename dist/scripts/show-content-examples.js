#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function showContentExamples() {
    console.log('📋 CONTENT QUALITY ANALYSIS');
    console.log('===========================');
    try {
        await prisma.$connect();
        // Get current articles by platform
        const articles = await prisma.article.findMany({
            select: {
                id: true,
                platform: true,
                question: true,
                answer: true,
                category: true,
                contentType: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        console.log(`\n📊 CURRENT CONTENT EXAMPLES (${articles.length} articles):`);
        console.log('==================================================');
        // Group by platform
        const byPlatform = articles.reduce((acc, article) => {
            if (!acc[article.platform]) {
                acc[article.platform] = [];
            }
            acc[article.platform].push(article);
            return acc;
        }, {});
        // Show examples from each platform
        Object.entries(byPlatform).forEach(([platform, platformArticles]) => {
            console.log(`\n🏷️  ${platform.toUpperCase()} (${platformArticles.length} articles):`);
            console.log('─'.repeat(50));
            platformArticles.slice(0, 3).forEach((article, index) => {
                console.log(`\n${index + 1}. Question: "${article.question}"`);
                console.log(`   Category: ${article.category}`);
                console.log(`   Content Type: ${article.contentType}`);
                console.log(`   Answer Preview: "${article.answer.substring(0, 150)}..."`);
                console.log(`   Length: ${article.answer.length} characters`);
            });
        });
        // Show what was likely deleted (examples based on cleanup criteria)
        console.log('\n\n🗑️  EXAMPLES OF WHAT WAS LIKELY DELETED:');
        console.log('==========================================');
        console.log('\n❌ 1. Empty Questions:');
        console.log('   Question: ""');
        console.log('   Answer: "We got a full 5G signal sailing up fjords..."');
        console.log('   Reason: No question/title extracted');
        console.log('\n❌ 2. Technical/JavaScript Content:');
        console.log('   Question: "How do I view linting errors when i run gulp?"');
        console.log('   Answer: "Have you tried setting your eslint configuration..."');
        console.log('   Reason: Not travel/tour vendor related');
        console.log('\n❌ 3. Mobile/Phone Content:');
        console.log('   Question: "Mobile phone signal whilst cruising Norwegian Fjords"');
        console.log('   Answer: "We never had a connection problem in Norway..."');
        console.log('   Reason: About mobile signals, not travel services');
        console.log('\n❌ 4. JavaScript Artifacts:');
        console.log('   Question: "Topics for Travelers"');
        console.log('   Answer: "Manage My BookingEnglish (US)English (GB)DanskDeutsch..."');
        console.log('   Reason: Navigation menu content, not actual travel Q&A');
        console.log('\n❌ 5. Very Short Content:');
        console.log('   Question: "Pool and garden"');
        console.log('   Answer: "Hello, I have been renting out my house..."');
        console.log('   Reason: Too short or not substantial enough');
        // Show quality metrics
        console.log('\n\n📈 QUALITY METRICS:');
        console.log('==================');
        const qualityStats = {
            hasQuestion: articles.filter(a => a.question && a.question.trim().length > 0).length,
            reasonableLength: articles.filter(a => a.answer.length >= 50 && a.answer.length <= 2000).length,
            travelRelated: articles.filter(a => {
                const text = (a.question + ' ' + a.answer).toLowerCase();
                return /tour|guide|booking|reservation|package|excursion|activity|attraction|hotel|accommodation|travel|trip|destination|cruise|flight|airline|vacation|holiday/.test(text);
            }).length
        };
        console.log(`✅ Articles with questions: ${qualityStats.hasQuestion}/${articles.length} (${Math.round(qualityStats.hasQuestion / articles.length * 100)}%)`);
        console.log(`✅ Articles with reasonable length: ${qualityStats.reasonableLength}/${articles.length} (${Math.round(qualityStats.reasonableLength / articles.length * 100)}%)`);
        console.log(`✅ Travel-related content: ${qualityStats.travelRelated}/${articles.length} (${Math.round(qualityStats.travelRelated / articles.length * 100)}%)`);
        // Show some high-quality examples
        console.log('\n\n✅ HIGH-QUALITY CONTENT EXAMPLES:');
        console.log('==================================');
        const highQualityArticles = articles.filter(a => a.question && a.question.trim().length > 0 &&
            a.answer.length >= 100 && a.answer.length <= 2000 &&
            /tour|guide|booking|reservation|package|excursion|activity|attraction|hotel|accommodation|travel|trip|destination|cruise|flight|airline|vacation|holiday/.test((a.question + ' ' + a.answer).toLowerCase())).slice(0, 5);
        highQualityArticles.forEach((article, index) => {
            console.log(`\n${index + 1}. Platform: ${article.platform}`);
            console.log(`   Question: "${article.question}"`);
            console.log(`   Answer: "${article.answer.substring(0, 200)}..."`);
            console.log(`   Quality Score: Excellent`);
        });
    }
    catch (error) {
        console.error('❌ Error analyzing content:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run the analysis if this file is executed directly
if (require.main === module) {
    showContentExamples().then(() => {
        console.log('\n📋 Content analysis completed');
        process.exit(0);
    }).catch((error) => {
        console.error('❌ Analysis failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=show-content-examples.js.map
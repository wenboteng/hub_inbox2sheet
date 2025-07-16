"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function testSEOFiltering() {
    console.log('🔍 TESTING SEO FILTERING SYSTEM');
    console.log('================================\n');
    try {
        // Get all articles
        const articles = await prisma.article.findMany({
            where: { crawlStatus: 'active' },
            select: {
                id: true,
                question: true,
                answer: true,
                platform: true,
                slug: true,
                contentType: true,
            }
        });
        console.log(`📊 Analyzing ${articles.length} articles for SEO filtering...\n`);
        let indexedCount = 0;
        let noindexCount = 0;
        const noindexReasons = {};
        articles.forEach(article => {
            // Calculate metrics
            const wordCount = article.answer.split(' ').length;
            const charCount = article.answer.length;
            // SEO quality criteria
            const hasSubstantialContent = wordCount >= 100 || charCount >= 500;
            const isNotCodeSnippet = !article.answer.includes('```') && !article.answer.includes('function(');
            const isNotVeryShort = wordCount >= 50;
            const isSEOQuality = hasSubstantialContent && isNotCodeSnippet && isNotVeryShort;
            if (isSEOQuality) {
                indexedCount++;
            }
            else {
                noindexCount++;
                // Track reasons for noindex
                if (!hasSubstantialContent) {
                    noindexReasons['Too Short'] = (noindexReasons['Too Short'] || 0) + 1;
                }
                if (!isNotCodeSnippet) {
                    noindexReasons['Code Snippet'] = (noindexReasons['Code Snippet'] || 0) + 1;
                }
                if (!isNotVeryShort) {
                    noindexReasons['Very Short'] = (noindexReasons['Very Short'] || 0) + 1;
                }
            }
        });
        // Print results
        console.log('📈 SEO FILTERING RESULTS:');
        console.log('==========================');
        console.log(`✅ Will be indexed: ${indexedCount} articles (${(indexedCount / articles.length * 100).toFixed(1)}%)`);
        console.log(`❌ Will be noindexed: ${noindexCount} articles (${(noindexCount / articles.length * 100).toFixed(1)}%)`);
        console.log('\n🔍 NOINDEX REASONS:');
        console.log('===================');
        Object.entries(noindexReasons).forEach(([reason, count]) => {
            console.log(`   ${reason}: ${count} articles`);
        });
        // Platform breakdown
        console.log('\n🏢 PLATFORM BREAKDOWN:');
        console.log('=====================');
        const platformStats = articles.reduce((acc, article) => {
            const wordCount = article.answer.split(' ').length;
            const charCount = article.answer.length;
            const hasSubstantialContent = wordCount >= 100 || charCount >= 500;
            const isNotCodeSnippet = !article.answer.includes('```') && !article.answer.includes('function(');
            const isNotVeryShort = wordCount >= 50;
            const isSEOQuality = hasSubstantialContent && isNotCodeSnippet && isNotVeryShort;
            if (!acc[article.platform]) {
                acc[article.platform] = { total: 0, indexed: 0, noindex: 0 };
            }
            acc[article.platform].total++;
            if (isSEOQuality) {
                acc[article.platform].indexed++;
            }
            else {
                acc[article.platform].noindex++;
            }
            return acc;
        }, {});
        Object.entries(platformStats).forEach(([platform, stats]) => {
            const indexedPercent = (stats.indexed / stats.total * 100).toFixed(1);
            const noindexPercent = (stats.noindex / stats.total * 100).toFixed(1);
            console.log(`   ${platform}: ${stats.indexed}/${stats.total} indexed (${indexedPercent}%)`);
        });
        // Sitemap impact
        console.log('\n🗺️ SITEMAP IMPACT:');
        console.log('==================');
        const staticPages = 7; // Home, search, submit, reports, privacy, terms, platform pages
        const platformPages = Object.keys(platformStats).length;
        const reportPages = 5; // Your reports
        const totalSitemapUrls = staticPages + platformPages + indexedCount + reportPages;
        console.log(`   Static pages: ${staticPages}`);
        console.log(`   Platform pages: ${platformPages}`);
        console.log(`   Quality articles: ${indexedCount}`);
        console.log(`   Report pages: ${reportPages}`);
        console.log(`   Total sitemap URLs: ${totalSitemapUrls}`);
        console.log(`\n📊 Before filtering: ~${articles.length + staticPages + platformPages + reportPages} URLs`);
        console.log(`📊 After filtering: ${totalSitemapUrls} URLs`);
        console.log(`📊 Reduction: ${articles.length - indexedCount} URLs (${((articles.length - indexedCount) / articles.length * 100).toFixed(1)}%)`);
        // SEO benefits
        console.log('\n🎯 SEO BENEFITS:');
        console.log('================');
        console.log('✅ Higher average content quality');
        console.log('✅ Better site authority');
        console.log('✅ Improved crawl efficiency');
        console.log('✅ Focus on valuable content');
        console.log('✅ Data still available for analysis');
    }
    catch (error) {
        console.error('❌ Error during SEO filtering test:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
testSEOFiltering().catch(console.error);
//# sourceMappingURL=test-seo-filtering.js.map
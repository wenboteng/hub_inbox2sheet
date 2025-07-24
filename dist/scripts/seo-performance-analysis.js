"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fs_1 = require("fs");
const path_1 = require("path");
const prisma = new client_1.PrismaClient();
async function analyzeSEOPerformance() {
    console.log('🔍 COMPREHENSIVE SEO PERFORMANCE ANALYSIS');
    console.log('==========================================\n');
    try {
        await prisma.$connect();
        console.log('✅ Database connected successfully\n');
        // 1. CONTENT OVERVIEW
        console.log('1️⃣ CONTENT OVERVIEW');
        console.log('===================');
        const totalArticles = await prisma.article.count();
        const activeArticles = await prisma.article.count({
            where: { crawlStatus: 'active' }
        });
        const errorArticles = await prisma.article.count({
            where: { crawlStatus: 'error' }
        });
        const duplicateArticles = await prisma.article.count({
            where: { isDuplicate: true }
        });
        console.log(`📚 Total Articles: ${totalArticles.toLocaleString()}`);
        console.log(`✅ Active Articles: ${activeArticles.toLocaleString()}`);
        console.log(`❌ Error Articles: ${errorArticles.toLocaleString()}`);
        console.log(`🔄 Duplicate Articles: ${duplicateArticles.toLocaleString()}`);
        console.log(`📊 Indexing Rate: ${((activeArticles / totalArticles) * 100).toFixed(1)}%\n`);
        // 2. PLATFORM PERFORMANCE
        console.log('2️⃣ PLATFORM PERFORMANCE');
        console.log('=======================');
        const platformStats = await prisma.article.groupBy({
            by: ['platform'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } }
        });
        const platformAnalysis = [];
        for (const stat of platformStats) {
            const platformArticles = await prisma.article.findMany({
                where: { platform: stat.platform },
                select: { createdAt: true, crawlStatus: true }
            });
            const avgAge = platformArticles.length > 0
                ? Math.round((Date.now() - platformArticles[0].createdAt.getTime()) / (1000 * 60 * 60 * 24))
                : 0;
            const indexedCount = platformArticles.filter(a => a.crawlStatus === 'active').length;
            const indexedRate = platformArticles.length > 0
                ? (indexedCount / platformArticles.length) * 100
                : 0;
            // Calculate SEO score based on content quality
            const seoScore = Math.min(100, Math.max(0, (indexedRate * 0.4) +
                (Math.max(0, 30 - avgAge) * 2) +
                (stat._count.id > 100 ? 20 : stat._count.id * 0.2)));
            platformAnalysis.push({
                platform: stat.platform,
                count: stat._count.id,
                avgAge,
                seoScore: Math.round(seoScore),
                indexedRate: Math.round(indexedRate)
            });
        }
        platformAnalysis
            .sort((a, b) => b.seoScore - a.seoScore)
            .forEach(platform => {
            console.log(`🏢 ${platform.platform.toUpperCase()}:`);
            console.log(`   📊 Articles: ${platform.count.toLocaleString()}`);
            console.log(`   📈 SEO Score: ${platform.seoScore}/100`);
            console.log(`   🔍 Indexed: ${platform.indexedRate}%`);
            console.log(`   ⏰ Avg Age: ${platform.avgAge} days`);
            console.log('');
        });
        // 3. KEYWORD PERFORMANCE
        console.log('3️⃣ KEYWORD PERFORMANCE');
        console.log('======================');
        // Load SEO report if available
        let seoReport = null;
        const seoReportPath = (0, path_1.join)(process.cwd(), 'seo-monitoring-report.json');
        if ((0, fs_1.existsSync)(seoReportPath)) {
            try {
                const reportData = JSON.parse((0, fs_1.readFileSync)(seoReportPath, 'utf8'));
                seoReport = reportData.seoReport;
            }
            catch (error) {
                console.log('⚠️ Could not load SEO report data');
            }
        }
        if (seoReport) {
            console.log(`📅 Report Date: ${seoReport.date}`);
            console.log(`📈 Average Ranking: ${seoReport.averageRanking.toFixed(1)}`);
            console.log(`🎯 Top Keywords: ${seoReport.topKeywords.length}`);
            const top10Keywords = seoReport.topKeywords.filter(k => k.position <= 10).length;
            const top20Keywords = seoReport.topKeywords.filter(k => k.position <= 20).length;
            console.log(`🏆 Keywords in Top 10: ${top10Keywords}`);
            console.log(`🏆 Keywords in Top 20: ${top20Keywords}`);
            if (seoReport.topKeywords.length > 0) {
                console.log('\n🏆 TOP PERFORMING KEYWORDS:');
                seoReport.topKeywords
                    .filter(k => k.position <= 10)
                    .slice(0, 5)
                    .forEach((keyword, index) => {
                    console.log(`${index + 1}. "${keyword.keyword}" - Position #${keyword.position}`);
                });
            }
        }
        else {
            console.log('⚠️ No SEO report data available');
            console.log('💡 Run: npm run automation:seo-monitoring');
        }
        console.log('');
        // 4. CONTENT QUALITY ANALYSIS
        console.log('4️⃣ CONTENT QUALITY ANALYSIS');
        console.log('===========================');
        const contentTypeStats = await prisma.article.groupBy({
            by: ['contentType'],
            _count: { id: true }
        });
        contentTypeStats.forEach(stat => {
            console.log(`📝 ${stat.contentType}: ${stat._count.id.toLocaleString()} articles`);
        });
        // Check for content gaps
        const recentArticles = await prisma.article.count({
            where: {
                createdAt: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                }
            }
        });
        console.log(`\n📅 Recent Activity (7 days): ${recentArticles} articles`);
        if (recentArticles === 0) {
            console.log('⚠️ No recent content - SEO performance may decline');
        }
        else if (recentArticles < 10) {
            console.log('⚠️ Low recent activity - consider increasing content production');
        }
        else {
            console.log('✅ Good recent activity - SEO performance should be stable');
        }
        console.log('');
        // 5. TECHNICAL SEO ISSUES
        console.log('5️⃣ TECHNICAL SEO ISSUES');
        console.log('=======================');
        const technicalIssues = [];
        if (errorArticles > 0) {
            technicalIssues.push(`${errorArticles} articles have crawl errors`);
        }
        if (duplicateArticles > 0) {
            technicalIssues.push(`${duplicateArticles} duplicate articles detected`);
        }
        const oldContent = platformAnalysis.filter(p => p.avgAge > 30).length;
        if (oldContent > 0) {
            technicalIssues.push(`${oldContent} platforms have content older than 30 days`);
        }
        const lowIndexingPlatforms = platformAnalysis.filter(p => p.indexedRate < 90).length;
        if (lowIndexingPlatforms > 0) {
            technicalIssues.push(`${lowIndexingPlatforms} platforms have low indexing rates`);
        }
        if (technicalIssues.length === 0) {
            console.log('✅ No critical technical SEO issues detected');
        }
        else {
            technicalIssues.forEach(issue => {
                console.log(`❌ ${issue}`);
            });
        }
        console.log('');
        // 6. SEO SCORE CALCULATION
        console.log('6️⃣ OVERALL SEO SCORE');
        console.log('=====================');
        // Calculate overall SEO score
        const indexingScore = (activeArticles / totalArticles) * 30; // 30% weight
        const contentScore = Math.min(30, (totalArticles / 1000) * 30); // 30% weight
        const recencyScore = recentArticles > 0 ? Math.min(20, (recentArticles / 20) * 20) : 0; // 20% weight
        const qualityScore = errorArticles === 0 ? 20 : Math.max(0, 20 - (errorArticles / 10)); // 20% weight
        const overallSEOScore = Math.round(indexingScore + contentScore + recencyScore + qualityScore);
        console.log(`📊 Overall SEO Score: ${overallSEOScore}/100`);
        console.log(`   🔍 Indexing Score: ${Math.round(indexingScore)}/30`);
        console.log(`   📚 Content Score: ${Math.round(contentScore)}/30`);
        console.log(`   ⏰ Recency Score: ${Math.round(recencyScore)}/20`);
        console.log(`   ✅ Quality Score: ${Math.round(qualityScore)}/20`);
        // SEO Score interpretation
        if (overallSEOScore >= 80) {
            console.log('\n🎉 EXCELLENT: Your SEO performance is outstanding!');
        }
        else if (overallSEOScore >= 60) {
            console.log('\n✅ GOOD: Your SEO performance is solid with room for improvement');
        }
        else if (overallSEOScore >= 40) {
            console.log('\n⚠️ FAIR: Your SEO needs attention to improve performance');
        }
        else {
            console.log('\n🚨 POOR: Your SEO requires immediate attention');
        }
        console.log('');
        // 7. RECOMMENDATIONS
        console.log('7️⃣ ACTIONABLE RECOMMENDATIONS');
        console.log('=============================');
        const recommendations = [];
        // Content recommendations
        if (recentArticles < 10) {
            recommendations.push('📝 Increase content production - aim for 10+ articles per week');
        }
        if (errorArticles > 0) {
            recommendations.push('🔧 Fix crawl errors to improve indexing');
        }
        if (duplicateArticles > 0) {
            recommendations.push('🔄 Remove or merge duplicate content');
        }
        // Platform-specific recommendations
        const lowPerformingPlatforms = platformAnalysis.filter(p => p.seoScore < 50);
        if (lowPerformingPlatforms.length > 0) {
            recommendations.push(`🎯 Focus on improving content for: ${lowPerformingPlatforms.map(p => p.platform).join(', ')}`);
        }
        // Technical recommendations
        if (lowIndexingPlatforms > 0) {
            recommendations.push('🔍 Improve indexing by fixing technical issues and submitting sitemaps');
        }
        if (seoReport && seoReport.averageRanking > 20) {
            recommendations.push('📈 Focus on improving keyword rankings - current average is above position 20');
        }
        if (recommendations.length === 0) {
            console.log('✅ No immediate actions required - SEO performance is good');
        }
        else {
            recommendations.forEach((rec, index) => {
                console.log(`${index + 1}. ${rec}`);
            });
        }
        console.log('');
        // 8. TRAFFIC PROJECTIONS
        console.log('8️⃣ TRAFFIC PROJECTIONS');
        console.log('======================');
        // Estimate organic traffic potential
        const estimatedTraffic = Math.round((totalArticles * 0.8) * // Assuming 80% of articles get some traffic
            (overallSEOScore / 100) * // SEO score as traffic multiplier
            2.5 // Base traffic per article
        );
        console.log(`📊 Estimated Monthly Organic Traffic: ${estimatedTraffic.toLocaleString()} visitors`);
        console.log(`📈 Traffic Potential (with 80+ SEO score): ${Math.round(estimatedTraffic * 1.5).toLocaleString()} visitors`);
        if (overallSEOScore < 60) {
            console.log('💡 Improving SEO score to 80+ could increase traffic by 50%+');
        }
        console.log('');
        // 9. COMPETITIVE ANALYSIS
        console.log('9️⃣ COMPETITIVE ANALYSIS');
        console.log('=======================');
        console.log('🏢 Your Content Strengths:');
        console.log(`   • ${totalArticles.toLocaleString()} articles across ${platformStats.length} platforms`);
        console.log(`   • ${((activeArticles / totalArticles) * 100).toFixed(1)}% indexing rate`);
        console.log(`   • ${recentArticles} articles in last 7 days`);
        console.log('\n🎯 Areas for Competitive Advantage:');
        if (overallSEOScore < 70) {
            console.log('   • Improve overall SEO score for better rankings');
        }
        if (recentArticles < 20) {
            console.log('   • Increase content velocity to stay ahead of competitors');
        }
        if (platformAnalysis.some(p => p.seoScore < 50)) {
            console.log('   • Strengthen content quality across all platforms');
        }
        console.log('');
        // 10. MONITORING SETUP
        console.log('🔟 MONITORING RECOMMENDATIONS');
        console.log('=============================');
        console.log('📊 Set up monitoring for:');
        console.log('   • Weekly SEO score tracking');
        console.log('   • Keyword ranking changes');
        console.log('   • Content indexing status');
        console.log('   • Platform performance metrics');
        console.log('   • Traffic growth patterns');
        console.log('\n🛠️ Recommended tools:');
        console.log('   • Google Search Console (free)');
        console.log('   • Google Analytics (free)');
        console.log('   • Run: npm run automation:seo-monitoring (weekly)');
        console.log('   • Run: npm run check:content-stats (daily)');
    }
    catch (error) {
        console.error('❌ Error analyzing SEO performance:', error);
    }
    finally {
        await prisma.$disconnect();
        console.log('\n🔌 Database disconnected');
    }
}
// Run the analysis
analyzeSEOPerformance()
    .then(() => {
    console.log('\n✅ SEO performance analysis completed!');
    process.exit(0);
})
    .catch((error) => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
});
//# sourceMappingURL=seo-performance-analysis.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const prisma = new client_1.PrismaClient();
async function showLondonReportSummary() {
    console.log('🇬🇧 LONDON MARKET INTELLIGENCE REPORT - KEY HIGHLIGHTS\n');
    console.log('========================================================\n');
    try {
        // Get the report
        const report = await prisma.report.findFirst({
            where: { slug: 'london-market-intelligence-report-2025' }
        });
        if (!report) {
            console.log('❌ Report not found');
            return;
        }
        console.log(`📄 Report: ${report.title}`);
        console.log(`🔗 Slug: ${report.slug}`);
        console.log(`📅 Created: ${report.createdAt.toLocaleDateString()}`);
        console.log(`🌐 Public: ${report.isPublic ? 'Yes' : 'No'}\n`);
        // Extract key metrics from the content
        const content = report.content;
        // Find key statistics using regex
        const totalActivitiesMatch = content.match(/Total Activities Analyzed:\s*([\d,]+)/);
        const avgPriceMatch = content.match(/Average Price\s*\|\s*£([\d.]+)/);
        const avgRatingMatch = content.match(/Average Rating\s*\|\s*([\d.]+)\/5/);
        const priceCoverageMatch = content.match(/Activities with Pricing Data:\s*([\d,]+)\s*\((\d+)%\)/);
        const ratingCoverageMatch = content.match(/Activities with Rating Data:\s*([\d,]+)\s*\((\d+)%\)/);
        console.log('📊 KEY METRICS:');
        console.log('===============');
        console.log(`Total Activities: ${totalActivitiesMatch?.[1] || 'N/A'}`);
        console.log(`Average Price: £${avgPriceMatch?.[1] || 'N/A'}`);
        console.log(`Average Rating: ${avgRatingMatch?.[1] || 'N/A'}/5`);
        console.log(`Price Coverage: ${priceCoverageMatch?.[2] || 'N/A'}%`);
        console.log(`Rating Coverage: ${ratingCoverageMatch?.[2] || 'N/A'}%\n`);
        // Extract platform information
        const platformMatches = content.matchAll(/\*\*([A-Z]+)\*\*\n- Activities: ([\d,]+) \((\d+)%\)/g);
        console.log('🔗 PLATFORM BREAKDOWN:');
        console.log('=====================');
        for (const match of platformMatches) {
            console.log(`${match[1]}: ${match[2]} activities (${match[3]}%)`);
        }
        console.log('');
        // Extract top providers
        const providerMatches = content.matchAll(/\*\*([^*]+)\*\*: ([\d,]+) activities, £([\d.]+) avg price/g);
        console.log('🏆 TOP PROVIDERS:');
        console.log('=================');
        let count = 0;
        for (const match of providerMatches) {
            if (count < 5) {
                console.log(`${count + 1}. ${match[1]}: ${match[2]} activities, £${match[3]} avg`);
                count++;
            }
        }
        console.log('');
        // Extract price segments
        const priceSegmentMatches = content.matchAll(/\| ([^|]+) \| ([\d,]+) \| (\d+)% \| £([\d.]+) \|/g);
        console.log('💰 PRICE SEGMENTS:');
        console.log('==================');
        for (const match of priceSegmentMatches) {
            console.log(`${match[1]}: ${match[2]} activities (${match[3]}%) - £${match[4]} avg`);
        }
        console.log('');
        // Extract rating distribution
        const ratingMatches = content.matchAll(/\| ([^|]+) \| ([\d,]+) \| (\d+)% \|/g);
        console.log('⭐ RATING DISTRIBUTION:');
        console.log('=======================');
        for (const match of ratingMatches) {
            if (match[1].includes('Excellent') || match[1].includes('Good') || match[1].includes('Average') || match[1].includes('Poor')) {
                console.log(`${match[1]}: ${match[2]} activities (${match[3]}%)`);
            }
        }
        console.log('');
        console.log('🎯 STRATEGIC INSIGHTS:');
        console.log('======================');
        console.log('✅ High-quality data coverage (97% pricing, 82% ratings)');
        console.log('✅ Strong market diversity with activities from £0 to £1,870');
        console.log('✅ Platform-specific pricing opportunities');
        console.log('✅ Clear competitive landscape with top 15 providers');
        console.log('✅ Actionable recommendations for market entry');
        console.log('');
        console.log('📋 REPORT SECTIONS:');
        console.log('===================');
        console.log('1. Executive Summary & Market Overview');
        console.log('2. Pricing Intelligence & Price Segments');
        console.log('3. Platform Performance Analysis');
        console.log('4. Competitive Landscape (Top 15 Providers)');
        console.log('5. Quality & Rating Analysis');
        console.log('6. Market Opportunities & Strategic Recommendations');
        console.log('');
        console.log('🔗 ACCESS THE REPORT:');
        console.log('=====================');
        console.log(`API Endpoint: /api/reports/london-market-intelligence-report-2025`);
        console.log(`Direct URL: /reports/london-market-intelligence-report-2025`);
        console.log('');
        console.log('✅ Report successfully generated and ready for tour vendors!');
    }
    catch (error) {
        console.error('❌ Error showing report summary:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
showLondonReportSummary().catch(console.error);
//# sourceMappingURL=london-report-summary.js.map
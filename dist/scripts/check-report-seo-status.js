"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkReportSEOStatus = checkReportSEOStatus;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function checkReportSEOStatus() {
    console.log('🔍 REPORT SEO STATUS CHECKER');
    console.log('============================\n');
    try {
        // Get all public reports
        const reports = await prisma.report.findMany({
            where: { isPublic: true },
            orderBy: { updatedAt: 'desc' }
        });
        console.log(`📊 Found ${reports.length} public reports:\n`);
        reports.forEach((report, index) => {
            const daysOld = Math.round((Date.now() - report.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
            const wordCount = report.content.split(' ').length;
            console.log(`${index + 1}. ${report.title}`);
            console.log(`   URL: https://otaanswers.com/reports/${report.slug}`);
            console.log(`   Type: ${report.type}`);
            console.log(`   Updated: ${daysOld} days ago`);
            console.log(`   Word Count: ${wordCount.toLocaleString()}`);
            console.log(`   Status: ${daysOld < 30 ? '✅ Fresh' : daysOld < 90 ? '⚠️ Needs Update' : '❌ Stale'}`);
            console.log('');
        });
        // Check sitemap inclusion
        console.log('🗺️ SITEMAP STATUS:');
        console.log('==================\n');
        const sitemapReports = reports.filter(r => r.slug);
        console.log(`✅ ${sitemapReports.length} reports will be included in sitemap`);
        console.log(`❌ ${reports.length - sitemapReports.length} reports missing slugs`);
        if (reports.length - sitemapReports.length > 0) {
            console.log('\nReports missing slugs:');
            reports.filter(r => !r.slug).forEach(r => {
                console.log(`   - ${r.title} (${r.type})`);
            });
        }
        // SEO recommendations
        console.log('\n🎯 SEO RECOMMENDATIONS:');
        console.log('======================\n');
        reports.forEach(report => {
            const daysOld = Math.round((Date.now() - report.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
            const wordCount = report.content.split(' ').length;
            if (daysOld > 30) {
                console.log(`🔄 Update "${report.title}" (${daysOld} days old)`);
            }
            if (wordCount < 1000) {
                console.log(`📝 Expand "${report.title}" (only ${wordCount} words)`);
            }
            if (!report.slug) {
                console.log(`🔗 Add slug for "${report.title}"`);
            }
        });
        // Check for high-value reports
        console.log('\n💎 HIGH-VALUE REPORTS:');
        console.log('=====================\n');
        const highValueReports = reports.filter(r => r.title.toLowerCase().includes('airbnb') ||
            r.title.toLowerCase().includes('ranking') ||
            r.title.toLowerCase().includes('algorithm') ||
            r.title.toLowerCase().includes('guide'));
        highValueReports.forEach(report => {
            console.log(`⭐ ${report.title}`);
            console.log(`   Priority: HIGH - Consider aggressive promotion`);
            console.log(`   URL: https://otaanswers.com/reports/${report.slug}`);
            console.log('');
        });
        // Performance metrics
        console.log('📈 PERFORMANCE METRICS:');
        console.log('========================\n');
        const totalWords = reports.reduce((sum, r) => sum + r.content.split(' ').length, 0);
        const avgWords = Math.round(totalWords / reports.length);
        const avgAge = Math.round(reports.reduce((sum, r) => sum + (Date.now() - r.updatedAt.getTime()) / (1000 * 60 * 60 * 24), 0) / reports.length);
        console.log(`📊 Total Reports: ${reports.length}`);
        console.log(`📝 Total Words: ${totalWords.toLocaleString()}`);
        console.log(`📊 Average Words per Report: ${avgWords.toLocaleString()}`);
        console.log(`📅 Average Age: ${avgAge} days`);
        console.log(`🔗 Reports with Slugs: ${sitemapReports.length}/${reports.length}`);
    }
    catch (error) {
        console.error('❌ Error checking report SEO status:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run the check
if (require.main === module) {
    checkReportSEOStatus()
        .then(() => {
        console.log('\n✅ SEO status check completed!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=check-report-seo-status.js.map
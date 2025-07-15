"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function fixReportLoading() {
    console.log('🔧 DIAGNOSING REPORT LOADING ISSUE');
    console.log('==================================\n');
    try {
        // Check if the report exists in database
        const report = await prisma.report.findUnique({
            where: { type: 'airbnb-ranking-algorithm' }
        });
        if (!report) {
            console.log('❌ Report not found in database');
            return;
        }
        console.log('✅ Report found in database:');
        console.log(`   Title: ${report.title}`);
        console.log(`   Slug: ${report.slug}`);
        console.log(`   Type: ${report.type}`);
        console.log(`   Public: ${report.isPublic}`);
        console.log(`   Content Length: ${report.content.length} characters`);
        // Test the API endpoint
        console.log('\n🔍 TESTING API ENDPOINT...');
        const apiUrl = `https://otaanswers.com/api/reports/${report.slug}`;
        console.log(`   API URL: ${apiUrl}`);
        try {
            const response = await fetch(apiUrl);
            const data = await response.json();
            if (response.ok) {
                console.log('✅ API endpoint working correctly');
                console.log(`   Response status: ${response.status}`);
                console.log(`   Data received: ${Object.keys(data).join(', ')}`);
            }
            else {
                console.log('❌ API endpoint error:');
                console.log(`   Status: ${response.status}`);
                console.log(`   Error: ${data.error}`);
            }
        }
        catch (error) {
            console.log('❌ API fetch failed:', error);
        }
        // Check sitemap inclusion
        console.log('\n🗺️ CHECKING SITEMAP...');
        const sitemapUrl = 'https://otaanswers.com/sitemap.xml';
        try {
            const sitemapResponse = await fetch(sitemapUrl);
            if (sitemapResponse.ok) {
                const sitemapText = await sitemapResponse.text();
                if (sitemapText.includes(report.slug)) {
                    console.log('✅ Report included in sitemap');
                }
                else {
                    console.log('❌ Report NOT included in sitemap');
                }
            }
            else {
                console.log('❌ Sitemap not accessible');
            }
        }
        catch (error) {
            console.log('❌ Sitemap fetch failed:', error);
        }
        // Provide immediate action steps
        console.log('\n🚀 IMMEDIATE ACTION STEPS:');
        console.log('==========================');
        console.log('1. Go to Google Search Console');
        console.log('2. Add sitemap: https://otaanswers.com/sitemap.xml');
        console.log('3. Request indexing for: https://otaanswers.com/reports/' + report.slug);
        console.log('4. Wait 24-48 hours for Google to crawl');
        console.log('5. Check indexing status in Search Console');
        console.log('\n📱 SOCIAL MEDIA PROMOTION:');
        console.log('==========================');
        console.log('Share this URL on:');
        console.log('- LinkedIn (Airbnb host groups)');
        console.log('- Twitter/X (vacation rental community)');
        console.log('- Facebook (Airbnb host communities)');
        console.log('- Reddit (r/AirBnBHosts)');
    }
    catch (error) {
        console.error('❌ Error:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
if (require.main === module) {
    fixReportLoading();
}
//# sourceMappingURL=fix-report-loading.js.map
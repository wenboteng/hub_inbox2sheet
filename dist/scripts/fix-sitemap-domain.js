"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fs_1 = require("fs");
const path_1 = require("path");
const prisma = new client_1.PrismaClient();
async function fixSitemapDomain() {
    console.log('🔧 FIXING SITEMAP DOMAIN ISSUE');
    console.log('==============================\n');
    try {
        // Check current environment
        const currentBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        console.log(`Current BASE_URL: ${currentBaseUrl}`);
        // The correct domain should be otaanswers.com
        const correctBaseUrl = "https://otaanswers.com";
        if (currentBaseUrl !== correctBaseUrl) {
            console.log(`❌ Wrong domain detected: ${currentBaseUrl}`);
            console.log(`✅ Should be: ${correctBaseUrl}`);
            console.log('\n🔧 FIXING SITEMAP...');
            // Generate correct sitemap
            const sitemap = await generateCorrectSitemap(correctBaseUrl);
            // Save sitemap
            const sitemapPath = (0, path_1.join)(process.cwd(), 'public', 'sitemap.xml');
            (0, fs_1.writeFileSync)(sitemapPath, sitemap, 'utf-8');
            console.log(`✅ Sitemap saved to: ${sitemapPath}`);
            console.log(`✅ Using correct domain: ${correctBaseUrl}`);
            // Test sitemap
            console.log('\n🔍 TESTING SITEMAP...');
            const testUrl = `${correctBaseUrl}/sitemap.xml`;
            console.log(`Test URL: ${testUrl}`);
            try {
                const response = await fetch(testUrl);
                if (response.ok) {
                    console.log('✅ Sitemap accessible at correct domain');
                }
                else {
                    console.log(`❌ Sitemap not accessible: ${response.status}`);
                }
            }
            catch (error) {
                console.log('❌ Sitemap test failed:', error);
            }
        }
        else {
            console.log('✅ Domain is already correct');
        }
        // Provide next steps
        console.log('\n🚀 NEXT STEPS:');
        console.log('==============');
        console.log('1. Update NEXT_PUBLIC_BASE_URL in Render environment variables');
        console.log('2. Set it to: https://otaanswers.com');
        console.log('3. Redeploy your application');
        console.log('4. Go to Google Search Console');
        console.log('5. Remove the old sitemap');
        console.log('6. Add the new sitemap: https://otaanswers.com/sitemap.xml');
        console.log('7. Request indexing for your report page');
    }
    catch (error) {
        console.error('❌ Error:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
async function generateCorrectSitemap(baseUrl) {
    // Get all articles
    const articles = await prisma.article.findMany({
        select: {
            slug: true,
            updatedAt: true,
        },
    });
    // Get unique platforms for platform pages
    const platforms = await prisma.article.groupBy({
        by: ['platform'],
        _count: {
            id: true
        },
        where: {
            crawlStatus: 'active'
        }
    });
    // Get public reports for sitemap
    const reports = await prisma.report.findMany({
        where: { isPublic: true },
        select: {
            slug: true,
            updatedAt: true,
            title: true,
        },
    });
    // Create URLs for each article
    const articleUrls = articles
        .filter((article) => article.slug)
        .map((article) => ({
        url: `${baseUrl}/answers/${article.slug}`,
        lastModified: article.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
    }));
    // Create URLs for platform pages
    const platformUrls = platforms.map((platform) => ({
        url: `${baseUrl}/platform/${encodeURIComponent(platform.platform)}`,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 0.9,
    }));
    // Create URLs for reports
    const reportUrls = reports
        .filter((report) => report.slug)
        .map((report) => ({
        url: `${baseUrl}/reports/${report.slug}`,
        lastModified: report.updatedAt,
        changeFrequency: "monthly",
        priority: 0.7,
    }));
    // Add static pages
    const staticPages = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 1,
        },
        {
            url: `${baseUrl}/search`,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.9,
        },
        {
            url: `${baseUrl}/submit`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.7,
        },
        {
            url: `${baseUrl}/reports`,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.8,
        },
        {
            url: `${baseUrl}/privacy-policy`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.5,
        },
        {
            url: `${baseUrl}/terms`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.5,
        }
    ];
    const allUrls = [...staticPages, ...platformUrls, ...articleUrls, ...reportUrls];
    // Generate XML sitemap
    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    allUrls.forEach(url => {
        sitemap += '<url>\n';
        sitemap += `  <loc>${url.url}</loc>\n`;
        sitemap += `  <lastmod>${url.lastModified.toISOString()}</lastmod>\n`;
        sitemap += `  <changefreq>${url.changeFrequency}</changefreq>\n`;
        sitemap += `  <priority>${url.priority}</priority>\n`;
        sitemap += '</url>\n';
    });
    sitemap += '</urlset>';
    return sitemap;
}
if (require.main === module) {
    fixSitemapDomain();
}
//# sourceMappingURL=fix-sitemap-domain.js.map
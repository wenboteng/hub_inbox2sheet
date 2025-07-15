"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const airbnb_1 = require("@/scripts/scrapers/airbnb");
const getyourguide_1 = require("../src/crawlers/getyourguide");
const viator_1 = require("../src/crawlers/viator");
const scrape_1 = require("./scrape");
const openai_1 = require("../src/utils/openai");
const contentDeduplication_1 = require("../src/utils/contentDeduplication");
const languageDetection_1 = require("../src/utils/languageDetection");
const slugify_1 = require("../src/utils/slugify");
const crypto_1 = require("crypto");
const prisma = new client_1.PrismaClient();
// Simple function to process articles
async function processNewArticles(articles, existingUrls) {
    const newArticles = articles.filter(article => !existingUrls.has(article.url));
    console.log(`📝 Found ${newArticles.length} new articles to process`);
    let processed = 0;
    for (const article of newArticles) {
        try {
            // Skip if no content
            if (!article.question || !article.answer || article.answer.length < 50) {
                continue;
            }
            const contentHash = (0, contentDeduplication_1.generateContentHash)(article.answer);
            const isDuplicate = contentHash ? (await (0, contentDeduplication_1.checkContentDuplicate)(contentHash)).isDuplicate : false;
            if (isDuplicate) {
                console.log(`⏭️  Skipping duplicate: ${article.question}`);
                continue;
            }
            const languageDetection = (0, languageDetection_1.detectLanguage)(article.answer);
            const slug = await generateUniqueSlug(article.question);
            // Create article
            await prisma.article.create({
                data: {
                    url: article.url,
                    question: article.question,
                    slug: slug,
                    answer: article.answer,
                    category: article.category,
                    platform: article.platform,
                    contentType: article.contentType,
                    source: 'help_center',
                    contentHash: contentHash || null,
                    isDuplicate: false,
                    language: languageDetection.language,
                },
            });
            // Add embeddings
            try {
                const embeddings = await (0, openai_1.getContentEmbeddings)(article.answer);
                if (embeddings.length > 0) {
                    const created = await prisma.article.findUnique({ where: { url: article.url } });
                    if (created) {
                        await prisma.articleParagraph.createMany({
                            data: embeddings.map(p => ({
                                articleId: created.id,
                                text: p.text,
                                embedding: p.embedding,
                            })),
                        });
                    }
                }
            }
            catch (e) {
                // Skip embeddings if they fail
            }
            processed++;
            console.log(`✅ Added: ${article.question}`);
        }
        catch (error) {
            if (error.code === 'P2002') {
                console.log(`⏭️  URL already exists: ${article.url}`);
            }
            else {
                console.error(`❌ Error processing: ${error.message}`);
            }
        }
    }
    return processed;
}
async function generateUniqueSlug(title) {
    let slug = (0, slugify_1.slugify)(title);
    let attempts = 0;
    while (attempts < 5) {
        const existing = await prisma.article.findUnique({ where: { slug } });
        if (!existing)
            return slug;
        slug = `${(0, slugify_1.slugify)(title)}-${(0, crypto_1.randomBytes)(3).toString('hex')}`;
        attempts++;
    }
    return `article-${(0, crypto_1.randomBytes)(6).toString('hex')}`;
}
async function collectMoreContent() {
    console.log('🚀 Starting content collection...');
    try {
        await prisma.$connect();
        const existingArticles = await prisma.article.findMany({ select: { url: true } });
        const existingUrls = new Set(existingArticles.map(a => a.url));
        console.log(`📊 Current database: ${existingUrls.size} articles`);
        let totalNew = 0;
        // Run working scrapers
        const scrapers = [
            { name: 'Airbnb', scraper: airbnb_1.scrapeAirbnb, enabled: true },
            { name: 'GetYourGuide', scraper: getyourguide_1.crawlGetYourGuideArticlesWithPagination, enabled: true },
            { name: 'Viator', scraper: viator_1.crawlViatorArticles, enabled: true },
            { name: 'Airbnb Community', scraper: scrape_1.scrapeAirbnbCommunity, enabled: true },
        ];
        for (const { name, enabled, scraper } of scrapers) {
            if (!enabled)
                continue;
            console.log(`\n🔍 Running ${name} scraper...`);
            try {
                const articles = await scraper();
                const mappedArticles = articles.map((a) => ({
                    ...a,
                    platform: name,
                    contentType: name.includes('Community') ? 'community' : 'official',
                    category: a.category || 'Help Center',
                }));
                const processed = await processNewArticles(mappedArticles, existingUrls);
                totalNew += processed;
                console.log(`✅ ${name}: Processed ${processed} new articles`);
            }
            catch (error) {
                console.error(`❌ ${name} scraper failed:`, error);
            }
        }
        // Final stats
        const finalCount = await prisma.article.count();
        console.log(`\n🎉 FINAL RESULTS:`);
        console.log(`   - New articles added: ${totalNew}`);
        console.log(`   - Total articles in database: ${finalCount}`);
        if (totalNew > 0) {
            console.log(`\n✅ SUCCESS: Added ${totalNew} new articles!`);
        }
        else {
            console.log(`\n⚠️  No new articles found. All sources exhausted.`);
        }
    }
    catch (error) {
        console.error('❌ Collection failed:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
collectMoreContent();
//# sourceMappingURL=collect-more-content.js.map
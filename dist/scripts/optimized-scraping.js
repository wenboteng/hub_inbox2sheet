"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const airbnb_1 = require("../scripts/scrapers/airbnb");
const getyourguide_1 = require("../crawlers/getyourguide");
const viator_1 = require("../crawlers/viator");
const scrape_1 = require("./scrape");
const featureFlags_1 = require("../utils/featureFlags");
const openai_1 = require("../utils/openai");
const contentDeduplication_1 = require("../utils/contentDeduplication");
const languageDetection_1 = require("../utils/languageDetection");
const slugify_1 = require("../utils/slugify");
const crypto_1 = require("crypto");
const prisma = new client_1.PrismaClient();
// Generate unique slug
async function generateUniqueSlug(title) {
    let slug = (0, slugify_1.slugify)(title);
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 5) {
        const existingSlug = await prisma.article.findUnique({ where: { slug } });
        if (existingSlug) {
            const randomSuffix = (0, crypto_1.randomBytes)(3).toString('hex');
            slug = `${(0, slugify_1.slugify)(title)}-${randomSuffix}`;
            attempts++;
        }
        else {
            isUnique = true;
        }
    }
    if (!isUnique) {
        const finalSuffix = (0, crypto_1.randomBytes)(6).toString('hex');
        slug = `article-${finalSuffix}`;
    }
    return slug;
}
// Validate article
function validateArticle(article) {
    const issues = [];
    if (!article.url || article.url.trim() === '')
        issues.push('Empty or missing URL');
    if (!article.question || article.question.trim() === '')
        issues.push('Empty or missing question/title');
    if (!article.answer || article.answer.trim() === '')
        issues.push('Empty or missing answer/content');
    if (article.answer && article.answer.length < 50)
        issues.push(`Content too short (${article.answer.length} characters)`);
    if (!article.platform || article.platform.trim() === '')
        issues.push('Empty or missing platform');
    if (!article.category || article.category.trim() === '')
        issues.push('Empty or missing category');
    return { isValid: issues.length === 0, issues };
}
// Process articles with enhanced error handling and duplicate URL prevention
async function processArticles(articles, existingUrls) {
    // Remove duplicates by URL first
    const uniqueArticles = articles.filter((article, index, self) => index === self.findIndex(a => a.url === article.url));
    const newArticles = uniqueArticles.filter(article => !existingUrls.has(article.url));
    console.log(`[PROCESS] Found ${newArticles.length} unique new articles to process`);
    let processedCount = 0, skippedCount = 0, duplicateCount = 0, errorCount = 0;
    for (const article of newArticles) {
        if (!validateArticle(article).isValid) {
            console.log(`[PROCESS] Skipping invalid article: ${article.question}`);
            errorCount++;
            continue;
        }
        try {
            const contentHash = (0, contentDeduplication_1.generateContentHash)(article.answer);
            let isDuplicate = false;
            if (contentHash) {
                const duplicateCheck = await (0, contentDeduplication_1.checkContentDuplicate)(contentHash);
                if (duplicateCheck.isDuplicate) {
                    console.log(`[PROCESS][DEDUP] Found content duplicate of ${duplicateCheck.existingArticle?.url}.`);
                    isDuplicate = true;
                    duplicateCount++;
                }
            }
            const languageDetection = (0, languageDetection_1.detectLanguage)(article.answer);
            const slug = await generateUniqueSlug(article.question);
            let paragraphsWithEmbeddings = [];
            try {
                paragraphsWithEmbeddings = await (0, openai_1.getContentEmbeddings)(article.answer);
            }
            catch (embeddingError) {
                console.error('[PROCESS] Failed to generate embeddings:', embeddingError);
            }
            // Use upsert to handle potential URL conflicts
            const created = await prisma.article.upsert({
                where: { url: article.url },
                update: {
                    question: article.question,
                    slug: slug,
                    answer: article.answer,
                    category: article.category,
                    platform: article.platform,
                    contentType: article.contentType,
                    contentHash: contentHash || null,
                    isDuplicate: isDuplicate,
                    language: languageDetection.language,
                },
                create: {
                    url: article.url,
                    question: article.question,
                    slug: slug,
                    answer: article.answer,
                    category: article.category,
                    platform: article.platform,
                    contentType: article.contentType,
                    source: 'help_center',
                    contentHash: contentHash || null,
                    isDuplicate: isDuplicate,
                    language: languageDetection.language,
                },
            });
            if (paragraphsWithEmbeddings.length > 0) {
                // Delete existing paragraphs and recreate
                await prisma.articleParagraph.deleteMany({
                    where: { articleId: created.id }
                });
                await prisma.articleParagraph.createMany({
                    data: paragraphsWithEmbeddings.map(p => ({
                        articleId: created.id,
                        text: p.text,
                        embedding: p.embedding,
                    })),
                });
            }
            processedCount++;
            console.log(`[PROCESS] Successfully processed: ${article.question}`);
        }
        catch (articleError) {
            console.error(`[PROCESS] Error processing article "${article.question}":`, articleError.message);
            errorCount++;
        }
    }
    return { processedCount, skippedCount, duplicateCount, errorCount };
}
// Main optimized scraping function
async function optimizedScraping() {
    console.log('[OPTIMIZED-SCRAPE] Starting optimized scraping process...');
    try {
        await prisma.$connect();
        console.log('[OPTIMIZED-SCRAPE] Database connected');
        const existingArticles = await prisma.article.findMany({ select: { url: true } });
        const existingUrls = new Set(existingArticles.map(a => a.url));
        console.log(`[OPTIMIZED-SCRAPE] Found ${existingUrls.size} existing articles`);
        let allArticles = [];
        // Only run working scrapers (removed Expedia due to DNS issues)
        const workingScrapers = [
            { name: 'Airbnb', scraper: airbnb_1.scrapeAirbnb, enabled: true },
            { name: 'GetYourGuide', scraper: getyourguide_1.crawlGetYourGuideArticlesWithPagination, enabled: (0, featureFlags_1.isFeatureEnabled)('enableGetYourGuidePagination') },
            { name: 'Viator', scraper: viator_1.crawlViatorArticles, enabled: (0, featureFlags_1.isFeatureEnabled)('enableViatorScraping') },
            { name: 'Airbnb Community', scraper: scrape_1.scrapeAirbnbCommunity, enabled: (0, featureFlags_1.isFeatureEnabled)('enableCommunityCrawling') },
        ];
        for (const { name, enabled, scraper } of workingScrapers) {
            if (enabled) {
                console.log(`\n[OPTIMIZED-SCRAPE] Running ${name} scraper...`);
                try {
                    const articles = await scraper();
                    const mappedArticles = articles.map((a) => ({
                        ...a,
                        platform: name,
                        contentType: name.includes('Community') ? 'community' : 'official',
                        category: a.category || 'Help Center',
                    }));
                    allArticles = allArticles.concat(mappedArticles);
                    console.log(`[OPTIMIZED-SCRAPE] ${name}: Found ${articles.length} articles`);
                }
                catch (e) {
                    console.error(`[OPTIMIZED-SCRAPE] ${name} scraper failed:`, e);
                }
            }
        }
        console.log(`\n[OPTIMIZED-SCRAPE] Total articles found: ${allArticles.length}`);
        // Process new articles
        const results = await processArticles(allArticles, existingUrls);
        // Summary
        console.log(`\n[OPTIMIZED-SCRAPE] Processing summary:`);
        console.log(`   - New articles processed: ${results.processedCount}`);
        console.log(`   - Articles skipped: ${results.skippedCount}`);
        console.log(`   - Articles marked as duplicates: ${results.duplicateCount}`);
        console.log(`   - Errors: ${results.errorCount}`);
        // Final stats
        const finalStats = await prisma.article.groupBy({
            by: ['platform'],
            _count: { id: true },
        });
        console.log('\n📊 FINAL DATABASE STATISTICS:');
        finalStats.forEach((stat) => {
            console.log(`   ${stat.platform}: ${stat._count.id} articles`);
        });
        const totalArticles = await prisma.article.count();
        console.log(`\n🎉 Total articles in database: ${totalArticles}`);
        if (results.processedCount > 0) {
            console.log(`\n✅ SUCCESS: Added ${results.processedCount} new articles to your database!`);
        }
        else {
            console.log(`\n⚠️  No new articles found. All sources have been exhausted.`);
            console.log(`💡 Consider:`);
            console.log(`   - Adding more community sources (Reddit, Quora, etc.)`);
            console.log(`   - Implementing content re-checking for updates`);
            console.log(`   - Adding more travel platforms`);
        }
    }
    catch (error) {
        console.error('[OPTIMIZED-SCRAPE] Error during optimized scraping:', error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
        console.log('[OPTIMIZED-SCRAPE] Database disconnected');
    }
}
optimizedScraping();
//# sourceMappingURL=optimized-scraping.js.map
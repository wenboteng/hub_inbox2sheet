"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDiscoveryMode = main;
const client_1 = require("@prisma/client");
const crawler_1 = require("@/lib/crawler");
const communityCrawler_1 = require("../src/lib/communityCrawler");
const getyourguide_1 = require("../src/crawlers/getyourguide");
const airbnb_1 = require("../scripts/scrapers/airbnb");
const prisma = new client_1.PrismaClient();
// Configuration for discovery mode
const DISCOVERY_CONFIG = {
    // Maximum URLs to discover per platform per run
    maxUrlsPerPlatform: 100,
    // Maximum URLs to process from queue per run
    maxQueueProcessing: 50,
    // Delay between requests (ms)
    delayBetweenRequests: 2000,
    // Timeout for requests (ms)
    requestTimeout: 15000,
    // Retry configuration
    maxRetries: 3,
    retryDelay: 5000,
};
// Platform-specific discovery configurations
const PLATFORM_CONFIGS = {
    airbnb: {
        name: 'Airbnb',
        indexUrls: [
            'https://www.airbnb.com/help',
            'https://www.airbnb.com/help/article',
            // Additional entry points to widen discovery
            'https://www.airbnb.com/help/home',
            'https://www.airbnb.com/help/topic/hosting',
        ],
        selectors: {
            articleLinks: 'a[href*="/help/article/"]',
            categoryLinks: 'a[href*="/help/category/"]',
        },
        priority: 8,
    },
    getyourguide: {
        name: 'GetYourGuide',
        indexUrls: [
            'https://supply.getyourguide.support/hc/en-us',
            'https://supply.getyourguide.support/hc/en-us/categories',
            // Additional sections for more comprehensive crawling
            'https://supply.getyourguide.support/hc/en-us/sections',
            'https://supply.getyourguide.support/hc/en-us/community/topics',
        ],
        selectors: {
            articleLinks: 'a[href*="/articles/"]',
            categoryLinks: 'a[href*="/categories/"]',
        },
        priority: 7,
    },
    community: {
        name: 'Community',
        indexUrls: [
            'https://community.airbnb.com',
            'https://airhostsforum.com',
            // Specific community categories for deeper discovery
            'https://community.airbnb.com/t5/Help/bd-p/help',
            'https://airhostsforum.com/c/airbnb-hosts',
        ],
        selectors: {
            threadLinks: 'a[href*="/t/"]',
            postLinks: 'a[href*="/p/"]',
        },
        priority: 6,
    },
};
async function discoverUrlsFromPage(url, platform, type) {
    try {
        console.log(`[DISCOVERY] Discovering ${type} URLs from ${url}`);
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            },
            signal: AbortSignal.timeout(DISCOVERY_CONFIG.requestTimeout)
        });
        if (!response.ok) {
            console.log(`[DISCOVERY][WARN] HTTP ${response.status} for ${url}`);
            return [];
        }
        const html = await response.text();
        const urls = [];
        // Simple regex-based URL extraction (you might want to use a proper HTML parser)
        const linkRegex = /href=["']([^"']+)["']/g;
        let match;
        while ((match = linkRegex.exec(html)) !== null) {
            const href = match[1];
            // Filter URLs based on platform and type
            if (isValidUrlForPlatform(href, platform, type)) {
                const fullUrl = new URL(href, url).href;
                if (!urls.includes(fullUrl)) {
                    urls.push(fullUrl);
                }
            }
        }
        console.log(`[DISCOVERY] Found ${urls.length} ${type} URLs from ${url}`);
        return urls;
    }
    catch (error) {
        console.error(`[DISCOVERY][ERROR] Failed to discover URLs from ${url}:`, error);
        return [];
    }
}
function isValidUrlForPlatform(url, platform, type) {
    switch (platform) {
        case 'airbnb':
            return type === 'article' ? url.includes('/help/article/') : url.includes('/help/category/');
        case 'getyourguide':
            return type === 'article' ? url.includes('/articles/') : url.includes('/categories/');
        case 'community':
            return type === 'thread' ? url.includes('/t/') : url.includes('/p/');
        default:
            return false;
    }
}
async function addToCrawlQueue(urls, platform, type, priority) {
    let added = 0;
    for (const url of urls) {
        try {
            // Check if URL already exists in queue or as an article
            const existingQueue = await prisma.crawlQueue.findUnique({
                where: { url }
            });
            const existingArticle = await prisma.article.findUnique({
                where: { url }
            });
            if (existingQueue || existingArticle) {
                continue; // Skip if already queued or processed
            }
            // Add to crawl queue
            await prisma.crawlQueue.create({
                data: {
                    url,
                    platform,
                    type,
                    priority,
                    status: 'pending',
                }
            });
            added++;
            console.log(`[DISCOVERY] Added to queue: ${url}`);
        }
        catch (error) {
            console.error(`[DISCOVERY][ERROR] Failed to add ${url} to queue:`, error);
        }
    }
    return added;
}
async function discoverFromPlatform(platform, config) {
    console.log(`[DISCOVERY] Discovering from ${platform}...`);
    let totalDiscovered = 0;
    for (const indexUrl of config.indexUrls) {
        try {
            // Discover article URLs
            const articleUrls = await discoverUrlsFromPage(indexUrl, platform, 'article');
            const articlesAdded = await addToCrawlQueue(articleUrls, platform, 'article', config.priority);
            totalDiscovered += articlesAdded;
            // Discover category URLs (for further discovery)
            const categoryUrls = await discoverUrlsFromPage(indexUrl, platform, 'category');
            const categoriesAdded = await addToCrawlQueue(categoryUrls, platform, 'category', config.priority - 1);
            totalDiscovered += categoriesAdded;
            // Add delay between index pages
            await new Promise(resolve => setTimeout(resolve, DISCOVERY_CONFIG.delayBetweenRequests));
        }
        catch (error) {
            console.error(`[DISCOVERY][ERROR] Failed to discover from ${indexUrl}:`, error);
        }
    }
    return totalDiscovered;
}
async function processCrawlQueue() {
    console.log('[DISCOVERY] Processing crawl queue...');
    // Get pending URLs from queue, ordered by priority and first seen
    const queueItems = await prisma.crawlQueue.findMany({
        where: {
            status: 'pending',
            retryCount: {
                lt: DISCOVERY_CONFIG.maxRetries
            }
        },
        orderBy: [
            { priority: 'desc' },
            { firstSeen: 'asc' }
        ],
        take: DISCOVERY_CONFIG.maxQueueProcessing
    });
    console.log(`[DISCOVERY] Found ${queueItems.length} items in queue to process`);
    let processed = 0;
    for (const item of queueItems) {
        try {
            // Mark as processing
            await prisma.crawlQueue.update({
                where: { id: item.id },
                data: {
                    status: 'processing',
                    lastChecked: new Date()
                }
            });
            console.log(`[DISCOVERY] Processing queue item: ${item.url} (${item.type})`);
            // Process based on type
            let success = false;
            if (item.type === 'article') {
                if (item.platform === 'community') {
                    await (0, communityCrawler_1.scrapeCommunityUrls)([item.url]);
                }
                else {
                    await (0, crawler_1.scrapeUrls)([item.url]);
                }
                success = true;
            }
            else if (item.type === 'category') {
                // For categories, discover more URLs
                const discoveredUrls = await discoverUrlsFromPage(item.url, item.platform, 'article');
                await addToCrawlQueue(discoveredUrls, item.platform, 'article', item.priority);
                success = true;
            }
            // Mark as completed
            await prisma.crawlQueue.update({
                where: { id: item.id },
                data: {
                    status: success ? 'completed' : 'failed',
                    lastChecked: new Date()
                }
            });
            processed++;
            console.log(`[DISCOVERY] Successfully processed: ${item.url}`);
            // Add delay between processing
            await new Promise(resolve => setTimeout(resolve, DISCOVERY_CONFIG.delayBetweenRequests));
        }
        catch (error) {
            console.error(`[DISCOVERY][ERROR] Failed to process ${item.url}:`, error);
            // Update retry count and status
            await prisma.crawlQueue.update({
                where: { id: item.id },
                data: {
                    status: 'failed',
                    retryCount: item.retryCount + 1,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    lastChecked: new Date()
                }
            });
        }
    }
    return processed;
}
async function runPlatformSpecificDiscovery() {
    console.log('[DISCOVERY] Running platform-specific discovery...');
    // Airbnb discovery
    try {
        console.log('[DISCOVERY] Running Airbnb discovery...');
        const airbnbArticles = await (0, airbnb_1.scrapeAirbnb)();
        console.log(`[DISCOVERY] Airbnb discovery found ${airbnbArticles.length} articles`);
    }
    catch (error) {
        console.error('[DISCOVERY] Airbnb discovery failed:', error);
    }
    // GetYourGuide discovery with pagination
    try {
        console.log('[DISCOVERY] Running GetYourGuide discovery...');
        const gygArticles = await (0, getyourguide_1.crawlGetYourGuideArticlesWithPagination)();
        console.log(`[DISCOVERY] GetYourGuide discovery found ${gygArticles.length} articles`);
    }
    catch (error) {
        console.error('[DISCOVERY] GetYourGuide discovery failed:', error);
    }
}
async function main() {
    console.log('[DISCOVERY] Starting discovery mode...');
    console.log(`[DISCOVERY] Configuration: ${JSON.stringify(DISCOVERY_CONFIG, null, 2)}`);
    const startTime = Date.now();
    const stats = {
        discovered: 0,
        processed: 0,
        added: 0,
        errors: 0,
        skipped: 0,
    };
    try {
        // Step 1: Discover URLs from index pages
        console.log('\n[DISCOVERY] Step 1: Discovering URLs from index pages...');
        for (const [platform, config] of Object.entries(PLATFORM_CONFIGS)) {
            try {
                const discovered = await discoverFromPlatform(platform, config);
                stats.discovered += discovered;
                console.log(`[DISCOVERY] ${platform}: discovered ${discovered} URLs`);
            }
            catch (error) {
                console.error(`[DISCOVERY] Failed to discover from ${platform}:`, error);
                stats.errors++;
            }
        }
        // Step 2: Run platform-specific discovery
        console.log('\n[DISCOVERY] Step 2: Running platform-specific discovery...');
        await runPlatformSpecificDiscovery();
        // Step 3: Process crawl queue
        console.log('\n[DISCOVERY] Step 3: Processing crawl queue...');
        const processed = await processCrawlQueue();
        stats.processed = processed;
        // Step 4: Clean up old queue items
        console.log('\n[DISCOVERY] Step 4: Cleaning up old queue items...');
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const deletedCount = await prisma.crawlQueue.deleteMany({
            where: {
                OR: [
                    { status: 'completed' },
                    {
                        status: 'failed',
                        lastChecked: { lt: thirtyDaysAgo }
                    }
                ]
            }
        });
        console.log(`[DISCOVERY] Cleaned up ${deletedCount.count} old queue items`);
    }
    catch (error) {
        console.error('[DISCOVERY] Fatal error:', error);
        throw error;
    }
    finally {
        const duration = Date.now() - startTime;
        console.log('\n[DISCOVERY] Discovery completed!');
        console.log(`[DISCOVERY] Duration: ${Math.round(duration / 1000)}s`);
        console.log(`[DISCOVERY] Stats:`, stats);
    }
}
// Run the discovery if this script is executed directly
if (require.main === module) {
    main()
        .then(() => {
        console.log('[DISCOVERY] Discovery mode completed successfully');
        process.exit(0);
    })
        .catch((error) => {
        console.error('[DISCOVERY] Discovery mode failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=discovery.js.map
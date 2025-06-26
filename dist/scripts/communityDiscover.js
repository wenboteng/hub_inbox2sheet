"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCommunityDiscoveryMode = main;
const client_1 = require("@prisma/client");
const communityCrawler_1 = require("../lib/communityCrawler");
const communityCrawler_2 = require("../lib/communityCrawler");
const prisma = new client_1.PrismaClient();
// Configuration for community discovery
const COMMUNITY_DISCOVERY_CONFIG = {
    // Maximum threads to discover per forum per run
    maxThreadsPerForum: 30,
    // Maximum posts to discover per thread
    maxPostsPerThread: 10,
    // Delay between requests (ms)
    delayBetweenRequests: 3000,
    // Timeout for requests (ms)
    requestTimeout: 15000,
    // Pagination settings
    maxPagesPerForum: 5,
    // Retry configuration
    maxRetries: 2,
    retryDelay: 10000,
};
// Community forum configurations
const COMMUNITY_CONFIGS = {
    airbnb: {
        name: 'Airbnb Community',
        baseUrl: 'https://community.airbnb.com',
        indexUrls: [
            'https://community.airbnb.com/c/hosting/',
            'https://community.airbnb.com/c/experiences/',
            'https://community.airbnb.com/c/guest/',
            // Additional boards for broader coverage
            'https://community.airbnb.com/t5/Help/bd-p/help',
        ],
        selectors: {
            threadLinks: 'a[href*="/t/"]',
            paginationLinks: 'a[href*="page="]',
            nextPage: '.next-page, .pagination-next',
        },
        priority: 8,
        contentType: 'community',
    },
    airhostsforum: {
        name: 'AirHosts Forum',
        baseUrl: 'https://airhostsforum.com',
        indexUrls: [
            'https://airhostsforum.com/categories',
            'https://airhostsforum.com/latest',
            // Dive directly into the Airbnb hosts category
            'https://airhostsforum.com/c/airbnb-hosts',
        ],
        selectors: {
            threadLinks: 'a[href*="/t/"]',
            paginationLinks: 'a[href*="page="]',
            nextPage: '.next-page, .pagination-next',
        },
        priority: 7,
        contentType: 'community',
    },
};
async function discoverCommunityThreads(forumKey, config) {
    console.log(`[COMMUNITY_DISCOVERY] Discovering threads from ${config.name}...`);
    const discoveredThreads = [];
    const processedUrls = new Set();
    for (const indexUrl of config.indexUrls) {
        let currentUrl = indexUrl;
        let pageCount = 0;
        while (currentUrl && pageCount < COMMUNITY_DISCOVERY_CONFIG.maxPagesPerForum) {
            try {
                console.log(`[COMMUNITY_DISCOVERY] Checking page ${pageCount + 1}: ${currentUrl}`);
                const response = await fetch(currentUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Accept-Encoding': 'gzip, deflate',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1',
                    },
                    signal: AbortSignal.timeout(COMMUNITY_DISCOVERY_CONFIG.requestTimeout)
                });
                if (!response.ok) {
                    console.log(`[COMMUNITY_DISCOVERY][WARN] HTTP ${response.status} for ${currentUrl}`);
                    break;
                }
                const html = await response.text();
                const threadUrls = extractThreadUrls(html, config.baseUrl, config.selectors.threadLinks);
                // Add new thread URLs
                for (const threadUrl of threadUrls) {
                    if (!processedUrls.has(threadUrl) && discoveredThreads.length < COMMUNITY_DISCOVERY_CONFIG.maxThreadsPerForum) {
                        discoveredThreads.push(threadUrl);
                        processedUrls.add(threadUrl);
                        console.log(`[COMMUNITY_DISCOVERY] Found thread: ${threadUrl}`);
                    }
                }
                // Find next page
                currentUrl = extractNextPageUrl(html, currentUrl, config.selectors.nextPage);
                pageCount++;
                // Add delay between pages
                await new Promise(resolve => setTimeout(resolve, COMMUNITY_DISCOVERY_CONFIG.delayBetweenRequests));
            }
            catch (error) {
                console.error(`[COMMUNITY_DISCOVERY][ERROR] Failed to process ${currentUrl}:`, error);
                break;
            }
        }
        console.log(`[COMMUNITY_DISCOVERY] Discovered ${discoveredThreads.length} threads from ${config.name}`);
    }
    return discoveredThreads;
}
function extractThreadUrls(html, baseUrl, selector) {
    const urls = [];
    // Simple regex-based extraction for thread URLs
    const threadRegex = /href=["']([^"']*\/t\/[^"']*)["']/g;
    let match;
    while ((match = threadRegex.exec(html)) !== null) {
        const href = match[1];
        const fullUrl = href.startsWith('http') ? href : `${baseUrl}${href}`;
        if (!urls.includes(fullUrl)) {
            urls.push(fullUrl);
        }
    }
    return urls;
}
function extractNextPageUrl(html, currentUrl, selector) {
    // Simple regex-based extraction for next page URL
    const nextPageRegex = /href=["']([^"']*page=\d+[^"']*)["']/g;
    const matches = Array.from(html.matchAll(nextPageRegex));
    if (matches.length > 0) {
        const href = matches[matches.length - 1][1]; // Get the last match (highest page number)
        return href.startsWith('http') ? href : new URL(href, currentUrl).href;
    }
    return null;
}
async function addThreadsToQueue(threadUrls, forumKey, config) {
    let added = 0;
    for (const url of threadUrls) {
        try {
            // Check if thread already exists in queue or as an article
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
                    platform: forumKey,
                    type: 'thread',
                    priority: config.priority,
                    status: 'pending',
                    metadata: {
                        contentType: config.contentType,
                        forum: config.name,
                    }
                }
            });
            added++;
            console.log(`[COMMUNITY_DISCOVERY] Added thread to queue: ${url}`);
        }
        catch (error) {
            console.error(`[COMMUNITY_DISCOVERY][ERROR] Failed to add ${url} to queue:`, error);
        }
    }
    return added;
}
async function processCommunityQueue() {
    console.log('[COMMUNITY_DISCOVERY] Processing community queue...');
    // Get pending community URLs from queue
    const queueItems = await prisma.crawlQueue.findMany({
        where: {
            status: 'pending',
            type: 'thread',
            retryCount: {
                lt: COMMUNITY_DISCOVERY_CONFIG.maxRetries
            }
        },
        orderBy: [
            { priority: 'desc' },
            { firstSeen: 'asc' }
        ],
        take: COMMUNITY_DISCOVERY_CONFIG.maxThreadsPerForum
    });
    console.log(`[COMMUNITY_DISCOVERY] Found ${queueItems.length} community threads to process`);
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
            console.log(`[COMMUNITY_DISCOVERY] Processing thread: ${item.url}`);
            // Scrape the community thread
            await (0, communityCrawler_1.scrapeCommunityUrls)([item.url]);
            // Mark as completed
            await prisma.crawlQueue.update({
                where: { id: item.id },
                data: {
                    status: 'completed',
                    lastChecked: new Date()
                }
            });
            processed++;
            console.log(`[COMMUNITY_DISCOVERY] Successfully processed thread: ${item.url}`);
            // Add delay between processing
            await new Promise(resolve => setTimeout(resolve, COMMUNITY_DISCOVERY_CONFIG.delayBetweenRequests));
        }
        catch (error) {
            console.error(`[COMMUNITY_DISCOVERY][ERROR] Failed to process ${item.url}:`, error);
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
async function runLegacyCommunityDiscovery() {
    console.log('[COMMUNITY_DISCOVERY] Running legacy community discovery...');
    try {
        const communityUrls = await (0, communityCrawler_2.getCommunityContentUrls)();
        console.log(`[COMMUNITY_DISCOVERY] Legacy discovery found ${communityUrls.length} URLs`);
        if (communityUrls.length > 0) {
            await (0, communityCrawler_1.scrapeCommunityUrls)(communityUrls);
            console.log('[COMMUNITY_DISCOVERY] Legacy community discovery completed');
        }
    }
    catch (error) {
        console.error('[COMMUNITY_DISCOVERY] Legacy community discovery failed:', error);
    }
}
async function main() {
    console.log('[COMMUNITY_DISCOVERY] Starting community discovery mode...');
    console.log(`[COMMUNITY_DISCOVERY] Configuration: ${JSON.stringify(COMMUNITY_DISCOVERY_CONFIG, null, 2)}`);
    const startTime = Date.now();
    const stats = {
        forumsChecked: 0,
        threadsDiscovered: 0,
        postsDiscovered: 0,
        processed: 0,
        errors: 0,
        skipped: 0,
    };
    try {
        // Step 1: Discover threads from community forums
        console.log('\n[COMMUNITY_DISCOVERY] Step 1: Discovering threads from community forums...');
        for (const [forumKey, config] of Object.entries(COMMUNITY_CONFIGS)) {
            try {
                stats.forumsChecked++;
                const discoveredThreads = await discoverCommunityThreads(forumKey, config);
                const addedToQueue = await addThreadsToQueue(discoveredThreads, forumKey, config);
                stats.threadsDiscovered += discoveredThreads.length;
                console.log(`[COMMUNITY_DISCOVERY] ${config.name}: discovered ${discoveredThreads.length} threads, added ${addedToQueue} to queue`);
            }
            catch (error) {
                console.error(`[COMMUNITY_DISCOVERY] Failed to discover from ${forumKey}:`, error);
                stats.errors++;
            }
        }
        // Step 2: Process community queue
        console.log('\n[COMMUNITY_DISCOVERY] Step 2: Processing community queue...');
        const processed = await processCommunityQueue();
        stats.processed = processed;
        // Step 3: Run legacy community discovery as fallback
        console.log('\n[COMMUNITY_DISCOVERY] Step 3: Running legacy community discovery...');
        await runLegacyCommunityDiscovery();
        // Step 4: Clean up old community queue items
        console.log('\n[COMMUNITY_DISCOVERY] Step 4: Cleaning up old community queue items...');
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const deletedCount = await prisma.crawlQueue.deleteMany({
            where: {
                type: 'thread',
                OR: [
                    { status: 'completed' },
                    {
                        status: 'failed',
                        lastChecked: { lt: sevenDaysAgo }
                    }
                ]
            }
        });
        console.log(`[COMMUNITY_DISCOVERY] Cleaned up ${deletedCount.count} old community queue items`);
    }
    catch (error) {
        console.error('[COMMUNITY_DISCOVERY] Fatal error:', error);
        throw error;
    }
    finally {
        const duration = Date.now() - startTime;
        console.log('\n[COMMUNITY_DISCOVERY] Community discovery completed!');
        console.log(`[COMMUNITY_DISCOVERY] Duration: ${Math.round(duration / 1000)}s`);
        console.log(`[COMMUNITY_DISCOVERY] Stats:`, stats);
    }
}
// Run the community discovery if this script is executed directly
if (require.main === module) {
    main()
        .then(() => {
        console.log('[COMMUNITY_DISCOVERY] Community discovery mode completed successfully');
        process.exit(0);
    })
        .catch((error) => {
        console.error('[COMMUNITY_DISCOVERY] Community discovery mode failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=communityDiscover.js.map
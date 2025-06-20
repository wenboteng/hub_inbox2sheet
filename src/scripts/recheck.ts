import { PrismaClient } from '@prisma/client';
import { scrapeUrls } from '@/lib/crawler';
import { scrapeCommunityUrls } from '@/lib/communityCrawler';
import { computeContentHash } from '@/lib/contentUtils';

const prisma = new PrismaClient();

// Configuration for recheck mode
const RECHECK_CONFIG = {
  // Only recheck articles that haven't been updated in 7+ days
  daysSinceLastUpdate: 7,
  // Maximum articles to recheck per run
  maxArticlesPerRun: 50,
  // Delay between requests (ms)
  delayBetweenRequests: 3000,
  // Timeout for requests (ms)
  requestTimeout: 15000,
};

interface RecheckStats {
  totalChecked: number;
  updated: number;
  unchanged: number;
  errors: number;
  skipped: number;
}

async function getArticlesToRecheck(): Promise<string[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RECHECK_CONFIG.daysSinceLastUpdate);

  console.log(`[RECHECK] Looking for articles not updated since ${cutoffDate.toISOString()}`);

  const articles = await prisma.article.findMany({
    where: {
      lastUpdated: {
        lt: cutoffDate
      },
      crawlStatus: 'active',
      // Exclude duplicates and archived content
      isDuplicate: false,
    },
    select: {
      url: true,
      platform: true,
      contentType: true,
      etag: true,
      lastModified: true,
    },
    orderBy: {
      lastUpdated: 'asc' // Check oldest articles first
    },
    take: RECHECK_CONFIG.maxArticlesPerRun
  });

  console.log(`[RECHECK] Found ${articles.length} articles to recheck`);
  return articles.map(article => article.url);
}

async function checkIfContentChanged(url: string, existingEtag?: string, existingLastModified?: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: AbortSignal.timeout(RECHECK_CONFIG.requestTimeout)
    });

    if (!response.ok) {
      console.log(`[RECHECK][WARN] HTTP ${response.status} for ${url}`);
      return true; // Assume changed if we can't check
    }

    const newEtag = response.headers.get('etag');
    const newLastModified = response.headers.get('last-modified');

    // If we have ETag and it matches, content hasn't changed
    if (existingEtag && newEtag && existingEtag === newEtag) {
      console.log(`[RECHECK][CACHE] ETag match for ${url}`);
      return false;
    }

    // If we have Last-Modified and it matches, content hasn't changed
    if (existingLastModified && newLastModified && existingLastModified === newLastModified) {
      console.log(`[RECHECK][CACHE] Last-Modified match for ${url}`);
      return false;
    }

    // If we don't have previous headers, assume content might have changed
    if (!existingEtag && !existingLastModified) {
      console.log(`[RECHECK][UNKNOWN] No previous cache headers for ${url}`);
      return true;
    }

    console.log(`[RECHECK][CHANGED] Cache headers indicate content changed for ${url}`);
    return true;

  } catch (error) {
    console.error(`[RECHECK][ERROR] Failed to check cache headers for ${url}:`, error);
    return true; // Assume changed if we can't check
  }
}

async function updateArticleCacheHeaders(url: string, etag?: string, lastModified?: string): Promise<void> {
  try {
    await prisma.article.update({
      where: { url },
      data: {
        etag,
        lastModified,
        lastCheckedAt: new Date(),
      }
    });
  } catch (error) {
    console.error(`[RECHECK][ERROR] Failed to update cache headers for ${url}:`, error);
  }
}

async function recheckArticle(url: string): Promise<{ updated: boolean; error?: string }> {
  try {
    // Get current article data
    const article = await prisma.article.findUnique({
      where: { url },
      select: {
        etag: true,
        lastModified: true,
        contentType: true,
        platform: true,
      }
    });

    if (!article) {
      return { updated: false, error: 'Article not found' };
    }

    // Check if content has changed using cache headers
    const hasChanged = await checkIfContentChanged(url, article.etag, article.lastModified);

    if (!hasChanged) {
      // Update last checked timestamp but don't re-scrape
      await updateArticleCacheHeaders(url, article.etag, article.lastModified);
      return { updated: false };
    }

    // Content has changed, re-scrape it
    console.log(`[RECHECK] Re-scraping changed content: ${url}`);

    if (article.contentType === 'community') {
      // Use community crawler for community content
      await scrapeCommunityUrls([url]);
    } else {
      // Use regular crawler for official content
      await scrapeUrls([url]);
    }

    // Update cache headers after successful scrape
    await updateArticleCacheHeaders(url, article.etag, article.lastModified);

    return { updated: true };

  } catch (error) {
    console.error(`[RECHECK][ERROR] Failed to recheck ${url}:`, error);
    return { updated: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function main(): Promise<void> {
  console.log('[RECHECK] Starting recheck mode...');
  console.log(`[RECHECK] Configuration: ${JSON.stringify(RECHECK_CONFIG, null, 2)}`);

  const startTime = Date.now();
  const stats: RecheckStats = {
    totalChecked: 0,
    updated: 0,
    unchanged: 0,
    errors: 0,
    skipped: 0,
  };

  try {
    // Get articles that need rechecking
    const urlsToRecheck = await getArticlesToRecheck();

    if (urlsToRecheck.length === 0) {
      console.log('[RECHECK] No articles need rechecking');
      return;
    }

    console.log(`[RECHECK] Processing ${urlsToRecheck.length} articles...`);

    // Process each article
    for (const url of urlsToRecheck) {
      stats.totalChecked++;
      
      console.log(`[RECHECK] Processing ${stats.totalChecked}/${urlsToRecheck.length}: ${url}`);

      const result = await recheckArticle(url);

      if (result.error) {
        stats.errors++;
        console.log(`[RECHECK][ERROR] ${url}: ${result.error}`);
      } else if (result.updated) {
        stats.updated++;
        console.log(`[RECHECK][UPDATED] ${url}`);
      } else {
        stats.unchanged++;
        console.log(`[RECHECK][UNCHANGED] ${url}`);
      }

      // Add delay between requests
      if (stats.totalChecked < urlsToRecheck.length) {
        await new Promise(resolve => setTimeout(resolve, RECHECK_CONFIG.delayBetweenRequests));
      }
    }

  } catch (error) {
    console.error('[RECHECK] Fatal error:', error);
    throw error;
  } finally {
    const duration = Date.now() - startTime;
    console.log('\n[RECHECK] Recheck completed!');
    console.log(`[RECHECK] Duration: ${Math.round(duration / 1000)}s`);
    console.log(`[RECHECK] Stats:`, stats);
    console.log(`[RECHECK] Success rate: ${Math.round(((stats.updated + stats.unchanged) / stats.totalChecked) * 100)}%`);
  }
}

// Run the recheck if this script is executed directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('[RECHECK] Recheck mode completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[RECHECK] Recheck mode failed:', error);
      process.exit(1);
    });
}

export { main as runRecheckMode }; 
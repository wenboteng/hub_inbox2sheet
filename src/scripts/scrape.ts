import { PrismaClient } from '@prisma/client';
import type { Page } from 'puppeteer';
import { randomBytes } from 'crypto';
import { getContentEmbeddings, getEmbedding } from '@/utils/openai';
import { scrapeAirbnb } from '@/scripts/scrapers/airbnb';
import { crawlGetYourGuideArticles, crawlGetYourGuideArticlesWithPagination } from '@/crawlers/getyourguide';
import { scrapeCommunityUrls, getCommunityContentUrls } from '@/lib/communityCrawler';
import { crawlNewsAndPolicies } from '@/crawlers/news-policy';
import {
  generateContentHash,
  checkContentDuplicate,
  markArticleAsDuplicate,
  getDeduplicationStats,
  DEFAULT_DEDUP_CONFIG,
} from '@/utils/contentDeduplication';
import { isFeatureEnabled, getFeatureFlagsSummary } from '@/utils/featureFlags';
import { detectLanguage } from '@/utils/languageDetection';
import { slugify } from '@/utils/slugify';
import { crawlViatorArticles } from '@/crawlers/viator';
import { crawlExpedia } from '@/crawlers/expedia';

const prisma = new PrismaClient();

interface Article {
  url: string;
  question: string;
  answer: string;
  platform: string;
  category: string;
  contentType: 'official' | 'community';
}

interface ParagraphWithEmbedding {
  text: string;
  embedding: number[];
}

// Helper function to setup a page
async function setupPage(page: Page) {
  await page.setViewport({
    width: 1280,
    height: 800
  });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  await page.setDefaultTimeout(120000);
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (['image', 'stylesheet', 'font', 'media'].includes(request.resourceType())) {
      request.abort();
    } else {
      request.continue();
    }
  });
  page.on('dialog', async (dialog) => {
    console.log(`[PUPPETEER] Dismissing dialog: ${dialog.message()}`);
    await dialog.dismiss();
  });
}

// Function to get existing article URLs from database
async function getExistingArticleUrls(): Promise<Set<string>> {
  const existingArticles = await prisma.article.findMany({
    select: { url: true },
  });
  return new Set(existingArticles.map((a: { url: string }) => a.url));
}

// Function to log scraping statistics
async function logScrapingStats() {
  const totalArticles = await prisma.article.count();
  const officialArticles = await prisma.article.count({
    where: { contentType: 'official' },
  });
  const communityArticles = await prisma.article.count({
    where: { contentType: 'community' },
  });

  const platformStats = await prisma.article.groupBy({
    by: ['platform'],
    _count: { id: true },
  });

  console.log('\n📊 DATABASE STATISTICS:');
  console.log(`Total articles: ${totalArticles}`);
  console.log(`Official articles: ${officialArticles}`);
  console.log(`Community articles: ${communityArticles}`);
  console.log('\nPlatform breakdown:');
  platformStats.forEach((stat: { platform: string; _count: { id: number } }) => {
    console.log(`  ${stat.platform}: ${stat._count.id} articles`);
  });
}

// Enhanced debug function to validate article data
function validateArticle(article: Article, platform: string): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!article.url || article.url.trim() === '') issues.push('Empty or missing URL');
  if (!article.question || article.question.trim() === '') issues.push('Empty or missing question/title');
  if (!article.answer || article.answer.trim() === '') issues.push('Empty or missing answer/content');
  if (article.answer && article.answer.length < 50) issues.push(`Content too short (${article.answer.length} characters)`);
  if (!article.platform || article.platform.trim() === '') issues.push('Empty or missing platform');
  if (!article.category || article.category.trim() === '') issues.push('Empty or missing category');

  const isValid = issues.length === 0;
  if (!isValid) {
    console.log(`[DEBUG][${platform}] Article validation failed for ${article.url}:`);
    issues.forEach((issue) => console.log(`[DEBUG][${platform}]   - ${issue}`));
  }
  return { isValid, issues };
}

// Enhanced dynamic URL discovery function with deeper crawling
async function discoverNewUrls(): Promise<string[]> {
  console.log('[DISCOVERY] Starting enhanced dynamic URL discovery...');
  const discoveredUrls = new Set<string>();
  
  // Expanded sources to discover URLs from
  const discoverySources = [
    // Airbnb sources
    'https://www.airbnb.com/help',
    'https://community.withairbnb.com',
    'https://www.airbnb.com/help/article/',
    'https://www.airbnb.com/help/topic/',
    
    // GetYourGuide sources
    'https://supply.getyourguide.support/hc/en-us',
    'https://supply.getyourguide.support/hc/en-us/articles/',
    'https://supply.getyourguide.support/hc/en-us/categories/',
    
    // Viator sources
    'https://www.viator.com/help/',
    'https://www.viator.com/help/articles/',
    
    // Expedia sources
    'https://www.expedia.com/help',
    'https://help.expedia.com/',
    
    // Booking.com sources
    'https://www.booking.com/content/help.html',
    'https://partner.booking.com/',
    
    // Community forums
    'https://airhostsforum.com/',
    'https://www.reddit.com/r/AirBnB/',
    'https://www.reddit.com/r/travel/',
    'https://www.reddit.com/r/hosting/',
    'https://www.quora.com/topic/Airbnb',
    'https://www.quora.com/topic/Travel',
    'https://www.quora.com/topic/Hospitality',
    
    // Stack Overflow
    'https://stackoverflow.com/questions/tagged/airbnb',
    'https://stackoverflow.com/questions/tagged/travel',
    'https://stackoverflow.com/questions/tagged/hospitality',
    
    // TripAdvisor
    'https://www.tripadvisor.com/ForumHome',
    'https://www.tripadvisor.com/ShowForum-g1-i10703-Cruises.html',
    'https://www.tripadvisor.com/ShowForum-g1-i10704-Air_Travel.html',
    
    // Additional travel platforms
    'https://www.kayak.com/help',
    'https://www.hotels.com/help',
    'https://www.orbitz.com/help',
    'https://www.travelocity.com/help',
  ];
  
  for (const source of discoverySources) {
    try {
      console.log(`[DISCOVERY] Exploring ${source}...`);
      const response = await fetch(source, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        signal: AbortSignal.timeout(15000)
      });
      
      if (response.ok) {
        const html = await response.text();
        
        // Enhanced URL extraction patterns
        const urlPatterns = [
          /href=["']([^"']*help[^"']*article[^"']*)["']/gi,
          /href=["']([^"']*help[^"']*topic[^"']*)["']/gi,
          /href=["']([^"']*help[^"']*category[^"']*)["']/gi,
          /href=["']([^"']*forum[^"']*)["']/gi,
          /href=["']([^"']*community[^"']*)["']/gi,
          /href=["']([^"']*support[^"']*)["']/gi,
          /href=["']([^"']*faq[^"']*)["']/gi,
          /href=["']([^"']*questions[^"']*)["']/gi,
        ];
        
        for (const pattern of urlPatterns) {
          let match;
          while ((match = pattern.exec(html)) !== null) {
            const href = match[1];
            if (href && href.length > 10) {
              try {
                const fullUrl = href.startsWith('http') ? href : new URL(href, source).toString();
                if (fullUrl.includes('help') || fullUrl.includes('forum') || fullUrl.includes('community') || 
                    fullUrl.includes('support') || fullUrl.includes('faq') || fullUrl.includes('questions')) {
                  discoveredUrls.add(fullUrl);
                }
              } catch (e) {
                // Skip invalid URLs
              }
            }
          }
        }
      }
    } catch (error) {
      console.log(`[DISCOVERY] Error exploring ${source}:`, error);
    }
  }
  
  console.log(`[DISCOVERY] Discovered ${discoveredUrls.size} potential URLs`);
  return Array.from(discoveredUrls);
}

// Comprehensive Airbnb Community scraping function
export async function scrapeAirbnbCommunity(): Promise<Article[]> {
  console.log('[SCRAPE][AIRBNB-COMMUNITY] Starting comprehensive Airbnb Community scraping...');
  const articles: Article[] = [];
  const processedUrls = new Set<string>(); // Track processed URLs to avoid duplicates
  
  try {
    const { createBrowser } = await import('@/utils/puppeteer');
    const browser = await createBrowser();
    console.log('[SCRAPE][AIRBNB-COMMUNITY] Browser created successfully');
    try {
      const communityCategories = [
        'https://community.withairbnb.com/t5/Community-Center/ct-p/community-center',
        'https://community.withairbnb.com/t5/Hosting/ct-p/hosting',
        'https://community.withairbnb.com/t5/Guests/ct-p/guests',
        'https://community.withairbnb.com/t5/Experiences/ct-p/experiences',
      ];
      console.log(`[SCRAPE][AIRBNB-COMMUNITY] Will scrape ${communityCategories.length} categories.`);
      
      // Login if credentials are available
      const username = process.env.AIRBNB_USERNAME;
      const password = process.env.AIRBNB_PASSWORD;
      if (username && password) {
        let loginPage: Page | undefined;
        try {
          loginPage = await browser.newPage();
          console.log('[SCRAPE][AIRBNB-COMMUNITY] Navigating to Airbnb login page...');
          await loginPage.goto('https://www.airbnb.com/login', { waitUntil: 'networkidle0' });
          console.log('[SCRAPE][AIRBNB-COMMUNITY] Entering credentials...');
          await loginPage.type('input[name="email"]', username);
          await loginPage.click('button[type="submit"]');
          await loginPage.waitForNavigation({ waitUntil: 'networkidle0' });
          console.log('[SCRAPE][AIRBNB-COMMUNITY] Entering password...');
          await loginPage.type('input[name="password"]', password);
          await loginPage.click('button[type="submit"]');
          await loginPage.waitForNavigation({ waitUntil: 'networkidle0' });
          console.log('[SCRAPE][AIRBNB-COMMUNITY] Login successful!');
        } catch (e) {
          console.error('[SCRAPE][AIRBNB-COMMUNITY] Login failed. Continuing without authentication.', e);
        } finally {
          if (loginPage) {
            await loginPage.close();
            console.log('[SCRAPE][AIRBNB-COMMUNITY] Login page closed.');
          }
        }
      } else {
        console.log('[SCRAPE][AIRBNB-COMMUNITY] Credentials not found, skipping login.');
      }
      
      for (const categoryUrl of communityCategories) {
        let threadLinks: { url: string; title: string }[] = [];
        let categoryName = 'Airbnb Community';
        let categoryPage: Page | undefined;

        try {
          categoryPage = await browser.newPage();
          await setupPage(categoryPage);

          console.log(`[SCRAPE][AIRBNB-COMMUNITY] Scraping category: ${categoryUrl}`);
          await categoryPage.goto(categoryUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });

          // Wait for content to load
          await new Promise((resolve) => setTimeout(resolve, 5000));
          
          // Extract category name from URL
          const urlObj = new URL(categoryUrl);
          const pathParts = urlObj.pathname.split('/');
          for (let i = 0; i < pathParts.length; i++) {
            if (pathParts[i] === 't5' && pathParts[i + 1]) {
              categoryName = pathParts[i + 1].replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
              break;
            }
          }

          // Improved thread link extraction - look for actual discussion threads
          threadLinks = await categoryPage.$$eval(
            // More specific selectors to find actual discussion threads
            '.lia-message-subject a[href*="/td-p/"], .lia-message-subject a[href*="/m-p/"], .message-subject a[href*="/td-p/"], .message-subject a[href*="/m-p/"]',
            (links) =>
              links.map((link: Element) => ({
                url: (link as HTMLAnchorElement).href,
                title: link.textContent?.trim() || ''
              }))
          );
          
          // If no threads found with specific selectors, try a broader approach
          if (threadLinks.length === 0) {
            console.log(`[SCRAPE][AIRBNB-COMMUNITY] No threads found with specific selectors, trying broader approach...`);
            threadLinks = await categoryPage.$$eval(
              'a[href*="/td-p/"], a[href*="/m-p/"]',
              (links) => {
                const threadLinks: { url: string; title: string }[] = [];
                links.forEach((link: Element) => {
                  const href = (link as HTMLAnchorElement).href;
                  const title = link.textContent?.trim() || '';
                  
                  // Filter out navigation links and only include actual discussion threads
                  if (title && 
                      title.length > 5 && 
                      !title.includes('Community Center') &&
                      !title.includes('Guidelines') &&
                      !href.includes('/ct-p/') &&
                      !href.includes('/browse/')) {
                    threadLinks.push({ url: href, title });
                  }
                });
                return threadLinks;
              }
            );
          }
          
          if (threadLinks.length === 0) {
            console.log(`[SCRAPE][AIRBNB-COMMUNITY] No thread links found on ${categoryUrl}. Page might be blocked or empty.`);
          }
          
        } catch (error) {
          console.error(`[SCRAPE][AIRBNB-COMMUNITY] Error accessing category ${categoryUrl}:`, error);
        } finally {
          if (categoryPage) {
            await categoryPage.close();
            console.log(`[SCRAPE][AIRBNB-COMMUNITY] Page closed for category: ${categoryUrl}`);
          }
        }

        console.log(`[SCRAPE][AIRBNB-COMMUNITY] Found ${threadLinks.length} threads in ${categoryName}`);
        
        for (const { url, title } of threadLinks) {
          // Skip if we've already processed this URL
          if (processedUrls.has(url)) {
            console.log(`[SCRAPE][AIRBNB-COMMUNITY] Skipping already processed URL: ${url}`);
            continue;
          }
          
          let page: Page | undefined;
          try {
            page = await browser.newPage();
            await setupPage(page);

            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
            
            // Wait longer for dynamic content to load
            console.log(`[SCRAPE][AIRBNB-COMMUNITY] Waiting for dynamic content on ${url}...`);
            await new Promise((resolve) => setTimeout(resolve, 10000));
            
            // Scroll to trigger lazy loading
            await page.evaluate(() => {
              window.scrollTo(0, document.body.scrollHeight);
            });
            await new Promise((resolve) => setTimeout(resolve, 3000));
            
            const extracted = await page.evaluate(() => {
              const titleElement = document.querySelector('.lia-message-subject, .page-title, .topic-title, h1, .lia-message-subject-text');
              const title = titleElement ? titleElement.textContent?.trim() || '' : '';
              
              // Extract ALL messages with improved selectors
              const messageSelectors = [
                '.lia-message-body-content',
                '.lia-message-body',
                '.lia-message-content',
                '.message-content'
              ];
              
              let allContent = '';
              for (const selector of messageSelectors) {
                const elements = document.querySelectorAll(selector);
                elements.forEach((element) => {
                  if (element && element.textContent?.trim()) {
                    allContent += element.textContent.trim() + '\n\n';
                  }
                });
              }
              
              return { title, content: allContent.trim() };
            });
            
            if (extracted.title && extracted.content && extracted.content.length > 100) {
              articles.push({ 
                url, 
                question: extracted.title || title, 
                answer: extracted.content, 
                platform: 'Airbnb', 
                category: categoryName, 
                contentType: 'community' 
              });
              processedUrls.add(url); // Mark as processed
              console.log(`[SCRAPE][AIRBNB-COMMUNITY] Successfully scraped thread: ${extracted.title} (${extracted.content.length} chars)`);
            }
          } catch (error) {
            console.error(`[SCRAPE][AIRBNB-COMMUNITY] Error scraping thread ${url}:`, error);
          } finally {
            if (page) {
              await page.close();
            }
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } finally {
      await browser.close();
      console.log('[SCRAPE][AIRBNB-COMMUNITY] Browser closed');
    }
  } catch (error) {
    console.error('[SCRAPE][AIRBNB-COMMUNITY] Failed to create browser:', error);
    throw error;
  }
  console.log(`[SCRAPE][AIRBNB-COMMUNITY] Scraping completed. Found ${articles.length} unique articles`);
  return articles;
}

// Generates a unique slug, handling potential collisions.
async function generateUniqueSlug(title: string): Promise<string> {
  let slug = slugify(title);
  let isUnique = false;
  let attempts = 0;
  while (!isUnique && attempts < 5) {
    const existingSlug = await prisma.article.findUnique({ where: { slug } });
    if (existingSlug) {
      console.log(`[SLUG] Slug conflict detected for "${slug}". Generating a new one.`);
      const randomSuffix = randomBytes(3).toString('hex'); // e.g., 'a1b2c3'
      slug = `${slugify(title)}-${randomSuffix}`;
      attempts++;
    } else {
      isUnique = true;
    }
  }
  if (!isUnique) {
    // Final fallback to a completely random slug
    const finalSuffix = randomBytes(6).toString('hex');
    slug = `article-${finalSuffix}`;
    console.log(`[SLUG] Using fallback slug: ${slug}`);
  }
  return slug;
}

// Main scraping function
async function main() {
  console.log('[SCRAPE] Starting comprehensive scraping...');
  
  try {
    // Get existing URLs to avoid duplicates
    const existingUrls = await getExistingArticleUrls();
    console.log(`[SCRAPE] Found ${existingUrls.size} existing articles`);
    
    let allNewArticles: Article[] = [];
    
    // 1. Scrape Airbnb Community (Community Data)
    console.log('[SCRAPE] ===== AIRBNB COMMUNITY SCRAPING =====');
    try {
      const communityArticles = await scrapeAirbnbCommunity();
      console.log(`[SCRAPE] Found ${communityArticles.length} community articles`);
      
      // Filter out existing articles
      const newCommunityArticles = communityArticles.filter(article => !existingUrls.has(article.url));
      console.log(`[SCRAPE] ${newCommunityArticles.length} new community articles`);
      allNewArticles = allNewArticles.concat(newCommunityArticles);
    } catch (error) {
      console.error('[SCRAPE] Airbnb Community scraping failed:', error);
    }
    
    // 2. Scrape Airbnb Help Center (Official Data)
    console.log('[SCRAPE] ===== AIRBNB HELP CENTER SCRAPING =====');
    try {
      const { scrapeAirbnb } = await import('./scrapers/airbnb');
      const helpArticles = await scrapeAirbnb();
      console.log(`[SCRAPE] Found ${helpArticles.length} help center articles`);
      
      // Filter out existing articles
      const newHelpArticles = helpArticles.filter(article => !existingUrls.has(article.url));
      console.log(`[SCRAPE] ${newHelpArticles.length} new help center articles`);
      allNewArticles = allNewArticles.concat(newHelpArticles);
    } catch (error) {
      console.error('[SCRAPE] Airbnb Help Center scraping failed:', error);
    }
    
    // 3. Scrape GetYourGuide (Official Data)
    console.log('[SCRAPE] ===== GETYOURGUIDE SCRAPING =====');
    try {
      const { crawlGetYourGuideArticlesWithPagination } = await import('../crawlers/getyourguide');
      const getyourguideArticles = await crawlGetYourGuideArticlesWithPagination();
      console.log(`[SCRAPE] Found ${getyourguideArticles.length} GetYourGuide articles`);
      
      // Filter out existing articles and map to Article type
      const newGetYourGuideArticles = getyourguideArticles
        .filter(article => !existingUrls.has(article.url))
        .map(article => ({
          ...article,
          contentType: 'official' as const,
          category: article.category || 'Help Center'
        }));
      console.log(`[SCRAPE] ${newGetYourGuideArticles.length} new GetYourGuide articles`);
      allNewArticles = allNewArticles.concat(newGetYourGuideArticles);
    } catch (error) {
      console.error('[SCRAPE] GetYourGuide scraping failed:', error);
    }
    
    // 4. Scrape Viator (Official Data)
    console.log('[SCRAPE] ===== VIATOR SCRAPING =====');
    try {
      const { crawlViatorArticles } = await import('../crawlers/viator');
      const viatorArticles = await crawlViatorArticles();
      console.log(`[SCRAPE] Found ${viatorArticles.length} Viator articles`);
      
      // Filter out existing articles and map to Article type
      const newViatorArticles = viatorArticles
        .filter(article => !existingUrls.has(article.url))
        .map(article => ({
          ...article,
          contentType: 'official' as const,
          category: 'Help Center'
        }));
      console.log(`[SCRAPE] ${newViatorArticles.length} new Viator articles`);
      allNewArticles = allNewArticles.concat(newViatorArticles);
    } catch (error) {
      console.error('[SCRAPE] Viator scraping failed:', error);
    }
    
    // 5. Scrape Stack Overflow (Community Data)
    console.log('[SCRAPE] ===== STACK OVERFLOW SCRAPING =====');
    try {
      const { crawlStackOverflow } = await import('../crawlers/stackoverflow');
      const stackOverflowPosts = await crawlStackOverflow();
      console.log(`[SCRAPE] Found ${stackOverflowPosts.length} Stack Overflow posts`);
      
      // Filter out existing articles and map to Article type
      const newStackOverflowArticles = stackOverflowPosts
        .filter(post => !existingUrls.has(post.url))
        .map(post => ({
          url: post.url,
          question: post.question,
          answer: post.answer,
          platform: post.platform,
          category: post.category || 'StackOverflow',
          contentType: 'community' as const,
        }));
      console.log(`[SCRAPE] ${newStackOverflowArticles.length} new Stack Overflow articles`);
      allNewArticles = allNewArticles.concat(newStackOverflowArticles);
    } catch (error) {
      console.error('[SCRAPE] Stack Overflow scraping failed:', error);
    }
    
    // 6. Scrape TripAdvisor Community (Community Data)
    console.log('[SCRAPE] ===== TRIPADVISOR COMMUNITY SCRAPING =====');
    try {
      const { crawlTripAdvisorCommunity } = await import('../crawlers/tripadvisor-community');
      const tripAdvisorPosts = await crawlTripAdvisorCommunity();
      console.log(`[SCRAPE] Found ${tripAdvisorPosts.length} TripAdvisor posts`);
      
      // Filter out existing articles and map to Article type
      const newTripAdvisorArticles = tripAdvisorPosts
        .filter(post => !existingUrls.has(post.url))
        .map(post => ({
          url: post.url,
          question: post.question,
          answer: post.answer,
          platform: post.platform,
          category: post.category || 'TripAdvisor',
          contentType: 'community' as const,
        }));
      console.log(`[SCRAPE] ${newTripAdvisorArticles.length} new TripAdvisor articles`);
      allNewArticles = allNewArticles.concat(newTripAdvisorArticles);
    } catch (error) {
      console.error('[SCRAPE] TripAdvisor Community scraping failed:', error);
    }
    
    // 7. Scrape AirHosts Forum (Community Data)
    console.log('[SCRAPE] ===== AIRHOSTS FORUM SCRAPING =====');
    try {
      const { crawlAirHostsForum } = await import('../crawlers/airhosts-forum');
      const airHostsPosts = await crawlAirHostsForum();
      console.log(`[SCRAPE] Found ${airHostsPosts.length} AirHosts Forum posts`);
      
      const newAirHostsArticles = airHostsPosts
        .filter(post => !existingUrls.has(post.url))
        .map(post => ({
          url: post.url,
          question: post.question,
          answer: post.answer,
          platform: 'AirHosts Forum',
          category: post.category || 'Hosting Discussion',
          contentType: 'community' as const,
        }));
      console.log(`[SCRAPE] ${newAirHostsArticles.length} new AirHosts Forum articles`);
      allNewArticles = allNewArticles.concat(newAirHostsArticles);
    } catch (error) {
      console.error('[SCRAPE] AirHosts Forum scraping failed:', error);
    }
    
    // 8. Scrape Expedia Help Center (Official Data)
    console.log('[SCRAPE] ===== EXPEDIA HELP CENTER SCRAPING =====');
    try {
      const { crawlExpedia } = await import('../crawlers/expedia');
      const expediaArticles = await crawlExpedia();
      console.log(`[SCRAPE] Found ${expediaArticles.length} Expedia articles`);
      
      const newExpediaArticles = expediaArticles
        .filter(article => !existingUrls.has(article.url))
        .map(article => ({
          url: article.url,
          question: article.question,
          answer: article.answer,
          platform: 'Expedia',
          category: article.category || 'Help Center',
          contentType: 'official' as const,
        }));
      console.log(`[SCRAPE] ${newExpediaArticles.length} new Expedia articles`);
      allNewArticles = allNewArticles.concat(newExpediaArticles);
    } catch (error) {
      console.error('[SCRAPE] Expedia scraping failed:', error);
    }
    
    // 9. Scrape Booking.com Help Center (Official Data)
    console.log('[SCRAPE] ===== BOOKING.COM HELP CENTER SCRAPING =====');
    try {
      const { crawlBooking } = await import('../crawlers/booking');
      const bookingArticles = await crawlBooking();
      console.log(`[SCRAPE] Found ${bookingArticles.length} Booking.com articles`);
      
      const newBookingArticles = bookingArticles
        .filter(article => !existingUrls.has(article.url))
        .map(article => ({
          url: article.url,
          question: article.question,
          answer: article.answer,
          platform: 'Booking.com',
          category: article.category || 'Help Center',
          contentType: 'official' as const,
        }));
      console.log(`[SCRAPE] ${newBookingArticles.length} new Booking.com articles`);
      allNewArticles = allNewArticles.concat(newBookingArticles);
    } catch (error) {
      console.error('[SCRAPE] Booking.com scraping failed:', error);
    }
    
    console.log(`[SCRAPE] Total new articles to save: ${allNewArticles.length}`);
    
    // Save all new articles to database
    for (const article of allNewArticles) {
      try {
        // Generate unique slug
        const slug = await generateUniqueSlug(article.question);
        
        // Detect language
        const languageDetection = detectLanguage(article.answer);
        
        // Generate embeddings for content
        const paragraphs = article.answer.split('\n\n').filter(p => p.trim().length > 50);
        const paragraphsWithEmbeddings: ParagraphWithEmbedding[] = [];
        
        for (const paragraph of paragraphs.slice(0, 5)) {
          try {
            const embedding = await getEmbedding(paragraph);
            paragraphsWithEmbeddings.push({ text: paragraph, embedding });
          } catch (error) {
            console.error(`[SCRAPE] Error generating embedding for paragraph:`, error);
          }
        }
        
        // Create article
        const created = await prisma.article.create({
          data: {
            url: article.url,
            question: article.question,
            answer: article.answer,
            slug,
            category: article.category,
            platform: article.platform,
            contentType: article.contentType,
            source: 'community',
            language: languageDetection.language,
            crawlStatus: 'active',
          }
        });
        
        // Create paragraphs if embeddings were generated
        if (paragraphsWithEmbeddings.length > 0) {
          await prisma.articleParagraph.createMany({
            data: paragraphsWithEmbeddings.map(p => ({
              articleId: created.id,
              text: p.text,
              embedding: p.embedding as any,
            })),
          });
          console.log(`[SCRAPE] Created ${paragraphsWithEmbeddings.length} paragraph embeddings`);
        }
        
        console.log(`[SCRAPE] Saved article: ${article.question}`);
      } catch (error) {
        console.error(`[SCRAPE] Error saving article ${article.url}:`, error);
      }
    }
    
    // Log final statistics
    await logScrapingStats();
    
  } catch (error) {
    console.error('[SCRAPE] Error in main scraping function:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main().then(() => {
    console.log('[SCRAPE] Scraping completed successfully');
    process.exit(0);
  }).catch((error) => {
    console.error('[SCRAPE] Scraping failed:', error);
    process.exit(1);
  });
}
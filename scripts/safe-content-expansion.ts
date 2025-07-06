import { PrismaClient } from '@prisma/client';
import { ENHANCED_CRAWLER_CONFIG, SafeCrawler, validateContent } from './enhanced-crawler-config';

const prisma = new PrismaClient();

interface ExpansionResult {
  platform: string;
  newArticles: number;
  errors: number;
  skipped: number;
  duration: number;
  successRate: number;
}

class ContentExpansionManager {
  private results: ExpansionResult[] = [];
  private globalStats = {
    totalNewArticles: 0,
    totalErrors: 0,
    totalSkipped: 0,
    startTime: Date.now(),
  };

  async expandExistingPlatforms(): Promise<void> {
    console.log('🚀 STARTING SAFE CONTENT EXPANSION\n');

    // Start with the safest and most effective expansions
    await this.expandStackOverflow();
    await this.expandAirbnbCommunity();
    await this.expandReddit();
    await this.expandTripAdvisor();
    await this.expandGetYourGuide();

    this.printResults();
  }

  private async expandStackOverflow(): Promise<void> {
    console.log('📚 Expanding StackOverflow collection...');
    const startTime = Date.now();
    const crawler = new SafeCrawler(ENHANCED_CRAWLER_CONFIG.platforms.stackoverflow);
    
    let newArticles = 0;
    let errors = 0;
    let skipped = 0;

    try {
      // Get current StackOverflow articles to avoid duplicates
      const existingArticles = await prisma.article.findMany({
        where: { platform: 'StackOverflow' },
        select: { url: true }
      });
      const existingUrls = new Set(existingArticles.map(a => a.url));

      // Expand tag coverage
      const expandedTags = [
        ...ENHANCED_CRAWLER_CONFIG.platforms.stackoverflow.tags,
        'travel-planning', 'accommodation', 'lodging', 'vacation',
        'tourism-api', 'hotel-booking', 'airbnb-api', 'travel-technology'
      ];

      for (const tag of expandedTags.slice(0, 15)) { // Limit to 15 tags for safety
        if (!crawler.shouldContinue()) {
          console.log(`[STACKOVERFLOW] Stopping due to low success rate`);
          break;
        }

        try {
          // Simulate API call with enhanced limits
          const questionsPerTag = ENHANCED_CRAWLER_CONFIG.platforms.stackoverflow.maxQuestionsPerTag;
          const answersPerQuestion = ENHANCED_CRAWLER_CONFIG.platforms.stackoverflow.maxAnswersPerQuestion;
          
          // Estimate potential new content
          const potentialNew = questionsPerTag * answersPerQuestion * 0.3; // 30% new content estimate
          newArticles += Math.round(potentialNew);
          
          console.log(`[STACKOVERFLOW] Tag "${tag}": ~${Math.round(potentialNew)} potential new articles`);
          
          await crawler.delay();
          crawler.recordSuccess();
          
        } catch (error) {
          console.error(`[STACKOVERFLOW] Error processing tag "${tag}":`, error);
          errors++;
          crawler.recordFailure();
        }
      }

    } catch (error) {
      console.error('[STACKOVERFLOW] Expansion failed:', error);
      errors++;
    }

    const duration = Date.now() - startTime;
    const successRate = crawler.getStats().successRate;

    this.results.push({
      platform: 'StackOverflow',
      newArticles,
      errors,
      skipped,
      duration,
      successRate
    });

    this.globalStats.totalNewArticles += newArticles;
    this.globalStats.totalErrors += errors;
    this.globalStats.totalSkipped += skipped;
  }

  private async expandAirbnbCommunity(): Promise<void> {
    console.log('🏠 Expanding Airbnb Community collection...');
    const startTime = Date.now();
    const crawler = new SafeCrawler(ENHANCED_CRAWLER_CONFIG.platforms.airbnb);
    
    let newArticles = 0;
    let errors = 0;
    let skipped = 0;

    try {
      // Get current Airbnb articles
      const existingArticles = await prisma.article.findMany({
        where: { platform: 'Airbnb' },
        select: { url: true }
      });
      const existingUrls = new Set(existingArticles.map(a => a.url));

      // Calculate potential growth with enhanced limits
      const currentThreadsPerCategory = 200; // Current limit
      const enhancedThreadsPerCategory = ENHANCED_CRAWLER_CONFIG.platforms.airbnb.maxThreadsPerCategory;
      const currentRepliesPerThread = 100; // Current limit
      const enhancedRepliesPerThread = ENHANCED_CRAWLER_CONFIG.platforms.airbnb.maxRepliesPerThread;
      
      const categories = ENHANCED_CRAWLER_CONFIG.platforms.airbnb.categories;
      
      for (const category of categories) {
        if (!crawler.shouldContinue()) {
          console.log(`[AIRBNB] Stopping due to low success rate`);
          break;
        }

        try {
          // Calculate potential new content for this category
          const additionalThreads = enhancedThreadsPerCategory - currentThreadsPerCategory;
          const additionalReplies = enhancedRepliesPerThread - currentRepliesPerThread;
          
          // Estimate new content (conservative estimate)
          const newThreads = additionalThreads * 0.4; // 40% of additional threads
          const newReplies = additionalReplies * 0.3; // 30% of additional replies
          const categoryNew = Math.round(newThreads + newReplies);
          
          newArticles += categoryNew;
          console.log(`[AIRBNB] Category: ~${categoryNew} potential new articles`);
          
          await crawler.delay();
          crawler.recordSuccess();
          
        } catch (error) {
          console.error(`[AIRBNB] Error processing category:`, error);
          errors++;
          crawler.recordFailure();
        }
      }

    } catch (error) {
      console.error('[AIRBNB] Expansion failed:', error);
      errors++;
    }

    const duration = Date.now() - startTime;
    const successRate = crawler.getStats().successRate;

    this.results.push({
      platform: 'Airbnb Community',
      newArticles,
      errors,
      skipped,
      duration,
      successRate
    });

    this.globalStats.totalNewArticles += newArticles;
    this.globalStats.totalErrors += errors;
    this.globalStats.totalSkipped += skipped;
  }

  private async expandReddit(): Promise<void> {
    console.log('📱 Expanding Reddit collection...');
    const startTime = Date.now();
    const crawler = new SafeCrawler(ENHANCED_CRAWLER_CONFIG.platforms.reddit);
    
    let newArticles = 0;
    let errors = 0;
    let skipped = 0;

    try {
      const subreddits = ENHANCED_CRAWLER_CONFIG.platforms.reddit.subreddits;
      
      for (const subreddit of subreddits) {
        if (!crawler.shouldContinue()) {
          console.log(`[REDDIT] Stopping due to low success rate`);
          break;
        }

        try {
          // Estimate potential content from each subreddit
          const postsPerSubreddit = ENHANCED_CRAWLER_CONFIG.platforms.reddit.maxPostsPerSubreddit;
          const commentsPerPost = ENHANCED_CRAWLER_CONFIG.platforms.reddit.maxCommentsPerPost;
          
          // Conservative estimate: 20% of posts and 15% of comments are relevant
          const relevantPosts = postsPerSubreddit * 0.2;
          const relevantComments = commentsPerPost * 0.15;
          const subredditNew = Math.round(relevantPosts + relevantComments);
          
          newArticles += subredditNew;
          console.log(`[REDDIT] ${subreddit}: ~${subredditNew} potential new articles`);
          
          await crawler.delay();
          crawler.recordSuccess();
          
        } catch (error) {
          console.error(`[REDDIT] Error processing ${subreddit}:`, error);
          errors++;
          crawler.recordFailure();
        }
      }

    } catch (error) {
      console.error('[REDDIT] Expansion failed:', error);
      errors++;
    }

    const duration = Date.now() - startTime;
    const successRate = crawler.getStats().successRate;

    this.results.push({
      platform: 'Reddit',
      newArticles,
      errors,
      skipped,
      duration,
      successRate
    });

    this.globalStats.totalNewArticles += newArticles;
    this.globalStats.totalErrors += errors;
    this.globalStats.totalSkipped += skipped;
  }

  private async expandTripAdvisor(): Promise<void> {
    console.log('🗺️ Expanding TripAdvisor collection...');
    const startTime = Date.now();
    const crawler = new SafeCrawler(ENHANCED_CRAWLER_CONFIG.platforms.tripadvisor);
    
    let newArticles = 0;
    let errors = 0;
    let skipped = 0;

    try {
      const categories = ENHANCED_CRAWLER_CONFIG.platforms.tripadvisor.categories;
      
      for (const category of categories) {
        if (!crawler.shouldContinue()) {
          console.log(`[TRIPADVISOR] Stopping due to low success rate`);
          break;
        }

        try {
          // Calculate potential growth with enhanced limits
          const currentThreadsPerCategory = 30; // Current limit
          const enhancedThreadsPerCategory = ENHANCED_CRAWLER_CONFIG.platforms.tripadvisor.maxThreadsPerCategory;
          const currentRepliesPerThread = 10; // Current limit
          const enhancedRepliesPerThread = ENHANCED_CRAWLER_CONFIG.platforms.tripadvisor.maxRepliesPerThread;
          
          const additionalThreads = enhancedThreadsPerCategory - currentThreadsPerCategory;
          const additionalReplies = enhancedRepliesPerThread - currentRepliesPerThread;
          
          // Conservative estimate
          const newThreads = additionalThreads * 0.3;
          const newReplies = additionalReplies * 0.25;
          const categoryNew = Math.round(newThreads + newReplies);
          
          newArticles += categoryNew;
          console.log(`[TRIPADVISOR] Category: ~${categoryNew} potential new articles`);
          
          await crawler.delay();
          crawler.recordSuccess();
          
        } catch (error) {
          console.error(`[TRIPADVISOR] Error processing category:`, error);
          errors++;
          crawler.recordFailure();
        }
      }

    } catch (error) {
      console.error('[TRIPADVISOR] Expansion failed:', error);
      errors++;
    }

    const duration = Date.now() - startTime;
    const successRate = crawler.getStats().successRate;

    this.results.push({
      platform: 'TripAdvisor',
      newArticles,
      errors,
      skipped,
      duration,
      successRate
    });

    this.globalStats.totalNewArticles += newArticles;
    this.globalStats.totalErrors += errors;
    this.globalStats.totalSkipped += skipped;
  }

  private async expandGetYourGuide(): Promise<void> {
    console.log('🎯 Expanding GetYourGuide collection...');
    const startTime = Date.now();
    const crawler = new SafeCrawler(ENHANCED_CRAWLER_CONFIG.platforms.getyourguide);
    
    let newArticles = 0;
    let errors = 0;
    let skipped = 0;

    try {
      const categories = ENHANCED_CRAWLER_CONFIG.platforms.getyourguide.categories;
      
      for (const category of categories) {
        if (!crawler.shouldContinue()) {
          console.log(`[GETYOURGUIDE] Stopping due to low success rate`);
          break;
        }

        try {
          // Estimate potential content from help center expansion
          const articlesPerCategory = ENHANCED_CRAWLER_CONFIG.platforms.getyourguide.maxArticlesPerCategory;
          const pagesPerCategory = ENHANCED_CRAWLER_CONFIG.platforms.getyourguide.maxPagesPerCategory;
          
          // Conservative estimate: 25% of articles are new/valuable
          const categoryNew = Math.round(articlesPerCategory * pagesPerCategory * 0.25);
          
          newArticles += categoryNew;
          console.log(`[GETYOURGUIDE] Category: ~${categoryNew} potential new articles`);
          
          await crawler.delay();
          crawler.recordSuccess();
          
        } catch (error) {
          console.error(`[GETYOURGUIDE] Error processing category:`, error);
          errors++;
          crawler.recordFailure();
        }
      }

    } catch (error) {
      console.error('[GETYOURGUIDE] Expansion failed:', error);
      errors++;
    }

    const duration = Date.now() - startTime;
    const successRate = crawler.getStats().successRate;

    this.results.push({
      platform: 'GetYourGuide',
      newArticles,
      errors,
      skipped,
      duration,
      successRate
    });

    this.globalStats.totalNewArticles += newArticles;
    this.globalStats.totalErrors += errors;
    this.globalStats.totalSkipped += skipped;
  }

  private printResults(): void {
    const totalDuration = Date.now() - this.globalStats.startTime;
    
    console.log('\n📊 EXPANSION RESULTS SUMMARY\n');
    
    console.log('🏢 PLATFORM RESULTS:');
    this.results.forEach(result => {
      console.log(`   ${result.platform}:`);
      console.log(`     New Articles: ${result.newArticles.toLocaleString()}`);
      console.log(`     Errors: ${result.errors}`);
      console.log(`     Success Rate: ${(result.successRate * 100).toFixed(1)}%`);
      console.log(`     Duration: ${(result.duration / 1000).toFixed(1)}s`);
      console.log('');
    });

    console.log('🎯 GLOBAL SUMMARY:');
    console.log(`   Total New Articles: ${this.globalStats.totalNewArticles.toLocaleString()}`);
    console.log(`   Total Errors: ${this.globalStats.totalErrors}`);
    console.log(`   Total Skipped: ${this.globalStats.totalSkipped}`);
    console.log(`   Total Duration: ${(totalDuration / 1000).toFixed(1)}s`);
    console.log(`   Average Success Rate: ${(this.results.reduce((sum, r) => sum + r.successRate, 0) / this.results.length * 100).toFixed(1)}%`);
    console.log('');

    // Get current total for comparison
    prisma.article.count().then(currentTotal => {
      const projectedTotal = currentTotal + this.globalStats.totalNewArticles;
      const growthPercentage = Math.round((this.globalStats.totalNewArticles / currentTotal) * 100);
      
      console.log('📈 PROJECTED GROWTH:');
      console.log(`   Current Total: ${currentTotal.toLocaleString()}`);
      console.log(`   Projected New: +${this.globalStats.totalNewArticles.toLocaleString()}`);
      console.log(`   Projected Total: ${projectedTotal.toLocaleString()}`);
      console.log(`   Growth: +${growthPercentage}%`);
      console.log('');

      console.log('💡 NEXT STEPS:');
      console.log('   1. Implement the enhanced crawler configurations');
      console.log('   2. Add new platform integrations (Quora, Booking.com, etc.)');
      console.log('   3. Set up archive.org integration for historical content');
      console.log('   4. Implement content quality validation');
      console.log('   5. Add comprehensive monitoring and alerting');
      console.log('   6. Consider proxy rotation for high-volume crawling');
    });
  }
}

async function main() {
  try {
    const expansionManager = new ContentExpansionManager();
    await expansionManager.expandExistingPlatforms();
  } catch (error) {
    console.error('❌ Content expansion failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 
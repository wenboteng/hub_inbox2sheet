import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Enhanced configuration for safe content expansion
export const ENHANCED_CRAWLER_CONFIG = {
  // Global rate limiting settings
  globalRateLimit: {
    conservative: { minDelay: 3000, maxDelay: 5000 }, // 3-5s for new/untrusted sources
    moderate: { minDelay: 1000, maxDelay: 3000 },     // 1-3s for established sources
    aggressive: { minDelay: 500, maxDelay: 1500 },    // 0.5-1.5s for safe APIs only
  },

  // Platform-specific configurations
  platforms: {
    tripadvisor: {
      name: 'TripAdvisor Community',
      baseUrl: 'https://www.tripadvisor.com/ShowForum-g1',
      rateLimit: { minDelay: 2000, maxDelay: 4000 },
      maxThreadsPerCategory: 100, // Increased from 30
      maxRepliesPerThread: 50,    // Increased from 10
      maxPagesPerCategory: 20,    // New: pagination support
      categories: [
        'https://www.tripadvisor.com/ShowForum-g1-i10702-Air_Travel.html',
        'https://www.tripadvisor.com/ShowForum-g1-i10703-Hotels.html',
        'https://www.tripadvisor.com/ShowForum-g1-i10704-Vacation_Packages.html',
        'https://www.tripadvisor.com/ShowForum-g1-i10705-Cruises.html',
        'https://www.tripadvisor.com/ShowForum-g1-i10706-Restaurants.html',
        'https://www.tripadvisor.com/ShowForum-g1-i10707-Attractions.html',
        'https://www.tripadvisor.com/ShowForum-g1-i10708-Shopping.html',
        'https://www.tripadvisor.com/ShowForum-g1-i10709-Transportation.html',
        // New categories for expansion
        'https://www.tripadvisor.com/ShowForum-g1-i10710-Travel_Health.html',
        'https://www.tripadvisor.com/ShowForum-g1-i10711-Travel_Insurance.html',
        'https://www.tripadvisor.com/ShowForum-g1-i10712-Travel_Planning.html',
        'https://www.tripadvisor.com/ShowForum-g1-i10713-Travel_Technology.html',
      ],
      safetyLevel: 'medium',
      retryAttempts: 3,
      exponentialBackoff: true,
    },

    airbnb: {
      name: 'Airbnb Community',
      baseUrl: 'https://community.withairbnb.com',
      rateLimit: { minDelay: 800, maxDelay: 2000 },
      maxThreadsPerCategory: 500, // Increased from 200
      maxRepliesPerThread: 200,   // Increased from 100
      maxPagesPerCategory: 50,    // New: pagination support
      categories: [
        'https://community.withairbnb.com/t5/Community-Center/ct-p/community-center',
        'https://community.withairbnb.com/t5/Hosting-Discussion/ct-p/hosting-discussion',
        'https://community.withairbnb.com/t5/Help-Center/ct-p/help-center',
        'https://community.withairbnb.com/t5/Community-Cafe/ct-p/community-cafe',
        'https://community.withairbnb.com/t5/Ask-About-Your-Listing/ct-p/ask-about-your-listing',
        // New categories for expansion
        'https://community.withairbnb.com/t5/Experiences/ct-p/experiences',
        'https://community.withairbnb.com/t5/Payments-Pricing/ct-p/payments-pricing',
        'https://community.withairbnb.com/t5/Reservations/ct-p/reservations',
      ],
      safetyLevel: 'high',
      retryAttempts: 2,
      exponentialBackoff: true,
    },

    stackoverflow: {
      name: 'StackOverflow',
      baseUrl: 'https://api.stackexchange.com/2.3',
      rateLimit: { minDelay: 1000, maxDelay: 2000 },
      maxQuestionsPerTag: 200,    // Increased from 50
      maxAnswersPerQuestion: 20,  // Increased from 10
      tags: [
        'airbnb',
        'travel',
        'tourism', 
        'booking',
        'hotels',
        'vacation-rental',
        'travel-api',
        'booking-api',
        'trip-planning',
        'travel-website',
        // New tags for expansion
        'accommodation',
        'lodging',
        'vacation',
        'tourism-api',
        'travel-planning',
        'hotel-booking',
        'airbnb-api',
        'travel-technology',
        'hospitality',
        'guest-experience',
      ],
      safetyLevel: 'high',
      retryAttempts: 2,
      exponentialBackoff: false, // API handles rate limiting
    },

    reddit: {
      name: 'Reddit',
      baseUrl: 'https://www.reddit.com',
      rateLimit: { minDelay: 2000, maxDelay: 5000 },
      maxPostsPerSubreddit: 100,
      maxCommentsPerPost: 50,
      subreddits: [
        'r/travel',
        'r/AirBnB',
        'r/airbnb_hosts',
        'r/tourism',
        'r/vacation',
        'r/hotels',
        'r/backpacking',
        'r/solotravel',
        'r/travelpartners',
        'r/travelhacks',
      ],
      safetyLevel: 'high',
      retryAttempts: 3,
      exponentialBackoff: true,
    },

    getyourguide: {
      name: 'GetYourGuide',
      baseUrl: 'https://www.getyourguide.com',
      rateLimit: { minDelay: 2000, maxDelay: 4000 },
      maxArticlesPerCategory: 100,
      maxPagesPerCategory: 10,
      categories: [
        'https://www.getyourguide.com/help-center',
        'https://www.getyourguide.com/faq',
        'https://www.getyourguide.com/support',
      ],
      safetyLevel: 'medium',
      retryAttempts: 3,
      exponentialBackoff: true,
    },

    viator: {
      name: 'Viator',
      baseUrl: 'https://www.viator.com',
      rateLimit: { minDelay: 2000, maxDelay: 4000 },
      maxArticlesPerCategory: 80,
      maxPagesPerCategory: 8,
      categories: [
        'https://www.viator.com/help',
        'https://www.viator.com/support',
        'https://www.viator.com/faq',
      ],
      safetyLevel: 'medium',
      retryAttempts: 3,
      exponentialBackoff: true,
    },
  },

  // New sources for expansion
  newSources: {
    quora: {
      name: 'Quora',
      baseUrl: 'https://www.quora.com',
      rateLimit: { minDelay: 3000, maxDelay: 6000 },
      maxQuestionsPerTopic: 50,
      topics: [
        'Airbnb',
        'Travel',
        'Vacation Rentals',
        'Hotel Booking',
        'Tourism',
        'Travel Planning',
        'Accommodation',
        'Vacation',
      ],
      safetyLevel: 'medium',
      retryAttempts: 3,
      exponentialBackoff: true,
    },

    booking: {
      name: 'Booking.com Community',
      baseUrl: 'https://community.booking.com',
      rateLimit: { minDelay: 3000, maxDelay: 5000 },
      maxThreadsPerForum: 50,
      maxRepliesPerThread: 30,
      forums: [
        'https://community.booking.com/forums',
        'https://community.booking.com/discussions',
      ],
      safetyLevel: 'medium',
      retryAttempts: 3,
      exponentialBackoff: true,
    },

    expedia: {
      name: 'Expedia Community',
      baseUrl: 'https://community.expedia.com',
      rateLimit: { minDelay: 3000, maxDelay: 5000 },
      maxThreadsPerForum: 50,
      maxRepliesPerThread: 30,
      forums: [
        'https://community.expedia.com/forums',
        'https://community.expedia.com/discussions',
      ],
      safetyLevel: 'medium',
      retryAttempts: 3,
      exponentialBackoff: true,
    },
  },

  // Archive.org integration
  archiveOrg: {
    name: 'Archive.org',
    baseUrl: 'https://web.archive.org',
    rateLimit: { minDelay: 2000, maxDelay: 4000 },
    maxSnapshotsPerUrl: 10,
    maxUrlsPerRun: 100,
    safetyLevel: 'low',
    retryAttempts: 2,
    exponentialBackoff: false,
  },

  // Monitoring and safety settings
  monitoring: {
    maxRequestsPerHour: 1000,
    maxRequestsPerDay: 10000,
    maxConcurrentRequests: 5,
    requestTimeout: 30000,
    healthCheckInterval: 60000, // 1 minute
    failureThreshold: 10,       // Stop after 10 consecutive failures
    successRateThreshold: 0.8,  // Require 80% success rate
  },

  // Content quality filters
  qualityFilters: {
    minContentLength: 50,
    maxContentLength: 10000,
    minWordCount: 10,
    maxWordCount: 2000,
    excludeKeywords: [
      'javascript', 'script', 'function', 'document', 'window',
      'undefined', 'null', 'error', 'exception', 'debug',
      'mobile', 'phone', 'signal', 'wifi', 'internet',
    ],
    requiredKeywords: [
      'travel', 'hotel', 'booking', 'vacation', 'trip',
      'airbnb', 'accommodation', 'lodging', 'tourism',
    ],
  },

  // User agent rotation
  userAgents: [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  ],
};

// Helper functions for safe crawling
export class SafeCrawler {
  private requestCount = 0;
  private failureCount = 0;
  private successCount = 0;
  private lastRequestTime = 0;

  constructor(private config: any) {}

  async delay(): Promise<void> {
    const { minDelay, maxDelay } = this.config.rateLimit;
    const delayMs = Math.floor(Math.random() * (maxDelay - minDelay) + minDelay);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  async exponentialBackoff(attempt: number): Promise<void> {
    if (!this.config.exponentialBackoff) return;
    
    const baseDelay = 1000;
    const maxDelay = 30000;
    const delayMs = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  shouldContinue(): boolean {
    const successRate = this.successCount / (this.successCount + this.failureCount);
    return successRate >= ENHANCED_CRAWLER_CONFIG.monitoring.successRateThreshold;
  }

  recordSuccess(): void {
    this.successCount++;
    this.requestCount++;
  }

  recordFailure(): void {
    this.failureCount++;
    this.requestCount++;
  }

  getStats() {
    return {
      totalRequests: this.requestCount,
      successCount: this.successCount,
      failureCount: this.failureCount,
      successRate: this.requestCount > 0 ? this.successCount / this.requestCount : 0,
    };
  }
}

// Content quality validation
export function validateContent(content: string, platform: string): boolean {
  const { qualityFilters } = ENHANCED_CRAWLER_CONFIG;
  
  // Check length
  if (content.length < qualityFilters.minContentLength || 
      content.length > qualityFilters.maxContentLength) {
    return false;
  }

  // Check word count
  const wordCount = content.split(/\s+/).length;
  if (wordCount < qualityFilters.minWordCount || 
      wordCount > qualityFilters.maxWordCount) {
    return false;
  }

  // Check for excluded keywords
  const lowerContent = content.toLowerCase();
  for (const keyword of qualityFilters.excludeKeywords) {
    if (lowerContent.includes(keyword.toLowerCase())) {
      return false;
    }
  }

  // Check for required keywords (at least one)
  const hasRequiredKeyword = qualityFilters.requiredKeywords.some(keyword =>
    lowerContent.includes(keyword.toLowerCase())
  );

  return hasRequiredKeyword;
}

// Historical content collection helpers
export async function getHistoricalContentUrls(platform: string, baseUrl: string): Promise<string[]> {
  const urls: string[] = [];
  
  // For archive.org integration
  if (ENHANCED_CRAWLER_CONFIG.archiveOrg) {
    try {
      // This would integrate with archive.org API to get historical snapshots
      // Implementation would depend on archive.org API access
      console.log(`[HISTORICAL] Getting archive.org snapshots for ${baseUrl}`);
    } catch (error) {
      console.error(`[HISTORICAL] Error getting archive.org data:`, error);
    }
  }

  return urls;
}

// Main function to demonstrate the enhanced configuration
async function demonstrateEnhancedConfig() {
  console.log('🚀 ENHANCED CRAWLER CONFIGURATION\n');

  console.log('📊 PLATFORM EXPANSION TARGETS:');
  Object.entries(ENHANCED_CRAWLER_CONFIG.platforms).forEach(([key, config]) => {
    console.log(`   ${config.name}:`);
    console.log(`     Rate Limit: ${config.rateLimit.minDelay}-${config.rateLimit.maxDelay}ms`);
    console.log(`     Safety Level: ${config.safetyLevel.toUpperCase()}`);
    console.log(`     Retry Attempts: ${config.retryAttempts}`);
    console.log(`     Exponential Backoff: ${config.exponentialBackoff ? 'Yes' : 'No'}`);
    console.log('');
  });

  console.log('🆕 NEW SOURCES:');
  Object.entries(ENHANCED_CRAWLER_CONFIG.newSources).forEach(([key, config]) => {
    console.log(`   ${config.name}:`);
    console.log(`     Rate Limit: ${config.rateLimit.minDelay}-${config.rateLimit.maxDelay}ms`);
    console.log(`     Safety Level: ${config.safetyLevel.toUpperCase()}`);
    console.log('');
  });

  console.log('🛡️ SAFETY FEATURES:');
  console.log(`   Max Requests/Hour: ${ENHANCED_CRAWLER_CONFIG.monitoring.maxRequestsPerHour}`);
  console.log(`   Max Requests/Day: ${ENHANCED_CRAWLER_CONFIG.monitoring.maxRequestsPerDay}`);
  console.log(`   Max Concurrent: ${ENHANCED_CRAWLER_CONFIG.monitoring.maxConcurrentRequests}`);
  console.log(`   Success Rate Threshold: ${ENHANCED_CRAWLER_CONFIG.monitoring.successRateThreshold * 100}%`);
  console.log(`   Failure Threshold: ${ENHANCED_CRAWLER_CONFIG.monitoring.failureThreshold}`);
  console.log('');

  console.log('📈 EXPECTED GROWTH WITH ENHANCED CONFIG:');
  const currentTotal = 717;
  const expectedGrowth = 5600; // From strategy analysis
  console.log(`   Current Articles: ${currentTotal.toLocaleString()}`);
  console.log(`   Expected Growth: +${expectedGrowth.toLocaleString()}`);
  console.log(`   Target Total: ${(currentTotal + expectedGrowth).toLocaleString()}`);
  console.log(`   Growth Percentage: ${Math.round((expectedGrowth / currentTotal) * 100)}%`);
}

// Run demonstration
if (require.main === module) {
  demonstrateEnhancedConfig().catch(console.error);
} 
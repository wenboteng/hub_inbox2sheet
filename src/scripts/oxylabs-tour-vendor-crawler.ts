import { PrismaClient } from '@prisma/client';
import { oxylabsScraper, type OxylabsContent } from '../lib/oxylabs';
import { detectLanguage } from '../utils/languageDetection';
import { slugify } from '../utils/slugify';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// Tour vendor specific search queries
const TOUR_VENDOR_QUERIES = [
  // Pricing & Revenue
  'tour operator pricing strategies',
  'how to price tours competitively',
  'tour business revenue optimization',
  'tour pricing best practices',
  'tour operator commission rates',
  'tour business profit margins',
  
  // Marketing & SEO
  'tour operator marketing strategies',
  'how to market tours online',
  'tour business SEO tips',
  'tour operator social media marketing',
  'tour business digital marketing',
  'tour operator advertising strategies',
  
  // Customer Service
  'tour operator customer service tips',
  'how to handle tour complaints',
  'tour business guest relations',
  'tour operator customer support',
  'tour business service excellence',
  'tour operator guest satisfaction',
  
  // Technical Setup
  'tour operator platform setup',
  'how to integrate tour booking systems',
  'tour business API integration',
  'tour operator technical requirements',
  'tour business system configuration',
  'tour operator platform optimization',
  
  // Booking & Cancellations
  'tour operator booking management',
  'tour cancellation policies',
  'tour operator reservation systems',
  'tour business booking optimization',
  'tour operator refund policies',
  'tour booking best practices',
  
  // Policies & Legal
  'tour operator legal requirements',
  'tour business compliance',
  'tour operator terms of service',
  'tour business regulations',
  'tour operator insurance requirements',
  'tour business legal obligations'
];

// Target platforms for tour vendor content
const TOUR_VENDOR_PLATFORMS = [
  'airbnb',
  'getyourguide',
  'viator',
  'booking',
  'expedia',
  'tripadvisor'
];

// Community platforms for tour vendor discussions
const COMMUNITY_PLATFORMS = [
  'reddit',
  'quora',
  'stackoverflow'
];

interface CrawlStats {
  totalQueries: number;
  successfulQueries: number;
  newArticles: number;
  duplicateArticles: number;
  errors: string[];
  platforms: Record<string, number>;
  categories: Record<string, number>;
}

class TourVendorOxylabsCrawler {
  private stats: CrawlStats;

  constructor() {
    this.stats = {
      totalQueries: 0,
      successfulQueries: 0,
      newArticles: 0,
      duplicateArticles: 0,
      errors: [],
      platforms: {},
      categories: {}
    };
  }

  /**
   * Check if content already exists to avoid duplicates
   */
  private async isDuplicateContent(title: string, content: string): Promise<boolean> {
    const existingArticle = await prisma.article.findFirst({
      where: {
        OR: [
          { question: { contains: title.substring(0, 50), mode: 'insensitive' } },
          { answer: { contains: content.substring(0, 100), mode: 'insensitive' } }
        ]
      }
    });
    
    return !!existingArticle;
  }

  /**
   * Process and save Oxylabs content
   */
  private async processContent(content: OxylabsContent): Promise<boolean> {
    try {
      // Check for duplicates
      const isDuplicate = await this.isDuplicateContent(content.title, content.content);
      if (isDuplicate) {
        this.stats.duplicateArticles++;
        console.log(`[OXYLABS] Duplicate content found: ${content.title.substring(0, 50)}...`);
        return false;
      }

      // Language detection
      const languageResult = await detectLanguage(content.content);
      const language = typeof languageResult === 'string' ? languageResult : languageResult.language;
      if (language !== 'en') {
        console.log(`[OXYLABS] Non-English content skipped (${language}): ${content.title.substring(0, 50)}...`);
        return false;
      }

      // Quality check
      if (content.content.length < 100) {
        console.log(`[OXYLABS] Content too short: ${content.title.substring(0, 50)}...`);
        return false;
      }

      // Create slug
      const slug = await slugify(content.title);

      // Save to database
      await prisma.article.create({
        data: {
          url: content.url,
          question: content.title,
          answer: content.content,
          category: content.category,
          platform: content.platform,
          contentType: content.contentType,
          source: 'oxylabs',
          language: 'en',
          slug,
          isVerified: content.contentType === 'official',
          votes: content.contentType === 'official' ? 10 : 5,
        }
      });

      // Update stats
      this.stats.newArticles++;
      this.stats.platforms[content.platform] = (this.stats.platforms[content.platform] || 0) + 1;
      this.stats.categories[content.category] = (this.stats.categories[content.category] || 0) + 1;

      console.log(`[OXYLABS] ✅ Saved: ${content.title.substring(0, 60)}...`);
      return true;

    } catch (error: any) {
      console.error(`[OXYLABS] Error processing content:`, error.message);
      this.stats.errors.push(`Processing error: ${error.message}`);
      return false;
    }
  }

  /**
   * Crawl tour vendor specific content using search
   */
  async crawlTourVendorContent(): Promise<CrawlStats> {
    console.log('🚀 Starting Tour Vendor Oxylabs Crawler...');
    console.log(`📋 Target queries: ${TOUR_VENDOR_QUERIES.length}`);
    console.log(`🏢 Target platforms: ${TOUR_VENDOR_PLATFORMS.join(', ')}`);
    console.log('');

    for (const query of TOUR_VENDOR_QUERIES) {
      this.stats.totalQueries++;
      
      try {
        console.log(`🔍 Searching: "${query}"`);
        
        // Search on Google
        const googleResults = await oxylabsScraper.searchContent(query, 'google', 5);
        console.log(`   Google results: ${googleResults.length}`);
        
        // Search on Bing
        const bingResults = await oxylabsScraper.searchContent(query, 'bing', 5);
        console.log(`   Bing results: ${bingResults.length}`);
        
        // Process Google results
        for (const result of googleResults) {
          await this.processContent(result);
        }
        
        // Process Bing results
        for (const result of bingResults) {
          await this.processContent(result);
        }
        
        this.stats.successfulQueries++;
        
        // Rate limiting
        await this.delay(3000);
        
      } catch (error: any) {
        console.error(`❌ Error searching "${query}":`, error.message);
        this.stats.errors.push(`Search error for "${query}": ${error.message}`);
      }
    }

    return this.stats;
  }

  /**
   * Crawl specific tour vendor platforms
   */
  async crawlTourVendorPlatforms(): Promise<CrawlStats> {
    console.log('🏢 Crawling tour vendor platforms...');
    
    const platformUrls = [
      // Airbnb Partner Resources
      'https://www.airbnb.com/help/article/2853',
      'https://www.airbnb.com/help/article/2854',
      'https://www.airbnb.com/help/article/2855',
      
      // GetYourGuide Partner Center
      'https://supply.getyourguide.support/hc/en-us/articles/360000684857',
      'https://supply.getyourguide.support/hc/en-us/articles/360000684858',
      
      // Viator Partner Help
      'https://www.viator.com/help/partner',
      'https://www.viator.com/help/partner/pricing',
      
      // Booking.com Partner Resources
      'https://partner.booking.com/en-us/help',
      'https://partner.booking.com/en-us/help/partner-resources',
    ];

    for (const url of platformUrls) {
      this.stats.totalQueries++;
      
      try {
        console.log(`🌐 Crawling: ${url}`);
        
        const platform = this.detectPlatformFromUrl(url);
        const content = await oxylabsScraper.scrapeUrl(url, platform);
        
        if (content) {
          await this.processContent(content);
        }
        
        this.stats.successfulQueries++;
        
        // Rate limiting
        await this.delay(2000);
        
      } catch (error: any) {
        console.error(`❌ Error crawling ${url}:`, error.message);
        this.stats.errors.push(`Crawl error for ${url}: ${error.message}`);
      }
    }

    return this.stats;
  }

  /**
   * Detect platform from URL
   */
  private detectPlatformFromUrl(url: string): string {
    if (url.includes('airbnb')) return 'airbnb';
    if (url.includes('getyourguide')) return 'getyourguide';
    if (url.includes('viator')) return 'viator';
    if (url.includes('booking')) return 'booking';
    if (url.includes('expedia')) return 'expedia';
    if (url.includes('tripadvisor')) return 'tripadvisor';
    return 'universal';
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Print final statistics
   */
  printStats(): void {
    console.log('\n📊 TOUR VENDOR OXYLABS CRAWL RESULTS');
    console.log('=====================================');
    console.log(`Total queries: ${this.stats.totalQueries}`);
    console.log(`Successful queries: ${this.stats.successfulQueries}`);
    console.log(`New articles: ${this.stats.newArticles}`);
    console.log(`Duplicate articles: ${this.stats.duplicateArticles}`);
    console.log(`Errors: ${this.stats.errors.length}`);
    
    console.log('\n🏢 Platform Distribution:');
    Object.entries(this.stats.platforms)
      .sort(([,a], [,b]) => b - a)
      .forEach(([platform, count]) => {
        console.log(`  ${platform}: ${count} articles`);
      });
    
    console.log('\n📂 Category Distribution:');
    Object.entries(this.stats.categories)
      .sort(([,a], [,b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`  ${category}: ${count} articles`);
      });
    
    if (this.stats.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.stats.errors.slice(0, 10).forEach(error => console.log(`  - ${error}`));
    }
  }
}

async function main(): Promise<void> {
  console.log('🎯 Tour Vendor Oxylabs Crawler');
  console.log('==============================');
  
  try {
    const crawler = new TourVendorOxylabsCrawler();
    
    // Crawl search-based content
    await crawler.crawlTourVendorContent();
    
    // Crawl platform-specific content
    await crawler.crawlTourVendorPlatforms();
    
    // Print results
    crawler.printStats();
    
    console.log('\n✅ Tour vendor crawling completed!');
    
  } catch (error) {
    console.error('❌ Crawler failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the crawler
if (require.main === module) {
  main().catch(console.error);
}

export { TourVendorOxylabsCrawler, main }; 
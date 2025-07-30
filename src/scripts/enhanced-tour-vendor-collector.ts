#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { oxylabsScraper, type OxylabsContent } from '../lib/oxylabs';
import { detectLanguage } from '../utils/languageDetection';
import { slugify } from '../utils/slugify';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// Enhanced tour vendor specific search queries - focused on community and Q&A
const ENHANCED_TOUR_VENDOR_QUERIES = [
  // Community-focused queries
  'tour operator forum questions',
  'tour guide community problems',
  'tour business owner issues',
  'tour company owner help',
  'tour operator reddit',
  'tour guide facebook group',
  'tour business owner forum',
  'tour operator quora questions',
  'tour guide stack overflow',
  'tour business owner community',
  
  // Specific problem-based queries
  'tour operator booking system problems',
  'tour guide customer service issues',
  'tour business payment problems',
  'tour operator cancellation policy help',
  'tour guide insurance requirements',
  'tour business legal compliance',
  'tour operator marketing challenges',
  'tour guide pricing strategy help',
  'tour business platform integration',
  'tour operator technical setup issues',
  
  // Platform-specific queries
  'airbnb tour operator help',
  'getyourguide tour operator issues',
  'viator tour operator problems',
  'booking.com tour operator support',
  'tripadvisor tour operator questions',
  'expedia tour operator help',
  
  // Industry-specific queries
  'tour operator startup problems',
  'tour guide business challenges',
  'tour company growth issues',
  'tour operator scaling problems',
  'tour guide competition help',
  'tour business market analysis',
  
  // Operational queries
  'tour operator staff management',
  'tour guide training problems',
  'tour business equipment issues',
  'tour operator vehicle problems',
  'tour guide safety compliance',
  'tour business quality control',
  
  // Financial queries
  'tour operator cash flow problems',
  'tour guide pricing help',
  'tour business cost management',
  'tour operator profit margins',
  'tour guide revenue optimization',
  'tour business financial planning'
];

// Community platforms to prioritize
const COMMUNITY_PLATFORMS = [
  'reddit',
  'quora',
  'stackoverflow',
  'facebook',
  'linkedin',
  'tripadvisor',
  'airbnb_community'
];

// OTA help centers to focus on
const OTA_HELP_CENTERS = [
  'airbnb',
  'getyourguide',
  'viator',
  'booking',
  'tripadvisor',
  'expedia'
];

interface EnhancedCrawlStats {
  totalQueries: number;
  successfulQueries: number;
  newArticles: number;
  duplicateArticles: number;
  communityArticles: number;
  otaArticles: number;
  errors: string[];
  platforms: Record<string, number>;
  categories: Record<string, number>;
  qualityScores: {
    high: number;
    medium: number;
    low: number;
  };
}

class EnhancedTourVendorCollector {
  private stats: EnhancedCrawlStats;

  constructor() {
    this.stats = {
      totalQueries: 0,
      successfulQueries: 0,
      newArticles: 0,
      duplicateArticles: 0,
      communityArticles: 0,
      otaArticles: 0,
      errors: [],
      platforms: {},
      categories: {},
      qualityScores: {
        high: 0,
        medium: 0,
        low: 0
      }
    };
  }

  /**
   * Check if content is duplicate
   */
  private async isDuplicateContent(title: string, content: string): Promise<boolean> {
    const existingArticle = await prisma.article.findFirst({
      where: {
        OR: [
          { question: title },
          { answer: { contains: content.substring(0, 100) } }
        ]
      }
    });
    
    return !!existingArticle;
  }

  /**
   * Assess content quality
   */
  private assessContentQuality(content: OxylabsContent): 'high' | 'medium' | 'low' {
    const text = `${content.title} ${content.content}`.toLowerCase();
    
    // High quality indicators
    const highQualityIndicators = [
      'question', 'problem', 'issue', 'help', 'support', 'how to', 'why', 'what if',
      'tour operator', 'tour guide', 'tour business', 'tour company',
      'booking', 'pricing', 'customer', 'payment', 'cancellation', 'policy',
      'technical', 'setup', 'configuration', 'integration', 'api'
    ];
    
    // Low quality indicators
    const lowQualityIndicators = [
      'promote', 'advertise', 'sponsored', 'affiliate', 'commission',
      'blog post', 'article', 'guide', 'tutorial', 'how-to',
      'best practices', 'tips and tricks', 'ultimate guide',
      'exclusive', 'special offer', 'limited time', 'discount'
    ];
    
    let highScore = 0;
    let lowScore = 0;
    
    highQualityIndicators.forEach(indicator => {
      if (text.includes(indicator)) highScore++;
    });
    
    lowQualityIndicators.forEach(indicator => {
      if (text.includes(indicator)) lowScore++;
    });
    
    if (lowScore > highScore) return 'low';
    if (highScore >= 3) return 'high';
    return 'medium';
  }

  /**
   * Process and save enhanced content
   */
  private async processEnhancedContent(content: OxylabsContent): Promise<boolean> {
    try {
      // Check for duplicates
      const isDuplicate = await this.isDuplicateContent(content.title, content.content);
      if (isDuplicate) {
        this.stats.duplicateArticles++;
        console.log(`[ENHANCED] Duplicate content found: ${content.title.substring(0, 50)}...`);
        return false;
      }

      // Language detection
      const languageResult = await detectLanguage(content.content);
      const language = typeof languageResult === 'string' ? languageResult : languageResult.language;
      if (language !== 'en') {
        console.log(`[ENHANCED] Non-English content skipped (${language}): ${content.title.substring(0, 50)}...`);
        return false;
      }

      // Quality check
      if (content.content.length < 150) {
        console.log(`[ENHANCED] Content too short: ${content.title.substring(0, 50)}...`);
        return false;
      }

      // Assess quality
      const quality = this.assessContentQuality(content);
      this.stats.qualityScores[quality]++;

      // Create slug
      const slug = await slugify(content.title);

      // Determine content type
      const isCommunity = COMMUNITY_PLATFORMS.includes(content.platform.toLowerCase());
      const isOTA = OTA_HELP_CENTERS.includes(content.platform.toLowerCase());
      
      if (isCommunity) this.stats.communityArticles++;
      if (isOTA) this.stats.otaArticles++;

      // Save to database
      await prisma.article.create({
        data: {
          url: content.url,
          question: content.title,
          answer: content.content,
          category: content.category,
          platform: content.platform,
          contentType: isCommunity ? 'community' : (isOTA ? 'official' : 'general'),
          source: 'enhanced_collector',
          language: 'en',
          slug,
          isVerified: isOTA,
          votes: isOTA ? 10 : (isCommunity ? 8 : 5),
        }
      });

      // Update stats
      this.stats.newArticles++;
      this.stats.platforms[content.platform] = (this.stats.platforms[content.platform] || 0) + 1;
      this.stats.categories[content.category] = (this.stats.categories[content.category] || 0) + 1;

      console.log(`[ENHANCED] ✅ Saved (${quality} quality): ${content.title.substring(0, 60)}...`);
      return true;

    } catch (error: any) {
      console.error(`[ENHANCED] Error processing content:`, error.message);
      this.stats.errors.push(`Processing error: ${error.message}`);
      return false;
    }
  }

  /**
   * Enhanced tour vendor content collection
   */
  async collectEnhancedTourVendorContent(): Promise<EnhancedCrawlStats> {
    console.log('🚀 Starting Enhanced Tour Vendor Content Collection...');
    console.log(`📋 Target queries: ${ENHANCED_TOUR_VENDOR_QUERIES.length}`);
    console.log(`🏢 Community platforms: ${COMMUNITY_PLATFORMS.join(', ')}`);
    console.log(`🏢 OTA platforms: ${OTA_HELP_CENTERS.join(', ')}`);
    console.log('');

    for (const query of ENHANCED_TOUR_VENDOR_QUERIES) {
      this.stats.totalQueries++;
      
      try {
        console.log(`🔍 Searching: "${query}"`);
        
        // Search on Google with community focus
        const googleResults = await oxylabsScraper.searchContent(query, 'google', 8);
        console.log(`   Google results: ${googleResults.length}`);
        
        // Search on Bing with community focus
        const bingResults = await oxylabsScraper.searchContent(query, 'bing', 8);
        console.log(`   Bing results: ${bingResults.length}`);
        
        // Process Google results
        for (const result of googleResults) {
          await this.processEnhancedContent(result);
        }
        
        // Process Bing results
        for (const result of bingResults) {
          await this.processEnhancedContent(result);
        }
        
        this.stats.successfulQueries++;
        
        // Rate limiting
        await this.delay(4000);
        
      } catch (error: any) {
        console.error(`❌ Error searching "${query}":`, error.message);
        this.stats.errors.push(`Search error for "${query}": ${error.message}`);
      }
    }

    return this.stats;
  }

  /**
   * Collect from specific community platforms
   */
  async collectFromCommunityPlatforms(): Promise<EnhancedCrawlStats> {
    console.log('🏢 Collecting from community platforms...');
    
    // This would integrate with specific community APIs
    // For now, we'll focus on search-based discovery
    
    return this.stats;
  }

  /**
   * Collect from OTA help centers
   */
  async collectFromOTAHelpCenters(): Promise<EnhancedCrawlStats> {
    console.log('🏢 Collecting from OTA help centers...');
    
    // This would integrate with specific OTA APIs
    // For now, we'll focus on search-based discovery
    
    return this.stats;
  }

  /**
   * Delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Print final statistics
   */
  printStats(): void {
    console.log('\n📊 ENHANCED COLLECTION STATISTICS:');
    console.log('=====================================');
    console.log(`Total queries processed: ${this.stats.totalQueries}`);
    console.log(`Successful queries: ${this.stats.successfulQueries}`);
    console.log(`New articles added: ${this.stats.newArticles}`);
    console.log(`Duplicate articles: ${this.stats.duplicateArticles}`);
    console.log(`Community articles: ${this.stats.communityArticles}`);
    console.log(`OTA articles: ${this.stats.otaArticles}`);
    console.log('');
    console.log('Quality Distribution:');
    console.log(`  High quality: ${this.stats.qualityScores.high}`);
    console.log(`  Medium quality: ${this.stats.qualityScores.medium}`);
    console.log(`  Low quality: ${this.stats.qualityScores.low}`);
    console.log('');
    console.log('Platform Distribution:');
    Object.entries(this.stats.platforms).forEach(([platform, count]) => {
      console.log(`  ${platform}: ${count}`);
    });
    console.log('');
    console.log('Category Distribution:');
    Object.entries(this.stats.categories).forEach(([category, count]) => {
      console.log(`  ${category}: ${count}`);
    });
    console.log('');
    if (this.stats.errors.length > 0) {
      console.log('Errors encountered:');
      this.stats.errors.forEach(error => console.log(`  - ${error}`));
    }
  }
}

// Main execution
async function main() {
  const collector = new EnhancedTourVendorCollector();
  
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
    
    // Run enhanced collection
    await collector.collectEnhancedTourVendorContent();
    
    // Print statistics
    collector.printStats();
    
  } catch (error) {
    console.error('❌ Enhanced collection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { EnhancedTourVendorCollector }; 
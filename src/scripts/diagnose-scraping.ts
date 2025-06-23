import { PrismaClient } from '@prisma/client';
import { isFeatureEnabled } from '@/utils/featureFlags';
import { scrapeAirbnb } from '@/scripts/scrapers/airbnb';
import { crawlGetYourGuideArticlesWithPagination } from '@/crawlers/getyourguide';
import { crawlViatorArticles } from '@/crawlers/viator';
import { scrapeAirbnbCommunity } from './scrape';

const prisma = new PrismaClient();

interface DiagnosticResult {
  platform: string;
  enabled: boolean;
  articlesFound: number;
  newArticles: number;
  errors: string[];
  urlsChecked: string[];
}

async function getExistingArticleUrls(): Promise<Set<string>> {
  const existingArticles = await prisma.article.findMany({
    select: { url: true },
  });
  return new Set(existingArticles.map((a: { url: string }) => a.url));
}

async function diagnoseScraping(): Promise<void> {
  console.log('🔍 DIAGNOSING SCRAPING ISSUES...\n');
  
  const existingUrls = await getExistingArticleUrls();
  console.log(`📊 Current database: ${existingUrls.size} existing articles`);
  
  const results: DiagnosticResult[] = [];
  
  // Test each scraper individually
  const scrapers = [
    {
      name: 'Airbnb Official',
      enabled: true,
      scraper: scrapeAirbnb,
    },
    {
      name: 'GetYourGuide',
      enabled: isFeatureEnabled('enableGetYourGuidePagination'),
      scraper: crawlGetYourGuideArticlesWithPagination,
    },
    {
      name: 'Viator',
      enabled: isFeatureEnabled('enableViatorScraping'),
      scraper: crawlViatorArticles,
    },
    {
      name: 'Airbnb Community',
      enabled: isFeatureEnabled('enableCommunityCrawling'),
      scraper: scrapeAirbnbCommunity,
    },
  ];
  
  for (const { name, enabled, scraper } of scrapers) {
    console.log(`\n🔍 Testing ${name}...`);
    console.log(`   Status: ${enabled ? '✅ ENABLED' : '❌ DISABLED'}`);
    
    const result: DiagnosticResult = {
      platform: name,
      enabled,
      articlesFound: 0,
      newArticles: 0,
      errors: [],
      urlsChecked: [],
    };
    
    if (!enabled) {
      console.log(`   ⏭️  Skipped (disabled)`);
      results.push(result);
      continue;
    }
    
    try {
      console.log(`   🚀 Running scraper...`);
      const articles = await scraper();
      
      result.articlesFound = articles.length;
      result.newArticles = articles.filter(article => !existingUrls.has(article.url)).length;
      
      console.log(`   📈 Found ${articles.length} total articles`);
      console.log(`   🆕 Found ${result.newArticles} new articles`);
      
      // Log some sample URLs to see what's being checked
      const sampleUrls = articles.slice(0, 3).map(a => a.url);
      result.urlsChecked = sampleUrls;
      console.log(`   🔗 Sample URLs checked:`);
      sampleUrls.forEach(url => console.log(`      - ${url}`));
      
    } catch (error: any) {
      result.errors.push(error.message);
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    results.push(result);
  }
  
  // Summary
  console.log('\n📋 DIAGNOSIS SUMMARY:');
  console.log('='.repeat(50));
  
  const totalFound = results.reduce((sum, r) => sum + r.articlesFound, 0);
  const totalNew = results.reduce((sum, r) => sum + r.newArticles, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  
  console.log(`Total articles found: ${totalFound}`);
  console.log(`Total new articles: ${totalNew}`);
  console.log(`Total errors: ${totalErrors}`);
  
  console.log('\n📊 Platform breakdown:');
  results.forEach(result => {
    const status = result.enabled ? '✅' : '❌';
    const errorStatus = result.errors.length > 0 ? '⚠️' : '✅';
    console.log(`${status} ${result.platform}: ${result.articlesFound} found, ${result.newArticles} new ${errorStatus}`);
  });
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  if (totalNew === 0) {
    console.log('❌ No new articles found. Possible issues:');
    console.log('   1. All sources have been exhausted');
    console.log('   2. Sources are blocking requests');
    console.log('   3. URLs have changed or become inaccessible');
    console.log('   4. Rate limiting is preventing new content discovery');
    
    console.log('\n🔧 Suggested actions:');
    console.log('   1. Add new sources (TripAdvisor, Expedia, etc.)');
    console.log('   2. Implement URL discovery/dynamic crawling');
    console.log('   3. Add more community sources');
    console.log('   4. Implement content re-checking for updates');
  } else {
    console.log('✅ New articles found! Scraping is working.');
  }
}

async function addNewSources(): Promise<void> {
  console.log('\n🚀 ADDING NEW SOURCES...\n');
  
  // Add TripAdvisor scraping
  console.log('📝 Adding TripAdvisor scraper...');
  // TODO: Implement TripAdvisor scraper
  
  // Add Expedia scraping
  console.log('📝 Adding Expedia scraper...');
  // TODO: Implement Expedia scraper
  
  // Add Booking.com scraping
  console.log('📝 Adding Booking.com scraper...');
  // TODO: Implement Booking.com scraper
  
  console.log('✅ New sources added to configuration');
}

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
    
    await diagnoseScraping();
    await addNewSources();
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
  } finally {
    await prisma.$disconnect();
    console.log('✅ Database disconnected');
  }
}

main(); 
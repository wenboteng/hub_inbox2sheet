#!/usr/bin/env tsx

import axios from 'axios';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ContentSource {
  url: string;
  title: string;
  platform: string;
  type: 'help' | 'policy' | 'news' | 'community';
  lastChecked: Date;
  status: 'active' | 'inactive' | 'error';
}

// Content discovery sources
const DISCOVERY_SOURCES = {
  airbnb: {
    baseUrl: 'https://www.airbnb.com',
    paths: [
      '/help',
      '/help/article',
      '/help/topic',
      '/help/search',
      '/press',
      '/press/news',
      '/about',
      '/about/press',
    ],
  },
  booking: {
    baseUrl: 'https://www.booking.com',
    paths: [
      '/content',
      '/content/help',
      '/content/policies',
      '/content/terms',
      '/content/about',
    ],
  },
  expedia: {
    baseUrl: 'https://www.expedia.com',
    paths: [
      '/help',
      '/help/article',
      '/help/topic',
      '/about',
      '/about/press',
    ],
  },
  getyourguide: {
    baseUrl: 'https://www.getyourguide.com',
    paths: [
      '/help',
      '/help/article',
      '/help/topic',
      '/about',
      '/about/press',
    ],
  },
  viator: {
    baseUrl: 'https://www.viator.com',
    paths: [
      '/help',
      '/help/article',
      '/help/topic',
      '/about',
      '/about/press',
    ],
  },
};

async function discoverContentSources(): Promise<ContentSource[]> {
  console.log('🔍 Starting content source discovery...');
  
  const discoveredSources: ContentSource[] = [];
  
  for (const [platform, config] of Object.entries(DISCOVERY_SOURCES)) {
    console.log(`\n📋 Discovering ${platform} content sources...`);
    
    for (const path of config.paths) {
      const url = `${config.baseUrl}${path}`;
      
      try {
        console.log(`  Checking: ${url}`);
        
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
          timeout: 10000,
        });

        if (response.status === 200) {
          const $ = cheerio.load(response.data);
          
          // Extract links to potential content pages
          const links = $('a[href*="help"], a[href*="policy"], a[href*="terms"], a[href*="news"], a[href*="article"]');
          
          links.each((index, element) => {
            const href = $(element).attr('href');
            const text = $(element).text().trim();
            
            if (href && text && text.length > 10) {
              const fullUrl = href.startsWith('http') ? href : `${config.baseUrl}${href}`;
              
              // Determine content type
              let type: 'help' | 'policy' | 'news' | 'community' = 'help';
              if (href.includes('policy') || href.includes('terms')) type = 'policy';
              else if (href.includes('news') || href.includes('press')) type = 'news';
              else if (href.includes('community') || href.includes('forum')) type = 'community';
              
              discoveredSources.push({
                url: fullUrl,
                title: text,
                platform,
                type,
                lastChecked: new Date(),
                status: 'active',
              });
            }
          });
          
          console.log(`    ✅ Found ${links.length} potential content links`);
        }
        
      } catch (error: any) {
        console.log(`    ❌ Error checking ${url}: ${error.message}`);
      }
      
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return discoveredSources;
}

async function testContentSources(sources: ContentSource[]): Promise<ContentSource[]> {
  console.log('\n🧪 Testing discovered content sources...');
  
  const testedSources: ContentSource[] = [];
  
  for (const source of sources.slice(0, 20)) { // Test first 20 to avoid overwhelming
    try {
      console.log(`  Testing: ${source.url}`);
      
      const response = await axios.get(source.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        timeout: 10000,
      });

      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        const content = $('body').text().trim();
        
        if (content.length > 500) { // Minimum content threshold
          source.status = 'active';
          testedSources.push(source);
          console.log(`    ✅ Active: ${source.title}`);
        } else {
          source.status = 'inactive';
          console.log(`    ⚠️ Low content: ${source.title}`);
        }
      } else {
        source.status = 'error';
        console.log(`    ❌ Error ${response.status}: ${source.title}`);
      }
      
    } catch (error: any) {
      source.status = 'error';
      console.log(`    ❌ Failed: ${source.title} - ${error.message}`);
    }
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return testedSources;
}

async function saveDiscoveredSources(sources: ContentSource[]): Promise<void> {
  console.log('\n💾 Saving discovered content sources...');
  
  for (const source of sources) {
    try {
      // Check if source already exists
      const existing = await prisma.article.findUnique({
        where: { url: source.url }
      });

      if (!existing) {
        // Save as a placeholder article for future crawling
        await prisma.article.create({
          data: {
            url: source.url,
            question: source.title,
            answer: `Discovered content source: ${source.type} from ${source.platform}`,
            slug: `discovered-${source.platform}-${Date.now()}`,
            category: `${source.platform} ${source.type}`,
            platform: source.platform,
            contentType: 'discovered',
            source: 'discovery',
            language: 'en',
            crawlStatus: 'pending',
          }
        });
      }
    } catch (error) {
      console.error(`Error saving source ${source.url}:`, error);
    }
  }
  
  console.log(`✅ Saved ${sources.length} discovered sources`);
}

async function generateDiscoveryReport(sources: ContentSource[]): Promise<void> {
  console.log('\n📊 Content Discovery Report');
  console.log('==========================');
  
  const byPlatform = sources.reduce((acc, source) => {
    if (!acc[source.platform]) acc[source.platform] = [];
    acc[source.platform].push(source);
    return acc;
  }, {} as Record<string, ContentSource[]>);
  
  const byType = sources.reduce((acc, source) => {
    if (!acc[source.type]) acc[source.type] = [];
    acc[source.type].push(source);
    return acc;
  }, {} as Record<string, ContentSource[]>);
  
  console.log(`\nTotal sources discovered: ${sources.length}`);
  
  console.log('\nBy Platform:');
  for (const [platform, platformSources] of Object.entries(byPlatform)) {
    console.log(`  ${platform}: ${platformSources.length} sources`);
  }
  
  console.log('\nBy Type:');
  for (const [type, typeSources] of Object.entries(byType)) {
    console.log(`  ${type}: ${typeSources.length} sources`);
  }
  
  console.log('\nTop Sources by Platform:');
  for (const [platform, platformSources] of Object.entries(byPlatform)) {
    console.log(`\n${platform}:`);
    platformSources.slice(0, 5).forEach(source => {
      console.log(`  - ${source.title} (${source.type})`);
      console.log(`    ${source.url}`);
    });
  }
}

async function main() {
  try {
    console.log('🚀 Starting content discovery process...');
    
    // Step 1: Discover content sources
    const discoveredSources = await discoverContentSources();
    
    // Step 2: Test discovered sources
    const testedSources = await testContentSources(discoveredSources);
    
    // Step 3: Save active sources
    const activeSources = testedSources.filter(s => s.status === 'active');
    await saveDiscoveredSources(activeSources);
    
    // Step 4: Generate report
    await generateDiscoveryReport(activeSources);
    
    console.log('\n✅ Content discovery completed successfully!');
    
  } catch (error) {
    console.error('❌ Content discovery failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the discovery process
main(); 
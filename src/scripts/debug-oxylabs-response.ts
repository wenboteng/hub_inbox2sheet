import { OxylabsScraper } from '../lib/oxylabs';
import * as dotenv from 'dotenv';

dotenv.config();

async function debugOxylabsResponse() {
  console.log('🔍 Debugging Oxylabs Response Structure...');
  
  try {
    const scraper = new OxylabsScraper();
    
    const result = await scraper.scrapeUrl('https://httpbin.org/html', 'universal');
    
    if (result) {
      console.log('✅ Got response!');
      console.log('Title:', result.title);
      console.log('Content length:', result.content.length);
      console.log('First 200 chars:', result.content.substring(0, 200));
    } else {
      console.log('❌ No response');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

debugOxylabsResponse().catch(console.error); 
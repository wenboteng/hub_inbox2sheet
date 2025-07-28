import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Oxylabs API Configuration
interface OxylabsConfig {
  username: string;
  password: string;
  baseUrl: string;
  timeout: number;
  maxRetries: number;
}

// Content extraction result
interface OxylabsContent {
  url: string;
  title: string;
  content: string;
  platform: string;
  category: string;
  contentType: 'official' | 'community' | 'news' | 'policy';
  metadata?: {
    author?: string;
    publishedDate?: string;
    tags?: string[];
    language?: string;
    wordCount?: number;
  };
}

// Platform-specific configurations
interface PlatformConfig {
  source: string;
  geoLocation?: string;
  userAgentType?: string;
  render?: boolean | string;
  parse?: boolean;
  customHeaders?: Record<string, string>;
}

export class OxylabsScraper {
  private config: OxylabsConfig;
  private platformConfigs: Map<string, PlatformConfig>;

  constructor() {
    this.config = {
      username: process.env.OXYLABS_USERNAME || '',
      password: process.env.OXYLABS_PASSWORD || '',
      baseUrl: 'https://realtime.oxylabs.io/v1/queries',
      timeout: 60000, // Increased from 30000 to 60000ms (60 seconds)
      maxRetries: 5,  // Increased from 3 to 5 retries
    };

    this.platformConfigs = new Map([
      // Universal configuration (default)
      ['universal', {
        source: 'universal',
        geoLocation: 'United States',
        userAgentType: 'desktop',
        render: 'html',
        parse: false,
      }],
      // OTA Platforms
      ['airbnb', {
        source: 'universal',
        geoLocation: 'United States',
        userAgentType: 'desktop',
        render: 'html',
        parse: false,
      }],
      ['booking', {
        source: 'universal',
        geoLocation: 'United States',
        userAgentType: 'desktop',
        render: 'html',
        parse: false,
      }],
      ['expedia', {
        source: 'universal',
        geoLocation: 'United States',
        userAgentType: 'desktop',
        render: 'html',
        parse: false,
      }],
      ['getyourguide', {
        source: 'universal',
        geoLocation: 'Germany',
        userAgentType: 'desktop',
        render: 'html',
        parse: false,
      }],
      ['viator', {
        source: 'universal',
        geoLocation: 'United States',
        userAgentType: 'desktop',
        render: 'html',
        parse: false,
      }],
      
      // Community Platforms
      ['reddit', {
        source: 'universal',
        geoLocation: 'United States',
        userAgentType: 'desktop',
        render: 'html',
        parse: false,
      }],
      ['quora', {
        source: 'universal',
        geoLocation: 'United States',
        userAgentType: 'desktop',
        render: true,
        parse: false,
      }],
      ['stackoverflow', {
        source: 'universal',
        geoLocation: 'United States',
        userAgentType: 'desktop',
        render: true,
        parse: false,
      }],
      
      // Search Engines
      ['google', {
        source: 'google_search',
        geoLocation: 'United States',
        userAgentType: 'desktop',
        render: false,
        parse: true,
      }],
      ['bing', {
        source: 'bing_search',
        geoLocation: 'United States',
        userAgentType: 'desktop',
        render: false,
        parse: true,
      }],
    ]);
  }

  /**
   * Scrape content from a single URL using Oxylabs
   */
  async scrapeUrl(url: string, platform: string = 'universal'): Promise<OxylabsContent | null> {
    try {
      console.log(`[OXYLABS] Scraping: ${url} (platform: ${platform})`);
      
      const platformConfig = this.platformConfigs.get(platform) || this.platformConfigs.get('universal');
      
      if (!platformConfig) {
        console.error(`[OXYLABS] No platform config found for: ${platform}`);
        return null;
      }
      
      const requestBody = {
        source: platformConfig.source,
        url: url,
        geo_location: platformConfig.geoLocation,
        user_agent_type: platformConfig.userAgentType,
        render: platformConfig.render,
        parse: platformConfig.parse,
        ...platformConfig.customHeaders,
      };

      const response = await this.makeRequest(requestBody);
      
      if (!response || !response.data) {
        console.error(`[OXYLABS] No data received for ${url}`);
        return null;
      }

      return this.parseResponse(response.data, url, platform);
      
    } catch (error: any) {
      console.error(`[OXYLABS] Error scraping ${url}:`, error.message);
      return null;
    }
  }

  /**
   * Scrape multiple URLs with rate limiting
   */
  async scrapeUrls(urls: string[], platform: string = 'universal', delayMs: number = 1000): Promise<OxylabsContent[]> {
    const results: OxylabsContent[] = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`[OXYLABS] Processing ${i + 1}/${urls.length}: ${url}`);
      
      try {
        const content = await this.scrapeUrl(url, platform);
        if (content) {
          results.push(content);
        }
        
        // Rate limiting
        if (i < urls.length - 1) {
          await this.delay(delayMs);
        }
        
      } catch (error: any) {
        console.error(`[OXYLABS] Failed to scrape ${url}:`, error.message);
      }
    }
    
    return results;
  }

  /**
   * Search for content using search engines
   */
  async searchContent(query: string, platform: 'google' | 'bing' = 'google', maxResults: number = 10): Promise<OxylabsContent[]> {
    try {
      console.log(`[OXYLABS] Searching for: "${query}" on ${platform}`);
      
      const platformConfig = this.platformConfigs.get(platform)!;
      
      const requestBody = {
        source: platformConfig.source,
        query: query,
        geo_location: platformConfig.geoLocation,
        user_agent_type: platformConfig.userAgentType,
        parse: platformConfig.parse,
        start: 0,
        num: maxResults,
      };

      const response = await this.makeRequest(requestBody);
      
      if (!response || !response.data) {
        console.error(`[OXYLABS] No search results for: ${query}`);
        return [];
      }

      return this.parseSearchResults(response.data, platform);
      
    } catch (error: any) {
      console.error(`[OXYLABS] Search error for "${query}":`, error.message);
      return [];
    }
  }

  /**
   * Scrape community content (forums, Q&A sites)
   */
  async scrapeCommunityContent(platform: string, category: string, maxPages: number = 5): Promise<OxylabsContent[]> {
    const communityUrls = this.getCommunityUrls(platform, category, maxPages);
    return this.scrapeUrls(communityUrls, platform, 2000); // Slower rate for community sites
  }

  /**
   * Make authenticated request to Oxylabs API
   */
  private async makeRequest(requestBody: any, retryCount: number = 0): Promise<AxiosResponse | null> {
    try {
      console.log(`[OXYLABS] Making request (attempt ${retryCount + 1}/${this.config.maxRetries + 1})`);
      
      const config: AxiosRequestConfig = {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Authorization': `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`,
        },
        timeout: this.config.timeout,
      };
      
      const response = await axios.post(this.config.baseUrl, requestBody, config);

      console.log(`[OXYLABS] Request successful (${response.status})`);
      return response;
      
    } catch (error: any) {
      console.error(`[OXYLABS] Request failed (attempt ${retryCount + 1}):`, error.message);
      
      if (retryCount < this.config.maxRetries && this.isRetryableError(error)) {
        const delayMs = Math.pow(2, retryCount) * 2000; // Increased base delay
        console.log(`[OXYLABS] Retrying in ${delayMs}ms...`);
        await this.delay(delayMs);
        return this.makeRequest(requestBody, retryCount + 1);
      }
      
      throw error;
    }
  }

  /**
   * Parse Oxylabs response into structured content
   */
  private parseResponse(data: any, url: string, platform: string): OxylabsContent {
    // Handle different response formats based on source
    let title = '';
    let content = '';
    let metadata: any = {};

    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      
      // Debug logging removed for production
      
      if (result.content) {
        // Check if content is an array (raw HTML) or object
        if (Array.isArray(result.content) || typeof result.content === 'string') {
          // Raw HTML content
          content = Array.isArray(result.content) ? result.content.join('') : result.content;
          
          // Try to extract title from HTML
          const titleMatch = content.match(/<h1[^>]*>(.*?)<\/h1>/i) || 
                           content.match(/<title[^>]*>(.*?)<\/title>/i);
          title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : '';
          
          // Clean HTML tags from content
          content = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          
          metadata = {
            wordCount: content.split(' ').length,
            language: 'en',
          };
        } else {
          // Structured content object
          title = result.content.title || result.content.h1 || '';
          content = result.content.body || result.content.text || result.content.html || '';
          
          metadata = {
            author: result.content.author,
            publishedDate: result.content.published_date,
            tags: result.content.tags || [],
            language: result.content.language,
            wordCount: content.split(' ').length,
          };
        }
      } else {
        // Fallback: try to extract from the result directly
        title = result.title || '';
        content = result.body || result.text || result.html || '';
        metadata = {
          wordCount: content.split(' ').length,
        };
      }
    }

    return {
      url,
      title: title.trim(),
      content: content.trim(),
      platform,
      category: this.detectCategory(title, content),
      contentType: this.detectContentType(url, title),
      metadata,
    };
  }

  /**
   * Parse search results
   */
  private parseSearchResults(data: any, platform: string): OxylabsContent[] {
    const results: OxylabsContent[] = [];
    
    console.log(`[OXYLABS] Parsing search results for ${platform}:`, {
      hasResults: !!data.results,
      resultsLength: data.results?.length,
      dataKeys: Object.keys(data)
    });
    
    // Handle different response formats
    let searchResults = data.results || data.organic_results || data.organic || [];
    
    if (Array.isArray(searchResults)) {
      for (const result of searchResults) {
        console.log(`[OXYLABS] Processing result:`, {
          hasUrl: !!result.url,
          hasTitle: !!result.title,
          hasContent: !!result.content,
          hasSnippet: !!result.snippet,
          hasDescription: !!result.description,
          resultKeys: Object.keys(result)
        });
        
        // Handle Oxylabs search response format
        if (result.content && result.url) {
          console.log(`[OXYLABS] Content object keys:`, Object.keys(result.content));
          
          // Check if content has organic results
          if (result.content.results && result.content.results.organic) {
            console.log(`[OXYLABS] Found organic results: ${result.content.results.organic.length}`);
            
            for (const organicResult of result.content.results.organic) {
              if (organicResult.url && organicResult.title) {
                results.push({
                  url: organicResult.url,
                  title: organicResult.title,
                  content: organicResult.desc || organicResult.description || organicResult.snippet || '',
                  platform,
                  category: this.detectCategory(organicResult.title, organicResult.desc || ''),
                  contentType: 'community',
                  metadata: {
                    wordCount: (organicResult.desc || '').split(' ').length,
                  },
                });
              }
            }
          } else {
            // Handle traditional content object
            let content = '';
            if (typeof result.content === 'string') {
              content = result.content;
            } else if (Array.isArray(result.content)) {
              content = result.content.join('');
            } else if (typeof result.content === 'object') {
              content = result.content.body || result.content.text || result.content.html || result.content.content || '';
            }
            
            if (typeof content === 'string' && content.length > 0) {
              const titleMatch = content.match(/<title[^>]*>(.*?)<\/title>/i) || 
                               content.match(/<h1[^>]*>(.*?)<\/h1>/i) ||
                               content.match(/<h2[^>]*>(.*?)<\/h2>/i);
              
              const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : 'Search Result';
              
              // Clean HTML tags from content for snippet
              const cleanContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
              const snippet = cleanContent.substring(0, 300) + (cleanContent.length > 300 ? '...' : '');
              
              if (title && snippet.length > 10) {
                results.push({
                  url: result.url,
                  title,
                  content: snippet,
                  platform,
                  category: this.detectCategory(title, snippet),
                  contentType: 'community',
                  metadata: {
                    wordCount: snippet.split(' ').length,
                  },
                });
              }
            }
          }
        } else {
          // Handle traditional search result format
          const url = result.url || result.link || result.href || '';
          const title = result.title || result.name || result.headline || '';
          const content = result.snippet || result.description || result.summary || result.text || '';
          
          if (url && title && content.length > 10) {
            results.push({
              url,
              title,
              content,
              platform,
              category: this.detectCategory(title, content),
              contentType: 'community',
              metadata: {
                wordCount: content.split(' ').length,
              },
            });
          }
        }
      }
    }
    
    console.log(`[OXYLABS] Parsed ${results.length} search results`);
    return results;
  }

  /**
   * Detect content category based on title and content
   */
  private detectCategory(title: string, content: string): string {
    const text = `${title} ${content}`.toLowerCase();
    
    if (text.includes('pricing') || text.includes('price') || text.includes('cost')) {
      return 'Pricing & Revenue';
    }
    if (text.includes('marketing') || text.includes('seo') || text.includes('promotion')) {
      return 'Marketing & SEO';
    }
    if (text.includes('customer') || text.includes('guest') || text.includes('service')) {
      return 'Customer Service';
    }
    if (text.includes('policy') || text.includes('terms') || text.includes('legal')) {
      return 'Policies & Legal';
    }
    if (text.includes('technical') || text.includes('setup') || text.includes('configuration')) {
      return 'Technical Setup';
    }
    if (text.includes('cancellation') || text.includes('refund') || text.includes('booking')) {
      return 'Booking & Cancellations';
    }
    
    return 'General';
  }

  /**
   * Detect content type based on URL and title
   */
  private detectContentType(url: string, title: string): 'official' | 'community' | 'news' | 'policy' {
    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();
    
    if (urlLower.includes('community') || urlLower.includes('forum') || urlLower.includes('reddit')) {
      return 'community';
    }
    if (urlLower.includes('news') || urlLower.includes('press') || urlLower.includes('blog')) {
      return 'news';
    }
    if (urlLower.includes('policy') || urlLower.includes('terms') || urlLower.includes('legal')) {
      return 'policy';
    }
    
    return 'official';
  }

  /**
   * Get community URLs for specific platform and category
   */
  private getCommunityUrls(platform: string, category: string, maxPages: number): string[] {
    const urls: string[] = [];
    
    switch (platform) {
      case 'reddit':
        const subreddits = ['AirBnB', 'travel', 'hosting', 'tourism'];
        for (const subreddit of subreddits) {
          for (let i = 1; i <= maxPages; i++) {
            urls.push(`https://www.reddit.com/r/${subreddit}/hot.json?limit=25&after=${i}`);
          }
        }
        break;
        
      case 'quora':
        const topics = ['Airbnb', 'Travel', 'Hospitality', 'Tourism'];
        for (const topic of topics) {
          urls.push(`https://www.quora.com/topic/${topic}`);
        }
        break;
        
      case 'stackoverflow':
        const tags = ['airbnb', 'travel', 'hospitality'];
        for (const tag of tags) {
          for (let i = 1; i <= maxPages; i++) {
            urls.push(`https://stackoverflow.com/questions/tagged/${tag}?tab=votes&page=${i}`);
          }
        }
        break;
    }
    
    return urls;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    const retryableStatuses = [429, 500, 502, 503, 504, 408, 413];
    const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED', 'ENOTFOUND'];
    
    return retryableStatuses.includes(error.response?.status) || 
           retryableCodes.includes(error.code) ||
           error.message.includes('timeout') ||
           error.message.includes('network');
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get API usage statistics
   */
  async getUsageStats(): Promise<any> {
    try {
      const config: AxiosRequestConfig = {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`,
        },
        timeout: 10000,
      };
      
      const response = await axios.get('https://realtime.oxylabs.io/v1/usage', config);
      
      return response.data;
    } catch (error: any) {
      console.error('[OXYLABS] Failed to get usage stats:', error.message);
      return null;
    }
  }
}

// Export singleton instance
export const oxylabsScraper = new OxylabsScraper();

// Export types for external use
export type { OxylabsContent, PlatformConfig }; 
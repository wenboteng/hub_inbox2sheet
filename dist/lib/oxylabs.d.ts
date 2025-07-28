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
interface PlatformConfig {
    source: string;
    geoLocation?: string;
    userAgentType?: string;
    render?: boolean | string;
    parse?: boolean;
    customHeaders?: Record<string, string>;
}
export declare class OxylabsScraper {
    private config;
    private platformConfigs;
    constructor();
    /**
     * Scrape content from a single URL using Oxylabs
     */
    scrapeUrl(url: string, platform?: string): Promise<OxylabsContent | null>;
    /**
     * Scrape multiple URLs with rate limiting
     */
    scrapeUrls(urls: string[], platform?: string, delayMs?: number): Promise<OxylabsContent[]>;
    /**
     * Search for content using search engines
     */
    searchContent(query: string, platform?: 'google' | 'bing', maxResults?: number): Promise<OxylabsContent[]>;
    /**
     * Scrape community content (forums, Q&A sites)
     */
    scrapeCommunityContent(platform: string, category: string, maxPages?: number): Promise<OxylabsContent[]>;
    /**
     * Make authenticated request to Oxylabs API
     */
    private makeRequest;
    /**
     * Parse Oxylabs response into structured content
     */
    private parseResponse;
    /**
     * Parse search results
     */
    private parseSearchResults;
    /**
     * Detect content category based on title and content
     */
    private detectCategory;
    /**
     * Detect content type based on URL and title
     */
    private detectContentType;
    /**
     * Get community URLs for specific platform and category
     */
    private getCommunityUrls;
    /**
     * Check if error is retryable
     */
    private isRetryableError;
    /**
     * Utility function for delays
     */
    private delay;
    /**
     * Get API usage statistics
     */
    getUsageStats(): Promise<any>;
}
export declare const oxylabsScraper: OxylabsScraper;
export type { OxylabsContent, PlatformConfig };
//# sourceMappingURL=oxylabs.d.ts.map
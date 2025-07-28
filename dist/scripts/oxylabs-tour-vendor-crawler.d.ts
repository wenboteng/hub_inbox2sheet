interface CrawlStats {
    totalQueries: number;
    successfulQueries: number;
    newArticles: number;
    duplicateArticles: number;
    errors: string[];
    platforms: Record<string, number>;
    categories: Record<string, number>;
}
declare class TourVendorOxylabsCrawler {
    private stats;
    constructor();
    /**
     * Check if content already exists to avoid duplicates
     */
    private isDuplicateContent;
    /**
     * Process and save Oxylabs content
     */
    private processContent;
    /**
     * Crawl tour vendor specific content using search
     */
    crawlTourVendorContent(): Promise<CrawlStats>;
    /**
     * Crawl specific tour vendor platforms
     */
    crawlTourVendorPlatforms(): Promise<CrawlStats>;
    /**
     * Detect platform from URL
     */
    private detectPlatformFromUrl;
    /**
     * Utility function for delays
     */
    private delay;
    /**
     * Print final statistics
     */
    printStats(): void;
}
declare function main(): Promise<void>;
export { TourVendorOxylabsCrawler, main };
//# sourceMappingURL=oxylabs-tour-vendor-crawler.d.ts.map
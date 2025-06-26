import { Page } from 'puppeteer';
interface CrawlStats {
    categoriesDiscovered: number;
    threadsDiscovered: number;
    postsExtracted: number;
    repliesExtracted: number;
    errors: string[];
    skippedUrls: string[];
}
declare class AirbnbCommunityCrawler {
    private browser;
    private stats;
    private processedUrls;
    private discoveredUrls;
    getStats(): CrawlStats;
    testDiscoverCategories(page: Page): Promise<string[]>;
    testCrawlCategory(categoryUrl: string): Promise<void>;
    initialize(): Promise<void>;
    cleanup(): Promise<void>;
    private delay;
    private createPage;
    private extractLinks;
    private discoverCategories;
    private discoverThreads;
    private handlePagination;
    private extractThreadData;
    private extractRepliesData;
    private extractCategoryFromUrl;
    private extractThreadId;
    private extractThreadTitle;
    private saveToDatabase;
    crawlCategory(categoryUrl: string): Promise<void>;
    crawl(): Promise<CrawlStats>;
}
export declare function crawlAirbnbCommunity(): Promise<CrawlStats>;
export { AirbnbCommunityCrawler };
//# sourceMappingURL=airbnb-community.d.ts.map
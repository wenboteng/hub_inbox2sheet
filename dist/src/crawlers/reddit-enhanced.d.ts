interface CrawlStats {
    subredditsProcessed: number;
    postsDiscovered: number;
    postsExtracted: number;
    commentsExtracted: number;
    errors: string[];
    skippedPosts: string[];
    rateLimitHits: number;
    totalRequests: number;
}
declare class EnhancedRedditCrawler {
    private stats;
    private processedUrls;
    private accessToken;
    private lastRequestTime;
    constructor();
    private initializeRedditClient;
    private delay;
    private makeRedditRequest;
    private isContentQuality;
    private fetchSubredditPosts;
    private fetchPostComments;
    private extractCategoryFromSubreddit;
    private convertPostToArticle;
    private convertCommentToArticle;
    private saveToDatabase;
    crawlSubreddit(subreddit: string): Promise<void>;
    crawl(): Promise<CrawlStats>;
    getStats(): CrawlStats;
}
export declare function crawlRedditEnhanced(): Promise<CrawlStats>;
export { EnhancedRedditCrawler };
//# sourceMappingURL=reddit-enhanced.d.ts.map
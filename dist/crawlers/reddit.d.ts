interface CrawlStats {
    subredditsProcessed: number;
    postsDiscovered: number;
    postsExtracted: number;
    commentsExtracted: number;
    errors: string[];
    skippedPosts: string[];
}
declare class RedditCrawler {
    private stats;
    private processedUrls;
    private reddit;
    constructor();
    private initializeRedditClient;
    private delay;
    private fetchRedditData;
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
export declare function crawlReddit(): Promise<CrawlStats>;
export { RedditCrawler };
//# sourceMappingURL=reddit.d.ts.map
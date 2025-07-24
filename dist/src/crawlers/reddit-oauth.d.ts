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
export declare function crawlRedditOAuth(): Promise<CrawlStats>;
export {};
//# sourceMappingURL=reddit-oauth.d.ts.map
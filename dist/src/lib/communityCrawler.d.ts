/**
 * Community Content Crawler
 *
 * Crawls user-generated content from community platforms like:
 * - Airbnb Community (community.withairbnb.com)
 * - Quora (quora.com)
 * - AirHosts Forum (airhostsforum.com)
 *
 * Note: Reddit is excluded due to anti-bot protection (403 errors)
 * To add Reddit support, would need:
 * - Reddit API integration
 * - User agent rotation
 * - Rate limiting
 * - Authentication
 */
export declare function scrapeCommunityUrls(urls: string[]): Promise<void>;
export declare function getCommunityContentUrls(): Promise<string[]>;
export declare function verifyCommunityUrls(urls: string[]): Promise<{
    url: string;
    accessible: boolean;
    error?: string;
}[]>;
//# sourceMappingURL=communityCrawler.d.ts.map
#!/usr/bin/env tsx
interface EnhancedCrawlStats {
    totalQueries: number;
    successfulQueries: number;
    newArticles: number;
    duplicateArticles: number;
    communityArticles: number;
    otaArticles: number;
    errors: string[];
    platforms: Record<string, number>;
    categories: Record<string, number>;
    qualityScores: {
        high: number;
        medium: number;
        low: number;
    };
}
declare class EnhancedTourVendorCollector {
    private stats;
    constructor();
    /**
     * Check if content is duplicate
     */
    private isDuplicateContent;
    /**
     * Assess content quality
     */
    private assessContentQuality;
    /**
     * Process and save enhanced content
     */
    private processEnhancedContent;
    /**
     * Enhanced tour vendor content collection
     */
    collectEnhancedTourVendorContent(): Promise<EnhancedCrawlStats>;
    /**
     * Collect from specific community platforms
     */
    collectFromCommunityPlatforms(): Promise<EnhancedCrawlStats>;
    /**
     * Collect from OTA help centers
     */
    collectFromOTAHelpCenters(): Promise<EnhancedCrawlStats>;
    /**
     * Delay function
     */
    private delay;
    /**
     * Print final statistics
     */
    printStats(): void;
}
export { EnhancedTourVendorCollector };
//# sourceMappingURL=enhanced-tour-vendor-collector.d.ts.map
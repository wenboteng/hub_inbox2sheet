/**
 * Content-based deduplication utilities
 * Uses SHA-256 hashing to identify near-duplicate content
 */
export interface ContentDeduplicationConfig {
    enabled: boolean;
    hashAlgorithm: 'sha256' | 'md5';
    similarityThreshold: number;
    minContentLength: number;
}
export declare const DEFAULT_DEDUP_CONFIG: ContentDeduplicationConfig;
/**
 * Generate a hash for content deduplication
 * @param content The content to hash
 * @param config Deduplication configuration
 * @returns SHA-256 hash of the normalized content
 */
export declare function generateContentHash(content: string, config?: ContentDeduplicationConfig): string;
/**
 * Check if content is a near-duplicate of existing content
 * @param contentHash Hash of the new content
 * @param config Deduplication configuration
 * @returns Object with isDuplicate flag and existing article info if found
 */
export declare function checkContentDuplicate(contentHash: string, config?: ContentDeduplicationConfig): Promise<{
    isDuplicate: boolean;
    existingArticle?: any;
}>;
/**
 * Calculate content similarity between two strings
 * @param content1 First content string
 * @param content2 Second content string
 * @returns Similarity score between 0 and 1
 */
export declare function calculateContentSimilarity(content1: string, content2: string): number;
/**
 * Find near-duplicates in the database
 * @param contentHash Hash to search for
 * @param config Deduplication configuration
 * @returns Array of near-duplicate articles
 */
export declare function findNearDuplicates(contentHash: string, config?: ContentDeduplicationConfig): Promise<any[]>;
/**
 * Mark an article as a duplicate
 * @param articleId Article ID to mark
 * @param isDuplicate Whether it's a duplicate
 */
export declare function markArticleAsDuplicate(articleId: string, isDuplicate: boolean): Promise<void>;
/**
 * Get deduplication statistics
 * @returns Statistics about duplicates in the database
 */
export declare function getDeduplicationStats(): Promise<{
    totalArticles: number;
    duplicateArticles: number;
    uniqueArticles: number;
    duplicatePercentage: number;
}>;
//# sourceMappingURL=contentDeduplication.d.ts.map
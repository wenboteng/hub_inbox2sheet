import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Content-based deduplication utilities
 * Uses SHA-256 hashing to identify near-duplicate content
 */

export interface ContentDeduplicationConfig {
  enabled: boolean;
  hashAlgorithm: 'sha256' | 'md5';
  similarityThreshold: number; // 0-1, how similar content needs to be to be considered duplicate
  minContentLength: number; // Minimum content length to consider for deduplication
}

// Default configuration
export const DEFAULT_DEDUP_CONFIG: ContentDeduplicationConfig = {
  enabled: process.env.ENABLE_CONTENT_DEDUPLICATION === 'true',
  hashAlgorithm: 'sha256',
  similarityThreshold: 0.95, // 95% similarity threshold
  minContentLength: 100, // Minimum 100 characters
};

/**
 * Generate a hash for content deduplication
 * @param content The content to hash
 * @param config Deduplication configuration
 * @returns SHA-256 hash of the normalized content
 */
export function generateContentHash(content: string, config: ContentDeduplicationConfig = DEFAULT_DEDUP_CONFIG): string {
  if (!config.enabled) {
    return '';
  }

  // Normalize content for consistent hashing
  const normalizedContent = normalizeContent(content);
  
  if (normalizedContent.length < config.minContentLength) {
    return '';
  }

  // Generate hash
  const hash = crypto.createHash(config.hashAlgorithm);
  hash.update(normalizedContent);
  return hash.digest('hex');
}

/**
 * Normalize content for consistent hashing
 * @param content Raw content
 * @returns Normalized content
 */
function normalizeContent(content: string): string {
  return content
    .toLowerCase()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s.,!?-]/g, '') // Remove special characters
    .trim();
}

/**
 * Check if content is a near-duplicate of existing content
 * @param contentHash Hash of the new content
 * @param config Deduplication configuration
 * @returns Object with isDuplicate flag and existing article info if found
 */
export async function checkContentDuplicate(
  contentHash: string,
  config: ContentDeduplicationConfig = DEFAULT_DEDUP_CONFIG
): Promise<{ isDuplicate: boolean; existingArticle?: any }> {
  if (!config.enabled || !contentHash) {
    return { isDuplicate: false };
  }

  try {
    // Check for exact hash match
    const existingArticle = await prisma.article.findFirst({
      where: { contentHash },
      select: {
        id: true,
        url: true,
        question: true,
        platform: true,
        contentType: true,
      }
    });

    if (existingArticle) {
      console.log(`[DEDUP] Found exact content hash match: ${existingArticle.url}`);
      return {
        isDuplicate: true,
        existingArticle
      };
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error('[DEDUP] Error checking for duplicates:', error);
    return { isDuplicate: false };
  }
}

/**
 * Calculate content similarity between two strings
 * @param content1 First content string
 * @param content2 Second content string
 * @returns Similarity score between 0 and 1
 */
export function calculateContentSimilarity(content1: string, content2: string): number {
  const normalized1 = normalizeContent(content1);
  const normalized2 = normalizeContent(content2);

  if (normalized1 === normalized2) {
    return 1.0;
  }

  // Simple Jaccard similarity for now
  const words1 = new Set(normalized1.split(' '));
  const words2 = new Set(normalized2.split(' '));

  const intersection = new Set(Array.from(words1).filter(x => words2.has(x)));
  const union = new Set([...Array.from(words1), ...Array.from(words2)]);

  return intersection.size / union.size;
}

/**
 * Find near-duplicates in the database
 * @param contentHash Hash to search for
 * @param config Deduplication configuration
 * @returns Array of near-duplicate articles
 */
export async function findNearDuplicates(
  contentHash: string,
  config: ContentDeduplicationConfig = DEFAULT_DEDUP_CONFIG
): Promise<any[]> {
  if (!config.enabled || !contentHash) {
    return [];
  }

  try {
    // For now, we only check exact hash matches
    // In the future, we could implement fuzzy matching
    const duplicates = await prisma.article.findMany({
      where: { contentHash },
      select: {
        id: true,
        url: true,
        question: true,
        platform: true,
        contentType: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' }
    });

    return duplicates;
  } catch (error) {
    console.error('[DEDUP] Error finding near-duplicates:', error);
    return [];
  }
}

/**
 * Mark an article as a duplicate
 * @param articleId Article ID to mark
 * @param isDuplicate Whether it's a duplicate
 */
export async function markArticleAsDuplicate(articleId: string, isDuplicate: boolean): Promise<void> {
  try {
    await prisma.article.update({
      where: { id: articleId },
      data: { isDuplicate }
    });
  } catch (error) {
    console.error('[DEDUP] Error marking article as duplicate:', error);
  }
}

/**
 * Get deduplication statistics
 * @returns Statistics about duplicates in the database
 */
export async function getDeduplicationStats(): Promise<{
  totalArticles: number;
  duplicateArticles: number;
  uniqueArticles: number;
  duplicatePercentage: number;
}> {
  try {
    const totalArticles = await prisma.article.count();
    const duplicateArticles = await prisma.article.count({
      where: { isDuplicate: true }
    });

    const uniqueArticles = totalArticles - duplicateArticles;
    const duplicatePercentage = totalArticles > 0 ? (duplicateArticles / totalArticles) * 100 : 0;

    return {
      totalArticles,
      duplicateArticles,
      uniqueArticles,
      duplicatePercentage
    };
  } catch (error) {
    console.error('[DEDUP] Error getting deduplication stats:', error);
    return {
      totalArticles: 0,
      duplicateArticles: 0,
      uniqueArticles: 0,
      duplicatePercentage: 0
    };
  }
} 
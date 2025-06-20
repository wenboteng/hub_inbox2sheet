"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_DEDUP_CONFIG = void 0;
exports.generateContentHash = generateContentHash;
exports.checkContentDuplicate = checkContentDuplicate;
exports.calculateContentSimilarity = calculateContentSimilarity;
exports.findNearDuplicates = findNearDuplicates;
exports.markArticleAsDuplicate = markArticleAsDuplicate;
exports.getDeduplicationStats = getDeduplicationStats;
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Default configuration
exports.DEFAULT_DEDUP_CONFIG = {
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
function generateContentHash(content, config = exports.DEFAULT_DEDUP_CONFIG) {
    if (!config.enabled) {
        return '';
    }
    // Normalize content for consistent hashing
    const normalizedContent = normalizeContent(content);
    if (normalizedContent.length < config.minContentLength) {
        return '';
    }
    // Generate hash
    const hash = crypto_1.default.createHash(config.hashAlgorithm);
    hash.update(normalizedContent);
    return hash.digest('hex');
}
/**
 * Normalize content for consistent hashing
 * @param content Raw content
 * @returns Normalized content
 */
function normalizeContent(content) {
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
async function checkContentDuplicate(contentHash, config = exports.DEFAULT_DEDUP_CONFIG) {
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
    }
    catch (error) {
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
function calculateContentSimilarity(content1, content2) {
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
async function findNearDuplicates(contentHash, config = exports.DEFAULT_DEDUP_CONFIG) {
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
    }
    catch (error) {
        console.error('[DEDUP] Error finding near-duplicates:', error);
        return [];
    }
}
/**
 * Mark an article as a duplicate
 * @param articleId Article ID to mark
 * @param isDuplicate Whether it's a duplicate
 */
async function markArticleAsDuplicate(articleId, isDuplicate) {
    try {
        await prisma.article.update({
            where: { id: articleId },
            data: { isDuplicate }
        });
    }
    catch (error) {
        console.error('[DEDUP] Error marking article as duplicate:', error);
    }
}
/**
 * Get deduplication statistics
 * @returns Statistics about duplicates in the database
 */
async function getDeduplicationStats() {
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
    }
    catch (error) {
        console.error('[DEDUP] Error getting deduplication stats:', error);
        return {
            totalArticles: 0,
            duplicateArticles: 0,
            uniqueArticles: 0,
            duplicatePercentage: 0
        };
    }
}

/**
 * Get embedding for a text using OpenAI's text-embedding-3-small model
 */
export declare function getEmbedding(text: string): Promise<number[]>;
/**
 * Calculate cosine similarity between two vectors
 */
export declare function cosineSimilarity(vecA: number[], vecB: number[]): number;
/**
 * Split article content into paragraphs and get embeddings for each
 */
export declare function getContentEmbeddings(content: string): Promise<{
    text: string;
    embedding: number[];
}[]>;
/**
 * Find most relevant paragraphs using embedding similarity
 */
export declare function findRelevantParagraphs(query: string, paragraphs: {
    text: string;
    embedding: number[];
}[], topK?: number): Promise<{
    text: string;
    similarity: number;
}[]>;
/**
 * Generate a business-enriched report using OpenAI GPT-4o
 */
export declare function enrichAnalyticsReport(rawText: string): Promise<string>;
/**
 * Enrich report title and introduction with emotional framing using GPT-4o
 */
export declare function enrichReportTitleAndIntro(title: string, intro: string): Promise<{
    enrichedTitle: string;
    enrichedIntro: string;
}>;
/**
 * Generate "What This Means for You" summary boxes for report sections using GPT-4o
 */
export declare function generateSummaryBoxes(reportContent: string): Promise<string[]>;
/**
 * Generate tweet-style share suggestions from report content using GPT-4o
 */
export declare function generateShareSuggestions(reportContent: string): Promise<string[]>;
/**
 * Comprehensive report enrichment function that applies all GPT-4o enhancements
 */
export declare function enrichReportWithGPT(reportContent: string, originalTitle?: string): Promise<{
    enrichedContent: string;
    shareSuggestions: string[];
}>;
//# sourceMappingURL=openai.d.ts.map
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
//# sourceMappingURL=openai.d.ts.map
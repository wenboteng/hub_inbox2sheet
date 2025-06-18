"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmbedding = getEmbedding;
exports.cosineSimilarity = cosineSimilarity;
exports.getContentEmbeddings = getContentEmbeddings;
exports.findRelevantParagraphs = findRelevantParagraphs;
const openai_1 = __importDefault(require("openai"));
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
/**
 * Get embedding for a text using OpenAI's text-embedding-3-small model
 */
async function getEmbedding(text) {
    const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
        encoding_format: "float",
    });
    return response.data[0].embedding;
}
/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
    const normA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
    const normB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
    return dotProduct / (normA * normB);
}
/**
 * Split article content into paragraphs and get embeddings for each
 */
async function getContentEmbeddings(content) {
    // Split content into paragraphs (handling both HTML and plain text)
    const paragraphs = content
        .replace(/<[^>]+>/g, ' ')
        .split(/\n\n+|\r\n\r\n+/)
        .map(p => p.trim())
        .filter(p => p.length > 50); // Only consider paragraphs with substantial content
    // Get embeddings for each paragraph
    const embeddings = await Promise.all(paragraphs.map(async (text) => ({
        text,
        embedding: await getEmbedding(text),
    })));
    return embeddings;
}
/**
 * Find most relevant paragraphs using embedding similarity
 */
async function findRelevantParagraphs(query, paragraphs, topK = 3) {
    const queryEmbedding = await getEmbedding(query);
    // Calculate similarity scores
    const scored = paragraphs.map(para => ({
        text: para.text,
        similarity: cosineSimilarity(queryEmbedding, para.embedding),
    }));
    // Sort by similarity and return top K
    return scored
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);
}

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Get embedding for a text using OpenAI's text-embedding-3-small model
 */
export async function getEmbedding(text: string): Promise<number[]> {
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
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
  const normB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
  return dotProduct / (normA * normB);
}

/**
 * Split article content into paragraphs and get embeddings for each
 */
export async function getContentEmbeddings(content: string): Promise<{ text: string; embedding: number[] }[]> {
  // Split content into paragraphs (handling both HTML and plain text)
  const paragraphs = content
    .replace(/<[^>]+>/g, ' ')
    .split(/\n\n+|\r\n\r\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 50); // Only consider paragraphs with substantial content
  
  // Get embeddings for each paragraph
  const embeddings = await Promise.all(
    paragraphs.map(async (text) => ({
      text,
      embedding: await getEmbedding(text),
    }))
  );
  
  return embeddings;
}

/**
 * Find most relevant paragraphs using embedding similarity
 */
export async function findRelevantParagraphs(
  query: string,
  paragraphs: { text: string; embedding: number[] }[],
  topK: number = 3
): Promise<{ text: string; similarity: number }[]> {
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

/**
 * Generate a business-enriched report using OpenAI GPT-4o
 */
export async function enrichAnalyticsReport(rawText: string): Promise<string> {
  const prompt = `You are a business analyst. Given the following analytics data, write a professional, executive-level report with actionable insights for tour vendors. Highlight trends, opportunities, and recommendations.\n\nData:\n${rawText}`;
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1500,
    temperature: 0.7,
  });
  return response.choices[0].message.content || '';
} 
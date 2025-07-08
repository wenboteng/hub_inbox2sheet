"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmbedding = getEmbedding;
exports.cosineSimilarity = cosineSimilarity;
exports.getContentEmbeddings = getContentEmbeddings;
exports.findRelevantParagraphs = findRelevantParagraphs;
exports.enrichAnalyticsReport = enrichAnalyticsReport;
exports.enrichReportTitleAndIntro = enrichReportTitleAndIntro;
exports.generateSummaryBoxes = generateSummaryBoxes;
exports.generateShareSuggestions = generateShareSuggestions;
exports.enrichReportWithGPT = enrichReportWithGPT;
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
/**
 * Generate a business-enriched report using OpenAI GPT-4o
 */
async function enrichAnalyticsReport(rawText) {
    const prompt = `You are a business analyst. Given the following analytics data, write a professional, executive-level report with actionable insights for tour vendors. Highlight trends, opportunities, and recommendations.\n\nData:\n${rawText}`;
    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.7,
    });
    return response.choices[0].message.content || '';
}
/**
 * Enrich report title and introduction with emotional framing using GPT-4o
 */
async function enrichReportTitleAndIntro(title, intro) {
    const prompt = `You are a content editor for a data-driven tour industry insights platform. Rewrite the following title and introduction to make them more emotionally engaging and curiosity-driven, without distorting the facts. Use a tone that mixes logic with relevance, so that tour vendors feel understood and interested to keep reading. Keep it under 100 words. Add one short emotional hook if possible.

Title: ${title}
Introduction: ${intro}

Please respond with:
ENRICHED_TITLE: [your enhanced title]
ENRICHED_INTRO: [your enhanced introduction]`;
    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.8,
    });
    const content = response.choices[0].message.content || '';
    // Parse the response
    const titleMatch = content.match(/ENRICHED_TITLE:\s*(.+?)(?:\n|$)/);
    const introMatch = content.match(/ENRICHED_INTRO:\s*(.+?)(?:\n|$)/);
    return {
        enrichedTitle: titleMatch?.[1]?.trim() || title,
        enrichedIntro: introMatch?.[1]?.trim() || intro
    };
}
/**
 * Generate "What This Means for You" summary boxes for report sections using GPT-4o
 */
async function generateSummaryBoxes(reportContent) {
    // Split report into sections (by headers)
    const sections = reportContent.split(/(?=^#{2,3}\s+)/m).filter(section => section.trim().length > 50);
    const summaryBoxes = [];
    for (const section of sections.slice(0, 5)) { // Limit to first 5 sections to avoid too many API calls
        const prompt = `Based on the following report section, generate a short, plain-language summary box titled "What This Means for You". Include a 1-sentence insight, and 1 actionable step for a tour vendor. Use a slightly conversational, motivating tone. Keep it under 80 words.

Report Section:
${section}

Please respond with just the summary box content in this format:
**What This Means for You**
[Your summary content]`;
        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 150,
                temperature: 0.7,
            });
            const summaryBox = response.choices[0].message.content?.trim();
            if (summaryBox) {
                summaryBoxes.push(summaryBox);
            }
        }
        catch (error) {
            console.error('Error generating summary box:', error);
        }
    }
    return summaryBoxes;
}
/**
 * Generate tweet-style share suggestions from report content using GPT-4o
 */
async function generateShareSuggestions(reportContent) {
    const prompt = `Summarize this report in 1–2 short tweet-style insights that are punchy, data-backed, and engaging. Add a light emotional tone or FOMO if appropriate. Each tweet should be under 280 characters and include a relevant hashtag.

Report Content:
${reportContent.substring(0, 2000)} // Limit content to avoid token limits

Please respond with:
TWEET_1: [first tweet]
TWEET_2: [second tweet]`;
    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.8,
    });
    const content = response.choices[0].message.content || '';
    // Parse the response
    const tweet1Match = content.match(/TWEET_1:\s*(.+?)(?:\n|$)/);
    const tweet2Match = content.match(/TWEET_2:\s*(.+?)(?:\n|$)/);
    const suggestions = [];
    if (tweet1Match?.[1])
        suggestions.push(tweet1Match[1].trim());
    if (tweet2Match?.[1])
        suggestions.push(tweet2Match[1].trim());
    return suggestions;
}
/**
 * Comprehensive report enrichment function that applies all GPT-4o enhancements
 */
async function enrichReportWithGPT(reportContent, originalTitle) {
    try {
        // Extract title and intro from the report content
        const titleMatch = reportContent.match(/^#\s+(.+)$/m);
        const title = originalTitle || titleMatch?.[1] || 'Analytics Report';
        // Find the first paragraph after the title as intro
        const lines = reportContent.split('\n');
        let intro = '';
        let foundTitle = false;
        for (const line of lines) {
            if (line.startsWith('# ')) {
                foundTitle = true;
                continue;
            }
            if (foundTitle && line.trim() && !line.startsWith('#')) {
                intro = line.trim();
                break;
            }
        }
        // 1. Enrich title and intro
        const { enrichedTitle, enrichedIntro } = await enrichReportTitleAndIntro(title, intro);
        // 2. Generate summary boxes
        const summaryBoxes = await generateSummaryBoxes(reportContent);
        // 3. Generate share suggestions
        const shareSuggestions = await generateShareSuggestions(reportContent);
        // 4. Apply enhancements to the content
        let enrichedContent = reportContent;
        // Replace title if it exists
        if (titleMatch) {
            enrichedContent = enrichedContent.replace(/^#\s+(.+)$/m, `# ${enrichedTitle}`);
        }
        // Replace intro if it exists
        if (intro && enrichedIntro !== intro) {
            enrichedContent = enrichedContent.replace(intro, enrichedIntro);
        }
        // Add summary boxes after each major section
        if (summaryBoxes.length > 0) {
            const sections = enrichedContent.split(/(?=^#{2}\s+)/m);
            const enhancedSections = sections.map((section, index) => {
                if (index < summaryBoxes.length && section.trim()) {
                    return section + '\n\n' + summaryBoxes[index] + '\n';
                }
                return section;
            });
            enrichedContent = enhancedSections.join('');
        }
        // Add share suggestions at the end
        if (shareSuggestions.length > 0) {
            enrichedContent += '\n\n## 📱 Share This Insight\n\n';
            shareSuggestions.forEach((suggestion, index) => {
                enrichedContent += `**Tweet ${index + 1}:** ${suggestion}\n\n`;
            });
        }
        return {
            enrichedContent,
            shareSuggestions
        };
    }
    catch (error) {
        console.error('Error enriching report with GPT:', error);
        return {
            enrichedContent: reportContent,
            shareSuggestions: []
        };
    }
}
//# sourceMappingURL=openai.js.map
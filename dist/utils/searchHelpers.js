"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractRelevantSnippet = extractRelevantSnippet;
exports.rankArticlesByRelevance = rankArticlesByRelevance;
/**
 * Extracts the most relevant snippet from HTML content based on search query
 */
function extractRelevantSnippet(content, query, maxLength = 300) {
    // Remove HTML tags for text matching
    const plainText = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    // Split query into terms
    const terms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    // Find paragraphs containing query terms
    const paragraphs = plainText.split(/[.!?]\s+/);
    const scoredParagraphs = paragraphs.map(para => {
        const paraLower = para.toLowerCase();
        let score = 0;
        let matches = 0;
        // Score based on term frequency and position
        terms.forEach(term => {
            const count = (paraLower.match(new RegExp(term, 'g')) || []).length;
            if (count > 0) {
                score += count;
                matches++;
                // Bonus for having multiple terms
                if (matches > 1)
                    score *= 1.2;
                // Bonus for terms appearing early
                const pos = paraLower.indexOf(term);
                if (pos < para.length / 3)
                    score *= 1.3;
            }
        });
        return { para, score };
    });
    // Sort by score and get best paragraph
    const bestParagraph = scoredParagraphs
        .filter(p => p.score > 0)
        .sort((a, b) => b.score - a.score)[0];
    if (!bestParagraph) {
        // If no good match, return start of content
        return plainText.slice(0, maxLength) + '...';
    }
    let snippet = bestParagraph.para;
    // Truncate to maxLength while keeping whole words
    if (snippet.length > maxLength) {
        snippet = snippet.slice(0, maxLength).replace(/\s[^\s]*$/, '') + '...';
    }
    // Highlight matching terms
    terms.forEach(term => {
        const regex = new RegExp(`(${term})`, 'gi');
        snippet = snippet.replace(regex, '<mark>$1</mark>');
    });
    return snippet;
}
/**
 * Ranks articles by relevance to query
 */
function rankArticlesByRelevance(articles, query) {
    const terms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    return articles
        .map(article => {
        const text = `${article.question} ${article.answer}`.toLowerCase();
        let score = 0;
        // Score based on term frequency in title and content
        terms.forEach(term => {
            // Higher weight for matches in question/title
            const titleMatches = (article.question.toLowerCase().match(new RegExp(term, 'g')) || []).length;
            score += titleMatches * 3;
            // Regular weight for matches in content
            const contentMatches = (text.match(new RegExp(term, 'g')) || []).length;
            score += contentMatches;
        });
        // Bonus for having multiple terms
        if (terms.filter(term => text.includes(term)).length > 1) {
            score *= 1.5;
        }
        // Small bonus for recent articles
        const daysOld = (Date.now() - new Date(article.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
        score *= Math.max(0.5, 1 - (daysOld / 365)); // Decay over a year
        return { ...article, relevanceScore: score };
    })
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 3); // Return top 3 results
}
//# sourceMappingURL=searchHelpers.js.map
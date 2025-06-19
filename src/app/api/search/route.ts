import { NextRequest, NextResponse } from "next/server";
import prisma from '@/lib/prisma';
import { getEmbedding } from '@/utils/openai';
import type { Prisma } from '@prisma/client';
import { rankArticlesByRelevance } from '@/utils/searchHelpers';
import { expandSearchTerms, getRelatedTerms } from '@/utils/searchExpansion';

// Force dynamic rendering for search API
export const dynamic = 'force-dynamic';

interface ArticleParagraph {
  text: string;
  embedding: number[];
}

interface Article {
  id: string;
  url: string;
  question: string;
  platform: string;
  category: string;
  paragraphs: ArticleParagraph[];
}

interface SearchResult {
  id: string;
  url: string;
  question: string;
  platform: string;
  category: string;
  snippets: string[];
  score: number;
  isSemanticMatch: boolean;
  isTopMatch?: boolean;
  contentType?: string;
  source?: string;
  author?: string;
  votes?: number;
  isVerified?: boolean;
}

// Helper function to extract tight, relevant snippets
function extractTightSnippet(text: string, queryTerms: string[], maxLength: number = 200): string {
  // Split into sentences
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  // Score sentences based on query term density
  const scoredSentences = sentences.map(sentence => {
    const lowerSentence = sentence.toLowerCase();
    let score = 0;
    let termMatches = 0;
    
    queryTerms.forEach(term => {
      const count = (lowerSentence.match(new RegExp(term, 'g')) || []).length;
      if (count > 0) {
        score += count;
        termMatches++;
      }
    });
    
    // Bonus for having multiple terms
    if (termMatches > 1) score *= 1.5;
    
    return { sentence: sentence.trim(), score };
  });
  
  // Get the best sentence
  const bestSentence = scoredSentences
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)[0];
    
  if (!bestSentence) {
    // Fallback to first sentence
    return sentences[0]?.slice(0, maxLength) + '...' || text.slice(0, maxLength) + '...';
  }
  
  let snippet = bestSentence.sentence;
  
  // Truncate if too long
  if (snippet.length > maxLength) {
    snippet = snippet.slice(0, maxLength).replace(/\s[^\s]*$/, '') + '...';
  }
  
  return snippet;
}

// Helper function to highlight search terms in text
function highlightTerms(text: string, terms: string[]): string {
  let highlighted = text;
  // Only highlight the most relevant terms (limit to 3 to avoid over-highlighting)
  const topTerms = terms.slice(0, 3);
  topTerms.forEach(term => {
    const regex = new RegExp(`(${term})`, 'gi');
    highlighted = highlighted.replace(regex, '<mark>$1</mark>');
  });
  return highlighted;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const platform = searchParams.get('platform');
    const category = searchParams.get("category");
    const showAll = searchParams.get("showAll") === 'true';
    const contentType = searchParams.get("contentType") || 'all'; // 'all' | 'official' | 'community'
    const includeCommunity = searchParams.get("includeCommunity") !== 'false'; // Default to true

    if (!query) {
      return NextResponse.json({ articles: [] });
    }

    // Get query embedding and expanded terms
    const [queryEmbedding, expandedTerms] = await Promise.all([
      getEmbedding(query),
      Promise.resolve(getRelatedTerms(query))
    ]);

    // Build base query with content type filtering
    const baseQuery = {
      where: {
        ...(platform ? { platform } : {}),
        ...(category ? { category } : {}),
        // Content type filtering
        ...(contentType === 'official' && { contentType: 'official' }),
        ...(contentType === 'community' && { contentType: { in: ['community', 'user_generated'] } }),
        // If not including community, filter it out
        ...(!includeCommunity && { contentType: 'official' }),
      },
      select: {
        id: true,
        url: true,
        question: true,
        platform: true,
        category: true,
        paragraphs: true,
        contentType: true,
        source: true,
        author: true,
        votes: true,
        isVerified: true,
      },
      take: 50,
    };

    // Get articles with paragraphs
    const articles = await prisma.article.findMany(baseQuery);

    // Check for platform mismatch
    let platformMismatch = false;
    let platformWarning = null;
    
    if (platform && articles.length > 0) {
      const hasPlatformMatch = articles.some((article: any) => 
        article.platform.toLowerCase() === platform.toLowerCase()
      );
      
      if (!hasPlatformMatch) {
        platformMismatch = true;
        platformWarning = `No exact matches from ${platform} yet, but these may still help.`;
      }
    }

    // Process and rank results using semantic search
    const semanticResults = await Promise.all(
      articles.map(async (article: any) => {
        // Convert JSON embeddings to number arrays
        const paragraphs = article.paragraphs.map((p: { text: string; embedding: unknown }) => ({
          text: p.text,
          embedding: p.embedding as number[],
        }));

        // Find most relevant paragraphs using vector similarity
        const relevantParagraphs = paragraphs
          .map((para: { text: string; embedding: number[] }) => ({
            text: para.text,
            similarity: cosineSimilarity(queryEmbedding, para.embedding),
          }))
          .sort((a: { similarity: number }, b: { similarity: number }) => b.similarity - a.similarity)
          .slice(0, 1); // Only take the best paragraph

        // Calculate overall article score based on best paragraph similarity
        let score = relevantParagraphs.length > 0 
          ? relevantParagraphs[0].similarity
          : 0;

        // Boost community content with high votes
        if (article.contentType === 'community' && article.votes > 0) {
          const voteBoost = Math.min(article.votes / 100, 0.1); // Max 10% boost
          score += voteBoost;
        }

        // Extract tight, relevant snippets
        const snippets = relevantParagraphs.map((p: { text: string }) => 
          highlightTerms(extractTightSnippet(p.text, expandedTerms), expandedTerms)
        );

        return {
          id: article.id,
          url: article.url,
          question: article.question,
          platform: article.platform,
          category: article.category,
          snippets,
          score,
          isSemanticMatch: true,
          contentType: article.contentType,
          source: article.source,
          author: article.author,
          votes: article.votes,
          isVerified: article.isVerified,
        } as SearchResult;
      })
    );

    // Sort by score
    const sortedSemanticResults = semanticResults
      .sort((a, b) => b.score - a.score);

    // Check if we have good semantic matches
    const hasGoodSemanticMatches = sortedSemanticResults.some(r => r.score > 0.3);

    if (hasGoodSemanticMatches) {
      // Mark top match and limit results
      const results = sortedSemanticResults
        .filter(r => r.score > 0.3)
        .map((r, index) => ({ ...r, isTopMatch: index === 0 }));
      
      const limitedResults = showAll ? results : results.slice(0, 5);
      
      return NextResponse.json({ 
        articles: limitedResults,
        searchType: 'semantic',
        totalResults: results.length,
        hasMore: !showAll && results.length > 5,
        platformMismatch,
        platformWarning,
        contentTypes: Array.from(new Set(results.map(r => r.contentType))),
      });
    }

    // If no good semantic matches, try keyword search as fallback
    const keywordResults = rankArticlesByRelevance(articles, expandedTerms.join(" "))
      .map((article, index) => ({
        ...article,
        snippets: [highlightTerms(extractTightSnippet(article.paragraphs[0].text, expandedTerms), expandedTerms)],
        score: article.relevanceScore,
        isSemanticMatch: false,
        isTopMatch: index === 0,
        contentType: article.contentType || 'official',
        source: article.source || 'help_center',
        author: article.author,
        votes: article.votes || 0,
        isVerified: article.isVerified || false,
      }));

    // If we have any results from either method, return the best ones
    if (sortedSemanticResults.length > 0 || keywordResults.length > 0) {
      // Combine and sort results, preferring semantic matches
      const combinedResults = [
        // Include top semantic match even if below threshold
        ...sortedSemanticResults.slice(0, 1).map(r => ({
          ...r,
          snippets: [...r.snippets, "This may not be a perfect match, but it's semantically related."],
          isTopMatch: true
        })),
        // Include keyword matches
        ...keywordResults
      ];

      const limitedResults = showAll ? combinedResults : combinedResults.slice(0, 5);

      return NextResponse.json({ 
        articles: limitedResults,
        searchType: 'combined',
        totalResults: combinedResults.length,
        hasMore: !showAll && combinedResults.length > 5,
        platformMismatch,
        platformWarning,
        contentTypes: Array.from(new Set(combinedResults.map(r => r.contentType))),
      });
    }

    // If still no results, we'll handle this case in the frontend
    return NextResponse.json({ 
      articles: [],
      searchType: 'none',
      totalResults: 0,
      hasMore: false,
      platformMismatch,
      platformWarning,
      contentTypes: [],
    });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Failed to perform search' }, { status: 500 });
  }
}

// Helper function for cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
  const normB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
  return dotProduct / (normA * normB);
} 
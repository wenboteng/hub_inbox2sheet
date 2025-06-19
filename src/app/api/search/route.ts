import { NextRequest, NextResponse } from "next/server";
import prisma from '@/lib/prisma';
import { getEmbedding } from '@/utils/openai';
import type { Prisma } from '@prisma/client';
import { rankArticlesByRelevance } from '@/utils/searchHelpers';
import { expandSearchTerms, getRelatedTerms } from '@/utils/searchExpansion';

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
}

// Helper function to highlight search terms in text
function highlightTerms(text: string, terms: string[]): string {
  let highlighted = text;
  terms.forEach(term => {
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

    if (!query) {
      return NextResponse.json({ articles: [] });
    }

    // Get query embedding and expanded terms
    const [queryEmbedding, expandedTerms] = await Promise.all([
      getEmbedding(query),
      Promise.resolve(getRelatedTerms(query))
    ]);

    // Build base query
    const baseQuery = {
      where: {
        ...(platform ? { platform } : {}),
      },
      select: {
        id: true,
        url: true,
        question: true,
        platform: true,
        category: true,
        paragraphs: true,
      },
      take: 50,
    };

    // Get articles with paragraphs
    const articles = await prisma.article.findMany(baseQuery);

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
          .slice(0, 2);

        // Calculate overall article score based on best paragraph similarity
        const score = relevantParagraphs.length > 0 
          ? relevantParagraphs[0].similarity
          : 0;

        // Highlight search terms in snippets
        const snippets = relevantParagraphs.map((p: { text: string }) => 
          highlightTerms(p.text, expandedTerms)
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
        } as SearchResult;
      })
    );

    // Sort by score
    const sortedSemanticResults = semanticResults
      .sort((a, b) => b.score - a.score);

    // Check if we have good semantic matches
    const hasGoodSemanticMatches = sortedSemanticResults.some(r => r.score > 0.3);

    if (hasGoodSemanticMatches) {
      // Return only good semantic matches
      return NextResponse.json({ 
        articles: sortedSemanticResults.filter(r => r.score > 0.3),
        searchType: 'semantic'
      });
    }

    // If no good semantic matches, try keyword search as fallback
    const keywordResults = rankArticlesByRelevance(articles, expandedTerms.join(" "))
      .map(article => ({
        ...article,
        snippets: [highlightTerms(article.paragraphs[0].text, expandedTerms)],
        score: article.relevanceScore,
        isSemanticMatch: false
      }));

    // If we have any results from either method, return the best ones
    if (sortedSemanticResults.length > 0 || keywordResults.length > 0) {
      // Combine and sort results, preferring semantic matches
      const combinedResults = [
        // Include top semantic match even if below threshold
        ...sortedSemanticResults.slice(0, 1).map(r => ({
          ...r,
          snippets: [...r.snippets, "This may not be a perfect match, but it's semantically related."]
        })),
        // Include keyword matches
        ...keywordResults
      ].slice(0, 5); // Limit to top 5 results

      return NextResponse.json({ 
        articles: combinedResults,
        searchType: 'combined'
      });
    }

    // If still no results, we'll handle this case in the frontend
    return NextResponse.json({ 
      articles: [],
      searchType: 'none'
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
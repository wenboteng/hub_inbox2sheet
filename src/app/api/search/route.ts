import { NextRequest, NextResponse } from "next/server";
import prisma from '@/lib/prisma';
import { getEmbedding } from '@/utils/openai';
import type { Prisma } from '@prisma/client';

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

    // Get query embedding
    const queryEmbedding = await getEmbedding(query);

    // Build base query
    const baseQuery: Prisma.ArticleFindManyArgs = {
      where: {
        AND: [
          {
            OR: [
              { question: { contains: query, mode: "insensitive" } },
              { answer: { contains: query, mode: "insensitive" } },
            ],
          },
          platform && platform !== "all" ? { platform } : {},
          category && category !== "all" ? { category } : {},
        ],
      },
      orderBy: {
        lastUpdated: "desc",
      },
      include: {
        paragraphs: true,
      },
      take: 3,
    };

    // Get articles with paragraphs
    const articles = await prisma.article.findMany(baseQuery);

    // Process and rank results
    const results = await Promise.all(
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
          highlightTerms(p.text, query.split(' '))
        );

        return {
          id: article.id,
          url: article.url,
          question: article.question,
          platform: article.platform,
          category: article.category,
          snippets,
          score,
        } as SearchResult;
      })
    );

    // Sort by score and return top results
    const sortedResults = results
      .sort((a, b) => b.score - a.score)
      .filter(r => r.score > 0.7); // Only return reasonably good matches

    return NextResponse.json({ articles: sortedResults });
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
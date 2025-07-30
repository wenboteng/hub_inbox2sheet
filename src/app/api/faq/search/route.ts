import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '6');

    if (!query || query.trim().length < 2) {
      return NextResponse.json([]);
    }

    // Search in both question and answer fields
    const searchResults = await prisma.article.findMany({
      where: {
        crawlStatus: 'active',
        OR: [
          {
            question: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            answer: {
              contains: query,
              mode: 'insensitive'
            }
          }
        ],
        // Filter out tourist content for vendor-focused search
        AND: [
          {
            question: {
              not: {
                contains: 'tourist'
              }
            }
          },
          {
            answer: {
              not: {
                contains: 'tourist'
              }
            }
          }
        ]
      },
      orderBy: [
        { votes: 'desc' },        // Most popular first
        { isVerified: 'desc' },   // Verified content
        { createdAt: 'desc' }     // Recent content
      ],
      take: limit,
      select: {
        id: true,
        question: true,
        answer: true,
        platform: true,
        category: true,
        votes: true,
        isVerified: true,
        createdAt: true,
        contentType: true,
        source: true
      }
    });

    // Apply relevance scoring
    const scoredResults = searchResults.map(result => {
      let relevanceScore = 0;
      const queryLower = query.toLowerCase();
      const questionLower = result.question.toLowerCase();
      const answerLower = result.answer.toLowerCase();

      // Exact match bonus
      if (questionLower.includes(queryLower)) relevanceScore += 100;
      if (answerLower.includes(queryLower)) relevanceScore += 50;

      // Word boundary match bonus
      const queryWords = queryLower.split(' ').filter(word => word.length > 2);
      queryWords.forEach(word => {
        if (questionLower.includes(word)) relevanceScore += 20;
        if (answerLower.includes(word)) relevanceScore += 10;
      });

      // Platform relevance bonus
      const platformKeywords = ['airbnb', 'viator', 'booking', 'getyourguide', 'tripadvisor'];
      const matchingPlatform = platformKeywords.find(keyword => 
        queryLower.includes(keyword) && result.platform.toLowerCase().includes(keyword)
      );
      if (matchingPlatform) relevanceScore += 30;

      // Quality bonus
      relevanceScore += result.votes * 2;
      if (result.isVerified) relevanceScore += 25;
      if (result.contentType === 'community') relevanceScore += 15;

      return { ...result, relevanceScore };
    });

    // Sort by relevance score
    const sortedResults = scoredResults
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

    return NextResponse.json(sortedResults);

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Get real stats from database
    const [
      totalQuestions,
      topQuestions,
      verifiedAnswers,
      platformStats,
      categoryStats
    ] = await Promise.all([
      // Total questions
      prisma.article.count({
        where: {
          crawlStatus: 'active',
          isDuplicate: false,
          language: 'en',
        }
      }),
      
      // Top questions (verified or official)
      prisma.article.count({
        where: {
          crawlStatus: 'active',
          isDuplicate: false,
          language: 'en',
          OR: [
            { isVerified: true },
            { contentType: 'official' }
          ]
        }
      }),
      
      // Verified answers
      prisma.article.count({
        where: {
          crawlStatus: 'active',
          isDuplicate: false,
          language: 'en',
          isVerified: true,
        }
      }),
      
      // Platform stats
      prisma.article.groupBy({
        by: ['platform'],
        where: {
          crawlStatus: 'active',
          isDuplicate: false,
          language: 'en',
        },
        _count: {
          platform: true
        },
        orderBy: {
          _count: {
            platform: 'desc'
          }
        }
      }),
      
      // Category stats
      prisma.article.groupBy({
        by: ['category'],
        where: {
          crawlStatus: 'active',
          isDuplicate: false,
          language: 'en',
          category: {
            not: ''
          }
        },
        _count: {
          category: true
        },
        orderBy: {
          _count: {
            category: 'desc'
          }
        }
      })
    ]);

    const stats = {
      totalQuestions,
      topQuestions,
      verifiedAnswers,
      platforms: platformStats.map(p => ({
        platform: p.platform,
        count: p._count.platform
      })),
      categories: categoryStats.map(c => ({
        category: c.category || 'Unknown',
        count: (c._count as any).category || 0
      }))
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to fetch FAQ stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
} 
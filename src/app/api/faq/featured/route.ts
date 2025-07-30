import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Algorithm-based selection: popular + recent + high-quality
    const featuredFAQs = await prisma.article.findMany({
      where: {
        crawlStatus: 'active',
        // Filter out tourist content, focus on vendor content
        question: {
          not: {
            contains: 'tourist'
          }
        },
        answer: {
          not: {
            contains: 'tourist'
          }
        }
      },
      orderBy: [
        { votes: 'desc' },        // Most popular first
        { createdAt: 'desc' },    // Recent content
        { isVerified: 'desc' }    // Verified content
      ],
      take: 10, // Get more than needed for variety
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

    // Apply additional filtering and scoring
    const scoredFAQs = featuredFAQs.map(faq => {
      let score = 0;
      
      // Base score from votes
      score += faq.votes * 2;
      
      // Bonus for verified content
      if (faq.isVerified) score += 50;
      
      // Bonus for recent content (last 30 days)
      const daysSinceCreated = Math.floor((Date.now() - new Date(faq.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceCreated <= 30) score += 30;
      
      // Bonus for community content
      if (faq.contentType === 'community') score += 20;
      
      // Bonus for vendor-specific platforms
      const vendorPlatforms = ['Airbnb', 'Viator', 'GetYourGuide', 'Booking.com'];
      if (vendorPlatforms.includes(faq.platform)) score += 15;
      
      // Penalty for promotional content
      const promotionalKeywords = ['promote', 'advertise', 'sponsored', 'buy now', 'limited time'];
      const hasPromotionalContent = promotionalKeywords.some(keyword => 
        faq.question.toLowerCase().includes(keyword) || faq.answer.toLowerCase().includes(keyword)
      );
      if (hasPromotionalContent) score -= 100;

      return { ...faq, score };
    });

    // Sort by score and take top 6 for variety
    const topFAQs = scoredFAQs
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    // Randomly select 3 from top 6 for auto-rotation
    const shuffled = topFAQs.sort(() => 0.5 - Math.random());
    const selectedFAQs = shuffled.slice(0, 3);

    return NextResponse.json(selectedFAQs);

  } catch (error) {
    console.error('Error fetching featured FAQs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch featured FAQs' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 
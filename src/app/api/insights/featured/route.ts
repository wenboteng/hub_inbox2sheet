import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Fetch real reports from the database
    const reports = await prisma.report.findMany({
      where: {
        isPublic: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 6 // Get more to have variety
    });

    // Transform reports into the format expected by the homepage
    const insights = reports.map((report, index) => {
      // Extract platform from report type or content
      let platform = 'All Platforms';
      if (report.type?.includes('viator')) platform = 'Viator';
      else if (report.type?.includes('gyg') || report.type?.includes('getyourguide')) platform = 'GetYourGuide';
      else if (report.type?.includes('airbnb')) platform = 'Airbnb';
      else if (report.type?.includes('tripadvisor')) platform = 'TripAdvisor';
      else if (report.type?.includes('booking')) platform = 'Booking.com';

      // Generate a short description from the content
      const content = report.content || '';
      const description = content.length > 150 
        ? content.substring(0, 150) + '...' 
        : content || 'Comprehensive analysis and insights for tour vendors';

      // Generate mock data for the cards (since reports don't have this data)
      const mockData = {
        totalQuestions: Math.floor(Math.random() * 500) + 100,
        topCategory: ['Pricing & Revenue', 'Tour Operations', 'Customer Service', 'Marketing'][index % 4],
        avgEngagement: Math.floor(Math.random() * 20) + 5,
        trend: ['up', 'stable', 'down'][index % 3] as 'up' | 'down' | 'stable'
      };

      return {
        id: report.slug || report.id,
        title: report.title,
        description,
        platform,
        data: mockData,
        isPremium: index < 2, // First 2 reports are premium
        slug: report.slug || report.id
      };
    });

    // Return 3 featured insights
    return NextResponse.json(insights.slice(0, 3));

  } catch (error) {
    console.error('Error fetching featured insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch featured insights' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get all reports (both public and private)
    const reports = await prisma.report.findMany({
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      reports: reports.map(report => ({
        id: report.id,
        type: report.type,
        title: report.title,
        slug: report.slug,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        isPublic: report.isPublic,
        // Extract platform from type or content for display
        platform: extractPlatformFromReport(report),
        // Extract summary from content
        summary: extractSummaryFromContent(report.content)
      }))
    });

  } catch (error) {
    console.error('Error fetching admin reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

// Helper function to extract platform from report
function extractPlatformFromReport(report: any): string {
  const platformMap: { [key: string]: string } = {
    'airbnb': 'Airbnb',
    'viator': 'Viator',
    'getyourguide': 'GetYourGuide',
    'gyg': 'GetYourGuide',
    'tripadvisor': 'TripAdvisor',
    'booking': 'Booking.com',
    'expedia': 'Expedia'
  };

  // Check type first
  for (const [key, platform] of Object.entries(platformMap)) {
    if (report.type.toLowerCase().includes(key)) {
      return platform;
    }
  }

  // Check content for platform mentions
  const content = report.content.toLowerCase();
  for (const [key, platform] of Object.entries(platformMap)) {
    if (content.includes(key)) {
      return platform;
    }
  }

  return 'Multi-Platform';
}

// Helper function to extract summary from content
function extractSummaryFromContent(content: string): string {
  // Remove markdown formatting
  const cleanContent = content
    .replace(/#{1,6}\s+/g, '') // Remove headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italic
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
    .replace(/`(.*?)`/g, '$1') // Remove code
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim();

  // Return first 150 characters
  return cleanContent.length > 150 
    ? cleanContent.substring(0, 150) + '...'
    : cleanContent;
} 
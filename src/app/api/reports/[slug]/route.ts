import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    
    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    // Find the report by slug
    const report = await prisma.report.findFirst({
      where: { 
        slug: slug,
        isPublic: true 
      }
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Derive platform from type or title for frontend compatibility
    let platform = '';
    const lower = (report.type + ' ' + report.title).toLowerCase();
    if (lower.includes('airbnb')) platform = 'Airbnb';
    else if (lower.includes('viator')) platform = 'Viator';
    else if (lower.includes('getyourguide') || lower.includes('gyg')) platform = 'GetYourGuide';
    else if (lower.includes('booking')) platform = 'Booking.com';
    else if (lower.includes('expedia')) platform = 'Expedia';
    else if (lower.includes('tripadvisor')) platform = 'Tripadvisor';
    else platform = 'Other';

    // Return the report with platform information
    return NextResponse.json({
      ...report,
      platform
    });

  } catch (error) {
    console.error('Error fetching report:', error);
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
} 
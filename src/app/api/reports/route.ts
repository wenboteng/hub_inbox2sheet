import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const dbReports = await prisma.report.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: 'desc' },
    });
    console.log('DB Reports:', dbReports); // Debug log
    const reports = dbReports.map(r => {
      // Extract summary: first 200 chars of content, stripped of markdown
      let summary = r.content.replace(/[#*_`>\-\[\]()!\d\.]/g, '').slice(0, 200);
      // Derive platform from type or title
      let platform = '';
      const lower = (r.type + ' ' + r.title).toLowerCase();
      if (lower.includes('airbnb')) platform = 'Airbnb';
      else if (lower.includes('viator')) platform = 'Viator';
      else if (lower.includes('getyourguide') || lower.includes('gyg')) platform = 'GetYourGuide';
      else if (lower.includes('booking')) platform = 'Booking.com';
      else if (lower.includes('expedia')) platform = 'Expedia';
      else if (lower.includes('tripadvisor')) platform = 'Tripadvisor';
      else platform = 'Other';
      return {
        id: r.id,
        type: r.type,
        slug: r.slug,
        title: r.title,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        isPublic: r.isPublic,
        summary,
        platform,
      };
    });
    return NextResponse.json({ reports });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list reports' }, { status: 500 });
  }
} 
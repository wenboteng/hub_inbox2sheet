import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params;
    
    // Find the report
    const report = await prisma.report.findUnique({
      where: { slug }
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // For now, return a message indicating server-side PDF generation is available
    // In a full implementation, you would use a library like puppeteer or jsPDF on the server
    return NextResponse.json({
      success: true,
      message: 'Server-side PDF generation endpoint available',
      report: {
        id: report.id,
        title: report.title,
        slug: report.slug,
        contentLength: report.content.length
      },
      note: 'This endpoint is ready for server-side PDF generation implementation. Currently, client-side generation is recommended for better performance and scalability.'
    });

  } catch (error) {
    console.error('Error in PDF generation endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to process PDF generation request' },
      { status: 500 }
    );
  }
} 
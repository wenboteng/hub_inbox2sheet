import { NextRequest, NextResponse } from 'next/server';
import { enrichReportWithGPT } from '@/utils/openai';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { reportId, reportType } = await request.json();
    
    if (!reportId && !reportType) {
      return NextResponse.json(
        { error: 'Either reportId or reportType is required' },
        { status: 400 }
      );
    }

    // Find the report
    let report;
    if (reportId) {
      report = await prisma.report.findUnique({
        where: { id: reportId }
      });
    } else {
      report = await prisma.report.findUnique({
        where: { type: reportType }
      });
    }

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    console.log(`🎯 Enriching report: ${report.title} with GPT-4o...`);

    // Enrich the report content with GPT-4o
    const { enrichedContent, shareSuggestions } = await enrichReportWithGPT(
      report.content,
      report.title
    );

    // Update the report with enriched content
    const updatedReport = await prisma.report.update({
      where: { id: report.id },
      data: {
        content: enrichedContent,
        updatedAt: new Date(),
      }
    });

    console.log(`✅ Report enriched successfully! Share suggestions: ${shareSuggestions.length}`);

    return NextResponse.json({
      success: true,
      message: 'Report enriched successfully with GPT-4o',
      report: {
        id: updatedReport.id,
        title: updatedReport.title,
        type: updatedReport.type,
        slug: updatedReport.slug,
        updatedAt: updatedReport.updatedAt,
      },
      shareSuggestions,
      enrichmentApplied: true
    });

  } catch (error) {
    console.error('Error enriching report:', error);
    return NextResponse.json(
      { error: 'Failed to enrich report with GPT-4o' },
      { status: 500 }
    );
  }
} 
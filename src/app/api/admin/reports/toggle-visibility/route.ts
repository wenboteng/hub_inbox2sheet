import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { reportId, isPublic } = await request.json();
    
    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      );
    }

    // Update the report visibility
    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: { isPublic }
    });

    console.log(`Report "${updatedReport.title}" ${isPublic ? 'made public' : 'made private'}`);

    return NextResponse.json({
      success: true,
      message: `Report ${isPublic ? 'made public' : 'made private'} successfully`,
      report: {
        id: updatedReport.id,
        title: updatedReport.title,
        type: updatedReport.type,
        isPublic: updatedReport.isPublic,
        updatedAt: updatedReport.updatedAt
      }
    });

  } catch (error) {
    console.error('Error toggling report visibility:', error);
    return NextResponse.json(
      { error: 'Failed to update report visibility' },
      { status: 500 }
    );
  }
} 
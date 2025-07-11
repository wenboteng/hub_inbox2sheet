import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: { filename: string } }) {
  try {
    const { filename } = params;
    // Try to find by id, type, or slug
    const report = await prisma.report.findFirst({
      where: {
        OR: [
          { id: filename },
          { type: filename },
          { slug: filename },
        ],
      },
    });
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }
    return NextResponse.json({ content: report.content, title: report.title, slug: report.slug, createdAt: report.createdAt, updatedAt: report.updatedAt });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
} 
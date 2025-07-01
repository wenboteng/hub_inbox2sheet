import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const dbReports = await prisma.report.findMany({ orderBy: { createdAt: 'desc' } });
    console.log('DB Reports:', dbReports); // Debug log
    const reports = dbReports.map(r => ({
      id: r.id,
      type: r.type,
      title: r.title,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
    return NextResponse.json({ reports });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list reports' }, { status: 500 });
  }
} 
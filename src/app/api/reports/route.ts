import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const reportsDir = path.join(process.cwd(), 'reports');

export async function GET(request: NextRequest) {
  try {
    if (!fs.existsSync(reportsDir)) {
      return NextResponse.json({ reports: [] });
    }
    const files = fs.readdirSync(reportsDir).filter(f => f.endsWith('-enriched.md'));
    const reports = files.map(filename => ({
      id: filename.replace('-enriched.md', ''),
      filename,
      title: filename.replace('-enriched.md', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      url: `/api/reports/${filename}`
    }));
    return NextResponse.json({ reports });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list reports' }, { status: 500 });
  }
} 
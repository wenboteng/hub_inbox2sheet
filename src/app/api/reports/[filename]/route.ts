import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const reportsDir = path.join(process.cwd(), 'reports');

export async function GET(request: NextRequest, { params }: { params: { filename: string } }) {
  try {
    const { filename } = params;
    const filePath = path.join(reportsDir, filename);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return NextResponse.json({ content });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { startCrawl } from '@/lib/crawler';

export async function POST(req: NextRequest) {
  try {
    await startCrawl();
    return NextResponse.json({ message: 'Crawl completed successfully!' });
  } catch (error: any) {
    console.error('Crawl failed:', error);
    return NextResponse.json({ error: 'Crawl failed', details: error?.message }, { status: 500 });
  }
} 
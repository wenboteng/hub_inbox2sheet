import { NextRequest, NextResponse } from 'next/server';
import { scrapeUrls } from '@/lib/crawler';

export async function POST(req: NextRequest) {
  try {
    const { urls } = await req.json();

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json(
        { error: 'URLs array is required' },
        { status: 400 }
      );
    }

    // Start scraping in the background
    scrapeUrls(urls).catch(error => {
      console.error('[API] Error during scraping:', error);
    });

    return NextResponse.json({ 
      message: 'Scraping started',
      urlsCount: urls.length 
    });
  } catch (error) {
    console.error('[API] Error in crawl endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
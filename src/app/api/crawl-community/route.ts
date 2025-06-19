import { NextRequest, NextResponse } from 'next/server';
import { scrapeCommunityUrls, getCommunityContentUrls } from '@/lib/communityCrawler';

// Force dynamic rendering for community crawl API
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { urls, useDefaultUrls = true } = await req.json();

    let urlsToScrape: string[] = [];

    if (useDefaultUrls) {
      // Use default community URLs
      urlsToScrape = await getCommunityContentUrls();
    } else if (urls && Array.isArray(urls)) {
      // Use provided URLs
      urlsToScrape = urls;
    } else {
      return NextResponse.json(
        { error: 'Either useDefaultUrls must be true or urls array must be provided' },
        { status: 400 }
      );
    }

    if (urlsToScrape.length === 0) {
      return NextResponse.json(
        { error: 'No URLs to scrape' },
        { status: 400 }
      );
    }

    // Start community scraping in the background
    scrapeCommunityUrls(urlsToScrape).catch(error => {
      console.error('[API] Error during community scraping:', error);
    });

    return NextResponse.json({ 
      message: 'Community scraping started',
      urlsCount: urlsToScrape.length,
      urls: urlsToScrape
    });
  } catch (error) {
    console.error('[API] Error in community crawl endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Return available community URLs for reference
    const defaultUrls = await getCommunityContentUrls();
    
    return NextResponse.json({
      message: 'Community crawler is available',
      defaultUrlsCount: defaultUrls.length,
      defaultUrls: defaultUrls.slice(0, 5), // Show first 5 for reference
      usage: {
        method: 'POST',
        body: {
          useDefaultUrls: 'boolean (optional, default: true)',
          urls: 'string[] (optional, required if useDefaultUrls is false)'
        }
      }
    });
  } catch (error) {
    console.error('[API] Error in community crawl GET endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { scrapeCommunityUrls, verifyCommunityUrls, getCommunityContentUrls } from '@/lib/communityCrawler';

// Force dynamic rendering for community crawl API
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { action, urls } = await request.json();
    
    if (action === 'verify') {
      // Verify URLs before crawling
      const urlsToVerify = urls || await getCommunityContentUrls();
      const verificationResults = await verifyCommunityUrls(urlsToVerify);
      
      return NextResponse.json({
        success: true,
        action: 'verify',
        results: verificationResults,
        summary: {
          total: verificationResults.length,
          accessible: verificationResults.filter(r => r.accessible).length,
          blocked: verificationResults.filter(r => r.error?.includes('Blocked')).length,
          notFound: verificationResults.filter(r => r.error?.includes('Not Found')).length,
        }
      });
    }
    
    if (action === 'crawl') {
      // Perform the actual crawling
      const urlsToCrawl = urls || await getCommunityContentUrls();
      await scrapeCommunityUrls(urlsToCrawl);
      
      return NextResponse.json({
        success: true,
        action: 'crawl',
        message: 'Community crawling completed successfully',
        urlsProcessed: urlsToCrawl.length
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use "verify" or "crawl"'
    }, { status: 400 });
    
  } catch (error) {
    console.error('Community crawling error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process community crawling request'
    }, { status: 500 });
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
          action: 'string (required, must be "verify" or "crawl")',
          urls: 'string[] (optional, required if action is "verify" or "crawl")'
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
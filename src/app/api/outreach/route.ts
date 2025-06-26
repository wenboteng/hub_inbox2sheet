import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getHighPriorityArticles } from '@/crawlers/news-policy';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const priority = searchParams.get('priority') || 'high';
    const limit = parseInt(searchParams.get('limit') || '10');

    let whereClause: any = {
      contentType: 'news',
    };

    // Filter by platform if specified
    if (platform) {
      whereClause.platform = platform;
    }

    // Filter by priority
    if (priority === 'high') {
      whereClause.category = {
        contains: '[HIGH]'
      };
    } else if (priority === 'medium') {
      whereClause.category = {
        contains: '[MEDIUM]'
      };
    }

    const articles = await prisma.article.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      select: {
        id: true,
        url: true,
        question: true,
        answer: true,
        platform: true,
        category: true,
        author: true,
        createdAt: true,
        lastUpdated: true,
      }
    });

    // Format articles for outreach
    const outreachArticles = articles.map(article => {
      const priorityMatch = article.category.match(/\[(HIGH|MEDIUM|LOW)\]/);
      const priority = priorityMatch ? priorityMatch[1].toLowerCase() : 'medium';
      
      const categoryParts = article.category.split(' ');
      const contentType = categoryParts[1] || 'news';
      
      return {
        id: article.id,
        url: article.url,
        title: article.question,
        content: article.answer,
        platform: article.platform,
        contentType,
        priority,
        author: article.author,
        publishedAt: article.createdAt,
        updatedAt: article.lastUpdated,
        summary: article.answer.substring(0, 200) + '...',
        tags: extractTags(article.answer),
      };
    });

    return NextResponse.json({
      success: true,
      articles: outreachArticles,
      total: outreachArticles.length,
      filters: {
        platform,
        priority,
        limit
      }
    });

  } catch (error) {
    console.error('[OUTREACH] Error fetching articles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch outreach articles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, platform, template } = await request.json();

    if (action === 'generate_outreach') {
      // Get high-priority articles for the specified platform
      const articles = await getHighPriorityArticles();
      const platformArticles = platform ? 
        articles.filter(a => a.platform.toLowerCase() === platform.toLowerCase()) :
        articles;

      if (platformArticles.length === 0) {
        return NextResponse.json({
          success: false,
          message: `No high-priority articles found for ${platform || 'any platform'}`
        });
      }

      // Generate outreach content
      const outreachContent = generateOutreachContent(platformArticles, template);

      return NextResponse.json({
        success: true,
        outreachContent,
        articlesUsed: platformArticles.length,
        platform: platform || 'all'
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use "generate_outreach"'
    }, { status: 400 });

  } catch (error) {
    console.error('[OUTREACH] Error generating outreach content:', error);
    return NextResponse.json(
      { error: 'Failed to generate outreach content' },
      { status: 500 }
    );
  }
}

function extractTags(content: string): string[] {
  const tags = [];
  const text = content.toLowerCase();
  
  // Policy-related tags
  if (text.includes('policy') || text.includes('terms')) tags.push('policy');
  if (text.includes('cancellation') || text.includes('refund')) tags.push('cancellation');
  if (text.includes('booking') || text.includes('reservation')) tags.push('booking');
  if (text.includes('pricing') || text.includes('fee')) tags.push('pricing');
  if (text.includes('safety') || text.includes('security')) tags.push('safety');
  if (text.includes('payment') || text.includes('payout')) tags.push('payment');
  if (text.includes('verification') || text.includes('identity')) tags.push('verification');
  if (text.includes('legal') || text.includes('compliance')) tags.push('legal');
  
  return Array.from(new Set(tags)); // Remove duplicates
}

function generateOutreachContent(articles: any[], template?: string): string {
  const highPriorityArticles = articles.filter(a => a.priority === 'high');
  const recentArticles = articles.slice(0, 3); // Top 3 most recent

  let content = '';

  if (template === 'policy_update') {
    content = `🚨 **Important Policy Updates for ${recentArticles[0]?.platform || 'OTA'} Partners**

We've identified several critical policy changes that may impact your business:

${recentArticles.map((article, index) => `
**${index + 1}. ${article.title}**
${article.summary}
*Source: ${article.url}*
`).join('\n')}

**Key Takeaways:**
${extractKeyPoints(recentArticles)}

**Recommended Actions:**
${generateRecommendations(recentArticles)}

Please review these changes and update your processes accordingly. We're here to help if you need assistance implementing any of these updates.

Best regards,
Your OTA Partner Team`;

  } else {
    // Default template
    content = `📢 **Latest Updates from ${recentArticles[0]?.platform || 'OTA'}**

Here are the most recent policy changes and announcements:

${recentArticles.map((article, index) => `
**${index + 1}. ${article.title}**
${article.summary}
*Priority: ${article.priority.toUpperCase()}*
*Source: ${article.url}*
`).join('\n')}

**Summary:**
${extractKeyPoints(recentArticles)}

Stay informed and proactive about these changes to maintain compliance and optimize your operations.

Best regards,
Your Partner Success Team`;
  }

  return content;
}

function extractKeyPoints(articles: any[]): string {
  const points: string[] = [];
  
  articles.forEach(article => {
    const text = article.content.toLowerCase();
    
    if (text.includes('policy change')) points.push('Policy changes require immediate attention');
    if (text.includes('new requirement')) points.push('New requirements may affect compliance');
    if (text.includes('fee change') || text.includes('pricing')) points.push('Pricing updates may impact profitability');
    if (text.includes('safety') || text.includes('security')) points.push('Safety updates enhance guest protection');
    if (text.includes('verification')) points.push('Verification processes may be updated');
  });
  
  return points.length > 0 ? 
    points.map(point => `• ${point}`).join('\n') :
    '• Review all changes for potential impact on your operations';
}

function generateRecommendations(articles: any[]): string {
  const recommendations = [
    '• Review your current policies against the new requirements',
    '• Update your booking and cancellation procedures if needed',
    '• Communicate changes to your team and guests',
    '• Monitor your performance metrics for any impact',
    '• Reach out to support if you need clarification'
  ];
  
  return recommendations.join('\n');
} 
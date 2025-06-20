import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import prisma from '@/lib/prisma';
import { findMatchingFallback } from '@/lib/faqFallbacks';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Article {
  question: string;
  paragraphs: {
    text: string;
  }[];
}

interface ArticleContext {
  title: string;
  content: string;
  platform: string;
}

export async function POST(request: NextRequest) {
  try {
    const { query, availableArticles, platform } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    // Check for FAQ fallback first
    const faqFallback = findMatchingFallback(query, platform);
    
    if (faqFallback) {
      return NextResponse.json({ 
        answer: faqFallback.answer,
        source: faqFallback.source,
        confidence: faqFallback.confidence,
        isFallback: true
      });
    }

    // Get all article titles and snippets for context, filtered by platform if specified
    const whereClause: any = {};
    if (platform && platform !== 'all') {
      whereClause.platform = platform;
    }

    const articles = await prisma.article.findMany({
      where: whereClause,
      select: {
        question: true,
        platform: true,
        paragraphs: {
          select: {
            text: true,
          },
        },
      },
      take: 20, // Limit to prevent token overflow
    }) as (Article & { platform: string })[];

    // If no platform-specific content is available and platform is specified
    if (platform && platform !== 'all' && articles.length === 0) {
      return NextResponse.json({
        answer: `Sorry, we couldn't find an exact answer from ${platform}'s official sources, but we're working to improve coverage. You might want to try searching without platform filtering or check our general knowledge base.`,
        noPlatformContent: true,
        suggestedPlatform: platform
      });
    }

    // Prepare context for GPT
    const context = articles.map((article: Article & { platform: string }): ArticleContext => ({
      title: article.question,
      content: article.paragraphs.map(p => p.text).join(" ").slice(0, 500), // Truncate long paragraphs
      platform: article.platform,
    }));

    // Create platform-aware prompt for GPT
    const platformContext = platform && platform !== 'all' 
      ? `\n\nIMPORTANT: The user is specifically asking about ${platform}. Only provide information from ${platform} sources. If no ${platform}-specific information is available, clearly state this limitation.`
      : '';

    const prompt = `Given the following user query and available articles, provide a helpful response. If the articles don't contain a direct answer, synthesize relevant information and indicate any uncertainties.

User Query: ${query}${platformContext}

Available Articles:
${context.map((a: ArticleContext) => `Platform: ${a.platform}\nTitle: ${a.title}\nContent: ${a.content}\n---`).join("\n")}

Please provide a clear, concise response that:
1. Directly addresses the user's query
2. Cites relevant information from the articles when possible
3. Clearly indicates when information is inferred or uncertain
4. Uses HTML formatting for better readability (e.g., <p>, <ul>, <strong>)
5. Keeps the response under 300 words
6. ${platform && platform !== 'all' ? `Focuses specifically on ${platform} information and clearly states if no ${platform}-specific data is available` : 'Provides general information across platforms'}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that provides accurate information based on available articles. ${platform && platform !== 'all' ? `You are specifically focused on ${platform} information. If no ${platform}-specific information is available, clearly state this limitation.` : 'You provide information across multiple platforms.'} When information is not directly available, you synthesize relevant details and clearly indicate uncertainties.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const answer = completion.choices[0]?.message?.content || "Sorry, I couldn't generate a helpful response.";

    return NextResponse.json({ 
      answer,
      platform,
      hasPlatformSpecificContent: articles.length > 0
    });
  } catch (error) {
    console.error("GPT search error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import prisma from '@/lib/prisma';

// Force dynamic rendering for search summary API
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Intent patterns for different types of queries
const intentPatterns = {
  payout: ['payout', 'payment', 'money', 'funds', 'receive', 'earnings', 'revenue'],
  delay: ['delay', 'hold', 'pending', 'wait', 'processing', 'time'],
  cancel: ['cancel', 'cancellation', 'refund', 'terminate', 'withdraw'],
  booking: ['booking', 'reservation', 'modify', 'change', 'update', 'schedule'],
  support: ['help', 'contact', 'support', 'issue', 'problem', 'trouble'],
  account: ['account', 'profile', 'settings', 'details', 'information'],
  fees: ['fee', 'charge', 'cost', 'commission', 'service charge'],
  reviews: ['review', 'rating', 'feedback', 'comment', 'testimonial']
};

function detectIntent(query: string): string | null {
  const lowerQuery = query.toLowerCase();
  
  for (const [intent, patterns] of Object.entries(intentPatterns)) {
    if (patterns.some(pattern => lowerQuery.includes(pattern))) {
      return intent;
    }
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { query, matchedArticles } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    const intent = detectIntent(query);
    
    // Only generate summary for specific intents
    if (!intent) {
      return NextResponse.json({ summary: null });
    }

    // Get relevant articles for context
    const articles = await prisma.article.findMany({
      where: {
        OR: [
          { question: { contains: intent, mode: 'insensitive' } },
          { category: { contains: intent, mode: 'insensitive' } }
        ]
      },
      select: {
        question: true,
        paragraphs: {
          select: {
            text: true,
          },
        },
      },
      take: 10,
    });

    if (articles.length === 0) {
      return NextResponse.json({ summary: null });
    }

    // Prepare context from matched articles
    const context = articles.map((article: any) => ({
      title: article.question,
      content: article.paragraphs.map((p: any) => p.text).join(" ").slice(0, 300),
    }));

    // Create intent-specific prompts
    const intentPrompts = {
      payout: "Provide a clear, actionable summary about payment and payout processes for tour vendors. Focus on timing, requirements, and common issues.",
      delay: "Summarize information about payment delays, processing times, and what vendors can expect. Include troubleshooting steps if available.",
      cancel: "Provide guidance on cancellation policies, refund processes, and what vendors need to know about cancellations.",
      booking: "Summarize booking management, modification processes, and scheduling information for vendors.",
      support: "Provide information about getting help, contacting support, and resolving common issues.",
      account: "Summarize account management, profile settings, and information updates for vendors.",
      fees: "Provide clear information about fees, charges, commissions, and cost structures for vendors.",
      reviews: "Summarize review processes, rating systems, and feedback management for vendors."
    };

    const prompt = `Based on the user query and available articles, provide a concise, helpful summary.

User Query: ${query}
Detected Intent: ${intent}

Available Articles:
${context.map((a: any) => `Title: ${a.title}\nContent: ${a.content}\n---`).join("\n")}

${intentPrompts[intent as keyof typeof intentPrompts]}

Please provide a summary that:
1. Directly addresses the user's specific question
2. Includes actionable steps or key information
3. Uses clear, professional language
4. Is formatted with HTML for readability (<p>, <ul>, <strong>)
5. Keeps under 200 words
6. Focuses on the most relevant information from the articles`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful support assistant for tour and activity vendors. Provide accurate, actionable information based on available articles."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent summaries
      max_tokens: 300,
    });

    const summary = completion.choices[0]?.message?.content || null;

    return NextResponse.json({ 
      summary,
      intent,
      confidence: "high" // We only generate for detected intents
    });
  } catch (error) {
    console.error("Search summary error:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
} 
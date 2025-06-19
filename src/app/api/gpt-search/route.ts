import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import prisma from '@/lib/prisma';

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
}

export async function POST(request: NextRequest) {
  try {
    const { query, availableArticles } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    // Get all article titles and snippets for context
    const articles = await prisma.article.findMany({
      select: {
        question: true,
        paragraphs: {
          select: {
            text: true,
          },
        },
      },
      take: 20, // Limit to prevent token overflow
    }) as Article[];

    // Prepare context for GPT
    const context = articles.map((article: Article): ArticleContext => ({
      title: article.question,
      content: article.paragraphs.map(p => p.text).join(" ").slice(0, 500), // Truncate long paragraphs
    }));

    // Create prompt for GPT
    const prompt = `Given the following user query and available articles, provide a helpful response. If the articles don't contain a direct answer, synthesize relevant information and indicate any uncertainties.

User Query: ${query}

Available Articles:
${context.map((a: ArticleContext) => `Title: ${a.title}\nContent: ${a.content}\n---`).join("\n")}

Please provide a clear, concise response that:
1. Directly addresses the user's query
2. Cites relevant information from the articles when possible
3. Clearly indicates when information is inferred or uncertain
4. Uses HTML formatting for better readability (e.g., <p>, <ul>, <strong>)
5. Keeps the response under 300 words`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that provides accurate information based on available articles. When information is not directly available, you synthesize relevant details and clearly indicate uncertainties."
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

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("GPT search error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
} 
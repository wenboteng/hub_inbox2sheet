import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { extractRelevantSnippet, rankArticlesByRelevance } from "@/utils/searchHelpers";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const platform = searchParams.get("platform");
    const category = searchParams.get("category");

    // Get matching articles
    const articles = await prisma.article.findMany({
      where: {
        AND: [
          {
            OR: [
              { question: { contains: query, mode: "insensitive" } },
              { answer: { contains: query, mode: "insensitive" } },
            ],
          },
          platform && platform !== "all" ? { platform } : {},
          category && category !== "all" ? { category } : {},
        ],
      },
      orderBy: {
        lastUpdated: "desc",
      },
    });

    // Rank articles and extract snippets
    const rankedArticles = rankArticlesByRelevance(articles, query);
    const results = rankedArticles.map(article => ({
      ...article,
      snippet: extractRelevantSnippet(article.answer, query),
      answer: undefined, // Don't send full answer in initial response
    }));

    return NextResponse.json({ hits: results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
} 
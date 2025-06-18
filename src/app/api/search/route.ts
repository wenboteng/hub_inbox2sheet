import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const platform = searchParams.get("platform");
    const category = searchParams.get("category");

    const articles = await prisma.article.findMany({
      where: {
        AND: [
          {
            OR: [
              { question: { contains: query, mode: "insensitive" } },
              { answer: { contains: query, mode: "insensitive" } },
            ],
          },
          platform ? { platform } : {},
          category ? { category } : {},
        ],
      },
      orderBy: {
        lastUpdated: "desc",
      },
      take: 20,
    });

    return NextResponse.json({ hits: articles });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
} 
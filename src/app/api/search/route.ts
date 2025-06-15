import { NextResponse } from "next/server";
import { MeiliSearch } from "meilisearch";

const meiliSearch = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST || "http://localhost:7700",
  apiKey: process.env.MEILISEARCH_API_KEY,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const platform = searchParams.get("platform");
  const category = searchParams.get("category");

  try {
    const searchResults = await meiliSearch.index("answers").search(query, {
      filter: [
        ...(platform && platform !== "All" ? [`platform = "${platform}"`] : []),
        ...(category && category !== "All" ? [`category = "${category}"`] : []),
      ].join(" AND "),
      limit: 20,
    });

    return NextResponse.json(searchResults);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
} 
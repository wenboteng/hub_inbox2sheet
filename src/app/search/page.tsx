"use client";

import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";

interface Article {
  id: string;
  url: string;
  question: string;
  answer?: string;
  snippet: string;
  category: string;
  platform: string;
  lastUpdated: string;
  relevanceScore: number;
}

interface ExpandedState {
  [key: string]: boolean;
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [results, setResults] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedArticles, setExpandedArticles] = useState<ExpandedState>({});
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);

  useEffect(() => {
    async function performSearch() {
      if (!debouncedSearchQuery) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          q: debouncedSearchQuery,
          ...(selectedPlatform !== "all" && { platform: selectedPlatform }),
        });

        const response = await fetch(`/api/search?${params}`);
        const data = await response.json();
        setResults(data.articles || []);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsLoading(false);
      }
    }

    performSearch();
  }, [debouncedSearchQuery, selectedPlatform]);

  const toggleArticle = async (articleId: string) => {
    if (expandedArticles[articleId]) {
      setExpandedArticles(prev => ({ ...prev, [articleId]: false }));
      return;
    }

    // Fetch full article content
    try {
      const response = await fetch(`/api/articles/${articleId}`);
      const article = await response.json();
      
      // Update the article in results with full content
      setResults(prev => 
        prev.map(a => 
          a.id === articleId 
            ? { ...a, answer: article.answer }
            : a
        )
      );
      
      setExpandedArticles(prev => ({ ...prev, [articleId]: true }));
    } catch (error) {
      console.error("Failed to fetch article:", error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Search Knowledge Base</h1>

      <div className="mb-6 flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="Search for answers..."
          className="px-4 py-2 border rounded-lg flex-grow"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <select
          className="px-4 py-2 border rounded-lg"
          value={selectedPlatform}
          onChange={(e) => setSelectedPlatform(e.target.value)}
        >
          <option value="all">All Platforms</option>
          <option value="Airbnb">Airbnb</option>
          <option value="GetYourGuide">GetYourGuide</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em]" />
          <p className="mt-2 text-sm text-gray-500">Searching...</p>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-6">
          {results.map((article) => (
            <div
              key={article.id}
              className="bg-white p-6 rounded-lg shadow-sm border"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                  {article.platform}
                </span>
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                  {article.category}
                </span>
              </div>
              <h2 className="text-xl font-semibold mb-4">{article.question}</h2>
              <div className="prose max-w-none mb-4">
                {expandedArticles[article.id] ? (
                  <div dangerouslySetInnerHTML={{ __html: article.answer || "" }} />
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: article.snippet }} />
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="space-x-4">
                  <button
                    onClick={() => toggleArticle(article.id)}
                    className="text-blue-500 hover:text-blue-600"
                  >
                    {expandedArticles[article.id] ? "Show Less" : "View Full Article"}
                  </button>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600"
                  >
                    View Source →
                  </a>
                </div>
                <span className="text-gray-500">
                  Last updated: {new Date(article.lastUpdated).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : searchQuery ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No results found</p>
        </div>
      ) : null}
    </div>
  );
} 
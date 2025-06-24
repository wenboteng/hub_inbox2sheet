"use client";

import { useState, useEffect, useRef } from "react";
import { useDebounce } from "use-debounce";
import { generateRelatedSearches } from "@/utils/relatedSearches";

interface Article {
  id: string;
  url: string;
  question: string;
  answer?: string;
  snippets: string[];
  category: string;
  platform: string;
  lastUpdated: string;
  score: number;
  isSemanticMatch: boolean;
  isTopMatch?: boolean;
  contentType?: string;
  source?: string;
  author?: string;
  votes?: number;
  isVerified?: boolean;
}

interface SearchResponse {
  articles: Article[];
  searchType: 'semantic' | 'combined' | 'none';
  totalResults: number;
  hasMore: boolean;
  platformMismatch?: boolean;
  platformWarning?: string;
  contentTypes?: string[];
  gptFallbackAnswer?: string;
  faqFallback?: {
    id: string;
    platform: string;
    category: string;
    question: string;
    answer: string;
    confidence: 'high' | 'medium' | 'low';
    source?: string;
    lastUpdated: string;
  };
  noPlatformMatch?: boolean;
}

interface SearchSummary {
  summary: string | null;
  intent: string | null;
  confidence: string;
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [selectedContentType, setSelectedContentType] = useState("all");
  const [results, setResults] = useState<Article[]>([]);
  const [searchType, setSearchType] = useState<'semantic' | 'combined' | 'none'>('semantic');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedArticles, setExpandedArticles] = useState<Record<string, boolean>>({});
  const [gptFallbackAnswer, setGptFallbackAnswer] = useState<string | null>(null);
  const [searchSummary, setSearchSummary] = useState<SearchSummary | null>(null);
  const [answerSummary, setAnswerSummary] = useState<string | null>(null);
  const [gptResponseLayerAnswer, setGptResponseLayerAnswer] = useState<string | null>(null);
  const [showAllResults, setShowAllResults] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [platformMismatch, setPlatformMismatch] = useState(false);
  const [platformWarning, setPlatformWarning] = useState<string | null>(null);
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [relatedSearches, setRelatedSearches] = useState<string[]>([]);
  const [faqFallback, setFaqFallback] = useState<SearchResponse['faqFallback']>(undefined);
  const [noPlatformMatch, setNoPlatformMatch] = useState(false);
  const [debouncedSearchQuery] = useDebounce(searchQuery, 600);
  const inputRef = useRef<HTMLInputElement>(null);

  // Add explicit search trigger
  const [manualSearch, setManualSearch] = useState(false);

  // Move performSearch to top-level function
  async function performSearch() {
    if (!debouncedSearchQuery) {
      setResults([]);
      setGptFallbackAnswer(null);
      setSearchSummary(null);
      setAnswerSummary(null);
      setGptResponseLayerAnswer(null);
      setRelatedSearches([]);
      setPlatformMismatch(false);
      setPlatformWarning(null);
      setContentTypes([]);
      setFaqFallback(undefined);
      setNoPlatformMatch(false);
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        q: debouncedSearchQuery,
        ...(selectedPlatform !== "all" && { platform: selectedPlatform }),
        ...(selectedContentType !== "all" && { contentType: selectedContentType }),
        showAll: showAllResults.toString(),
      });

      const response = await fetch(`/api/search?${params}`);
      const data: SearchResponse = await response.json();
      
      setResults(data.articles || []);
      setSearchType(data.searchType);
      setTotalResults(data.totalResults);
      setHasMore(data.hasMore);
      setPlatformMismatch(data.platformMismatch || false);
      setPlatformWarning(data.platformWarning || null);
      setContentTypes(data.contentTypes || []);
      setFaqFallback(data.faqFallback || undefined);
      setNoPlatformMatch(data.noPlatformMatch || false);
      
      // Generate related searches
      setRelatedSearches(generateRelatedSearches(debouncedSearchQuery));
      
      // Try to get GPT summary for intent-based queries
      if (data.articles.length > 0) {
        try {
          const summaryResponse = await fetch('/api/search-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              query: debouncedSearchQuery,
              matchedArticles: data.articles 
            })
          });
          const summaryData = await summaryResponse.json();
          setSearchSummary(summaryData);
        } catch (error) {
          console.error("Failed to get search summary:", error);
        }

        // Generate answer summary for top result
        const topResult = data.articles.find(article => article.isTopMatch);
        if (topResult) {
          try {
            const answerResponse = await fetch('/api/answer-summary', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                query: debouncedSearchQuery,
                topResult 
              })
            });
            const answerData = await answerResponse.json();
            setAnswerSummary(answerData.summary);
          } catch (error) {
            console.error("Failed to get answer summary:", error);
          }

          // Generate GPT Response Layer answer
          try {
            const gptResponse = await fetch('/api/gpt-response-layer', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                query: debouncedSearchQuery,
                topResult 
              })
            });
            const gptData = await gptResponse.json();
            setGptResponseLayerAnswer(gptData.aiAnswer);
          } catch (error) {
            console.error("Failed to get GPT response layer answer:", error);
          }
        }
      }
      
      // If no good matches found, try GPT fallback
      if (data.searchType === 'none' || (data.articles.length === 0 && debouncedSearchQuery.length > 0)) {
        const gptResponse = await fetch('/api/gpt-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query: debouncedSearchQuery,
            availableArticles: data.articles,
            platform: selectedPlatform !== 'all' ? selectedPlatform : undefined
          })
        });
        const gptData = await gptResponse.json();
        setGptFallbackAnswer(gptData.answer);
      } else {
        setGptFallbackAnswer(null);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    performSearch();
  }, [debouncedSearchQuery, selectedPlatform, selectedContentType, showAllResults]);

  useEffect(() => {
    if (manualSearch) {
      performSearch();
      setManualSearch(false);
    }
    // eslint-disable-next-line
  }, [manualSearch]);

  const toggleArticle = async (articleId: string) => {
    if (expandedArticles[articleId]) {
      setExpandedArticles(prev => ({ ...prev, [articleId]: false }));
      return;
    }

    try {
      const response = await fetch(`/api/articles/${articleId}`);
      const article = await response.json();
      
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

  const handleRelatedSearch = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowAllResults(false);
  };

  // Helper function to format date safely
  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'Invalid Date') return null;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      return date.toLocaleDateString();
    } catch {
      return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col items-center">
      <h1 className="text-4xl font-bold mb-10 text-center">Search Knowledge Base</h1>
      <form
        className="w-full flex flex-col items-center"
        onSubmit={e => {
          e.preventDefault();
          setManualSearch(true);
        }}
      >
        <div className="w-full flex flex-col items-center mb-8">
          <div className="flex flex-col md:flex-row items-center w-full max-w-2xl gap-4">
            <input
              ref={inputRef}
              type="text"
              placeholder="E.g. 'How to update a tour on Viator'"
              className="w-full md:w-[600px] px-8 py-5 border border-gray-300 rounded-full text-2xl shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              className="mt-4 md:mt-0 px-8 py-4 bg-blue-600 text-white text-xl rounded-full shadow hover:bg-blue-700 transition-all"
            >
              Search
            </button>
          </div>
          <div className="flex gap-4 mt-6 w-full max-w-2xl">
            <select
              className="flex-1 px-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg transition-colors duration-200"
              value={selectedPlatform}
              onChange={e => setSelectedPlatform(e.target.value)}
            >
              <option value="all">All Platforms</option>
              <option value="Airbnb">Airbnb</option>
              <option value="GetYourGuide">GetYourGuide</option>
            </select>
            <select
              className="flex-1 px-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg transition-colors duration-200"
              value={selectedContentType}
              onChange={e => setSelectedContentType(e.target.value)}
            >
              <option value="all">All Content Types</option>
              <option value="official">Official Help Center</option>
              <option value="community">Community Content</option>
            </select>
          </div>
        </div>
      </form>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em]" />
          <p className="mt-2 text-sm text-gray-500">Searching...</p>
        </div>
      ) : searchQuery && (results.length > 0 || gptFallbackAnswer || searchSummary?.summary || faqFallback) ? (
        <div className="space-y-6">
          {/* Platform Mismatch Warning */}
          {platformMismatch && platformWarning && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2">
                <span className="text-yellow-800">⚠️</span>
                <p className="text-yellow-800 text-sm">{platformWarning}</p>
              </div>
            </div>
          )}

          {/* FAQ Fallback Answer - Show prominently for platform-specific queries */}
          {faqFallback && (
            <div className="bg-emerald-50 p-6 rounded-lg shadow-sm border border-emerald-100">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 text-sm font-medium bg-emerald-100 text-emerald-800 rounded-full">
                  {faqFallback.confidence === 'high' ? '✓ Verified Answer' : 'Quick Answer'}
                </span>
                <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
                  {faqFallback.platform}
                </span>
                <span className="px-3 py-1 text-sm font-medium bg-gray-100 text-gray-800 rounded-full">
                  {faqFallback.category}
                </span>
                <span className="text-sm text-gray-500 capitalize">
                  {faqFallback.confidence} confidence
                </span>
              </div>
              <h3 className="text-lg font-semibold mb-3 text-emerald-900">{faqFallback.question}</h3>
              <div className="prose max-w-none mb-4">
                <p className="text-emerald-800">{faqFallback.answer}</p>
              </div>
              {faqFallback.source && (
                <div className="flex items-center justify-between text-sm">
                  <a
                    href={faqFallback.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:text-emerald-800"
                  >
                    View Official Source →
                  </a>
                  <span className="text-gray-500">
                    Last updated: {new Date(faqFallback.lastUpdated).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* No Platform Match Warning */}
          {noPlatformMatch && (
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2">
                <span className="text-orange-800">ℹ️</span>
                <p className="text-orange-800 text-sm">
                  We found a curated answer for your query, but no specific content from {selectedPlatform} in our search results. 
                  The answer above is based on official {selectedPlatform} documentation.
                </p>
              </div>
            </div>
          )}

          {/* GPT-Powered Summary */}
          {searchSummary?.summary && (
            <div className="bg-green-50 p-6 rounded-lg shadow-sm border border-green-100">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full">
                  Quick Answer
                </span>
                <span className="text-sm text-gray-500 capitalize">
                  {searchSummary.intent} • {searchSummary.confidence} confidence
                </span>
              </div>
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: searchSummary.summary }} />
            </div>
          )}

          {/* GPT-Powered Answer Summary */}
          {answerSummary && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <span className="text-blue-600 text-lg">💡</span>
                <p className="text-blue-900">{answerSummary}</p>
              </div>
            </div>
          )}

          {/* GPT Response Layer Answer */}
          {gptResponseLayerAnswer && (
            <div className="bg-indigo-50 p-6 rounded-lg shadow-sm border border-indigo-100">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 text-sm font-medium bg-indigo-100 text-indigo-800 rounded-full">
                  AI Answer
                </span>
              </div>
              <div className="prose max-w-none">
                <p className="text-indigo-900">{gptResponseLayerAnswer}</p>
              </div>
              <p className="mt-4 text-sm text-indigo-700">
                💡 This answer is based on the official documentation shown in the search results below.
              </p>
            </div>
          )}

          {/* GPT Fallback Answer Box */}
          {gptFallbackAnswer && (
            <div className="bg-blue-50 p-6 rounded-lg shadow-sm border border-blue-100">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
                  AI-Generated Response
                </span>
              </div>
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: gptFallbackAnswer }} />
              <p className="mt-4 text-sm text-gray-500">
                This is a best-effort summary based on available articles. Please verify any critical information.
              </p>
            </div>
          )}

          {/* Search Results */}
          {results.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Search Results ({totalResults} found)
                </h2>
                {hasMore && (
                  <button
                    onClick={() => setShowAllResults(!showAllResults)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    {showAllResults ? "Show Less" : "Show More Results"}
                  </button>
                )}
              </div>
              
              <div className="space-y-4">
                {results.map((article) => (
                  <div
                    key={article.id}
                    className={`bg-white p-6 rounded-lg shadow-sm border ${
                      article.isTopMatch ? 'ring-2 ring-blue-200' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {article.isTopMatch && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          Top Match
                        </span>
                      )}
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {article.platform}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                        {article.category}
                      </span>
                      {!article.isSemanticMatch && (
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                          Keyword Match
                        </span>
                      )}
                      {article.contentType === 'community' && (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                          Community
                        </span>
                      )}
                      {article.isVerified && (
                        <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                          ✓ Verified
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        Score: {(article.score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold mb-3">{article.question}</h3>
                    
                    {/* Community content metadata */}
                    {article.contentType === 'community' && (
                      <div className="mb-3 text-sm text-gray-600">
                        {article.author && (
                          <span className="mr-3">By {article.author}</span>
                        )}
                        {article.votes && article.votes > 0 && (
                          <span className="mr-3">👍 {article.votes} votes</span>
                        )}
                        {article.source && (
                          <span className="capitalize">{article.source}</span>
                        )}
                      </div>
                    )}
                    
                    <div className="prose max-w-none mb-4">
                      {expandedArticles[article.id] ? (
                        <div dangerouslySetInnerHTML={{ __html: article.answer || "" }} />
                      ) : (
                        article.snippets.map((snippet, idx) => (
                          <div 
                            key={idx} 
                            className="mb-2 last:mb-0 text-gray-700"
                            dangerouslySetInnerHTML={{ __html: snippet }}
                          />
                        ))
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
                      {formatDate(article.lastUpdated) && (
                        <span className="text-gray-500">
                          Last updated: {formatDate(article.lastUpdated)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Related Searches */}
          {relatedSearches.length > 0 && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Related Searches</h3>
              <div className="flex flex-wrap gap-2">
                {relatedSearches.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleRelatedSearch(suggestion)}
                    className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : searchQuery ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No results found</p>
        </div>
      ) : null}
    </div>
  );
} 
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

  // Handle URL parameters on page load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const queryParam = urlParams.get('q');
      if (queryParam) {
        setSearchQuery(queryParam);
        setManualSearch(true);
      }
    }
  }, []);

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

  const getPlatformColor = (platform: string) => {
    const colors: { [key: string]: string } = {
      'Airbnb': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      'Viator': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'GetYourGuide': 'bg-green-500/20 text-green-400 border-green-500/30',
      'TripAdvisor': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'Booking.com': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'Reddit': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'StackOverflow': 'bg-red-500/20 text-red-400 border-red-500/30',
      'google': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      'Other': 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };
    return colors[platform] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent mb-6">
            Search Intelligence
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-12">
            Find solutions to your tour business challenges from our comprehensive knowledge base
          </p>
          
          {/* Search Form */}
          <form
            className="w-full max-w-4xl mx-auto"
            onSubmit={e => {
              e.preventDefault();
              setManualSearch(true);
            }}
          >
            <div className="flex flex-col lg:flex-row items-center gap-4 mb-8">
              <div className="relative flex-1 w-full">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="E.g. 'How to update a tour on Viator'"
                  className="w-full px-8 py-5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-xl text-white placeholder-gray-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all outline-none"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <button
                type="submit"
                className="px-8 py-5 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white text-xl font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                Search
              </button>
            </div>
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
              <select
                className="flex-1 px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-400 transition-all outline-none"
                value={selectedPlatform}
                onChange={e => setSelectedPlatform(e.target.value)}
              >
                <option value="all" className="bg-gray-800">All Platforms</option>
                <option value="Airbnb" className="bg-gray-800">Airbnb</option>
                <option value="GetYourGuide" className="bg-gray-800">GetYourGuide</option>
                <option value="Viator" className="bg-gray-800">Viator</option>
                <option value="TripAdvisor" className="bg-gray-800">TripAdvisor</option>
                <option value="Booking.com" className="bg-gray-800">Booking.com</option>
              </select>
              <select
                className="flex-1 px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-400 transition-all outline-none"
                value={selectedContentType}
                onChange={e => setSelectedContentType(e.target.value)}
              >
                <option value="all" className="bg-gray-800">All Content Types</option>
                <option value="official" className="bg-gray-800">Official Help Center</option>
                <option value="community" className="bg-gray-800">Community Content</option>
                <option value="faq" className="bg-gray-800">FAQ Solutions</option>
              </select>
            </div>
          </form>
        </div>
      </section>

      {/* Results Section */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="text-center py-20">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-emerald-400 border-r-transparent align-[-0.125em]" />
              <p className="mt-4 text-lg text-gray-300">Searching our intelligence database...</p>
            </div>
          ) : searchQuery && (results.length > 0 || gptFallbackAnswer || searchSummary?.summary || faqFallback) ? (
            <div className="space-y-8">
              {/* Platform Mismatch Warning */}
              {platformMismatch && platformWarning && (
                <div className="bg-yellow-500/10 backdrop-blur-sm border border-yellow-500/30 rounded-xl p-6">
                  <div className="flex items-center gap-3">
                    <span className="text-yellow-400 text-xl">⚠️</span>
                    <p className="text-yellow-200 text-sm">{platformWarning}</p>
                  </div>
                </div>
              )}

              {/* FAQ Fallback Answer */}
              {faqFallback && (
                <div className="bg-emerald-500/10 backdrop-blur-sm border border-emerald-500/30 rounded-xl p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <span className={`px-4 py-2 text-sm font-medium rounded-full border ${getPlatformColor(faqFallback.platform)}`}>
                      {faqFallback.platform}
                    </span>
                    <span className="px-4 py-2 text-sm font-medium bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                      {faqFallback.confidence === 'high' ? '✓ Verified Answer' : 'Quick Answer'}
                    </span>
                    <span className="px-4 py-2 text-sm font-medium bg-gray-500/20 text-gray-400 rounded-full border border-gray-500/30">
                      {faqFallback.category}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">{faqFallback.question}</h3>
                  <div className="prose prose-invert max-w-none mb-6">
                    <p className="text-gray-300 leading-relaxed">{faqFallback.answer}</p>
                  </div>
                  {faqFallback.source && (
                    <div className="flex items-center justify-between">
                      <a
                        href={faqFallback.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        View Official Source →
                      </a>
                      <span className="text-gray-400 text-sm">
                        Last updated: {new Date(faqFallback.lastUpdated).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* No Platform Match Warning */}
              {noPlatformMatch && (
                <div className="bg-orange-500/10 backdrop-blur-sm border border-orange-500/30 rounded-xl p-6">
                  <div className="flex items-center gap-3">
                    <span className="text-orange-400 text-xl">ℹ️</span>
                    <p className="text-orange-200 text-sm">
                      We found a curated answer for your query, but no specific content from {selectedPlatform} in our search results. 
                      The answer above is based on official {selectedPlatform} documentation.
                    </p>
                  </div>
                </div>
              )}

              {/* GPT-Powered Summary */}
              {searchSummary?.summary && (
                <div className="bg-green-500/10 backdrop-blur-sm border border-green-500/30 rounded-xl p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="px-4 py-2 text-sm font-medium bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                      Quick Answer
                    </span>
                    <span className="text-sm text-gray-400 capitalize">
                      {searchSummary.intent} • {searchSummary.confidence} confidence
                    </span>
                  </div>
                  <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: searchSummary.summary }} />
                  <p className="mt-6 text-sm text-green-300">
                    💡 This summary is based on your search intent and relevant articles from our knowledge base.
                  </p>
                </div>
              )}

              {/* GPT-Powered Answer Summary */}
              {answerSummary && (
                <div className="bg-blue-500/10 backdrop-blur-sm border border-blue-500/30 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <span className="text-blue-400 text-2xl">💡</span>
                    <div className="flex-1">
                      <p className="text-white mb-3 text-lg">{answerSummary}</p>
                      <p className="text-sm text-blue-300">
                        This is a direct answer to your question based on the most relevant search result.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* GPT Response Layer Answer */}
              {gptResponseLayerAnswer && (
                <div className="bg-indigo-500/10 backdrop-blur-sm border border-indigo-500/30 rounded-xl p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="px-4 py-2 text-sm font-medium bg-indigo-500/20 text-indigo-400 rounded-full border border-indigo-500/30">
                      AI Answer
                    </span>
                  </div>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-white text-lg leading-relaxed">{gptResponseLayerAnswer}</p>
                  </div>
                  <p className="mt-6 text-sm text-indigo-300">
                    💡 This answer is based on the official documentation and verified sources shown in the search results below.
                  </p>
                </div>
              )}

              {/* GPT Fallback Answer Box */}
              {gptFallbackAnswer && (
                <div className="bg-blue-500/10 backdrop-blur-sm border border-blue-500/30 rounded-xl p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="px-4 py-2 text-sm font-medium bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">
                      AI-Generated Response
                    </span>
                  </div>
                  <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: gptFallbackAnswer }} />
                  <p className="mt-6 text-sm text-gray-400">
                    This is a helpful summary based on our help center. Please verify any critical information with the official platform.
                  </p>
                </div>
              )}

              {/* Search Results */}
              {results.length > 0 && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">
                      Search Results ({totalResults} found)
                    </h2>
                    {hasMore && (
                      <button
                        onClick={() => setShowAllResults(!showAllResults)}
                        className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors"
                      >
                        {showAllResults ? "Show Less" : "Show More Results"}
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-6">
                    {results.map((article) => (
                      <div
                        key={article.id}
                        className={`bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-8 hover:bg-white/10 transition-all ${
                          article.isTopMatch ? 'ring-2 ring-emerald-400/50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          {article.isTopMatch && (
                            <span className="px-3 py-1 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                              Top Match
                            </span>
                          )}
                          <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getPlatformColor(article.platform)}`}>
                            {article.platform}
                          </span>
                          <span className="px-3 py-1 text-xs font-medium bg-gray-500/20 text-gray-400 rounded-full border border-gray-500/30">
                            {article.category}
                          </span>
                          {!article.isSemanticMatch && (
                            <span className="px-3 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/30">
                              Keyword Match
                            </span>
                          )}
                          {article.contentType === 'community' && (
                            <span className="px-3 py-1 text-xs font-medium bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                              Community
                            </span>
                          )}
                          {article.isVerified && (
                            <span className="px-3 py-1 text-xs font-medium bg-purple-500/20 text-purple-400 rounded-full border border-purple-500/30">
                              ✓ Verified
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            Score: {(article.score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-4">{article.question}</h3>
                        
                        {/* Community content metadata */}
                        {article.contentType === 'community' && (
                          <div className="mb-4 text-sm text-gray-400">
                            {article.author && (
                              <span className="mr-4">By {article.author}</span>
                            )}
                            {article.votes && article.votes > 0 && (
                              <span className="mr-4">👍 {article.votes} votes</span>
                            )}
                            {article.source && (
                              <span className="capitalize">{article.source}</span>
                            )}
                          </div>
                        )}
                        
                        <div className="prose prose-invert max-w-none mb-6">
                          {expandedArticles[article.id] ? (
                            <div className="text-gray-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: article.answer || "" }} />
                          ) : (
                            article.snippets.map((snippet, idx) => (
                              <div 
                                key={idx} 
                                className="mb-3 last:mb-0 text-gray-300 leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: snippet }}
                              />
                            ))
                          )}
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-white/10">
                          <div className="flex items-center gap-6">
                            <button
                              onClick={() => toggleArticle(article.id)}
                              className="text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                            >
                              {expandedArticles[article.id] ? "Show Less" : "View Full Article"}
                            </button>
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                            >
                              View Source →
                            </a>
                          </div>
                          {formatDate(article.lastUpdated) && (
                            <span className="text-gray-400 text-sm">
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
                <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-8">
                  <h3 className="text-xl font-bold text-white mb-6">Related Searches</h3>
                  <div className="flex flex-wrap gap-3">
                    {relatedSearches.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleRelatedSearch(suggestion)}
                        className="px-4 py-2 text-sm bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 hover:border-white/30 transition-all text-white"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : searchQuery ? (
            <div className="text-center py-20">
              <div className="text-gray-400 text-6xl mb-4">🔍</div>
              <p className="text-xl text-gray-300 mb-2">No results found</p>
              <p className="text-gray-400">Try adjusting your search terms or filters</p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
} 
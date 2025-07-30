'use client';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  platform: string;
  category: string;
  votes: number;
  isVerified: boolean;
  createdAt: string;
}

interface SearchResultsProps {
  results: FAQItem[];
  isSearching: boolean;
  query: string;
}

export function SearchResults({ results, isSearching, query }: SearchResultsProps) {
  if (isSearching) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
          <span className="ml-3 text-gray-300">Searching for "{query}"...</span>
        </div>
      </div>
    );
  }

  if (results.length === 0 && query.trim()) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No results found</h3>
        <p className="text-gray-400">Try different keywords or check our FAQ page for similar topics.</p>
        <a 
          href="/faq" 
          className="inline-flex items-center mt-4 px-4 py-2 text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Browse all solutions
          <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">
          Found {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
        </h3>
      </div>

      <div className="space-y-4">
        {results.map((result) => (
          <div 
            key={result.id} 
            className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                  {result.platform}
                </span>
                {result.isVerified && (
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                    Verified
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <span>{result.votes} votes</span>
              </div>
            </div>

            <h4 className="text-white font-medium mb-2 line-clamp-2">
              {result.question}
            </h4>

            <p className="text-gray-300 text-sm line-clamp-3 mb-3">
              {result.answer}
            </p>

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {result.category}
              </span>
              <a 
                href={`/faq/${result.id}`}
                className="text-emerald-400 hover:text-emerald-300 text-sm transition-colors"
              >
                Read more →
              </a>
            </div>
          </div>
        ))}
      </div>

      {results.length > 0 && (
        <div className="mt-6 text-center">
          <a 
            href={`/search?q=${encodeURIComponent(query)}`}
            className="inline-flex items-center px-4 py-2 text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            View all results for "{query}"
            <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
} 
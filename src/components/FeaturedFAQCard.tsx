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

interface FeaturedFAQCardProps {
  faq: FAQItem;
}

export function FeaturedFAQCard({ faq }: FeaturedFAQCardProps) {
  const getPlatformColor = (platform: string) => {
    const colors: { [key: string]: string } = {
      'Airbnb': 'bg-pink-500/20 text-pink-400',
      'Viator': 'bg-blue-500/20 text-blue-400',
      'GetYourGuide': 'bg-green-500/20 text-green-400',
      'TripAdvisor': 'bg-yellow-500/20 text-yellow-400',
      'Booking.com': 'bg-purple-500/20 text-purple-400',
      'Reddit': 'bg-orange-500/20 text-orange-400',
      'StackOverflow': 'bg-red-500/20 text-red-400'
    };
    return colors[platform] || 'bg-gray-500/20 text-gray-400';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/10 transition-all duration-300 hover:scale-105">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPlatformColor(faq.platform)}`}>
            {faq.platform}
          </span>
          {faq.isVerified && (
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
              ✓ Verified
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
          </svg>
          <span>{faq.votes}</span>
        </div>
      </div>

      {/* Question */}
      <h3 className="text-white font-semibold text-lg mb-3 line-clamp-2">
        {faq.question}
      </h3>

      {/* Answer Preview */}
      <p className="text-gray-300 text-sm mb-4 line-clamp-3">
        {faq.answer}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 text-xs text-gray-400">
          <span className="px-2 py-1 bg-gray-500/20 rounded-full">
            {faq.category}
          </span>
          <span>{formatDate(faq.createdAt)}</span>
        </div>
        
        <a 
          href={`/faq/${faq.id}`}
          className="inline-flex items-center text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors"
        >
          Read more
          <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      {/* Quality Indicator */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Quality Score</span>
          <div className="flex items-center space-x-1">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className={`w-3 h-3 ${i < Math.min(Math.floor(faq.votes / 2), 5) ? 'text-yellow-400' : 'text-gray-600'}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 
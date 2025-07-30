import { notFound } from 'next/navigation';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PageProps {
  params: {
    id: string;
  };
}

export default async function FAQDetailPage({ params }: PageProps) {
  const { id } = params;

  try {
    // Fetch the FAQ article by ID
    const article = await prisma.article.findUnique({
      where: { id },
      select: {
        id: true,
        question: true,
        answer: true,
        platform: true,
        category: true,
        votes: true,
        isVerified: true,
        createdAt: true,
        contentType: true,
        source: true,
        url: true,
        crawlStatus: true
      }
    });

    if (!article) {
      notFound();
    }

    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const getPlatformColor = (platform: string) => {
      const colors: { [key: string]: string } = {
        'Airbnb': 'bg-pink-500/20 text-pink-400',
        'Viator': 'bg-blue-500/20 text-blue-400',
        'GetYourGuide': 'bg-green-500/20 text-green-400',
        'TripAdvisor': 'bg-yellow-500/20 text-yellow-400',
        'Booking.com': 'bg-purple-500/20 text-purple-400',
        'Reddit': 'bg-orange-500/20 text-orange-400',
        'StackOverflow': 'bg-red-500/20 text-red-400',
        'google': 'bg-gray-500/20 text-gray-400',
        'Other': 'bg-gray-500/20 text-gray-400'
      };
      return colors[platform] || 'bg-gray-500/20 text-gray-400';
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <nav className="mb-8">
            <a 
              href="/faq" 
              className="text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              ← Back to All Solutions
            </a>
          </nav>

          {/* Article Header */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-8 mb-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPlatformColor(article.platform)}`}>
                  {article.platform}
                </span>
                {article.isVerified && (
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                    ✓ Verified
                  </span>
                )}
                <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded-full">
                  {article.category}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                </svg>
                <span>{article.votes} votes</span>
              </div>
            </div>

            <h1 className="text-3xl font-bold text-white mb-4">
              {article.question}
            </h1>

            <div className="flex items-center space-x-4 text-sm text-gray-400 mb-6">
              <span>Published {formatDate(article.createdAt)}</span>
              <span>•</span>
              <span>{article.contentType}</span>
              {article.source && (
                <>
                  <span>•</span>
                  <span>Source: {article.source}</span>
                </>
              )}
            </div>
          </div>

          {/* Article Content */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-8 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Solution</h2>
            <div className="prose prose-invert max-w-none">
              <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                {article.answer}
              </div>
            </div>
          </div>

          {/* Quality Indicator */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Content Quality</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-gray-400">Quality Score</span>
                <div className="flex items-center space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-5 h-5 ${i < Math.min(Math.floor(article.votes / 2), 5) ? 'text-yellow-400' : 'text-gray-600'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-emerald-400">{article.votes}</div>
                <div className="text-sm text-gray-400">Community Votes</div>
              </div>
            </div>
          </div>

          {/* Source Link */}
          {article.url && (
            <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Source</h3>
              <a 
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                View Original Source
                <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error fetching FAQ article:', error);
    notFound();
  } finally {
    await prisma.$disconnect();
  }
} 
'use client';

interface InsightReport {
  id: string;
  title: string;
  description: string;
  platform: string;
  data: {
    totalQuestions: number;
    topCategory: string;
    avgEngagement: number;
    trend: 'up' | 'down' | 'stable';
  };
  isPremium: boolean;
  slug?: string;
}

interface InsightReportCardProps {
  insight: InsightReport;
}

export function InsightReportCard({ insight }: InsightReportCardProps) {
  const getPlatformColor = (platform: string) => {
    const colors: { [key: string]: string } = {
      'Airbnb': 'bg-pink-500/20 text-pink-400',
      'Viator': 'bg-blue-500/20 text-blue-400',
      'GetYourGuide': 'bg-green-500/20 text-green-400',
      'TripAdvisor': 'bg-yellow-500/20 text-yellow-400',
      'Booking.com': 'bg-purple-500/20 text-purple-400',
      'All Platforms': 'bg-emerald-500/20 text-emerald-400'
    };
    return colors[platform] || 'bg-gray-500/20 text-gray-400';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return (
          <div className="flex items-center text-green-400">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium">Trending Up</span>
          </div>
        );
      case 'down':
        return (
          <div className="flex items-center text-red-400">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium">Declining</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center text-gray-400">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium">Stable</span>
          </div>
        );
    }
  };

  // Use the slug for the link, fallback to id
  const reportLink = insight.slug || insight.id;

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/10 transition-all duration-300 hover:scale-105 relative">
      {/* Premium Badge */}
      {insight.isPremium && (
        <div className="absolute top-4 right-4">
          <span className="px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-bold rounded-full">
            PREMIUM
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPlatformColor(insight.platform)}`}>
            {insight.platform}
          </span>
        </div>
        {getTrendIcon(insight.data.trend)}
      </div>

      {/* Title */}
      <h3 className="text-white font-semibold text-lg mb-3 line-clamp-2">
        {insight.title}
      </h3>

      {/* Description */}
      <p className="text-gray-300 text-sm mb-6 line-clamp-2">
        {insight.description}
      </p>

      {/* Data Preview - Adjusted for report content */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-400">
            {insight.data.totalQuestions.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400">Data Points</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">
            {insight.data.avgEngagement}
          </div>
          <div className="text-xs text-gray-400">Key Insights</div>
        </div>
      </div>

      {/* Top Category */}
      <div className="mb-6">
        <div className="text-xs text-gray-400 mb-2">Focus Area</div>
        <div className="px-3 py-2 bg-white/10 rounded-lg">
          <span className="text-white text-sm font-medium">
            {insight.data.topCategory}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <div className="text-xs text-gray-400">
          {insight.isPremium ? 'Premium Report' : 'Free Report'}
        </div>
        
        <a 
          href={`/reports/${reportLink}`}
          className={`inline-flex items-center text-sm font-medium transition-colors ${
            insight.isPremium 
              ? 'text-yellow-400 hover:text-yellow-300' 
              : 'text-emerald-400 hover:text-emerald-300'
          }`}
        >
          {insight.isPremium ? 'View Premium Report' : 'Read Report'}
          <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      {/* Data Visualization Preview */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
          <span>Report Highlights</span>
          <span>Latest Data</span>
        </div>
        <div className="flex items-end space-x-1 h-8">
          {[...Array(7)].map((_, i) => {
            const height = Math.random() * 0.8 + 0.2; // Random height for demo
            return (
              <div
                key={i}
                className="bg-emerald-400/60 rounded-t"
                style={{ height: `${height * 100}%` }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
} 
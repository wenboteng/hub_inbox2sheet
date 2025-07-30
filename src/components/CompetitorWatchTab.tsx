'use client';

import { useState, useEffect } from 'react';

interface CompetitorAnalysis {
  city: string;
  activityType: string;
  providerName: string;
  userActivities: number;
  competitors: number;
  metrics: {
    totalCompetitors: number;
    userActivities: number;
    priceAnalysis: {
      userAveragePrice: number;
      marketAveragePrice: number;
      pricePositioning: 'premium' | 'competitive' | 'budget';
      priceGap: number;
    };
    ratingAnalysis: {
      userAverageRating: number;
      marketAverageRating: number;
      ratingPositioning: 'high' | 'average' | 'low';
      ratingGap: number;
    };
    marketShare: number;
    opportunities: string[];
    threats: string[];
  };
  topCompetitors: Array<{
    providerName: string;
    activityName: string;
    price: number | null;
    rating: number | null;
    reviews: number | null;
    platform: string;
  }>;
}

interface CompetitorWatchTabProps {
  dashboardData: any;
}

export default function CompetitorWatchTab({ dashboardData }: CompetitorWatchTabProps) {
  const [competitorData, setCompetitorData] = useState<CompetitorAnalysis[]>([]);
  const [overallSummary, setOverallSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompetitorData();
  }, []);

  const fetchCompetitorData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/competitor-analysis?userId=demo-user');
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setCompetitorData(data.competitorAnalysis || []);
        setOverallSummary(data.overallSummary || null);
      }
    } catch (err) {
      setError('Failed to load competitor data');
      console.error('Error fetching competitor data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPositioningColor = (positioning: string) => {
    switch (positioning) {
      case 'premium':
      case 'high':
        return 'text-emerald-400';
      case 'competitive':
      case 'average':
        return 'text-yellow-400';
      case 'budget':
      case 'low':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getPositioningIcon = (positioning: string) => {
    switch (positioning) {
      case 'premium':
      case 'high':
        return '📈';
      case 'competitive':
      case 'average':
        return '➡️';
      case 'budget':
      case 'low':
        return '📉';
      default:
        return '❓';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 text-center py-12">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Analyzing competitors...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 text-center py-12">
          <p className="text-red-400 mb-4">Error: {error}</p>
          <button
            onClick={fetchCompetitorData}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
          >
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  if (competitorData.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 text-center py-12">
          <h3 className="text-lg font-semibold text-white mb-4">
            🕵️‍♂️ No Competitor Data Available
          </h3>
          <p className="text-gray-400 mb-4">
            No competitor analysis available. This could be because:
          </p>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>• Your activities don't have city data</li>
            <li>• No competitors found in the same cities</li>
            <li>• No linked providers found</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Competitive Summary */}
      {overallSummary && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            📊 Overall Competitive Position
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h4 className="text-blue-400 font-medium mb-2">Cities Analyzed</h4>
              <p className="text-2xl font-bold text-white">{overallSummary.totalCities}</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h4 className="text-purple-400 font-medium mb-2">Activity Types</h4>
              <p className="text-2xl font-bold text-white">{overallSummary.totalActivityTypes}</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h4 className="text-emerald-400 font-medium mb-2">Avg Market Share</h4>
              <p className="text-2xl font-bold text-white">{overallSummary.averageMarketShare.toFixed(1)}%</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h4 className="text-yellow-400 font-medium mb-2">Price Position</h4>
              <p className="text-2xl font-bold text-white">{overallSummary.averagePricePositioning > 0 ? '+' : ''}{overallSummary.averagePricePositioning.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Competitor Analysis */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">
          🎯 Detailed Competitive Analysis
        </h3>
        
        {competitorData.map((analysis, index) => (
          <div key={index} className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-white font-semibold text-lg">
                  {analysis.city} - {analysis.activityType}
                </h4>
                <p className="text-gray-400 text-sm">
                  {analysis.providerName} vs {analysis.competitors} competitors
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{analysis.metrics.marketShare.toFixed(1)}%</div>
                <div className="text-gray-400 text-sm">Market Share</div>
              </div>
            </div>

            {/* Competitive Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <h5 className="text-blue-400 font-medium mb-2">Price Positioning</h5>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{getPositioningIcon(analysis.metrics.priceAnalysis.pricePositioning)}</span>
                  <div>
                    <p className={`text-lg font-bold ${getPositioningColor(analysis.metrics.priceAnalysis.pricePositioning)}`}>
                      {analysis.metrics.priceAnalysis.pricePositioning.toUpperCase()}
                    </p>
                    <p className="text-sm text-gray-400">
                      {analysis.metrics.priceAnalysis.priceGap > 0 ? '+' : ''}{analysis.metrics.priceAnalysis.priceGap.toFixed(1)}% vs market
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <h5 className="text-purple-400 font-medium mb-2">Rating Positioning</h5>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{getPositioningIcon(analysis.metrics.ratingAnalysis.ratingPositioning)}</span>
                  <div>
                    <p className={`text-lg font-bold ${getPositioningColor(analysis.metrics.ratingAnalysis.ratingPositioning)}`}>
                      {analysis.metrics.ratingAnalysis.ratingPositioning.toUpperCase()}
                    </p>
                    <p className="text-sm text-gray-400">
                      {analysis.metrics.ratingAnalysis.ratingGap > 0 ? '+' : ''}{analysis.metrics.ratingAnalysis.ratingGap.toFixed(1)}% vs market
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <h5 className="text-emerald-400 font-medium mb-2">Your Activities</h5>
                <p className="text-2xl font-bold text-white">{analysis.userActivities}</p>
                <p className="text-sm text-gray-400">vs {analysis.competitors} competitors</p>
              </div>
            </div>

            {/* Insights */}
            {(analysis.metrics.opportunities.length > 0 || analysis.metrics.threats.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {analysis.metrics.opportunities.length > 0 && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                    <h5 className="text-emerald-400 font-medium mb-2">🚀 Opportunities</h5>
                    <ul className="text-sm text-emerald-300 space-y-1">
                      {analysis.metrics.opportunities.map((opportunity, idx) => (
                        <li key={idx}>• {opportunity}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {analysis.metrics.threats.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <h5 className="text-red-400 font-medium mb-2">⚠️ Threats</h5>
                    <ul className="text-sm text-red-300 space-y-1">
                      {analysis.metrics.threats.map((threat, idx) => (
                        <li key={idx}>• {threat}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Top Competitors */}
            {analysis.topCompetitors.length > 0 && (
              <div>
                <h5 className="text-white font-medium mb-3">🏆 Top Competitors</h5>
                <div className="space-y-2">
                  {analysis.topCompetitors.map((competitor, idx) => (
                    <div key={idx} className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{competitor.providerName}</p>
                          <p className="text-gray-400 text-sm">{competitor.activityName.substring(0, 60)}...</p>
                        </div>
                        <div className="text-right text-sm">
                          <div className="flex items-center space-x-4">
                            {competitor.price && (
                              <span className="text-gray-300">£{competitor.price}</span>
                            )}
                            {competitor.rating && (
                              <span className="text-yellow-400">⭐ {competitor.rating}/5</span>
                            )}
                            <span className="text-gray-500 text-xs">{competitor.platform}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 
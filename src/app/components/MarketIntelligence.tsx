'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon, 
  CurrencyPoundIcon,
  StarIcon,
  UsersIcon,
  MapPinIcon,
  ChartBarIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface MarketData {
  totalCompetitors: number;
  averagePrice: number;
  averageRating: number;
  marketSaturation: 'low' | 'medium' | 'high';
  pricingOpportunity: 'undervalued' | 'competitive' | 'premium';
  topProviders: Array<{
    name: string;
    activityCount: number;
    averageRating: number;
    averagePrice: number;
    totalReviews: number;
  }>;
  priceRange: { min: number; max: number };
  ratingRange: { min: number; max: number };
  city: string;
  category: string;
}

interface MarketIntelligenceProps {
  userTier: string;
  selectedCity?: string;
  selectedCategory?: string;
}

export default function MarketIntelligence({ userTier, selectedCity, selectedCategory }: MarketIntelligenceProps) {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userTier === 'premium' && selectedCity) {
      fetchMarketData();
    }
  }, [userTier, selectedCity, selectedCategory]);

  const fetchMarketData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedCity) params.append('city', selectedCity);
      if (selectedCategory) params.append('category', selectedCategory);

      const response = await fetch(`/api/market/insights?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch market data');
      }

      const data = await response.json();
      setMarketData(data.insights);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load market data');
    } finally {
      setLoading(false);
    }
  };

  const getSaturationColor = (saturation: string) => {
    switch (saturation) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getOpportunityColor = (opportunity: string) => {
    switch (opportunity) {
      case 'undervalued': return 'text-green-600 bg-green-100';
      case 'competitive': return 'text-blue-600 bg-blue-100';
      case 'premium': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSaturationIcon = (saturation: string) => {
    switch (saturation) {
      case 'low': return <ArrowTrendingUpIcon className="h-5 w-5 text-green-500" />;
      case 'medium': return <ChartBarIcon className="h-5 w-5 text-yellow-500" />;
      case 'high': return <ArrowTrendingDownIcon className="h-5 w-5 text-red-500" />;
      default: return <ChartBarIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getOpportunityIcon = (opportunity: string) => {
    switch (opportunity) {
      case 'undervalued': return <ArrowTrendingUpIcon className="h-5 w-5 text-green-500" />;
      case 'competitive': return <CheckCircleIcon className="h-5 w-5 text-blue-500" />;
      case 'premium': return <StarIcon className="h-5 w-5 text-purple-500" />;
      default: return <CurrencyPoundIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  if (userTier !== 'premium') {
    return (
      <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg p-6 border border-purple-500/30">
        <div className="flex items-center space-x-3 mb-4">
          <StarIcon className="h-8 w-8 text-purple-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">Premium Market Intelligence</h3>
            <p className="text-gray-300 text-sm">Upgrade to access detailed market insights</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <CheckCircleIcon className="h-4 w-4 text-green-400" />
            <span>Real-time competitor analysis</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <CheckCircleIcon className="h-4 w-4 text-green-400" />
            <span>Pricing intelligence</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <CheckCircleIcon className="h-4 w-4 text-green-400" />
            <span>Market opportunity alerts</span>
          </div>
        </div>
        <button className="mt-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all">
          Upgrade to Premium
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white/10 rounded-lg p-6 border border-white/10">
        <div className="animate-pulse">
          <div className="h-4 bg-white/20 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-white/20 rounded"></div>
            <div className="h-3 bg-white/20 rounded w-2/3"></div>
            <div className="h-3 bg-white/20 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/20 rounded-lg p-6 border border-red-500/30">
        <div className="flex items-center space-x-3">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">Error Loading Market Data</h3>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!marketData) {
    return (
      <div className="bg-white/10 rounded-lg p-6 border border-white/10">
        <div className="text-center">
          <MapPinIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Select a City</h3>
          <p className="text-gray-300 text-sm">Choose a UK city to view market intelligence</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Market Overview */}
      <div className="bg-white/10 rounded-lg p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Market Overview</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <MapPinIcon className="h-4 w-4" />
            <span>{marketData.city}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300 text-sm">Competitors</span>
              <UsersIcon className="h-5 w-5 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white">{marketData.totalCompetitors}</p>
            <div className="flex items-center space-x-2 mt-2">
              {getSaturationIcon(marketData.marketSaturation)}
              <span className={`text-xs px-2 py-1 rounded ${getSaturationColor(marketData.marketSaturation)}`}>
                {marketData.marketSaturation} saturation
              </span>
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300 text-sm">Avg Price</span>
              <CurrencyPoundIcon className="h-5 w-5 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white">£{marketData.averagePrice}</p>
            <div className="flex items-center space-x-2 mt-2">
              {getOpportunityIcon(marketData.pricingOpportunity)}
              <span className={`text-xs px-2 py-1 rounded ${getOpportunityColor(marketData.pricingOpportunity)}`}>
                {marketData.pricingOpportunity} opportunity
              </span>
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300 text-sm">Avg Rating</span>
              <StarIcon className="h-5 w-5 text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-white">{marketData.averageRating}</p>
            <p className="text-xs text-gray-400 mt-2">
              Range: {marketData.ratingRange.min} - {marketData.ratingRange.max}
            </p>
          </div>
        </div>
      </div>

      {/* Market Insights */}
      <div className="bg-white/10 rounded-lg p-6 border border-white/10">
        <div className="flex items-center space-x-3 mb-4">
          <LightBulbIcon className="h-6 w-6 text-yellow-400" />
          <h3 className="text-lg font-semibold text-white">Market Insights</h3>
        </div>
        
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg p-4 border border-blue-500/30">
            <h4 className="font-semibold text-blue-400 mb-2">Pricing Strategy</h4>
            <p className="text-sm text-gray-300">
              {marketData.pricingOpportunity === 'undervalued' 
                ? 'Market prices are below average. Consider increasing your prices to capture more value.'
                : marketData.pricingOpportunity === 'premium'
                ? 'Market prices are high. Focus on premium positioning and exceptional service.'
                : 'Market prices are competitive. Focus on differentiation and value-added services.'
              }
            </p>
          </div>

          <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-lg p-4 border border-green-500/30">
            <h4 className="font-semibold text-green-400 mb-2">Market Opportunity</h4>
            <p className="text-sm text-gray-300">
              {marketData.marketSaturation === 'low' 
                ? 'Low competition detected! This is a great opportunity to establish market presence and capture market share.'
                : marketData.marketSaturation === 'medium'
                ? 'Moderate competition. Focus on unique value propositions and excellent customer service to stand out.'
                : 'High competition market. Consider niche positioning, premium services, or exploring adjacent markets.'
              }
            </p>
          </div>

          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-4 border border-purple-500/30">
            <h4 className="font-semibold text-purple-400 mb-2">Quality Benchmark</h4>
            <p className="text-sm text-gray-300">
              Average rating of {marketData.averageRating} indicates {marketData.averageRating >= 4.5 ? 'high' : marketData.averageRating >= 4.0 ? 'good' : 'moderate'} market quality. 
              Aim to exceed this benchmark through exceptional service and experiences.
            </p>
          </div>
        </div>
      </div>

      {/* Top Competitors */}
      {marketData.topProviders.length > 0 && (
        <div className="bg-white/10 rounded-lg p-6 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">Top Competitors</h3>
          <div className="space-y-3">
            {marketData.topProviders.map((provider, index) => (
              <div key={provider.name} className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{provider.name}</h4>
                      <p className="text-sm text-gray-300">{provider.activityCount} activities</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-1 text-sm">
                      <StarIcon className="h-4 w-4 text-yellow-400" />
                      <span className="text-white">{provider.averageRating.toFixed(1)}</span>
                    </div>
                    <p className="text-sm text-gray-300">£{provider.averagePrice.toFixed(0)} avg</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actionable Recommendations */}
      <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-lg p-6 border border-emerald-500/30">
        <h3 className="text-lg font-semibold text-emerald-400 mb-4">Actionable Recommendations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-white">Immediate Actions</h4>
            <ul className="space-y-1 text-sm text-gray-300">
              <li>• Analyze competitor pricing strategies</li>
              <li>• Review your service quality standards</li>
              <li>• Identify unique selling propositions</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-white">Strategic Planning</h4>
            <ul className="space-y-1 text-sm text-gray-300">
              <li>• Develop competitive pricing strategy</li>
              <li>• Plan market expansion opportunities</li>
              <li>• Invest in quality improvements</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 
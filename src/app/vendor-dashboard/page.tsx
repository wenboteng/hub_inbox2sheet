"use client";
import { useState, useEffect } from 'react';
import { Search, MapPin, Star, Users, Euro, TrendingUp, BarChart3, Target, AlertCircle } from 'lucide-react';

interface Activity {
  id: string;
  activityName: string;
  providerName: string;
  rating: number | null;
  reviewCount: number | null;
  price: number | null;
  priceText: string | null;
  priceCurrency: string | null;
  platform: string;
  url: string | null;
  duration: string | null;
  venue: string | null;
  tags: string[];
  qualityScore: number | null;
}

interface MarketInsights {
  totalCompetitors: number;
  averagePrice: number;
  averageRating: number;
  priceRange: { min: number; max: number };
  ratingRange: { min: number; max: number };
  marketSaturation: 'low' | 'medium' | 'high';
  pricingOpportunity: 'undervalued' | 'competitive' | 'premium';
}

interface TopCompetitor {
  providerName: string;
  activityCount: number;
  averageRating: number;
  averagePrice: number;
  totalReviews: number;
}

interface OTADistribution {
  getyourguide: number;
  viator: number;
  airbnb: number;
  booking: number;
  total: number;
}

interface PricingDistribution {
  budget: number;
  midRange: number;
  premium: number;
  luxury: number;
  ultraLuxury: number;
}

interface VendorDashboardData {
  activities: Activity[];
  marketInsights: MarketInsights;
  topCompetitors: TopCompetitor[];
  otaDistribution: OTADistribution;
  pricingDistribution: PricingDistribution;
  totalCount: number;
}

const UK_CITIES = [
  'London',
  'Edinburgh',
  'Liverpool',
  'Manchester',
  'Birmingham',
  'Glasgow',
  'Bristol',
  'Leeds',
  'Cardiff',
  'Newcastle',
  'Belfast',
  'Brighton',
  'Oxford',
  'Cambridge',
  'York',
  'Bath',
  'Stratford-upon-Avon',
  'Canterbury',
  'Chester',
  'Durham'
];

const CATEGORIES = [
  'all',
  'Walking Tours',
  'Food Tours',
  'Cultural Tours',
  'Historical Tours',
  'Adventure Tours',
  'Museum Tours',
  'Architecture Tours',
  'Ghost Tours',
  'Pub Crawls',
  'Day Trips',
  'Multi-day Tours'
];

export default function VendorDashboard() {
  const [selectedCity, setSelectedCity] = useState('London');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [data, setData] = useState<VendorDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, [selectedCity, selectedCategory]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/vendor-dashboard?city=${encodeURIComponent(selectedCity)}&category=${selectedCategory}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const filteredActivities = data?.activities.filter(activity =>
    activity.activityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.providerName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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

  const formatPrice = (price: number | null, currency: string | null) => {
    if (!price) return 'N/A';
    const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'USD' ? '$' : '';
    return `${symbol}${price.toFixed(2)}`;
  };

  const formatRating = (rating: number | null) => {
    if (!rating) return 'N/A';
    return rating.toFixed(1);
  };

  const formatReviewCount = (count: number | null) => {
    if (!count) return 'N/A';
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-4 lg:mb-0">
              <h1 className="text-3xl font-bold text-gray-900">Tour Vendor Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Analyze your local market and understand your competitive position
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Target className="w-4 h-4" />
                <span>Target: UK Tour Vendors</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <TrendingUp className="w-4 h-4" />
                <span>Updated hourly</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* City Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                City
              </label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {UK_CITIES.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <BarChart3 className="w-4 h-4 inline mr-1" />
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {CATEGORIES.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Search className="w-4 h-4 inline mr-1" />
                Search Activities
              </label>
              <input
                type="text"
                placeholder="Search by name or provider..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading market data...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Market Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Key Metrics */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Market Overview</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{data.marketInsights.totalCompetitors}</div>
                    <div className="text-sm text-gray-600">Total Competitors</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {formatPrice(data.marketInsights.averagePrice, 'EUR')}
                    </div>
                    <div className="text-sm text-gray-600">Avg Price</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {formatRating(data.marketInsights.averageRating)}
                    </div>
                    <div className="text-sm text-gray-600">Avg Rating</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {formatPrice(data.marketInsights.priceRange.min, 'EUR')} - {formatPrice(data.marketInsights.priceRange.max, 'EUR')}
                    </div>
                    <div className="text-sm text-gray-600">Price Range</div>
                  </div>
                </div>
              </div>

              {/* Market Intelligence */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Market Intelligence</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Market Saturation:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSaturationColor(data.marketInsights.marketSaturation)}`}>
                      {data.marketInsights.marketSaturation.charAt(0).toUpperCase() + data.marketInsights.marketSaturation.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Pricing Opportunity:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOpportunityColor(data.marketInsights.pricingOpportunity)}`}>
                      {data.marketInsights.pricingOpportunity.charAt(0).toUpperCase() + data.marketInsights.pricingOpportunity.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Rating Range:</span>
                    <span className="font-medium">
                      {formatRating(data.marketInsights.ratingRange.min)} - {formatRating(data.marketInsights.ratingRange.max)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Competitors */}
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Top 5 Competitors</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activities</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Rating</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Reviews</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.topCompetitors.map((competitor, index) => (
                      <tr key={competitor.providerName} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {competitor.providerName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {competitor.activityCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-400 mr-1" />
                            {formatRating(competitor.averageRating)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatPrice(competitor.averagePrice, 'EUR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatReviewCount(competitor.totalReviews)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Activity Listings */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Activity Listings ({filteredActivities.length} of {data.totalCount})
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Showing activities in {selectedCity} {selectedCategory !== 'all' && `- ${selectedCategory}`}
                </p>
              </div>
              
              <div className="divide-y divide-gray-200">
                {filteredActivities.length === 0 ? (
                  <div className="px-6 py-12 text-center text-gray-500">
                    <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No activities found matching your criteria.</p>
                  </div>
                ) : (
                  filteredActivities.map((activity) => (
                    <div key={activity.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-medium text-gray-900 truncate">
                              {activity.activityName}
                            </h3>
                            {activity.qualityScore && activity.qualityScore >= 80 && (
                              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                High Quality
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                            <span className="flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              {activity.providerName}
                            </span>
                            {activity.venue && (
                              <span className="flex items-center">
                                <MapPin className="w-4 h-4 mr-1" />
                                {activity.venue}
                              </span>
                            )}
                            {activity.duration && (
                              <span>{activity.duration}</span>
                            )}
                          </div>

                          {activity.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {activity.tags.slice(0, 3).map((tag, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                              {activity.tags.length > 3 && (
                                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                                  +{activity.tags.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end space-y-2 lg:ml-4">
                          <div className="flex items-center space-x-4 text-sm">
                            {activity.rating && (
                              <div className="flex items-center">
                                <Star className="w-4 h-4 text-yellow-400 mr-1" />
                                <span className="font-medium">{formatRating(activity.rating)}</span>
                                {activity.reviewCount && (
                                  <span className="text-gray-500 ml-1">
                                    ({formatReviewCount(activity.reviewCount)})
                                  </span>
                                )}
                              </div>
                            )}
                            {activity.price && (
                              <div className="flex items-center font-medium text-green-600">
                                <Euro className="w-4 h-4 mr-1" />
                                {formatPrice(activity.price, activity.priceCurrency)}
                              </div>
                            )}
                          </div>
                          
                          {activity.url && (
                            <a
                              href={activity.url}
                              target="_blank"
                              rel="nofollow"
                              className="inline-flex items-center px-3 py-1 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              View on {activity.platform}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 
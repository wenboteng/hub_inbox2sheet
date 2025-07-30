'use client';

import { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  ArrowTrendingUpIcon, 
  UsersIcon, 
  CurrencyPoundIcon,
  MapPinIcon,
  ClockIcon,
  StarIcon,
  EyeIcon,
  BookmarkIcon,
  CogIcon
} from '@heroicons/react/24/outline';

interface DashboardData {
  user: {
    tier: string;
    city?: string;
    country?: string;
    aiUsage: {
      allowed: boolean;
      remaining: number;
    };
  };
  marketInsights: {
    totalCompetitors: number;
    averagePrice: number;
    averageRating: number;
    marketSaturation: 'low' | 'medium' | 'high';
    pricingOpportunity: 'undervalued' | 'competitive' | 'premium';
  };
  recentQuestions: Array<{
    id: string;
    question: string;
    category: string;
    platform: string;
    upvotes: number;
    isTopQuestion: boolean;
  }>;
  savedQuestions: Array<{
    id: string;
    question: string;
    savedAt: string;
    notes?: string;
  }>;
  usageStats: {
    questionsViewed: number;
    aiRequestsUsed: number;
    aiRequestsLimit: number;
    savedQuestions: number;
  };
}

const UK_CITIES = [
  'London', 'Edinburgh', 'Manchester', 'Birmingham', 'Liverpool',
  'Glasgow', 'Bristol', 'Leeds', 'Cardiff', 'Newcastle',
  'Belfast', 'Brighton', 'Oxford', 'Cambridge', 'York',
  'Bath', 'Stratford-upon-Avon', 'Canterbury', 'Chester', 'Durham'
];

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'market' | 'insights' | 'saved'>('overview');

  useEffect(() => {
    fetchDashboardData();
  }, [selectedCity]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch user data and market insights
      const [userRes, marketRes, questionsRes, savedRes] = await Promise.all([
        fetch('/api/user/profile'),
        fetch(`/api/market/insights?city=${selectedCity}`),
        fetch('/api/faq/questions?limit=5&sortBy=recent'),
        fetch('/api/user/saved-questions')
      ]);

      const userData = userRes.ok ? await userRes.json() : null;
      const marketData = marketRes.ok ? await marketRes.json() : null;
      const questionsData = questionsRes.ok ? await questionsRes.json() : null;
      const savedData = savedRes.ok ? await savedRes.json() : null;

      setDashboardData({
        user: userData?.user || { tier: 'free', aiUsage: { allowed: true, remaining: 5 } },
        marketInsights: marketData?.insights || {
          totalCompetitors: 0,
          averagePrice: 0,
          averageRating: 0,
          marketSaturation: 'low',
          pricingOpportunity: 'competitive'
        },
        recentQuestions: questionsData?.questions || [],
        savedQuestions: savedData?.questions || [],
        usageStats: {
          questionsViewed: 0,
          aiRequestsUsed: 0,
          aiRequestsLimit: userData?.user?.aiRequestsLimit || 5,
          savedQuestions: savedData?.questions?.length || 0
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B0F2F] to-[#1E223F] flex items-center justify-center">
        <div className="text-white text-xl">Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0F2F] to-[#1E223F] text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0B0F2F] to-[#1E223F] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Tour Vendor Dashboard</h1>
              <p className="text-gray-300 mt-1">
                Welcome back! Here's your market intelligence overview.
              </p>
            </div>
            
            {/* User Info & City Selector */}
            <div className="flex items-center space-x-4">
              {dashboardData?.user?.tier === 'premium' && (
                <div className="flex items-center space-x-2">
                  <MapPinIcon className="h-5 w-5 text-emerald-400" />
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select City</option>
                    {UK_CITIES.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-4 py-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                <span className="text-sm font-medium capitalize">
                  {dashboardData?.user?.tier || 'free'} Tier
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex space-x-1 bg-white/10 rounded-lg p-1 mb-8">
          {[
            { id: 'overview', label: 'Overview', icon: ChartBarIcon },
            { id: 'market', label: 'Market Intelligence', icon: ArrowTrendingUpIcon },
            { id: 'insights', label: 'Recent Insights', icon: EyeIcon },
            { id: 'saved', label: 'Saved Questions', icon: BookmarkIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-emerald-500 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Dashboard Content */}
        <div className="space-y-8">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Usage Stats */}
              <div className="bg-white/10 rounded-lg p-6 border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm">AI Requests Used</p>
                    <p className="text-2xl font-bold">
                      {dashboardData?.usageStats.aiRequestsUsed || 0}
                      <span className="text-sm text-gray-400">/{dashboardData?.usageStats.aiRequestsLimit || 5}</span>
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <CogIcon className="h-6 w-6 text-emerald-400" />
                  </div>
                </div>
              </div>

              {/* Questions Viewed */}
              <div className="bg-white/10 rounded-lg p-6 border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm">Questions Viewed</p>
                    <p className="text-2xl font-bold">{dashboardData?.usageStats.questionsViewed || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <EyeIcon className="h-6 w-6 text-blue-400" />
                  </div>
                </div>
              </div>

              {/* Saved Questions */}
              <div className="bg-white/10 rounded-lg p-6 border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm">Saved Questions</p>
                    <p className="text-2xl font-bold">{dashboardData?.usageStats.savedQuestions || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <BookmarkIcon className="h-6 w-6 text-purple-400" />
                  </div>
                </div>
              </div>

              {/* Market Status */}
              <div className="bg-white/10 rounded-lg p-6 border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm">Market Status</p>
                    <p className="text-lg font-bold capitalize">
                      {dashboardData?.marketInsights.marketSaturation || 'low'}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <ArrowTrendingUpIcon className="h-6 w-6 text-yellow-400" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'market' && dashboardData?.user?.tier === 'premium' && (
            <div className="space-y-6">
              {/* Market Intelligence Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/10 rounded-lg p-6 border border-white/10">
                  <h3 className="text-lg font-semibold mb-4">Competitor Analysis</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total Competitors</span>
                      <span className="font-semibold">{dashboardData.marketInsights.totalCompetitors}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Market Saturation</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getSaturationColor(dashboardData.marketInsights.marketSaturation)}`}>
                        {dashboardData.marketInsights.marketSaturation}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 rounded-lg p-6 border border-white/10">
                  <h3 className="text-lg font-semibold mb-4">Pricing Intelligence</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Average Price</span>
                      <span className="font-semibold">£{dashboardData.marketInsights.averagePrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Opportunity</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getOpportunityColor(dashboardData.marketInsights.pricingOpportunity)}`}>
                        {dashboardData.marketInsights.pricingOpportunity}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 rounded-lg p-6 border border-white/10">
                  <h3 className="text-lg font-semibold mb-4">Quality Metrics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Average Rating</span>
                      <span className="font-semibold flex items-center">
                        {dashboardData.marketInsights.averageRating}
                        <StarIcon className="h-4 w-4 text-yellow-400 ml-1" />
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Market Quality</span>
                      <span className="text-green-400 font-semibold">High</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Market Recommendations */}
              <div className="bg-white/10 rounded-lg p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4">Market Recommendations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-emerald-500/20 rounded-lg p-4 border border-emerald-500/30">
                    <h4 className="font-semibold text-emerald-400 mb-2">Pricing Strategy</h4>
                    <p className="text-sm text-gray-300">
                      Based on market analysis, consider {dashboardData.marketInsights.pricingOpportunity === 'undervalued' ? 'increasing' : 'maintaining'} your prices.
                    </p>
                  </div>
                  <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-500/30">
                    <h4 className="font-semibold text-blue-400 mb-2">Market Opportunity</h4>
                    <p className="text-sm text-gray-300">
                      {dashboardData.marketInsights.marketSaturation === 'low' ? 'Low competition - great time to expand!' : 'Competitive market - focus on differentiation.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Recent Market Insights</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {dashboardData?.recentQuestions.map((question) => (
                  <div key={question.id} className="bg-white/10 rounded-lg p-6 border border-white/10">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
                        {question.platform}
                      </span>
                      {question.isTopQuestion && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                          Top Question
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold mb-2 line-clamp-2">{question.question}</h3>
                    <div className="flex items-center justify-between text-sm text-gray-300">
                      <span>{question.category}</span>
                                          <div className="flex items-center space-x-1">
                      <ArrowTrendingUpIcon className="h-4 w-4" />
                      <span>{question.upvotes}</span>
                    </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'saved' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Saved Questions</h2>
              {dashboardData?.savedQuestions.length === 0 ? (
                <div className="text-center py-12">
                  <BookmarkIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">No saved questions yet. Start bookmarking insights that matter to you!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dashboardData?.savedQuestions.map((saved) => (
                    <div key={saved.id} className="bg-white/10 rounded-lg p-6 border border-white/10">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-2">{saved.question}</h3>
                          {saved.notes && (
                            <p className="text-sm text-gray-300 mb-2">{saved.notes}</p>
                          )}
                          <p className="text-xs text-gray-400">
                            Saved on {new Date(saved.savedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button className="text-emerald-400 hover:text-emerald-300">
                          <EyeIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
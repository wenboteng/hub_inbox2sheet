'use client';

import { useState, useEffect } from 'react';
import CompetitorWatchTab from '@/components/CompetitorWatchTab';
import ProtectedRoute from '@/components/ProtectedRoute';

interface DashboardData {
  marketInsights: {
    totalCompetitors: number;
    averagePrice: number;
    averageRating: number;
    marketSaturation: 'low' | 'medium' | 'high';
    pricingOpportunity: 'undervalued' | 'competitive' | 'premium';
    currency?: string;
    qualityScore?: number;
    platformBreakdown?: {
      gyg: number;
      viator: number;
    };
  };
  tacticalSummary: {
    priceRisk: { count: number; percentage: number };
    opportunities: Array<{ location: string; competitors: number; description: string }>;
    reviewPulse: { newReviews: number; averageRating: number; trend: string };
    alerts: Array<{ type: string; message: string; priority: 'high' | 'medium' | 'low' }>;
  };
  linkedActivities: Array<{
    id: string;
    activityName: string;
    providerName: string;
    location: string;
    city: string;
    priceNumeric: number;
    priceCurrency: string;
    ratingNumeric: number;
    reviewCountNumeric: number;
    platform: string;
    qualityScore: number;
  }>;
}

function InsightDeckContent() {
  const [providerName, setProviderName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [linkedProviders, setLinkedProviders] = useState<any[]>([]);
  const [showDashboard, setShowDashboard] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'activities' | 'intelligence' | 'competitors' | 'insights' | 'opportunities' | 'agent' | 'reports' | 'research'>('overview');

  // Fetch linked providers on component mount
  useEffect(() => {
    console.log('InsightDeck: Fetching linked providers...');
    fetchLinkedProviders();
  }, []);

  // Fetch dashboard data when linked providers change
  useEffect(() => {
    if (linkedProviders.length > 0) {
      fetchDashboardData();
    }
  }, [linkedProviders]);

  const fetchLinkedProviders = async () => {
    try {
      console.log('InsightDeck: Making API call to fetch providers...');
      const response = await fetch('/api/user/products?userId=demo-user');
      console.log('InsightDeck: API response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('InsightDeck: API data:', data);
        setLinkedProviders(data.userProviders || []);
        const shouldShowDashboard = data.userProviders?.length > 0;
        console.log('InsightDeck: Should show dashboard:', shouldShowDashboard);
        setShowDashboard(shouldShowDashboard);
      }
    } catch (error) {
      console.error('Failed to fetch linked providers:', error);
    }
  };

  const fetchDashboardData = async () => {
    setLoadingData(true);
    try {
      // Get all activities for linked providers
      const providerNames = linkedProviders.map(p => p.providerName);
      const activitiesPromises = providerNames.map(name => 
        fetch(`/api/market/activities?search=${encodeURIComponent(name)}&limit=200`)
      );
      
      const responses = await Promise.all(activitiesPromises);
      const activitiesData = await Promise.all(responses.map(r => r.json()));
      
      // Combine all activities
      const allActivities = activitiesData.flatMap(data => data.activities || []);
      
      // Filter to only linked providers
      const linkedActivities = allActivities.filter((activity: any) => 
        providerNames.includes(activity.providerName)
      );

      // Calculate market insights
      const activitiesWithPrices = linkedActivities.filter((a: any) => a.priceNumeric && a.priceNumeric > 0);
      const activitiesWithRatings = linkedActivities.filter((a: any) => a.ratingNumeric && a.ratingNumeric > 0);
      
      const averagePrice = activitiesWithPrices.length > 0 
        ? activitiesWithPrices.reduce((sum: number, a: any) => sum + (a.priceNumeric || 0), 0) / activitiesWithPrices.length 
        : 0;

      const averageRating = activitiesWithRatings.length > 0 
        ? activitiesWithRatings.reduce((sum: number, a: any) => sum + (a.ratingNumeric || 0), 0) / activitiesWithRatings.length 
        : 0;

      // Calculate price risk (activities priced significantly above average)
      const priceRiskThreshold = averagePrice * 1.3; // 30% above average
      const priceRiskCount = activitiesWithPrices.filter((a: any) => a.priceNumeric > priceRiskThreshold).length;

      // Calculate opportunities (low competition areas)
      const locationCounts = linkedActivities.reduce((acc: any, activity: any) => {
        const location = activity.location || activity.city || 'Unknown';
        acc[location] = (acc[location] || 0) + 1;
        return acc;
      }, {});

      const lowCompetitionLocations = Object.entries(locationCounts)
        .filter(([_, count]) => (count as number) <= 3)
        .map(([location, count]) => ({
          location,
          competitors: count as number,
          description: `Only ${count} competitors in this area`
        }))
        .slice(0, 3);

      // Calculate review pulse
      const totalReviews = linkedActivities
        .filter((a: any) => a.reviewCountNumeric && a.reviewCountNumeric > 0)
        .reduce((sum: number, a: any) => sum + (a.reviewCountNumeric || 0), 0);

      // Generate alerts
      const alerts = [];
      
      if (priceRiskCount > 0) {
        alerts.push({
          type: 'pricing',
          message: `${priceRiskCount} activities priced 30%+ above £${Math.round(averagePrice)} average`,
          priority: 'high' as const
        });
      }

      // Platform distribution alert
      const gygCount = linkedActivities.filter((a: any) => a.platform === 'gyg').length;
      const viatorCount = linkedActivities.filter((a: any) => a.platform === 'viator').length;
      if (gygCount > 0 && viatorCount > 0) {
        alerts.push({
          type: 'platform',
          message: `Data from ${gygCount} GYG + ${viatorCount} Viator activities`,
          priority: 'low' as const
        });
      }

      // Market opportunity alert
      if (lowCompetitionLocations.length > 0) {
        alerts.push({
          type: 'market',
          message: `${lowCompetitionLocations.length} low-competition locations identified`,
          priority: 'low' as const
        });
      }

      const dashboardData: DashboardData = {
        marketInsights: {
          totalCompetitors: linkedActivities.length,
          averagePrice: Math.round(averagePrice * 100) / 100,
          averageRating: Math.round(averageRating * 100) / 100,
          marketSaturation: linkedActivities.length > 100 ? 'high' : linkedActivities.length > 50 ? 'medium' : 'low',
          pricingOpportunity: averagePrice < 50 ? 'undervalued' : averagePrice > 150 ? 'premium' : 'competitive',
          currency: '£',
          qualityScore: linkedActivities.reduce((sum: number, a: any) => sum + (a.qualityScore || 0), 0) / linkedActivities.length,
          platformBreakdown: {
            gyg: gygCount,
            viator: viatorCount
          }
        },
        tacticalSummary: {
          priceRisk: { 
            count: priceRiskCount, 
            percentage: Math.round((priceRiskCount / linkedActivities.length) * 100) 
          },
          opportunities: lowCompetitionLocations,
          reviewPulse: { 
            newReviews: totalReviews, 
            averageRating: Math.round(averageRating * 10) / 10, 
            trend: '+12% this week' 
          },
          alerts
        },
        linkedActivities: linkedActivities.map((activity: any) => ({
          id: activity.id,
          activityName: activity.activityName,
          providerName: activity.providerName,
          location: activity.location,
          city: activity.city,
          priceNumeric: activity.priceNumeric,
          priceCurrency: activity.priceCurrency,
          ratingNumeric: activity.ratingNumeric,
          reviewCountNumeric: activity.reviewCountNumeric,
          platform: activity.platform,
          qualityScore: activity.qualityScore
        }))
      };

      setDashboardData(dashboardData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const searchProviders = async () => {
    if (!providerName.trim()) {
      setError('Please enter a provider name');
      return;
    }

    setIsSearching(true);
    setError('');
    setSearchResults([]);

    try {
      const response = await fetch(`/api/market/activities?search=${encodeURIComponent(providerName)}&limit=50`);
      if (response.ok) {
        const data = await response.json();
        
        // Group activities by provider name
        const providerGroups = data.activities.reduce((acc: any, activity: any) => {
          const provider = activity.providerName;
          if (!acc[provider]) {
            acc[provider] = {
              name: provider,
              activities: [],
              totalActivities: 0,
              averagePrice: 0,
              averageRating: 0,
              totalReviews: 0
            };
          }
          
          acc[provider].activities.push(activity);
          acc[provider].totalActivities++;
          
          if (activity.priceNumeric) {
            acc[provider].averagePrice += activity.priceNumeric;
          }
          if (activity.ratingNumeric) {
            acc[provider].averageRating += activity.ratingNumeric;
          }
          if (activity.reviewCountNumeric) {
            acc[provider].totalReviews += activity.reviewCountNumeric;
          }
          
          return acc;
        }, {});

        // Calculate averages and format results
        const results = Object.values(providerGroups).map((provider: any) => ({
          ...provider,
          averagePrice: provider.totalActivities > 0 ? Math.round((provider.averagePrice / provider.totalActivities) * 100) / 100 : 0,
          averageRating: provider.totalActivities > 0 ? Math.round((provider.averageRating / provider.totalActivities) * 10) / 10 : 0
        }));

        setSearchResults(results);
        
        if (results.length === 0) {
          setError(`No providers found matching "${providerName}". Try a different search term.`);
        }
      } else {
        setError('Failed to search for providers. Please try again.');
      }
    } catch (error) {
      console.error('Error searching providers:', error);
      setError('An error occurred while searching. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const linkProvider = async (providerName: string) => {
    setIsLinking(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/user/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'demo-user',
          providerName: providerName
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(`Successfully linked ${providerName}! You now have access to personalized market intelligence.`);
        setSearchResults([]);
        setProviderName('');
        
        // Refresh linked providers and show dashboard
        await fetchLinkedProviders();
        
        // Auto-hide success message after 3 seconds
        setTimeout(() => {
          setSuccess('');
        }, 3000);
      } else {
        const errorData = await response.json();
        if (errorData.message?.includes('already linked')) {
          setError(`${providerName} is already linked to your account.`);
          // Refresh linked providers to show current state
          await fetchLinkedProviders();
        } else {
          setError(errorData.message || 'Failed to link provider. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error linking provider:', error);
      setError('An error occurred while linking the provider. Please try again.');
    } finally {
      setIsLinking(false);
    }
  };

  const unlinkProvider = async (providerId: string, providerName: string) => {
    if (!confirm(`Are you sure you want to unlink ${providerName}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/user/products?id=${providerId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess(`Successfully unlinked ${providerName}.`);
        await fetchLinkedProviders();
        
        // Auto-hide success message after 3 seconds
        setTimeout(() => {
          setSuccess('');
        }, 3000);
      } else {
        setError('Failed to unlink provider. Please try again.');
      }
    } catch (error) {
      console.error('Error unlinking provider:', error);
      setError('An error occurred while unlinking the provider. Please try again.');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'low': return 'text-green-400 bg-green-500/20 border-green-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  // Dashboard view
  if (showDashboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F1419] via-[#1A1F3A] to-[#2A2F5A] text-white">
        {/* Top Navigation Bar */}
        <div className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-white">🎯 InsightDeck</h1>
              <span className="text-emerald-400 text-sm font-medium">PREMIUM ACCESS</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-400">
                <span className="text-emerald-400">●</span> Live Intelligence
              </div>
              <button
                onClick={() => setShowDashboard(false)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm"
              >
                + Add Provider
              </button>
            </div>
          </div>
        </div>

        <div className="flex h-screen">
          {/* Sidebar Navigation */}
          <div className="w-64 bg-gray-900/80 backdrop-blur-sm border-r border-gray-700 p-6">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all ${
                  activeTab === 'overview'
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="text-lg">🧭</span>
                <span className="font-medium">Overview</span>
              </button>
              
              <button
                onClick={() => setActiveTab('activities')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all ${
                  activeTab === 'activities'
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="text-lg">📦</span>
                <span className="font-medium">My Products</span>
                {dashboardData?.linkedActivities.length && (
                  <span className="ml-auto bg-emerald-500 text-white text-xs px-2 py-1 rounded-full">
                    {dashboardData.linkedActivities.length}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => setActiveTab('competitors')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all ${
                  activeTab === 'competitors'
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="text-lg">🕵️‍♂️</span>
                <span className="font-medium">Competitor Watch</span>
              </button>
              
              <button
                onClick={() => setActiveTab('insights')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all ${
                  activeTab === 'insights'
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="text-lg">📈</span>
                <span className="font-medium">Market Insights</span>
              </button>
              
              <button
                onClick={() => setActiveTab('opportunities')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all ${
                  activeTab === 'opportunities'
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="text-lg">🚀</span>
                <span className="font-medium">Opportunities</span>
              </button>
              
              <button
                onClick={() => setActiveTab('agent')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all ${
                  activeTab === 'agent'
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="text-lg">🧠</span>
                <span className="font-medium">Ask Intel Agent</span>
              </button>
              
              <button
                onClick={() => setActiveTab('reports')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all ${
                  activeTab === 'reports'
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="text-lg">📄</span>
                <span className="font-medium">Reports</span>
              </button>
              
              <button
                onClick={() => setActiveTab('research')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all ${
                  activeTab === 'research'
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="text-lg">💼</span>
                <span className="font-medium">Custom Research</span>
              </button>
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-8 overflow-y-auto">
            {success && (
              <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">
                {success}
              </div>
            )}

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Linked Providers Section */}
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white">
                      🔗 Your Linked Providers ({linkedProviders.length})
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {linkedProviders.map((provider, index) => (
                      <div key={index} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-white">{provider.providerName}</h4>
                          <button
                            onClick={() => unlinkProvider(provider.id, provider.providerName)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Unlink
                          </button>
                        </div>
                        <div className="space-y-2 text-sm text-gray-400">
                          <div className="flex justify-between">
                            <span>Activities:</span>
                            <span className="text-white">{provider.linkedActivityCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Linked:</span>
                            <span className="text-white">
                              {new Date(provider.linkedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Market Intelligence Summary */}
                {dashboardData && (
                  <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">
                      📊 Market Intelligence Summary
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                        <h4 className="text-emerald-400 font-medium mb-2">Total Activities</h4>
                        <p className="text-2xl font-bold text-white">{dashboardData.marketInsights.totalCompetitors}</p>
                      </div>
                      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                        <h4 className="text-blue-400 font-medium mb-2">Avg Price</h4>
                        <p className="text-2xl font-bold text-white">£{dashboardData.marketInsights.averagePrice}</p>
                      </div>
                      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                        <h4 className="text-purple-400 font-medium mb-2">Avg Rating</h4>
                        <p className="text-2xl font-bold text-white">{dashboardData.marketInsights.averageRating}/5</p>
                      </div>
                      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                        <h4 className="text-yellow-400 font-medium mb-2">Market Saturation</h4>
                        <p className="text-2xl font-bold text-white capitalize">{dashboardData.marketInsights.marketSaturation}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Stats */}
                {dashboardData && (
                  <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">
                      ⚡ Quick Intelligence
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                        <h4 className="text-red-400 font-medium mb-2">Price Risk</h4>
                        <p className="text-2xl font-bold text-red-400">{dashboardData.tacticalSummary.priceRisk.count}</p>
                        <p className="text-sm text-red-300">{dashboardData.tacticalSummary.priceRisk.percentage}% of activities</p>
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                        <h4 className="text-emerald-400 font-medium mb-2">Opportunities</h4>
                        <p className="text-2xl font-bold text-emerald-400">{dashboardData.tacticalSummary.opportunities.length}</p>
                        <p className="text-sm text-emerald-300">Low competition areas</p>
                      </div>
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <h4 className="text-blue-400 font-medium mb-2">Total Reviews</h4>
                        <p className="text-2xl font-bold text-blue-400">{dashboardData.tacticalSummary.reviewPulse.newReviews.toLocaleString()}</p>
                        <p className="text-sm text-blue-300">Across all activities</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* My Products Tab */}
            {activeTab === 'activities' && (
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  🎯 Your Linked Activities ({dashboardData?.linkedActivities.length || 0})
                </h3>
                
                {loadingData ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading your activities...</p>
                  </div>
                ) : dashboardData?.linkedActivities.length ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {dashboardData.linkedActivities.map((activity, index) => (
                      <div key={index} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-white">{activity.activityName}</h4>
                          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                            {activity.platform}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-400">
                          <div>
                            <span className="text-gray-500">Provider:</span>
                            <span className="text-white ml-1">{activity.providerName}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Location:</span>
                            <span className="text-white ml-1">{activity.city || activity.location}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Price:</span>
                            <span className="text-white ml-1">{activity.priceCurrency}{activity.priceNumeric}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Rating:</span>
                            <span className="text-white ml-1">{activity.ratingNumeric}/5 ({activity.reviewCountNumeric} reviews)</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <p>No activities found for your linked providers.</p>
                  </div>
                )}
              </div>
            )}

            {/* Competitor Watch Tab */}
            {activeTab === 'competitors' && (
              <CompetitorWatchTab dashboardData={dashboardData} />
            )}

            {/* Market Insights Tab */}
            {activeTab === 'insights' && (
              <div className="space-y-6">
                {dashboardData && (
                  <>
                    {/* Intelligence Alerts */}
                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">
                        🚨 Intelligence Alerts
                      </h3>
                      <div className="space-y-3">
                        {dashboardData.tacticalSummary.alerts.map((alert, index) => (
                          <div key={index} className={`flex items-center justify-between p-3 rounded-lg border ${getPriorityColor(alert.priority)}`}>
                            <div className="flex items-center space-x-3">
                              <div className={`w-2 h-2 rounded-full ${
                                alert.priority === 'high' ? 'bg-red-400' : 
                                alert.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                              }`}></div>
                              <span className="text-sm">{alert.message}</span>
                            </div>
                            <span className="text-xs uppercase font-medium">{alert.priority}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Platform Distribution */}
                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">
                        📱 Platform Distribution
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                          <h4 className="text-blue-400 font-medium mb-2">GetYourGuide</h4>
                          <p className="text-2xl font-bold text-white">{dashboardData.marketInsights.platformBreakdown?.gyg || 0}</p>
                          <p className="text-sm text-gray-400">activities</p>
                        </div>
                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                          <h4 className="text-purple-400 font-medium mb-2">Viator</h4>
                          <p className="text-2xl font-bold text-white">{dashboardData.marketInsights.platformBreakdown?.viator || 0}</p>
                          <p className="text-sm text-gray-400">activities</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Opportunities Tab */}
            {activeTab === 'opportunities' && (
              <div className="space-y-6">
                {dashboardData && (
                  <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">
                      🎯 Market Opportunities
                    </h3>
                    <div className="space-y-3">
                      {dashboardData.tacticalSummary.opportunities.map((opportunity, index) => (
                        <div key={index} className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                          <h4 className="text-emerald-400 font-medium">{opportunity.location}</h4>
                          <p className="text-sm text-emerald-300">{opportunity.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Intel Agent Tab */}
            {activeTab === 'agent' && (
              <div className="space-y-6">
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    🧠 Ask Intel Agent
                  </h3>
                  <p className="text-gray-400">AI-powered market intelligence assistant coming soon...</p>
                </div>
              </div>
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
              <div className="space-y-6">
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    📄 Intelligence Reports
                  </h3>
                  <p className="text-gray-400 mb-6">Data-driven insights generated from our comprehensive tour vendor database</p>
                  
                  {/* Platform Performance Report */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <h4 className="text-emerald-400 font-medium mb-2">Platform Analysis</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Airbnb</span>
                          <span className="text-white">326 questions</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Viator</span>
                          <span className="text-white">44 questions</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">GetYourGuide</span>
                          <span className="text-white">44 questions</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">TripAdvisor</span>
                          <span className="text-white">421 questions</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <h4 className="text-emerald-400 font-medium mb-2">Top Categories</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Travel Forum</span>
                          <span className="text-white">421</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">General</span>
                          <span className="text-white">159</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Travel Discussion</span>
                          <span className="text-white">132</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Solo Travel</span>
                          <span className="text-white">105</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <h4 className="text-emerald-400 font-medium mb-2">Content Quality</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Verified Answers</span>
                          <span className="text-emerald-400">1</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Community Content</span>
                          <span className="text-blue-400">1,743</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total Solutions</span>
                          <span className="text-white">1,744</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Reports */}
                  <div className="space-y-4">
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-3">📊 Revenue Optimization Report</h4>
                      <p className="text-gray-400 text-sm mb-3">
                        Analysis of pricing strategies and revenue opportunities across platforms
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Pricing & Revenue Questions:</span>
                          <span className="text-white ml-2">22</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Customer Service Issues:</span>
                          <span className="text-white ml-2">15</span>
                        </div>
                      </div>
                      <button className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors">
                        View Full Report
                      </button>
                    </div>

                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-3">🎯 Platform-Specific Insights</h4>
                      <p className="text-gray-400 text-sm mb-3">
                        Deep dive into platform-specific challenges and opportunities
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Airbnb Hosting Issues</span>
                          <span className="text-yellow-400">High Priority</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Viator Payout Problems</span>
                          <span className="text-red-400">Critical</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">GetYourGuide Integration</span>
                          <span className="text-green-400">Resolved</span>
                        </div>
                      </div>
                      <button className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors">
                        View Platform Analysis
                      </button>
                    </div>

                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-3">📈 Seasonal Trends Report</h4>
                      <p className="text-gray-400 text-sm mb-3">
                        Seasonal patterns and booking trends for tour vendors
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Peak Season Questions</span>
                          <span className="text-white">+45%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Off-Season Optimization</span>
                          <span className="text-white">+23%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Holiday Booking Issues</span>
                          <span className="text-white">+67%</span>
                        </div>
                      </div>
                      <button className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors">
                        View Seasonal Analysis
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Research Tab */}
            {activeTab === 'research' && (
              <div className="space-y-6">
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    💼 Custom Research
                  </h3>
                  <p className="text-gray-400">Advanced research tools coming soon...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Provider linking view
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F1419] via-[#1A1F3A] to-[#2A2F5A] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">
            🎯 Welcome to InsightDeck
          </h1>
          <p className="text-gray-400 text-lg">
            Your secret command center for tour vendor intelligence
          </p>
        </div>
        
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-2">
              🔗 Link Your Provider
            </h3>
            <p className="text-gray-400 text-sm">
              Add your provider name to automatically link all your activities from our database.
              This will enable personalized market intelligence and competitor analysis.
            </p>
          </div>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchProviders()}
              placeholder="Enter your provider name (e.g., 'Evan Evans Tours')"
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <button 
              onClick={searchProviders}
              disabled={isSearching}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              {isSearching ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Searching...
                </>
              ) : (
                'Search'
              )}
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">
              {success}
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-white font-medium">Found Providers:</h4>
              {searchResults.map((provider, index) => (
                <div key={index} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-white">{provider.name}</h5>
                    <button
                      onClick={() => linkProvider(provider.name)}
                      disabled={isLinking}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
                    >
                      {isLinking ? 'Linking...' : 'Link Provider'}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm text-gray-400">
                    <div>
                      <span className="text-gray-500">Activities:</span>
                      <span className="text-white ml-1">{provider.totalActivities}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Avg Price:</span>
                      <span className="text-white ml-1">£{provider.averagePrice}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Avg Rating:</span>
                      <span className="text-white ml-1">{provider.averageRating}/5</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {searchResults.length === 0 && !error && !isSearching && (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">Search for your provider to get started</p>
              <p className="text-xs mt-1">Example: "Evan Evans Tours", "London Tours Ltd"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InsightDeck() {
  return (
    <ProtectedRoute
      fallback={
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white mb-2">What's in InsightDeck?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
            <div>
              <p className="font-medium text-emerald-400 mb-1">🎯 Market Intelligence</p>
              <p>Real-time competitor analysis and pricing insights</p>
            </div>
            <div>
              <p className="font-medium text-emerald-400 mb-1">📊 Performance Analytics</p>
              <p>Track your activities across multiple platforms</p>
            </div>
            <div>
              <p className="font-medium text-emerald-400 mb-1">🚀 Growth Opportunities</p>
              <p>Identify untapped markets and revenue potential</p>
            </div>
            <div>
              <p className="font-medium text-emerald-400 mb-1">🧠 AI-Powered Insights</p>
              <p>Get personalized recommendations and alerts</p>
            </div>
          </div>
        </div>
      }
    >
      <InsightDeckContent />
    </ProtectedRoute>
  );
} 
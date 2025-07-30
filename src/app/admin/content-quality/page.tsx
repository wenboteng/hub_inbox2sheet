'use client';

import { useState, useEffect } from 'react';
import { PrismaClient } from '@prisma/client';

interface ContentQualityStats {
  totalArticles: number;
  communityArticles: number;
  otaArticles: number;
  promotionalArticles: number;
  touristArticles: number;
  vendorArticles: number;
  highQualityArticles: number;
  mediumQualityArticles: number;
  lowQualityArticles: number;
  recentArticles: number;
  engagementStats: {
    highEngagement: number;
    mediumEngagement: number;
    lowEngagement: number;
  };
}

interface ArticleQuality {
  id: string;
  title: string;
  platform: string;
  contentType: string;
  source: string;
  qualityScore: number;
  priorityScore: number;
  isCommunity: boolean;
  isPromotional: boolean;
  isTourist: boolean;
  isVendor: boolean;
  lastUpdated: string;
  votes: number;
  recommendedAction: 'keep' | 'prioritize' | 'deprioritize' | 'remove';
}

export default function ContentQualityDashboard() {
  const [stats, setStats] = useState<ContentQualityStats | null>(null);
  const [articles, setArticles] = useState<ArticleQuality[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'community' | 'promotional' | 'tourist' | 'vendor'>('all');
  const [sortBy, setSortBy] = useState<'quality' | 'priority' | 'recent' | 'engagement'>('priority');

  useEffect(() => {
    fetchContentQualityData();
  }, []);

  const fetchContentQualityData = async () => {
    try {
      const [statsRes, articlesRes] = await Promise.all([
        fetch('/api/admin/content-quality/stats'),
        fetch('/api/admin/content-quality/articles')
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (articlesRes.ok) {
        const articlesData = await articlesRes.json();
        setArticles(articlesData);
      }
    } catch (error) {
      console.error('Failed to fetch content quality data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = articles.filter(article => {
    switch (filter) {
      case 'community':
        return article.isCommunity;
      case 'promotional':
        return article.isPromotional;
      case 'tourist':
        return article.isTourist;
      case 'vendor':
        return article.isVendor;
      default:
        return true;
    }
  });

  const sortedArticles = [...filteredArticles].sort((a, b) => {
    switch (sortBy) {
      case 'quality':
        return b.qualityScore - a.qualityScore;
      case 'priority':
        return b.priorityScore - a.priorityScore;
      case 'recent':
        return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      case 'engagement':
        return b.votes - a.votes;
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading content quality data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Content Quality Dashboard</h1>
          <p className="mt-2 text-gray-600">Monitor and manage content quality for tour vendors</p>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900">Total Articles</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.totalArticles}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900">Community Content</h3>
              <p className="text-3xl font-bold text-green-600">{stats.communityArticles}</p>
              <p className="text-sm text-gray-500">
                {((stats.communityArticles / stats.totalArticles) * 100).toFixed(1)}% of total
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900">High Quality</h3>
              <p className="text-3xl font-bold text-emerald-600">{stats.highQualityArticles}</p>
              <p className="text-sm text-gray-500">
                {((stats.highQualityArticles / stats.totalArticles) * 100).toFixed(1)}% of total
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900">Vendor Focused</h3>
              <p className="text-3xl font-bold text-purple-600">{stats.vendorArticles}</p>
              <p className="text-sm text-gray-500">
                {((stats.vendorArticles / stats.totalArticles) * 100).toFixed(1)}% of total
              </p>
            </div>
          </div>
        )}

        {/* Filters and Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Content</option>
                <option value="community">Community Content</option>
                <option value="promotional">Promotional Content</option>
                <option value="tourist">Tourist Content</option>
                <option value="vendor">Vendor Content</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="priority">Priority Score</option>
                <option value="quality">Quality Score</option>
                <option value="recent">Most Recent</option>
                <option value="engagement">Engagement</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchContentQualityData}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Refresh Data
              </button>
            </div>
          </div>
        </div>

        {/* Articles Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Content Analysis ({filteredArticles.length} articles)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Article
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Platform
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quality
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedArticles.slice(0, 50).map((article) => (
                  <tr key={article.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {article.title.substring(0, 60)}...
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(article.lastUpdated).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {article.platform}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{article.qualityScore}</div>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            article.qualityScore >= 80 ? 'bg-green-500' :
                            article.qualityScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${article.qualityScore}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{article.priorityScore}</div>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            article.priorityScore >= 80 ? 'bg-green-500' :
                            article.priorityScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${article.priorityScore}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {article.isCommunity && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Community
                          </span>
                        )}
                        {article.isPromotional && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Promotional
                          </span>
                        )}
                        {article.isTourist && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Tourist
                          </span>
                        )}
                        {article.isVendor && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Vendor
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        article.recommendedAction === 'prioritize' ? 'bg-green-100 text-green-800' :
                        article.recommendedAction === 'keep' ? 'bg-blue-100 text-blue-800' :
                        article.recommendedAction === 'deprioritize' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {article.recommendedAction}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 
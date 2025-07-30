'use client';

import { useState, useEffect } from 'react';
import { SearchBar } from '@/components/SearchBar';
import { FeaturedFAQCard } from '@/components/FeaturedFAQCard';
import { InsightReportCard } from '@/components/InsightReportCard';

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
}

export default function HomePage() {
  const [featuredFAQs, setFeaturedFAQs] = useState<FAQItem[]>([]);
  const [insightReports, setInsightReports] = useState<InsightReport[]>([]);
  const [stats, setStats] = useState({
    totalQuestions: 0,
    totalPlatforms: 0,
    totalCategories: 0
  });

  // Fetch featured FAQs and insights on component mount
  useEffect(() => {
    fetchFeaturedContent();
    fetchStats();
  }, []);

  // Auto-rotate featured content every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchFeaturedContent();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchFeaturedContent = async () => {
    try {
      console.log('Fetching featured content...');
      
      // Fetch featured FAQs (algorithm-based selection)
      const faqResponse = await fetch('/api/faq/featured');
      console.log('FAQ response status:', faqResponse.status);
      
      if (faqResponse.ok) {
        const faqData = await faqResponse.json();
        console.log('FAQ data received:', faqData.length, 'items');
        setFeaturedFAQs(faqData.slice(0, 3)); // Show 3 cards
      } else {
        console.error('FAQ API failed:', faqResponse.status, faqResponse.statusText);
      }

      // Fetch insight reports
      const insightsResponse = await fetch('/api/insights/featured');
      console.log('Insights response status:', insightsResponse.status);
      
      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json();
        console.log('Insights data received:', insightsData.length, 'items');
        setInsightReports(insightsData.slice(0, 3)); // Show 3 cards
      } else {
        console.error('Insights API failed:', insightsResponse.status, insightsResponse.statusText);
      }
    } catch (error) {
      console.error('Error fetching featured content:', error);
    }
  };

  const fetchStats = async () => {
    try {
      console.log('Fetching stats...');
      const response = await fetch('/api/faq/stats');
      console.log('Stats response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Stats data received:', data);
        setStats({
          totalQuestions: data.totalQuestions || 0,
          totalPlatforms: data.platforms?.length || 0,
          totalCategories: data.categories?.length || 0
        });
      } else {
        console.error('Stats API failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Remove handleSearch since we're redirecting to search page

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0F2F] to-[#1E223F] text-white">
      {/* Hero Section with Search */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo and Title */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent mb-4">
              Tour Vendor Intelligence
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Find solutions to your tour business challenges from 1,744+ verified answers across 8+ platforms
            </p>
          </div>

          {/* Stats Bar */}
          <div className="flex justify-center items-center space-x-8 mb-12 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-emerald-400 font-semibold">{stats.totalQuestions.toLocaleString()}+</span>
              <span className="text-gray-400">Solutions</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-emerald-400 font-semibold">{stats.totalPlatforms}+</span>
              <span className="text-gray-400">Platforms</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-emerald-400 font-semibold">{stats.totalCategories}+</span>
              <span className="text-gray-400">Categories</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-16">
            <SearchBar 
              placeholder="Search for tour vendor solutions..."
              className="w-full"
            />
          </div>
        </div>
      </section>

      {/* Featured FAQ Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#1A1F3A] to-[#2A2F5A]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Featured Solutions
            </h2>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Top solutions for tour vendors, automatically selected based on popularity and quality
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredFAQs.map((faq) => (
              <FeaturedFAQCard key={faq.id} faq={faq} />
            ))}
          </div>

          <div className="text-center mt-8">
            <a 
              href="/faq" 
              className="inline-flex items-center px-6 py-3 border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-white rounded-lg transition-colors"
            >
              View All Solutions
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Insight Reports Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Intelligence Reports
            </h2>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Data-driven insights to help you optimize your tour business
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {insightReports.map((insight) => (
              <InsightReportCard key={insight.id} insight={insight} />
            ))}
          </div>

          <div className="text-center mt-8">
            <a 
              href="/reports" 
              className="inline-flex items-center px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
            >
              View All Reports
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

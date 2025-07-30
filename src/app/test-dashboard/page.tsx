'use client';

import { useState } from 'react';

export default function TestDashboard() {
  const [selectedCity, setSelectedCity] = useState('London');

  const UK_CITIES = [
    'London', 'Edinburgh', 'Manchester', 'Birmingham', 'Liverpool',
    'Glasgow', 'Bristol', 'Leeds', 'Cardiff', 'Newcastle'
  ];

  const mockMarketData = {
    totalCompetitors: 45,
    averagePrice: 89.50,
    averageRating: 4.3,
    marketSaturation: 'medium' as const,
    pricingOpportunity: 'competitive' as const,
    topProviders: [
      { name: 'London Tours Ltd', activityCount: 12, averageRating: 4.5, averagePrice: 95 },
      { name: 'City Explorer', activityCount: 8, averageRating: 4.2, averagePrice: 78 },
      { name: 'Heritage Tours', activityCount: 6, averageRating: 4.7, averagePrice: 120 }
    ],
    priceRange: { min: 25, max: 200 },
    ratingRange: { min: 3.8, max: 4.9 },
    city: selectedCity,
    category: 'All'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0F2F] to-[#1E223F] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Dashboard Test Page</h1>
        
        {/* City Selector */}
        <div className="mb-8">
          <label className="block text-sm font-medium mb-2">Select City:</label>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {UK_CITIES.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        {/* Market Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 rounded-lg p-6 border border-white/10">
            <h3 className="text-lg font-semibold mb-4">Market Overview</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Competitors</span>
                <span className="font-semibold">{mockMarketData.totalCompetitors}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Avg Price</span>
                <span className="font-semibold">£{mockMarketData.averagePrice}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Avg Rating</span>
                <span className="font-semibold">{mockMarketData.averageRating}</span>
              </div>
            </div>
          </div>

          <div className="bg-white/10 rounded-lg p-6 border border-white/10">
            <h3 className="text-lg font-semibold mb-4">Market Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Saturation</span>
                <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-600">
                  {mockMarketData.marketSaturation}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Opportunity</span>
                <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-600">
                  {mockMarketData.pricingOpportunity}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white/10 rounded-lg p-6 border border-white/10">
            <h3 className="text-lg font-semibold mb-4">Price Range</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Min Price</span>
                <span className="font-semibold">£{mockMarketData.priceRange.min}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Max Price</span>
                <span className="font-semibold">£{mockMarketData.priceRange.max}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Competitors */}
        <div className="bg-white/10 rounded-lg p-6 border border-white/10">
          <h3 className="text-lg font-semibold mb-4">Top Competitors in {selectedCity}</h3>
          <div className="space-y-3">
            {mockMarketData.topProviders.map((provider, index) => (
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
                    <div className="text-sm text-white">★ {provider.averageRating}</div>
                    <p className="text-sm text-gray-300">£{provider.averagePrice} avg</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Market Insights */}
        <div className="mt-8 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-lg p-6 border border-emerald-500/30">
          <h3 className="text-lg font-semibold text-emerald-400 mb-4">Market Insights for {selectedCity}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-white">Pricing Strategy</h4>
              <p className="text-sm text-gray-300">
                Market prices are competitive. Focus on differentiation and value-added services to stand out from the competition.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-white">Market Opportunity</h4>
              <p className="text-sm text-gray-300">
                Moderate competition detected. Focus on unique value propositions and excellent customer service to capture market share.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
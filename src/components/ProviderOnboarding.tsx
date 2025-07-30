'use client';

import { useState } from 'react';
import { MagnifyingGlassIcon, PlusIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ProviderOnboardingProps {
  onProviderLinked: () => void;
}

export default function ProviderOnboarding({ onProviderLinked }: ProviderOnboardingProps) {
  const [providerName, setProviderName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const searchProviders = async () => {
    if (!providerName.trim()) return;
    
    setIsSearching(true);
    setError('');
    setSearchResults([]);
    
    try {
      const response = await fetch(`/api/market/activities?search=${encodeURIComponent(providerName)}&limit=10`);
      const data = await response.json();
      
      if (data.activities) {
        // Group by provider name
        const providers = data.activities.reduce((acc: any, activity: any) => {
          if (!acc[activity.providerName]) {
            acc[activity.providerName] = {
              name: activity.providerName,
              activities: [],
              totalActivities: 0,
              averagePrice: 0,
              averageRating: 0,
              totalReviews: 0
            };
          }
          
          acc[activity.providerName].activities.push(activity);
          acc[activity.providerName].totalActivities++;
          
          if (activity.priceNumeric) {
            acc[activity.providerName].averagePrice += activity.priceNumeric;
          }
          if (activity.ratingNumeric) {
            acc[activity.providerName].averageRating += activity.ratingNumeric;
          }
          if (activity.reviewCountNumeric) {
            acc[activity.providerName].totalReviews += activity.reviewCountNumeric;
          }
          
          return acc;
        }, {});
        
        // Calculate averages
        Object.values(providers).forEach((provider: any) => {
          const activitiesWithPrice = provider.activities.filter((a: any) => a.priceNumeric);
          const activitiesWithRating = provider.activities.filter((a: any) => a.ratingNumeric);
          
          if (activitiesWithPrice.length > 0) {
            provider.averagePrice = provider.averagePrice / activitiesWithPrice.length;
          }
          if (activitiesWithRating.length > 0) {
            provider.averageRating = provider.averageRating / activitiesWithRating.length;
          }
        });
        
        setSearchResults(Object.values(providers));
      }
    } catch (error) {
      setError('Failed to search providers');
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
          providerName,
          userId: 'demo-user' // For demo purposes
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess(`Successfully linked ${providerName} with ${data.userProvider.linkedActivities} activities!`);
        setProviderName('');
        setSearchResults([]);
        onProviderLinked();
      } else {
        setError(data.message || data.error || 'Failed to link provider');
      }
    } catch (error) {
      setError('Failed to link provider');
    } finally {
      setIsLinking(false);
    }
  };

  return (
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

      {/* Search Input */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={providerName}
            onChange={(e) => setProviderName(e.target.value)}
            placeholder="Enter your provider name (e.g., 'London Tours Ltd')"
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && searchProviders()}
          />
        </div>
        <button
          onClick={searchProviders}
          disabled={isSearching || !providerName.trim()}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          {isSearching ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Searching...
            </>
          ) : (
            <>
              <MagnifyingGlassIcon className="h-4 w-4" />
              Search
            </>
          )}
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded-lg flex items-center gap-2">
          <XMarkIcon className="h-5 w-5 text-red-400" />
          <span className="text-red-400 text-sm">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-emerald-900/20 border border-emerald-700 rounded-lg flex items-center gap-2">
          <CheckIcon className="h-5 w-5 text-emerald-400" />
          <span className="text-emerald-400 text-sm">{success}</span>
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-300">
            Found {searchResults.length} provider(s):
          </h4>
          
          {searchResults.map((provider, index) => (
            <div
              key={index}
              className="bg-gray-800 border border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-white">{provider.name}</h5>
                <button
                  onClick={() => linkProvider(provider.name)}
                  disabled={isLinking}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded flex items-center gap-1 transition-colors"
                >
                  {isLinking ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      Linking...
                    </>
                  ) : (
                    <>
                      <PlusIcon className="h-3 w-3" />
                      Link Provider
                    </>
                  )}
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm text-gray-400">
                <div>
                  <span className="font-medium text-gray-300">{provider.totalActivities}</span> activities
                </div>
                <div>
                  <span className="font-medium text-gray-300">
                    {provider.averagePrice ? `£${Math.round(provider.averagePrice)}` : 'N/A'}
                  </span> avg price
                </div>
                <div>
                  <span className="font-medium text-gray-300">
                    {provider.averageRating ? `${Math.round(provider.averageRating * 10) / 10}/5` : 'N/A'}
                  </span> avg rating
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {searchResults.length === 0 && providerName && !isSearching && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">No providers found matching "{providerName}"</p>
          <p className="text-xs mt-1">Try a different search term or check the spelling</p>
        </div>
      )}
    </div>
  );
} 
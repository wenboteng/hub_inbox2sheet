'use client';

import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, BookmarkIcon, ShareIcon, EyeIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/solid';

interface FAQCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  priority: number;
  questionCount: number;
}

interface VendorQuestion {
  id: string;
  question: string;
  answer: string;
  categoryId: string;
  platform: string;
  tags: string[];
  upvotes: number;
  downvotes: number;
  viewCount: number;
  isTopQuestion: boolean;
  isTopAnswered: boolean;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number;
  contentQuality: number;
  isVerified: boolean;
  lastUpdated: string;
  sourceUrl?: string;
  contentType?: string;
  source?: string;
  // AI Summary fields
  aiSummary?: string;
  keyPoints?: string[];
  actionItems?: string[];
  urgency?: 'high' | 'medium' | 'low';
  impact?: 'revenue' | 'customer' | 'technical' | 'general';
  category: FAQCategory;
}

interface FAQStats {
  totalQuestions: number;
  topQuestions: number;
  verifiedAnswers: number;
  platforms: { platform: string; count: number }[];
  categories: { category: string; count: number }[];
}

export default function FAQPage() {
  const [questions, setQuestions] = useState<VendorQuestion[]>([]);
  const [categories, setCategories] = useState<FAQCategory[]>([]);
  const [stats, setStats] = useState<FAQStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'quality' | 'views' | 'recent'>('relevance');
  const [showTopQuestions, setShowTopQuestions] = useState(false);
  const [contentLevels, setContentLevels] = useState<Record<string, 'summary' | 'keyPoints' | 'full'>>({});

  useEffect(() => {
    fetchFAQData();
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [searchQuery, selectedCategory, selectedDifficulty, selectedPlatform, sortBy, showTopQuestions]);

  const fetchFAQData = async () => {
    try {
      const [categoriesRes, statsRes] = await Promise.all([
        fetch('/api/faq/categories'),
        fetch('/api/faq/stats'),
      ]);

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Failed to fetch FAQ data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      const params = new URLSearchParams({
        search: searchQuery,
        category: selectedCategory,
        difficulty: selectedDifficulty,
        platform: selectedPlatform,
        sortBy,
        topOnly: showTopQuestions.toString(),
      });

      const response = await fetch(`/api/faq/questions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setQuestions(data);
      }
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    }
  };

  const handleBookmark = async (questionId: string) => {
    // TODO: Implement bookmark functionality
    console.log('Bookmark clicked for question:', questionId);
  };

  const handleShare = async (question: VendorQuestion) => {
    // TODO: Implement share functionality
    console.log('Share clicked for question:', question.id);
  };



  const setContentLevel = (questionId: string, level: 'summary' | 'keyPoints' | 'full') => {
    setContentLevels(prev => ({
      ...prev,
      [questionId]: level
    }));
  };

  const getContentLevel = (questionId: string): 'summary' | 'keyPoints' | 'full' => {
    return contentLevels[questionId] || 'summary';
  };

  // Component to render 3-level progressive disclosure content
  const renderProgressiveContent = (question: VendorQuestion) => {
    const level = getContentLevel(question.id);

    return (
      <div className="space-y-4">
        {/* Level 1: AI Summary */}
        {level === 'summary' && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-blue-600 font-medium flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AI Summary
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(question.urgency)}`}>
                  {question.urgency} priority
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImpactColor(question.impact)}`}>
                  {question.impact} impact
                </span>
              </div>
            </div>
            <p className="text-gray-700 mb-3">{question.aiSummary || 'AI summary not available.'}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setContentLevel(question.id, 'keyPoints')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
              >
                View Key Points
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={() => setContentLevel(question.id, 'full')}
                className="text-gray-600 hover:text-gray-800 text-sm font-medium flex items-center gap-1"
              >
                View Full Content
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Level 2: Key Points */}
        {level === 'keyPoints' && (
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-start justify-between mb-3">
              <span className="text-green-700 font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Key Points
              </span>
              <button
                onClick={() => setContentLevel(question.id, 'summary')}
                className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Summary
              </button>
            </div>
            <ul className="space-y-2 mb-4">
              {question.keyPoints?.map((point, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span className="text-gray-700">{point}</span>
                </li>
              ))}
            </ul>
            {question.actionItems && question.actionItems.length > 0 && (
              <div className="mt-4 p-3 bg-white rounded border">
                <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-1">
                  <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Action Items:
                </h4>
                <ul className="space-y-1">
                  {question.actionItems.map((action, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-orange-500 mt-1">→</span>
                      <span className="text-gray-700">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-4">
              <button
                onClick={() => setContentLevel(question.id, 'full')}
                className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center gap-1"
              >
                View Full Content
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Level 3: Full Content */}
        {level === 'full' && (
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-start justify-between mb-3">
              <span className="text-gray-700 font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Full Content
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setContentLevel(question.id, 'summary')}
                  className="text-gray-600 hover:text-gray-800 text-sm font-medium flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Summary
                </button>
                <button
                  onClick={() => setContentLevel(question.id, 'keyPoints')}
                  className="text-gray-600 hover:text-gray-800 text-sm font-medium flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Key Points
                </button>
              </div>
            </div>
            <div className="prose prose-sm text-gray-700 mb-4 max-w-none">
              {formatContent(question.answer)}
            </div>
            {question.sourceUrl && (
              <div className="mt-4 p-3 bg-gray-50 rounded border">
                <p className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Source:
                </p>
                <a
                  href={question.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium break-all flex items-center gap-1"
                >
                  {question.sourceUrl}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getImpactColor = (impact?: string) => {
    switch (impact) {
      case 'revenue': return 'bg-green-100 text-green-800';
      case 'customer': return 'bg-blue-100 text-blue-800';
      case 'technical': return 'bg-purple-100 text-purple-800';
      case 'general': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      'airbnb': '🏠',
      'getyourguide': '🎫',
      'viator': '🗺️',
      'booking': '📅',
      'expedia': '✈️',
      'tripadvisor': '🍽️',
      'reddit': '🤖',
      'stackoverflow': '💻',
      'quora': '❓',
      'default': '🌐'
    };
    return icons[platform.toLowerCase()] || icons.default;
  };

  const formatContent = (content: string) => {
    // Check if content contains HTML tags
    const hasHtml = /<[^>]*>/g.test(content);
    
    if (hasHtml) {
      // If content has HTML, render it safely
      return (
        <div 
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    } else {
      // Enhanced text formatting for better readability
      const lines = content.split('\n').filter(line => line.trim());
      const formattedElements: JSX.Element[] = [];
      
      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        
        // Skip empty lines
        if (!trimmedLine) return;
        
        // Detect and format different content types
        if (trimmedLine.match(/^[•\-\*]\s+/)) {
          // Bullet points
          formattedElements.push(
            <li key={index} className="mb-2 text-gray-700 leading-relaxed flex items-start">
              <span className="text-blue-500 mr-2 mt-1">•</span>
              <span>{trimmedLine.replace(/^[•\-\*]\s+/, '')}</span>
            </li>
          );
        } else if (trimmedLine.match(/^\d+\.\s+/)) {
          // Numbered lists
          formattedElements.push(
            <li key={index} className="mb-2 text-gray-700 leading-relaxed flex items-start">
              <span className="text-blue-500 mr-2 mt-1 font-medium">
                {trimmedLine.match(/^\d+\./)?.[0]}
              </span>
              <span>{trimmedLine.replace(/^\d+\.\s+/, '')}</span>
            </li>
          );
        } else if (trimmedLine.match(/^Step\s+\d+:/i)) {
          // Step-by-step instructions
          formattedElements.push(
            <div key={index} className="bg-blue-50 border-l-4 border-blue-400 pl-4 py-2 my-3 rounded-r-lg">
              <p className="text-gray-800 font-medium leading-relaxed">
                {trimmedLine}
              </p>
            </div>
          );
        } else if (trimmedLine.match(/^[A-Z][A-Z\s]+:$/)) {
          // Section headers (ALL CAPS followed by colon)
          formattedElements.push(
            <h4 key={index} className="text-lg font-semibold text-gray-900 mt-6 mb-3 border-b border-gray-200 pb-2">
              {trimmedLine.replace(':', '')}
            </h4>
          );
        } else if (trimmedLine.match(/^[A-Z][^.!?]*:$/)) {
          // Subsection headers (starts with capital, ends with colon)
          formattedElements.push(
            <h5 key={index} className="text-md font-medium text-gray-800 mt-4 mb-2">
              {trimmedLine.replace(':', '')}
            </h5>
          );
        } else if (trimmedLine.match(/^["'""].*["'""]$/)) {
          // Quoted text
          formattedElements.push(
            <blockquote key={index} className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 rounded-r-lg">
              <p className="text-gray-700 italic leading-relaxed">
                {trimmedLine.replace(/^["'""]|["'""]$/g, '')}
              </p>
            </blockquote>
          );
        } else if (trimmedLine.match(/^[A-Z][^.!?]*!/)) {
          // Important statements (end with exclamation)
          formattedElements.push(
            <div key={index} className="bg-yellow-50 border-l-4 border-yellow-400 pl-4 py-2 my-3 rounded-r-lg">
              <p className="text-gray-800 font-medium leading-relaxed">
                {trimmedLine}
              </p>
            </div>
          );
        } else if (trimmedLine.match(/^[A-Z][^.!?]*\?/)) {
          // Questions within answers
          formattedElements.push(
            <div key={index} className="bg-gray-50 border-l-4 border-gray-400 pl-4 py-2 my-3 rounded-r-lg">
              <p className="text-gray-700 font-medium leading-relaxed">
                {trimmedLine}
              </p>
            </div>
          );
        } else if (trimmedLine.match(/^(Note|Tip|Important|Warning):/i)) {
          // Notes, tips, and warnings
          const type = trimmedLine.match(/^(Note|Tip|Important|Warning):/i)?.[1]?.toLowerCase();
          const bgColor = type === 'warning' ? 'bg-red-50 border-red-400' : 
                         type === 'important' ? 'bg-yellow-50 border-yellow-400' :
                         type === 'tip' ? 'bg-green-50 border-green-400' : 'bg-blue-50 border-blue-400';
          const textColor = type === 'warning' ? 'text-red-800' : 
                           type === 'important' ? 'text-yellow-800' :
                           type === 'tip' ? 'text-green-800' : 'text-blue-800';
          
          formattedElements.push(
            <div key={index} className={`${bgColor} border-l-4 pl-4 py-2 my-3 rounded-r-lg`}>
              <p className={`${textColor} font-medium leading-relaxed`}>
                {trimmedLine}
              </p>
            </div>
          );
        } else if (trimmedLine.match(/^[A-Z][^.!?]*\./)) {
          // Regular sentences
          formattedElements.push(
            <p key={index} className="mb-3 text-gray-700 leading-relaxed">
              {trimmedLine}
            </p>
          );
        } else {
          // Default paragraph
          formattedElements.push(
            <p key={index} className="mb-3 text-gray-700 leading-relaxed">
              {trimmedLine}
            </p>
          );
        }
      });
      
      // Group list items together
      const finalElements: JSX.Element[] = [];
      let currentList: JSX.Element[] = [];
      let inList = false;
      
      formattedElements.forEach((element, index) => {
        if (element.type === 'li') {
          if (!inList) {
            inList = true;
            currentList = [];
          }
          currentList.push(element);
        } else {
          if (inList && currentList.length > 0) {
            finalElements.push(
              <ul key={`list-${index}`} className="mb-4 ml-4">
                {currentList}
              </ul>
            );
            currentList = [];
            inList = false;
          }
          finalElements.push(element);
        }
      });
      
      // Handle any remaining list items
      if (inList && currentList.length > 0) {
        finalElements.push(
          <ul key="list-final" className="mb-4 ml-4">
            {currentList}
          </ul>
        );
      }
      
      return (
        <div className="space-y-2">
          {finalElements}
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading FAQ content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Tour Vendor FAQ
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Find answers to common questions about tour operations, pricing, marketing, and more from experienced tour vendors and industry experts.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{stats.totalQuestions}</div>
                <div className="text-sm text-gray-600">Total Questions</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{stats.topQuestions}</div>
                <div className="text-sm text-gray-600">Top Questions</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{stats.verifiedAnswers}</div>
                <div className="text-sm text-gray-600">Verified Answers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">{stats.platforms.length}</div>
                <div className="text-sm text-gray-600">Platforms</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Search */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                    selectedCategory === 'all'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  All Categories ({stats?.totalQuestions || 0})
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center ${
                      selectedCategory === category.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-2">{category.icon}</span>
                    <span className="flex-1">{category.name}</span>
                    <span className="text-xs text-gray-500">({category.questionCount})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
              
              {/* Difficulty */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              {/* Platform */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Platforms</option>
                  {stats?.platforms.map((platform) => (
                    <option key={platform.platform} value={platform.platform}>
                      {platform.platform} ({platform.count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="relevance">Relevance</option>
                  <option value="quality">Quality</option>
                  <option value="views">Most Viewed</option>
                  <option value="recent">Recent</option>
                </select>
              </div>

              {/* Top Questions Toggle */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="topQuestions"
                  checked={showTopQuestions}
                  onChange={(e) => setShowTopQuestions(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="topQuestions" className="ml-2 text-sm text-gray-700">
                  Show top questions only
                </label>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Results Header */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {questions.length} Questions Found
                  </h2>
                  {searchQuery && (
                    <p className="text-sm text-gray-600 mt-1">
                      Results for "{searchQuery}"
                    </p>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  Last updated: {new Date().toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-6">
              {questions.map((question) => {
                
                return (
                  <div key={question.id} className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{getPlatformIcon(question.platform)}</span>
                          <span className="text-sm text-gray-500 capitalize">{question.platform}</span>
                          {question.isVerified && (
                            <CheckCircleIcon className="h-4 w-4 text-green-500" title="Verified Answer" />
                          )}
                          {question.isTopQuestion && (
                            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" title="Top Question" />
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                            {question.difficulty}
                          </span>
                          {question.contentType && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              question.contentType === 'official' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {question.contentType === 'official' ? 'Official' : 'Community'}
                            </span>
                          )}
                        </div>
                        
                        <h3 className="text-lg font-semibold text-gray-900 mb-3 leading-relaxed">
                          {question.question}
                        </h3>
                        
                        <div className="prose prose-sm text-gray-700 mb-4 max-w-none bg-white p-4 rounded-lg border border-gray-100">
                          {renderProgressiveContent(question)}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {question.upvotes > 0 && (
                            <span className="flex items-center gap-1">
                              <EyeIcon className="h-4 w-4" />
                              {question.upvotes} helpful
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <ChatBubbleLeftRightIcon className="h-4 w-4" />
                            {question.contentQuality}% quality
                          </span>
                          <span>• {question.estimatedTime} min read</span>
                          <span>• {new Date(question.lastUpdated).toLocaleDateString()}</span>
                        </div>
                        
                        {/* Source Attribution */}
                        {question.sourceUrl && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Source:</span>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  question.contentType === 'official' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {question.contentType === 'official' ? 'Official' : 'Community'}
                                </span>
                                {question.source && (
                                  <span className="text-xs text-gray-600 capitalize">
                                    {question.source.replace('_', ' ')}
                                  </span>
                                )}
                              </div>
                              <a
                                href={question.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                              >
                                View Original Source
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        <button
                          onClick={() => handleBookmark(question.id)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                          title="Bookmark"
                        >
                          <BookmarkIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleShare(question)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md"
                          title="Share"
                        >
                          <ShareIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Tags:</span>
                        {question.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {questions.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <InformationCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No questions found</h3>
                <p className="text-gray-600">
                  Try adjusting your search terms or filters to find what you're looking for.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
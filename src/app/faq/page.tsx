'use client';

import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, BookmarkIcon, ShareIcon, EyeIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/solid';
import Head from 'next/head';

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
  const [aiGenerating, setAiGenerating] = useState<Record<string, { summary?: boolean; keyPoints?: boolean; actionItems?: boolean }>>({});
  
  // Pagination state
  const [displayedQuestions, setDisplayedQuestions] = useState<VendorQuestion[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const ITEMS_PER_PAGE = 6; // Show 6 questions initially
  
  // AI Assistant state
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);

  useEffect(() => {
    fetchFAQData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setHasMore(true);
    fetchQuestions(1, false);
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

  const fetchQuestions = async (page = 1, append = false) => {
    try {
      const params = new URLSearchParams({
        search: searchQuery,
        category: selectedCategory,
        difficulty: selectedDifficulty,
        platform: selectedPlatform,
        sortBy,
        topOnly: showTopQuestions.toString(),
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      });

      const response = await fetch(`/api/faq/questions?${params}`);
      if (response.ok) {
        const data = await response.json();
        
        if (append) {
          setDisplayedQuestions(prev => [...prev, ...data.questions]);
        } else {
          setDisplayedQuestions(data.questions);
          setQuestions(data.questions); // Keep full list for filtering
        }
        
        setHasMore(data.hasMore);
        setCurrentPage(page);
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

  const handleSearch = () => {
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  const handleShowMore = async () => {
    setLoadingMore(true);
    await fetchQuestions(currentPage + 1, true);
    setLoadingMore(false);
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

  // Generate AI summary on-demand
  const generateAISummary = async (questionId: string) => {
    setAiGenerating(prev => ({ ...prev, [questionId]: { ...prev[questionId], summary: true } }));
    
    try {
      const response = await fetch(`/api/faq/generate-summary/${questionId}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update the question with new AI summary
        setQuestions(prev => prev.map(q => 
          q.id === questionId 
            ? { ...q, aiSummary: data.aiSummary, category: data.category }
            : q
        ));
        
        // Show the summary
        setContentLevel(questionId, 'summary');
      }
    } catch (error) {
      console.error('Error generating AI summary:', error);
    } finally {
      setAiGenerating(prev => ({ ...prev, [questionId]: { ...prev[questionId], summary: false } }));
    }
  };

  // Generate key points on-demand
  const generateKeyPoints = async (questionId: string) => {
    setAiGenerating(prev => ({ ...prev, [questionId]: { ...prev[questionId], keyPoints: true } }));
    
    try {
      const response = await fetch(`/api/faq/generate-keypoints/${questionId}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update the question with new key points
        setQuestions(prev => prev.map(q => 
          q.id === questionId 
            ? { ...q, keyPoints: data.keyPoints }
            : q
        ));
        
        // Show the key points
        setContentLevel(questionId, 'keyPoints');
      }
    } catch (error) {
      console.error('Error generating key points:', error);
    } finally {
      setAiGenerating(prev => ({ ...prev, [questionId]: { ...prev[questionId], keyPoints: false } }));
    }
  };

  // Generate action items on-demand
  const generateActionItems = async (questionId: string) => {
    setAiGenerating(prev => ({ ...prev, [questionId]: { ...prev[questionId], actionItems: true } }));
    
    try {
      const response = await fetch(`/api/faq/generate-actionitems/${questionId}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update the question with new action items
        setQuestions(prev => prev.map(q => 
          q.id === questionId 
            ? { ...q, actionItems: data.actionItems }
            : q
        ));
      }
    } catch (error) {
      console.error('Error generating action items:', error);
    } finally {
      setAiGenerating(prev => ({ ...prev, [questionId]: { ...prev[questionId], actionItems: false } }));
    }
  };

  // Component to render progressive disclosure content with on-demand AI generation
  const renderProgressiveContent = (question: VendorQuestion) => {
    const level = getContentLevel(question.id);
    const isGeneratingSummary = aiGenerating[question.id]?.summary;
    const isGeneratingKeyPoints = aiGenerating[question.id]?.keyPoints;
    const isGeneratingActionItems = aiGenerating[question.id]?.actionItems;

    return (
      <div className="space-y-4">
        {/* Progressive Disclosure Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* AI Summary Button */}
          <button
            onClick={() => question.aiSummary ? setContentLevel(question.id, 'summary') : generateAISummary(question.id)}
            disabled={isGeneratingSummary}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              question.aiSummary 
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } ${isGeneratingSummary ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isGeneratingSummary ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                {question.aiSummary ? '🤖 AI Summary' : '🤖 Generate AI Summary'}
              </>
            )}
          </button>

          {/* Key Points Button */}
          <button
            onClick={() => question.keyPoints?.length ? setContentLevel(question.id, 'keyPoints') : generateKeyPoints(question.id)}
            disabled={isGeneratingKeyPoints}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              question.keyPoints?.length 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } ${isGeneratingKeyPoints ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isGeneratingKeyPoints ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {question.keyPoints?.length ? '📋 Key Points' : '📋 Generate Key Points'}
              </>
            )}
          </button>

          {/* Action Items Button */}
          <button
            onClick={() => generateActionItems(question.id)}
            disabled={isGeneratingActionItems}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              question.actionItems?.length 
                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } ${isGeneratingActionItems ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isGeneratingActionItems ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {question.actionItems?.length ? '✅ Action Items' : '✅ Generate Action Items'}
              </>
            )}
          </button>

          {/* Full Content Button */}
          <button
            onClick={() => setContentLevel(question.id, 'full')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            📄 Full Content
          </button>
        </div>

        {/* Level 1: AI Summary - Only show if generated */}
        {level === 'summary' && question.aiSummary && (
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
            <p className="text-gray-700 mb-3">{question.aiSummary}</p>
          </div>
        )}

        {/* Level 2: Key Points - Only show if generated */}
        {level === 'keyPoints' && question.keyPoints && question.keyPoints.length > 0 && (
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-start justify-between mb-3">
              <span className="text-green-700 font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Key Points
              </span>
            </div>
            <ul className="space-y-2 mb-4">
              {question.keyPoints.map((point, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span className="text-gray-700">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Items Section - Only show if generated */}
        {question.actionItems && question.actionItems.length > 0 && (
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="flex items-start justify-between mb-3">
              <span className="text-orange-700 font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Action Items
              </span>
            </div>
            <ul className="space-y-2">
              {question.actionItems.map((action, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-orange-600 mt-1">→</span>
                  <span className="text-gray-700">{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Full Content - Always available */}
        {level === 'full' && (
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-start justify-between mb-3">
              <span className="text-gray-700 font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Full Content
              </span>
            </div>
            <div className="text-gray-700 whitespace-pre-wrap mb-4">{formatContent(question.answer)}</div>
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
        } else if (trimmedLine.match(/^[A-Z][^.!?]*\!/)) {
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

  // Generate a short preview from the answer content
  const generatePreview = (content: string): { preview: string; isTruncated: boolean } => {
    // Clean the content first - remove HTML tags and get plain text
    const cleanContent = content.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, ' ').trim();
    
    // Extract the first meaningful paragraph or sentence
    const sentences = cleanContent.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    if (sentences.length === 0) {
      return { preview: "No preview available.", isTruncated: false };
    }
    
    // Take the first sentence or first 150 characters, whichever is shorter
    let preview = sentences[0].trim();
    let isTruncated = false;
    
    // If the first sentence is too long, truncate it
    if (preview.length > 150) {
      preview = preview.substring(0, 147) + '...';
      isTruncated = true;
    }
    
    // If it's too short, add the next sentence
    if (preview.length < 50 && sentences.length > 1) {
      const secondSentence = sentences[1].trim();
      const combined = preview + '. ' + secondSentence;
      if (combined.length <= 150) {
        preview = combined;
      } else {
        preview = combined.substring(0, 147) + '...';
        isTruncated = true;
      }
    }
    
    return { preview: preview || "No preview available.", isTruncated };
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>OTAAnswers.com - Loading...</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading FAQ content...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>OTAAnswers.com - Your Virtual Assistant for OTA Market Intelligence</title>
        <meta name="description" content="Search questions and explore how tour vendors are using insights to grow their businesses. Get AI-powered answers to OTA platform questions, pricing strategies, and market intelligence." />
        <meta name="keywords" content="OTA, tour vendor, market intelligence, Airbnb, booking, pricing, marketing, customer service, technical setup" />
        <meta name="author" content="OTAAnswers.com" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://otaanswers.com/" />
        <meta property="og:title" content="OTAAnswers.com - Your Virtual Assistant for OTA Market Intelligence" />
        <meta property="og:description" content="Search questions and explore how tour vendors are using insights to grow their businesses. Get AI-powered answers to OTA platform questions." />
        <meta property="og:image" content="https://otaanswers.com/og-image.jpg" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://otaanswers.com/" />
        <meta property="twitter:title" content="OTAAnswers.com - Your Virtual Assistant for OTA Market Intelligence" />
        <meta property="twitter:description" content="Search questions and explore how tour vendors are using insights to grow their businesses. Get AI-powered answers to OTA platform questions." />
        <meta property="twitter:image" content="https://otaanswers.com/og-image.jpg" />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href="https://otaanswers.com/" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-[#0B0F2F] to-[#1E223F]">
      {/* Simple Header */}
      <div className="bg-gradient-to-r from-[#1A1F3A] to-[#2A2F5A] border-b border-white/10">
        <div className="max-w-none mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-4">
              Tour Vendor Solutions
            </h1>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Find answers to your tour business challenges from our curated collection of solutions
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-none mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Intelligence Command Center Sidebar */}
          <div className="lg:w-1/4">
            <div className="bg-gradient-to-b from-[#1A1F3A] to-[#2A2F5A] rounded-xl shadow-xl border border-white/10 p-6 sticky top-4">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Intelligence Filters
              </h3>
              
              {/* Search */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search Intelligence
                </label>
                <input
                  type="text"
                  placeholder="Search insights..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 text-white placeholder-gray-400"
                />
              </div>
              
              {/* Category Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Intelligence Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 text-white"
                >
                  <option value="all">All Intelligence</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name} ({category.questionCount})
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Difficulty Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Strategy Level
                </label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 text-white"
                >
                  <option value="all">All Levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              
              {/* Platform Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Platform Intelligence
                </label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 text-white"
                >
                  <option value="all">All Platforms</option>
                  <option value="airbnb">Airbnb</option>
                  <option value="booking">Booking.com</option>
                  <option value="vrbo">VRBO</option>
                  <option value="expedia">Expedia</option>
                </select>
              </div>
              
              {/* Sort By */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                  Sort Intelligence
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 text-white"
                >
                  <option value="relevance">Relevance</option>
                  <option value="quality">Quality</option>
                  <option value="views">Views</option>
                  <option value="recent">Recent</option>
                </select>
              </div>
              
              {/* Top Questions Toggle */}
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showTopQuestions}
                    onChange={(e) => setShowTopQuestions(e.target.checked)}
                    className="rounded border-white/20 text-emerald-500 focus:ring-emerald-400 bg-white/10"
                  />
                  <span className="ml-2 text-sm text-gray-300">Premium Intelligence Only</span>
                </label>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:w-3/4">
            {/* Results Header */}
            <div className="bg-gradient-to-br from-[#1A1F3A] to-[#2A2F5A] rounded-xl shadow-xl border border-white/10 p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {displayedQuestions.length} Intelligence Reports Found
                  </h2>
                  {searchQuery && (
                    <p className="text-sm text-gray-300 mt-1">
                      Results for "{searchQuery}"
                    </p>
                  )}
                </div>
                <div className="text-sm text-gray-400">
                  Last updated: {new Date().toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-6">
              {displayedQuestions.map((question) => {
                // Generate insight type based on content
                const getInsightType = (question: VendorQuestion) => {
                  const text = `${question.question} ${question.answer}`.toLowerCase();
                  if (text.includes('price') || text.includes('cost') || text.includes('revenue')) {
                    return { type: '📉 Price Risk', color: 'border-red-500 bg-red-500/10' };
                  }
                  if (text.includes('competitor') || text.includes('market') || text.includes('trend')) {
                    return { type: '🕵️‍♂️ Competitor Movement', color: 'border-blue-500 bg-blue-500/10' };
                  }
                  if (text.includes('opportunity') || text.includes('growth') || text.includes('expand')) {
                    return { type: '🚀 Market Gap', color: 'border-emerald-500 bg-emerald-500/10' };
                  }
                  if (text.includes('customer') || text.includes('guest') || text.includes('service')) {
                    return { type: '🎯 Customer Insight', color: 'border-cyan-500 bg-cyan-500/10' };
                  }
                  return { type: '📊 Market Intelligence', color: 'border-purple-500 bg-purple-500/10' };
                };
                
                const insightType = getInsightType(question);
                
                return (
                  <div key={question.id} className={`bg-gradient-to-br from-[#1A1F3A] to-[#2A2F5A] rounded-xl shadow-xl border ${insightType.color} p-6`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          {/* Insight Type Badge */}
                          <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${insightType.color.replace('border-', 'bg-').replace('/10', '/20')}`}>
                            {insightType.type}
                          </span>
                          
                          {/* Platform Badge */}
                          <span className="px-2 py-1 bg-white/10 text-white text-xs rounded-full border border-white/20">
                            {getPlatformIcon(question.platform)} {question.platform}
                          </span>
                          
                          {/* Difficulty Badge */}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            question.difficulty === 'beginner' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' :
                            question.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/30' :
                            'bg-red-500/20 text-red-300 border border-red-400/30'
                          }`}>
                            {question.difficulty}
                          </span>
                          
                          {/* Verified Badge */}
                          {question.isVerified && (
                            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded-full border border-emerald-400/30 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Verified
                            </span>
                          )}
                        </div>
                        
                        <h3 className="text-xl font-bold text-white leading-relaxed mb-3">
                          {question.question}
                        </h3>
                        
                        {/* Preview/Description */}
                        <div className="mb-4">
                          {(() => {
                            const { preview, isTruncated } = generatePreview(question.answer);
                            return (
                              <>
                                <p className="text-gray-300 leading-relaxed">
                                  {preview}
                                </p>
                                {isTruncated && (
                                  <button 
                                    onClick={() => setContentLevel(question.id, 'full')}
                                    className="text-cyan-400 hover:text-cyan-300 text-sm font-medium mt-2 transition-colors"
                                  >
                                    Read full intelligence →
                                  </button>
                                )}
                              </>
                            );
                          })()}
                          
                          {/* Quick Stats */}
                          <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              {question.viewCount || 0} views
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {question.upvotes || 0} helpful
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {question.estimatedTime} min read
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {new Date(question.lastUpdated).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        
                        {/* Intelligence Content */}
                        <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4 mb-4">
                          {renderProgressiveContent(question)}
                        </div>
                        
                        {/* Tags */}
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-xs text-gray-400">Intelligence Tags:</span>
                          {question.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="px-2 py-1 bg-white/10 text-gray-300 text-xs rounded-full border border-white/20">
                              {tag}
                            </span>
                          ))}
                        </div>
                        
                        {/* Source Attribution */}
                        {question.sourceUrl && (
                          <div className="pt-3 border-t border-white/10">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">Source:</span>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  question.contentType === 'official' 
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' 
                                    : 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                                }`}>
                                  {question.contentType === 'official' ? 'Official' : 'Community'}
                                </span>
                                {question.source && (
                                  <span className="text-xs text-gray-400 capitalize">
                                    {question.source.replace('_', ' ')}
                                  </span>
                                )}
                              </div>
                              <a
                                href={question.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-400 hover:text-cyan-300 text-sm font-medium flex items-center gap-1 transition-colors"
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
                          className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors"
                          title="Bookmark Intelligence"
                        >
                          <BookmarkIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleShare(question)}
                          className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/20 rounded-lg transition-colors"
                          title="Share Intelligence"
                        >
                          <ShareIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Initial Search Prompt */}
            {displayedQuestions.length === 0 && !loading && !searchQuery && (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <div className="max-w-md mx-auto">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Start Your Search</h3>
                  <p className="text-gray-600 mb-4">
                    Search for specific questions or browse categories to find answers about tour operations, pricing, and platform management.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <button
                      onClick={() => {
                        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
                        searchInput?.focus();
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Start Searching
                    </button>
                    <button
                      onClick={() => setSelectedCategory('pricing')}
                      className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Browse Categories
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Show More Button */}
            {hasMore && displayedQuestions.length > 0 && (
              <div className="text-center mt-8">
                <button
                  onClick={handleShowMore}
                  disabled={loadingMore}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-colors flex items-center gap-2 mx-auto"
                >
                  {loadingMore ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading...
                    </>
                  ) : (
                    <>
                      Show More Questions
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </button>
                <p className="text-sm text-gray-500 mt-2">
                  Showing {displayedQuestions.length} of {stats?.totalQuestions || 0} questions
                </p>
              </div>
            )}

            {displayedQuestions.length === 0 && !loading && (
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

      {/* Bottom CTA Section */}
      <div className="bg-gradient-to-r from-[#0B0F2F] to-[#1E223F] border-t border-white/10">
        <div className="max-w-none mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4 text-white">
              🧠 Ready to Get Personalized Intel?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Unlock competitor tracking, pricing trends, and AI-powered recommendations for your tour business.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <button className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-emerald-500/25">
                Start Free Trial
              </button>
              <button className="px-8 py-4 border-2 border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-[#0B0F2F] rounded-xl font-semibold text-lg transition-all duration-300">
                Learn More
              </button>
            </div>
            <p className="text-sm text-gray-400">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </div>

      {/* GPT-Powered Intelligence Assistant */}
      <div className="fixed bottom-6 right-6 z-50">
        {aiAssistantOpen ? (
          <div className="bg-gradient-to-br from-[#1A1F3A] to-[#2A2F5A] rounded-2xl shadow-2xl border border-emerald-400/30 p-6 max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold">Intelligence Agent</h3>
                  <p className="text-gray-400 text-sm">Ask me anything...</p>
                </div>
              </div>
              <button
                onClick={() => setAiAssistantOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-2 mb-4">
              <button className="w-full text-left p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg text-sm transition-colors">
                "Where is demand growing this week?"
              </button>
              <button className="w-full text-left p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg text-sm transition-colors">
                "Which of my products is underpriced?"
              </button>
              <button className="w-full text-left p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg text-sm transition-colors">
                "What categories are underserved in Lisbon?"
              </button>
            </div>
            
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask your question..."
                className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 text-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
              />
              <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAiAssistantOpen(true)}
            className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white rounded-full p-4 shadow-2xl transition-all duration-300 hover:scale-110"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </button>
        )}
      </div>
    </div>
    </>
  );
} 
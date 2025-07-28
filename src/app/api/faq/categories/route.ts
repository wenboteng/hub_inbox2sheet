import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Try to get categories from the Report table first
    const faqReport = await prisma.report.findUnique({
      where: { type: 'faq_categories' }
    });

    if (faqReport) {
      const categories = JSON.parse(faqReport.content);
      
      // Add question counts from existing Article table
      const categoriesWithCounts = await Promise.all(
        categories.map(async (category: any) => {
          const count = await prisma.article.count({
            where: { 
              category: category.name,
              contentType: 'faq'
            }
          });
          
          return {
            ...category,
            id: category.name.toLowerCase().replace(/\s+/g, '-'),
            questionCount: count
          };
        })
      );

      return NextResponse.json(categoriesWithCounts);
    }

    // Fallback to default categories if not found
    const defaultCategories = [
      {
        id: 'pricing',
        name: 'Pricing & Revenue',
        description: 'Strategies for pricing tours, revenue optimization, and financial management',
        icon: '💰',
        color: '#10B981',
        priority: 1,
        questionCount: 0
      },
      {
        id: 'marketing',
        name: 'Marketing & SEO',
        description: 'Digital marketing, SEO strategies, and promotional techniques',
        icon: '📈',
        color: '#3B82F6',
        priority: 2,
        questionCount: 0
      },
      {
        id: 'customer-service',
        name: 'Customer Service',
        description: 'Guest relations, customer support, and service excellence',
        icon: '🎯',
        color: '#F59E0B',
        priority: 3,
        questionCount: 0
      },
      {
        id: 'technical',
        name: 'Technical Setup',
        description: 'Platform configuration, technical requirements, and system setup',
        icon: '⚙️',
        color: '#8B5CF6',
        priority: 4,
        questionCount: 0
      },
      {
        id: 'booking',
        name: 'Booking & Cancellations',
        description: 'Reservation management, cancellation policies, and booking optimization',
        icon: '📅',
        color: '#EF4444',
        priority: 5,
        questionCount: 0
      },
      {
        id: 'legal',
        name: 'Policies & Legal',
        description: 'Legal requirements, terms of service, and compliance',
        icon: '⚖️',
        color: '#6B7280',
        priority: 6,
        questionCount: 0
      },
      {
        id: 'community',
        name: 'Community Insights',
        description: 'Real experiences and advice from the travel community',
        icon: '👥',
        color: '#EC4899',
        priority: 7,
        questionCount: 0
      },
      {
        id: 'expert',
        name: 'Expert Advice',
        description: 'Professional insights and industry best practices',
        icon: '🎓',
        color: '#059669',
        priority: 8,
        questionCount: 0
      },
      {
        id: 'technical-solutions',
        name: 'Technical Solutions',
        description: 'Technical problems and their solutions',
        icon: '🔧',
        color: '#DC2626',
        priority: 9,
        questionCount: 0
      },
      {
        id: 'general',
        name: 'General',
        description: 'General questions and miscellaneous topics',
        icon: '📚',
        color: '#9CA3AF',
        priority: 10,
        questionCount: 0
      }
    ];

    return NextResponse.json(defaultCategories);
  } catch (error) {
    console.error('Failed to fetch FAQ categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
} 
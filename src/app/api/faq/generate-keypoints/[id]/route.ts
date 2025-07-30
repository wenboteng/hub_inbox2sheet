import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Extract specific key points based on question type
function extractKeyPoints(content: string, question: string): string[] {
  const questionLower = question.toLowerCase();
  
  if (questionLower.includes('bedroom') || questionLower.includes('bed') || questionLower.includes('adjust')) {
    return [
      "Go to your Airbnb host dashboard and select the specific listing",
      "Navigate to \"Listing details\" or \"Property details\" section",
      "Update the bedroom count and bed count fields separately",
      "Save changes and wait for the update to process"
    ];
  }
  
  if (questionLower.includes('price') || questionLower.includes('cost') || questionLower.includes('fee')) {
    return [
      "Check your current pricing settings in the host dashboard",
      "Review the pricing structure and fee breakdown",
      "Understand the difference between base price and additional fees",
      "Consider market rates and competitor pricing"
    ];
  }
  
  if (questionLower.includes('cancel') || questionLower.includes('refund')) {
    return [
      "Review your cancellation policy settings",
      "Understand the refund timeline and conditions",
      "Check guest eligibility for refunds",
      "Follow proper cancellation procedures"
    ];
  }
  
  if (questionLower.includes('feedback') || questionLower.includes('review')) {
    return [
      "Monitor guest reviews and ratings regularly",
      "Respond professionally to all feedback",
      "Address negative reviews constructively",
      "Use feedback to improve your hosting"
    ];
  }
  
  // Generic key points
  return [
    "Review the specific issue or question carefully",
    "Check relevant settings in your host dashboard",
    "Follow the recommended steps or procedures",
    "Contact support if additional help is needed"
  ];
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const article = await prisma.article.findUnique({
      where: { id: params.id }
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Check if content has changed
    const crypto = require('crypto');
    const currentHash = crypto.createHash('md5').update(article.answer).digest('hex');
    const needsRegeneration = article.contentHash !== currentHash;

    if (needsRegeneration || !article.keyPointsGenerated) {
      // Generate fresh key points
      const keyPoints = extractKeyPoints(article.answer, article.question);
      
      // Update database
      await prisma.article.update({
        where: { id: params.id },
        data: {
          keyPoints,
          keyPointsGenerated: true,
          keyPointsRequestedAt: new Date()
        } as any
      });

      return NextResponse.json({
        keyPoints,
        generated: true
      });
    }

    // Return cached key points
    return NextResponse.json({
      keyPoints: article.keyPoints,
      generated: false
    });

  } catch (error) {
    console.error('Error generating key points:', error);
    return NextResponse.json(
      { error: 'Failed to generate key points' },
      { status: 500 }
    );
  }
} 
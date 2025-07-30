import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../../../lib/auth';

const prisma = new PrismaClient();

// Get saved questions
export const GET = requireAuth(async (request: NextRequest, user) => {
  try {
    const savedQuestions = await prisma.savedQuestion.findMany({
      where: { userId: user.userId },
      include: {
        question: {
          select: {
            id: true,
            question: true,
            answer: true,
            category: true,
            platform: true,
            isVerified: true,
            lastUpdated: true
          }
        }
      },
      orderBy: { savedAt: 'desc' }
    });

    const formattedQuestions = savedQuestions.map(saved => ({
      id: saved.id,
      question: saved.question.question,
      answer: saved.question.answer,
      category: saved.question.category,
      platform: saved.question.platform,
      isVerified: saved.question.isVerified,
      savedAt: saved.savedAt.toISOString(),
      notes: saved.notes
    }));

    return NextResponse.json({ questions: formattedQuestions });
  } catch (error) {
    console.error('Error fetching saved questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch saved questions' },
      { status: 500 }
    );
  }
});

// Save a question
export const POST = requireAuth(async (request: NextRequest, user) => {
  try {
    const { questionId, notes } = await request.json();

    if (!questionId) {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 }
      );
    }

    // Check if already saved
    const existing = await prisma.savedQuestion.findUnique({
      where: {
        userId_questionId: {
          userId: user.userId,
          questionId: questionId
        }
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Question already saved' },
        { status: 409 }
      );
    }

    // Save the question
    const savedQuestion = await prisma.savedQuestion.create({
      data: {
        userId: user.userId,
        questionId: questionId,
        notes: notes || null
      },
      include: {
        question: {
          select: {
            question: true,
            category: true,
            platform: true
          }
        }
      }
    });

    return NextResponse.json({
      message: 'Question saved successfully',
      savedQuestion: {
        id: savedQuestion.id,
        question: savedQuestion.question.question,
        category: savedQuestion.question.category,
        platform: savedQuestion.question.platform,
        savedAt: savedQuestion.savedAt.toISOString(),
        notes: savedQuestion.notes
      }
    });
  } catch (error) {
    console.error('Error saving question:', error);
    return NextResponse.json(
      { error: 'Failed to save question' },
      { status: 500 }
    );
  }
});

// Remove saved question
export const DELETE = requireAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const savedQuestionId = searchParams.get('id');

    if (!savedQuestionId) {
      return NextResponse.json(
        { error: 'Saved question ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const savedQuestion = await prisma.savedQuestion.findFirst({
      where: {
        id: savedQuestionId,
        userId: user.userId
      }
    });

    if (!savedQuestion) {
      return NextResponse.json(
        { error: 'Saved question not found' },
        { status: 404 }
      );
    }

    // Delete the saved question
    await prisma.savedQuestion.delete({
      where: { id: savedQuestionId }
    });

    return NextResponse.json({
      message: 'Question removed from saved list'
    });
  } catch (error) {
    console.error('Error removing saved question:', error);
    return NextResponse.json(
      { error: 'Failed to remove saved question' },
      { status: 500 }
    );
  }
}); 
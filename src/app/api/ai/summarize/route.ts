import { NextRequest, NextResponse } from 'next/server';

// Mock GPT-4o API call (replace with actual OpenAI integration)
async function generateAISummary(content: string, question: string): Promise<{
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  urgency: 'high' | 'medium' | 'low';
  impact: 'revenue' | 'customer' | 'technical' | 'general';
}> {
  // For now, we'll create intelligent summaries based on content analysis
  // In production, this would call OpenAI's GPT-4o API
  
  const contentLower = content.toLowerCase();
  const questionLower = question.toLowerCase();
  
  // Analyze content for urgency indicators
  const urgencyIndicators = {
    high: ['urgent', 'immediate', 'critical', 'emergency', 'asap', 'now', 'deadline', 'penalty', 'suspended', 'banned'],
    medium: ['soon', 'recommended', 'should', 'important', 'consider', 'plan'],
    low: ['optional', 'future', 'consider', 'might', 'could', 'suggestion']
  };
  
  let urgency: 'high' | 'medium' | 'low' = 'low';
  for (const [level, indicators] of Object.entries(urgencyIndicators)) {
    if (indicators.some(indicator => contentLower.includes(indicator))) {
      urgency = level as 'high' | 'medium' | 'low';
      break;
    }
  }
  
  // Analyze content for impact type
  const impactIndicators = {
    revenue: ['revenue', 'income', 'profit', 'earnings', 'money', 'pricing', 'commission', 'fee'],
    customer: ['guest', 'customer', 'review', 'rating', 'feedback', 'complaint', 'satisfaction'],
    technical: ['technical', 'setup', 'configuration', 'api', 'integration', 'bug', 'error'],
    general: ['policy', 'rule', 'guideline', 'best practice', 'tip']
  };
  
  let impact: 'revenue' | 'customer' | 'technical' | 'general' = 'general';
  for (const [type, indicators] of Object.entries(impactIndicators)) {
    if (indicators.some(indicator => contentLower.includes(indicator))) {
      impact = type as 'revenue' | 'customer' | 'technical' | 'general';
      break;
    }
  }
  
  // Generate intelligent summary based on content analysis
  const summary = generateIntelligentSummary(content, question, urgency, impact);
  const keyPoints = extractKeyPoints(content, question);
  const actionItems = extractActionItems(content);
  
  return {
    summary,
    keyPoints,
    actionItems,
    urgency,
    impact
  };
}

function generateIntelligentSummary(content: string, question: string, urgency: string, impact: string): string {
  // Extract the most important information based on the question and content
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  // Find sentences that contain key information
  const keySentences = sentences.filter(sentence => {
    const lower = sentence.toLowerCase();
    return lower.includes('should') || lower.includes('need') || lower.includes('must') || 
           lower.includes('recommend') || lower.includes('important') || lower.includes('key');
  });
  
  if (keySentences.length > 0) {
    return keySentences[0].trim() + '.';
  }
  
  // Fallback: use the first meaningful sentence
  return sentences[0]?.trim() + '.' || 'Important information for tour vendors.';
}

function extractKeyPoints(content: string, question: string): string[] {
  const keyPoints: string[] = [];
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  // Extract sentences with actionable information
  const actionableSentences = sentences.filter(sentence => {
    const lower = sentence.toLowerCase();
    return lower.includes('you can') || lower.includes('you should') || 
           lower.includes('try') || lower.includes('use') || lower.includes('check') ||
           lower.includes('contact') || lower.includes('update') || lower.includes('change');
  });
  
  // Convert to key points
  actionableSentences.slice(0, 5).forEach(sentence => {
    const point = sentence.trim()
      .replace(/^you can /i, '')
      .replace(/^you should /i, '')
      .replace(/^try /i, '')
      .replace(/^use /i, '')
      .replace(/^check /i, '')
      .replace(/^contact /i, '')
      .replace(/^update /i, '')
      .replace(/^change /i, '');
    
    if (point.length > 10 && point.length < 100) {
      keyPoints.push(point.charAt(0).toUpperCase() + point.slice(1));
    }
  });
  
  // If we don't have enough actionable points, add general insights
  if (keyPoints.length < 3) {
    const generalInsights = sentences.filter(s => 
      s.toLowerCase().includes('important') || s.toLowerCase().includes('note') || 
      s.toLowerCase().includes('remember') || s.toLowerCase().includes('keep')
    );
    
    generalInsights.slice(0, 3 - keyPoints.length).forEach(sentence => {
      const point = sentence.trim();
      if (point.length > 10 && point.length < 100) {
        keyPoints.push(point.charAt(0).toUpperCase() + point.slice(1));
      }
    });
  }
  
  return keyPoints.slice(0, 5);
}

function extractActionItems(content: string): string[] {
  const actionItems: string[] = [];
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  // Look for imperative sentences
  const imperativeSentences = sentences.filter(sentence => {
    const lower = sentence.toLowerCase();
    return lower.startsWith('do ') || lower.startsWith('don\'t ') || 
           lower.startsWith('make sure ') || lower.startsWith('ensure ') ||
           lower.includes('action required') || lower.includes('you must');
  });
  
  imperativeSentences.slice(0, 3).forEach(sentence => {
    const action = sentence.trim();
    if (action.length > 10 && action.length < 80) {
      actionItems.push(action.charAt(0).toUpperCase() + action.slice(1));
    }
  });
  
  return actionItems;
}

export async function POST(request: NextRequest) {
  try {
    const { content, question } = await request.json();
    
    if (!content || !question) {
      return NextResponse.json(
        { error: 'Content and question are required' },
        { status: 400 }
      );
    }
    
    const aiSummary = await generateAISummary(content, question);
    
    return NextResponse.json(aiSummary);
  } catch (error) {
    console.error('AI Summarization error:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
} 
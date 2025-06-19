import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { query, topResult } = await request.json();

    if (!query || !topResult) {
      return NextResponse.json(
        { error: "Query and top result are required" },
        { status: 400 }
      );
    }

    // Extract the most relevant paragraph from the top result
    const relevantParagraph = topResult.snippets.join(" ");

    // Create a prompt that focuses on making the response clear, helpful, and friendly
    const prompt = `Here's a user question: "${query}"

Here's the most relevant paragraph from official docs: "${relevantParagraph}"

Please write a clear, helpful, and friendly answer in human language. Your response should:

1. Directly address the user's specific question
2. Use conversational, approachable language (avoid robotic or overly formal tone)
3. Break down complex information into digestible parts
4. Be specific and actionable when possible
5. Maintain accuracy to the source material
6. Sound like a helpful human expert, not a technical document

Keep the response concise (2-3 sentences max) and focus on being genuinely helpful.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a friendly and knowledgeable support expert for tour and activity vendors. You help translate official documentation into clear, actionable advice that sounds human and helpful."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7, // Slightly higher for more natural, friendly responses
      max_tokens: 200, // Keep it concise but allow for friendly tone
    });

    const aiAnswer = completion.choices[0]?.message?.content || null;

    return NextResponse.json({ 
      aiAnswer,
      originalParagraph: relevantParagraph // Return the original for backup/reference
    });
  } catch (error) {
    console.error("GPT response layer error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI answer" },
      { status: 500 }
    );
  }
} 
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

    // Create prompt for generating a natural language summary
    const prompt = `Based on the user's query and the top search result, generate a concise, helpful summary that directly answers their question.

User Query: "${query}"

Top Result:
Question: ${topResult.question}
Content: ${topResult.snippets.join(" ")}
Platform: ${topResult.platform}

Please provide a natural language summary that:
1. Directly addresses the user's specific question
2. Uses clear, conversational language
3. Includes the most relevant information from the result
4. Is concise (1-2 sentences max)
5. Sounds helpful and authoritative
6. Focuses on actionable information

Format the response as a simple text answer, no HTML formatting needed.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful support assistant for tour and activity vendors. Provide clear, concise answers based on the available information."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3, // Low temperature for consistent, factual responses
      max_tokens: 150, // Keep it short and sweet
    });

    const summary = completion.choices[0]?.message?.content || null;

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Answer summary error:", error);
    return NextResponse.json(
      { error: "Failed to generate answer summary" },
      { status: 500 }
    );
  }
} 
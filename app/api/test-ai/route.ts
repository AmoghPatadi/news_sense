import { NextResponse } from "next/server"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"
import { analyzeSentimentHF, extractFinancialEntities } from "@/lib/huggingface"
import { config } from "@/lib/config"

export async function POST(request: Request) {
  try {
    const { text = "Tesla stock surged 5% today on positive earnings news" } = await request.json()

    const results = {
      groq: null as any,
      huggingface: {
        sentiment: null as any,
        entities: null as any,
      },
      timestamp: new Date().toISOString(),
    }

    // Test Groq
    try {
      const { text: groqResponse } = await generateText({
        model: groq(config.groq.model),
        prompt: `Analyze this financial news in 2 sentences: ${text}`,
      })
      results.groq = {
        success: true,
        response: groqResponse,
        model: config.groq.model,
      }
    } catch (error) {
      results.groq = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }

    // Test Hugging Face Sentiment
    try {
      const sentiment = await analyzeSentimentHF(text)
      results.huggingface.sentiment = {
        success: true,
        result: sentiment,
      }
    } catch (error) {
      results.huggingface.sentiment = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }

    // Test Hugging Face NER
    try {
      const entities = await extractFinancialEntities(text)
      results.huggingface.entities = {
        success: true,
        result: entities,
      }
    } catch (error) {
      results.huggingface.entities = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error("AI test error:", error)
    return NextResponse.json({ error: "Failed to test AI integrations" }, { status: 500 })
  }
}

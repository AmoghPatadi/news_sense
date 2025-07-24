import { NextResponse } from "next/server"
import { generateText } from "ai"
import { createServerClient } from "@/lib/supabase"
import { scrapeStockData, searchStocks } from "@/lib/google-finance-scraper"
import { config } from "@/lib/config"

export async function POST(request: Request) {
  try {
    const { question } = await request.json()
    const startTime = Date.now()
    const supabase = createServerClient()

    // Extract ticker from question
    const tickerMatch = question.match(/\b[A-Z]{1,5}\b/g)
    const potentialTickers = tickerMatch || []
    let contextData = ""

    if (potentialTickers.length > 0) {
      for (const ticker of potentialTickers) {
        // Scrape latest stock data
        const stockData = await scrapeStockData(ticker)

        if (stockData) {
          contextData += `\n\nStock: ${stockData.name} (${stockData.ticker})\n`
          contextData += `Current Price: $${stockData.price}\n`
          contextData += `Change: ${(stockData.changePercent * 100).toFixed(2)}%\n`
          contextData += `Market Cap: ${stockData.marketCap}\n`
          contextData += `P/E Ratio: ${stockData.peRatio}\n`
          contextData += `Day Range: ${stockData.dayRange}\n`
          contextData += `52-Week Range: ${stockData.yearRange}\n`
          contextData += `Volume: ${stockData.volume}\n`
        }

        // Optionally scrape related news, summarize news influences and append to contextData
      }
    }
    
    // If no specific ticker found, handle general market news
    if (!contextData) {
      contextData = "Sorry, could not find specific information for the provided question."
    }

    const systemPrompt = `You are a financial AI assistant powered by Groq that helps users understand stock performance.

Use the provided context data to explain the price movements and summarize news influences. 

Context Data: ${contextData}`

    const { text } = await generateText({
      model: config.openai.model,
      system: systemPrompt,
      prompt: question,
    })

    const responseTime = Date.now() - startTime

    // Log the query
    await supabase.from("user_queries").insert({
      question,
      response: text,
      response_time_ms: responseTime,
    })

    return NextResponse.json({
      response: text,
      responseTimeMs: responseTime,
      provider: "Groq",
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json({ error: "Failed to process question" }, { status: 500 })
  }
}

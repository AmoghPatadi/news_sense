import { NextResponse } from "next/server"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"
import { createServerClient } from "@/lib/supabase"
import { config } from "@/lib/config"

export async function POST(request: Request) {
  try {
    const { question } = await request.json()
    const startTime = Date.now()
    const supabase = createServerClient()

    // Extract potential ticker from question
    const tickerMatch = question.match(/\b[A-Z]{1,5}\b/g)
    const potentialTickers = tickerMatch || []

    // Search for relevant funds and news
    let contextData = ""

    if (potentialTickers.length > 0) {
      for (const ticker of potentialTickers) {
        const { data: fund } = await supabase
          .from("funds")
          .select(`
            *,
            fund_news_links (
              relevance_score,
              news_articles (
                title,
                content,
                source,
                published_at,
                sentiment_score
              )
            )
          `)
          .eq("ticker", ticker)
          .single()

        if (fund) {
          contextData += `\n\nFund: ${fund.name} (${fund.ticker})\n`
          contextData += `Current Price: $${fund.last_price}\n`
          contextData += `Daily Change: ${(fund.daily_change * 100).toFixed(2)}%\n`
          contextData += `Sector: ${fund.sector}\n`

          if (fund.fund_news_links && fund.fund_news_links.length > 0) {
            contextData += "\nRecent News:\n"
            fund.fund_news_links.slice(0, 3).forEach((link: any) => {
              const article = link.news_articles
              contextData += `- ${article.title} (${article.source}, Sentiment: ${article.sentiment_score?.toFixed(2) || "N/A"})\n`
              if (article.content) {
                contextData += `  ${article.content.substring(0, 200)}...\n`
              }
            })
          }
        }
      }
    }

    // If no specific ticker found, get general market news
    if (!contextData) {
      const { data: recentNews } = await supabase
        .from("news_articles")
        .select("title, content, source, sentiment_score, published_at")
        .order("published_at", { ascending: false })
        .limit(5)

      if (recentNews && recentNews.length > 0) {
        contextData = "\n\nRecent Market News:\n"
        recentNews.forEach((article) => {
          contextData += `- ${article.title} (${article.source}, Sentiment: ${article.sentiment_score?.toFixed(2) || "N/A"})\n`
          if (article.content) {
            contextData += `  ${article.content.substring(0, 150)}...\n`
          }
        })
      }
    }

    const systemPrompt = `You are a financial AI assistant powered by Groq that helps users understand fund performance and market movements. 
    
    Use the provided context data to answer questions about funds, their performance, and related news. 
    
    Guidelines:
    - Be factual and cite specific data when available
    - Explain the connection between news events and fund performance
    - If sentiment data is available, incorporate it into your analysis
    - Keep responses concise but informative
    - If you don't have enough data, say so clearly
    - Use your knowledge of financial markets to provide insights
    
    Context Data: ${contextData}`

    const { text } = await generateText({
      model: groq(config.groq.model),
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

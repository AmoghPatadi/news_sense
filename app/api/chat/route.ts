import { NextResponse } from "next/server"
import { generateText } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { createServerClient } from "@/lib/supabase"
import { scrapeStockData } from "@/lib/google-finance-scraper"
import { scrapeNewsForStock } from "@/lib/news-scraper"
import { config } from "@/lib/config"

// Initialize Groq client
const groq = createGroq({
  apiKey: config.groq.apiKey,
})

export async function POST(request: Request) {
  try {
    const { question } = await request.json()
    const startTime = Date.now()
    const supabase = createServerClient()

    console.log(`Processing question: ${question}`)

    // Extract ticker symbols from question (common stock tickers)
    const tickerPattern = /\b[A-Z]{1,5}\b/g
    const tickerMatches = question.match(tickerPattern) || []
    
    // Filter for likely stock tickers (common ones)
    const commonTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'SPY', 'QQQ', 'VTI', 'ARKK', 'XLF']
    const detectedTickers = tickerMatches.filter(ticker => 
      commonTickers.includes(ticker) || ticker.length <= 5
    )

    let contextData = ""
    let newsData = ""

    if (detectedTickers.length > 0) {
      console.log(`Detected tickers: ${detectedTickers.join(', ')}`)
      
      for (const ticker of detectedTickers.slice(0, 2)) { // Limit to 2 tickers to avoid timeout
        try {
          console.log(`Scraping data for ${ticker}...`)
          
          // Scrape current stock data
          const stockData = await scrapeStockData(ticker)
          
          if (stockData) {
            contextData += `\n\n=== ${stockData.name} (${stockData.ticker}) ===\n`
            contextData += `Current Price: $${stockData.price}\n`
            contextData += `Daily Change: ${stockData.changePercent >= 0 ? '+' : ''}${(stockData.changePercent * 100).toFixed(2)}%\n`
            contextData += `Price Change: ${stockData.change >= 0 ? '+' : ''}$${stockData.change}\n`
            
            if (stockData.marketCap) contextData += `Market Cap: ${stockData.marketCap}\n`
            if (stockData.peRatio) contextData += `P/E Ratio: ${stockData.peRatio}\n`
            if (stockData.dayRange) contextData += `Day Range: ${stockData.dayRange}\n`
            if (stockData.yearRange) contextData += `52-Week Range: ${stockData.yearRange}\n`
            if (stockData.volume) contextData += `Volume: ${stockData.volume}\n`
          }

          // Scrape recent news for the stock
          console.log(`Scraping news for ${ticker}...`)
          const newsArticles = await scrapeNewsForStock(ticker, 5) // Get top 5 news articles
          
          if (newsArticles && newsArticles.length > 0) {
            newsData += `\n\n=== Recent News for ${ticker} ===\n`
            newsArticles.forEach((article, index) => {
              newsData += `\n${index + 1}. ${article.title}\n`
              newsData += `   Source: ${article.source}\n`
              newsData += `   Published: ${new Date(article.publishedAt).toLocaleDateString()}\n`
              if (article.sentiment !== undefined) {
                const sentimentLabel = article.sentiment > 0.1 ? 'Positive' : 
                                     article.sentiment < -0.1 ? 'Negative' : 'Neutral'
                newsData += `   Sentiment: ${sentimentLabel} (${(article.sentiment * 100).toFixed(1)}%)\n`
              }
              if (article.content) {
                newsData += `   Summary: ${article.content.substring(0, 200)}...\n`
              }
            })
          } else {
            newsData += `\n\nNo recent news found for ${ticker}\n`
          }
        } catch (error) {
          console.error(`Error processing ${ticker}:`, error)
          contextData += `\n\nError getting data for ${ticker}\n`
        }
      }
    }

    // Prepare the context for Groq
    let fullContext = ""
    if (contextData) fullContext += "STOCK DATA:" + contextData
    if (newsData) fullContext += "\n\nNEWS DATA:" + newsData
    
    if (!fullContext) {
      fullContext = "No specific stock data found. Please ask about a specific stock ticker (e.g., AAPL, TSLA, SPY)."
    }

    const systemPrompt = `You are a knowledgeable financial AI assistant that helps users understand stock performance and market trends.

Your role:
- Analyze the provided stock data and news information
- Explain price movements and their potential causes
- Provide insights based on recent news sentiment
- Give clear, actionable financial analysis
- Always mention that this is for informational purposes only

Be concise but comprehensive in your analysis. Focus on connecting news events to stock price movements when possible.`

    const userPrompt = `User Question: ${question}\n\nContext Data:\n${fullContext}`

    console.log('Sending request to Groq...')
    
    // Generate response using Groq
    const { text } = await generateText({
      model: groq(config.groq.model),
      system: systemPrompt,
      prompt: userPrompt,
      maxTokens: 1000,
      temperature: 0.7,
    })

    const responseTime = Date.now() - startTime
    console.log(`Response generated in ${responseTime}ms`)

    // Log the query to database
    try {
      await supabase.from("user_queries").insert({
        question,
        response: text,
        response_time_ms: responseTime,
      })
    } catch (dbError) {
      console.error('Error logging to database:', dbError)
    }

    return NextResponse.json({
      response: text,
      responseTimeMs: responseTime,
      provider: "Groq",
      model: config.groq.model,
      tickersAnalyzed: detectedTickers,
    })

  } catch (error) {
    console.error("Chat API error:", error)
    
    // Fallback response
    const fallbackResponse = "I'm sorry, I encountered an error while processing your request. Please try asking about a specific stock ticker (e.g., 'How is AAPL doing today?' or 'What's the latest news on TSLA?')."
    
    return NextResponse.json({ 
      response: fallbackResponse,
      error: "Processing failed",
      provider: "Fallback"
    }, { status: 200 }) // Return 200 to show the fallback message
  }
}

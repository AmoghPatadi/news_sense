import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { scrapeMultipleStocks } from "@/lib/google-finance-scraper"
import { scrapeNewsForStock, matchArticleToFunds } from "@/lib/news-scraper"
import { config } from "@/lib/config"
import type { Fund } from "@/lib/types"

// This endpoint can be called by a background service or cron job
export async function POST() {
  try {
    const supabase = createServerClient()
    const startTime = Date.now()

    console.log('Starting background data sync...')

    // Fetch fund tickers from the database
    const { data: funds, error: fundsError } = await supabase.from("funds").select("*")

    if (fundsError) {
      console.error('Error fetching funds:', fundsError)
      throw fundsError
    }

    console.log(`Found ${funds.length} funds to update`)

    // Update stock prices
    let updatedStockCount = 0
    const batchSize = 3 // Process stocks in smaller batches to avoid rate limiting
    
    for (let i = 0; i < funds.length; i += batchSize) {
      const batch = funds.slice(i, i + batchSize)
      const tickers = batch.map((fund: Fund) => fund.ticker)
      
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}: ${tickers.join(', ')}`)
      
      try {
        const stockData = await scrapeMultipleStocks(tickers)
        
        for (const stock of stockData) {
          const { error: updateError } = await supabase
            .from("funds")
            .update({
              last_price: stock.price,
              daily_change: stock.changePercent,
              updated_at: new Date().toISOString(),
            })
            .eq("ticker", stock.ticker)
          
          if (!updateError) {
            updatedStockCount++
            console.log(`✅ Updated ${stock.ticker}: $${stock.price} (${(stock.changePercent * 100).toFixed(2)}%)`)
          } else {
            console.error(`❌ Error updating ${stock.ticker}:`, updateError)
          }
        }
      } catch (batchError) {
        console.error(`Error processing batch ${Math.floor(i/batchSize) + 1}:`, batchError)
      }
      
      // Add delay between batches
      if (i + batchSize < funds.length) {
        await new Promise(resolve => setTimeout(resolve, config.scraping.delayMs))
      }
    }

    // Update news for a subset of funds (to avoid rate limiting)
    let processedArticles = 0
    const newsUpdateCount = Math.min(5, funds.length) // Limit news updates
    
    console.log(`Updating news for ${newsUpdateCount} funds...`)
    
    for (let i = 0; i < newsUpdateCount; i++) {
      const fund = funds[i]
      
      try {
        console.log(`Scraping news for ${fund.ticker}...`)
        const newsArticles = await scrapeNewsForStock(fund.ticker, 3)
        
        for (const article of newsArticles) {
          // Insert article into database
          const { data: insertedArticle, error: articleError } = await supabase
            .from("news_articles")
            .upsert({
              title: article.title,
              content: article.content,
              source: article.source,
              url: article.url,
              published_at: article.publishedAt,
              sentiment_score: article.sentiment || 0,
              processed_at: new Date().toISOString()
            }, {
              onConflict: 'url',
              ignoreDuplicates: false
            })
            .select()
            .single()

          if (insertedArticle && !articleError) {
            // Match article to funds and insert relevance scores
            const relevanceScores = await matchArticleToFunds(article, funds)
            
            for (const { fundId, relevance } of relevanceScores) {
              await supabase.from("fund_news_links").upsert({
                fund_id: fundId,
                article_id: insertedArticle.id,
                relevance_score: relevance,
              }, {
                onConflict: 'fund_id,article_id'
              })
            }
            processedArticles++
          }
        }
      } catch (newsError) {
        console.error(`Error processing news for ${fund.ticker}:`, newsError)
      }
      
      // Add delay between news scraping
      if (i < newsUpdateCount - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    console.log(`Background sync completed: ${updatedStockCount} stocks, ${processedArticles} articles`)

    const processingTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      updatedFunds: updatedStockCount,
      processedArticles,
      processingTimeMs: processingTime,
      dataProvider: "Google Finance + News Scrapers",
      message: `Background sync completed: Updated ${updatedStockCount} funds and processed ${processedArticles} articles`
    })

  } catch (error) {
    console.error("Background sync error:", error)
    return NextResponse.json({ 
      error: "Background sync failed", 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

// GET endpoint to check sync status
export async function GET() {
  try {
    const supabase = createServerClient()
    
    // Get latest update times
    const { data: latestUpdate } = await supabase
      .from("funds")
      .select("updated_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single()

    const { data: latestNews } = await supabase
      .from("news_articles")
      .select("processed_at")
      .order("processed_at", { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      lastStockUpdate: latestUpdate?.updated_at || null,
      lastNewsUpdate: latestNews?.processed_at || null,
      status: "running"
    })

  } catch (error) {
    console.error("Status check error:", error)
    return NextResponse.json({ 
      error: "Status check failed" 
    }, { status: 500 })
  }
}

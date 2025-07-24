import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { scrapeMultipleStocks } from "@/lib/google-finance-scraper"
import { scrapeNewsForStock, matchArticleToFunds } from "@/lib/news-scraper"
import type { Fund } from "@/lib/types"

export async function POST() {
  try {
    const supabase = createServerClient()
    const startTime = Date.now()

    console.log('Starting data sync process...')

    // Fetch fund tickers from the database
    const { data: funds, error: fundsError } = await supabase.from("funds").select("*")

    if (fundsError) {
      console.error('Error fetching funds:', fundsError)
      throw fundsError
    }

    console.log(`Found ${funds.length} funds to update`)

    // Use web scraping to get the latest stock data
    const updatedStocks = await scrapeMultipleStocks(funds.map((fund: Fund) => fund.ticker))
    console.log(`Successfully scraped ${updatedStocks.length} stocks`)

    // Update the database with the latest stock data
    let updatedCount = 0
    for (const stock of updatedStocks) {
      const { error: updateError } = await supabase
        .from("funds")
        .update({
          last_price: stock.price,
          daily_change: stock.changePercent,
          updated_at: new Date().toISOString(),
        })
        .eq("ticker", stock.ticker)
      
      if (!updateError) {
        updatedCount++
      } else {
        console.error(`Error updating ${stock.ticker}:`, updateError)
      }
    }

    console.log(`Updated ${updatedCount} funds in database`)

    // Scrape news for funds and update database
    let processedArticles = 0
    for (const fund of funds.slice(0, 5)) { // Limit to first 5 funds to avoid rate limiting
      try {
        console.log(`Scraping news for ${fund.ticker}...`)
        const newsArticles = await scrapeNewsForStock(fund.ticker, 5)
        
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
    }

    console.log(`Processed ${processedArticles} news articles`)

    // Report completion and diagnostics
    const processingTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      updatedFunds: updatedCount,
      processedArticles,
      processingTimeMs: processingTime,
      dataProvider: "Google Finance + News Scrapers",
      message: `Updated ${updatedCount} funds and processed ${processedArticles} news articles via web scraping`
    })

  } catch (error) {
    console.error("Data sync error:", error)
    return NextResponse.json({ 
      error: "Data sync failed", 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

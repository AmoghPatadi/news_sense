import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { fetchFundPrice } from "@/lib/polygon" // Changed from alpha-vantage
import { scrapeFinancialNews, calculateSentiment, matchArticleToFunds } from "@/lib/news-scraper"
import type { Fund } from "@/lib/types"

export async function POST() {
  try {
    const supabase = createServerClient()
    const startTime = Date.now()

    // 1. Update fund prices using Polygon.io
    const { data: funds, error: fundsError } = await supabase.from("funds").select("*")

    if (fundsError) {
      throw fundsError
    }

    let updatedFunds = 0
    for (const fund of funds as Fund[]) {
      const priceData = await fetchFundPrice(fund.ticker)
      if (priceData) {
        await supabase
          .from("funds")
          .update({
            last_price: priceData.price,
            daily_change: priceData.changePercent,
            updated_at: new Date().toISOString(),
          })
          .eq("id", fund.id)

        updatedFunds++
      }

      // Rate limiting - Polygon.io allows more requests but let's be conservative
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    // 2. Scrape and process news (unchanged)
    const articles = await scrapeFinancialNews()
    let processedArticles = 0

    for (const article of articles) {
      // Check if article already exists
      const { data: existing } = await supabase.from("news_articles").select("id").eq("url", article.url).single()

      if (existing) continue

      // Calculate sentiment
      const sentiment = calculateSentiment(`${article.title} ${article.content}`)

      // Insert article
      const { data: insertedArticle, error: insertError } = await supabase
        .from("news_articles")
        .insert({
          title: article.title,
          content: article.content,
          source: article.source,
          url: article.url,
          published_at: article.publishedAt.toISOString(),
          sentiment_score: sentiment,
        })
        .select()
        .single()

      if (insertError || !insertedArticle) {
        console.error("Error inserting article:", insertError)
        continue
      }

      // Match article to funds
      const matches = matchArticleToFunds(article, funds as Fund[])

      for (const match of matches) {
        await supabase.from("fund_news_links").insert({
          fund_id: match.fundId,
          article_id: insertedArticle.id,
          relevance_score: match.relevance,
        })
      }

      processedArticles++
    }

    const processingTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      updatedFunds,
      processedArticles,
      processingTimeMs: processingTime,
      dataProvider: "Polygon.io",
    })
  } catch (error) {
    console.error("Data sync error:", error)
    return NextResponse.json({ error: "Data sync failed" }, { status: 500 })
  }
}

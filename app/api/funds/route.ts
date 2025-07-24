import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = createServerClient()

    // Get basic funds data first
    const { data: funds, error } = await supabase
      .from("funds")
      .select("*")
      .order("ticker")

    if (error) {
      if (error.message.includes('relation "public.funds" does not exist')) {
        return NextResponse.json(
          {
            error: "Database tables not found. Please run the setup scripts first.",
            setupRequired: true,
            funds: [],
          },
          { status: 200 },
        )
      }
      console.error('Error fetching funds:', error)
      throw error
    }

    if (!funds || funds.length === 0) {
      console.log('No funds found in database')
      return NextResponse.json([])
    }

    console.log(`Found ${funds.length} funds, enriching with sentiment data...`)

    // Try to enrich with sentiment data, but don't fail if this doesn't work
    const enrichedFunds = await Promise.all(
      funds.map(async (fund) => {
        try {
          // Try to get recent news sentiment for this fund
          const { data: newsData, error: newsError } = await supabase
            .from('fund_news_links')
            .select(`
              news_articles(
                sentiment_score,
                published_at
              )
            `)
            .eq('fund_id', fund.id)
            .limit(10)

          let sentimentData = {
            avg_sentiment: 0,
            article_count: 0,
            positive_count: 0,
            negative_count: 0,
            neutral_count: 0
          }

          if (!newsError && newsData && newsData.length > 0) {
            const articles = newsData
              .map(link => link.news_articles)
              .filter(article => article && article.sentiment_score !== null)

            if (articles.length > 0) {
              const sentiments = articles.map(a => a.sentiment_score)
              sentimentData = {
                avg_sentiment: sentiments.reduce((sum, score) => sum + score, 0) / sentiments.length,
                article_count: articles.length,
                positive_count: sentiments.filter(score => score > 0.1).length,
                negative_count: sentiments.filter(score => score < -0.1).length,
                neutral_count: sentiments.filter(score => score >= -0.1 && score <= 0.1).length
              }
            }
          }

          return {
            ...fund,
            sentiment: sentimentData
          }
        } catch (err) {
          console.warn(`Could not enrich sentiment for ${fund.ticker}:`, err.message)
          // Return fund without sentiment data if enrichment fails
          return {
            ...fund,
            sentiment: {
              avg_sentiment: 0,
              article_count: 0,
              positive_count: 0,
              negative_count: 0,
              neutral_count: 0
            }
          }
        }
      })
    )

    console.log(`Returning ${enrichedFunds.length} enriched funds`)
    return NextResponse.json(enrichedFunds)
  } catch (error) {
    console.error("Error fetching funds:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch funds",
        setupRequired: false,
        funds: [],
      },
      { status: 500 },
    )
  }
}

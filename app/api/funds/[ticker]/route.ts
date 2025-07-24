import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export async function GET(request: Request, { params }: { params: Promise<{ ticker: string }> }) {
  try {
    const supabase = createServerClient()
    const { ticker } = await params

    // Get fund details
    const { data: fund, error: fundError } = await supabase
      .from("funds")
      .select("*")
      .eq("ticker", ticker.toUpperCase())
      .single()

    if (fundError) {
      if (fundError.message.includes('relation "public.funds" does not exist')) {
        return NextResponse.json(
          {
            error: "Database tables not found. Please run the setup scripts first.",
            setupRequired: true,
          },
          { status: 200 },
        )
      }
      if (fundError.code === "PGRST116") {
        // No rows returned
        return NextResponse.json({ error: "Fund not found" }, { status: 404 })
      }
      throw fundError
    }

    if (!fund) {
      return NextResponse.json({ error: "Fund not found" }, { status: 404 })
    }

    // Get related news articles with enhanced data
    // First, try the complex query, but fall back to simpler approach if it fails
    let newsLinks = null
    let newsError = null
    
    try {
      const { data, error } = await supabase
        .from("fund_news_links")
        .select(`
          relevance_score,
          news_articles (
            id,
            title,
            content,
            source,
            url,
            published_at,
            sentiment_score,
            processed_at
          )
        `)
        .eq("fund_id", fund.id)
        .order("relevance_score", { ascending: false })
        .limit(20)
      
      newsLinks = data
      newsError = error
    } catch (error) {
      console.warn('Complex news query failed, trying simpler approach:', error)
      
      // Fallback: Get news links first, then fetch articles separately
      const { data: links } = await supabase
        .from("fund_news_links")
        .select("article_id, relevance_score")
        .eq("fund_id", fund.id)
        .order("relevance_score", { ascending: false })
        .limit(20)
      
      if (links && links.length > 0) {
        const articleIds = links.map(link => link.article_id)
        const { data: articles } = await supabase
          .from("news_articles")
          .select("*")
          .in("id", articleIds)
          .order("published_at", { ascending: false })
        
        // Combine the data
        newsLinks = links.map(link => {
          const article = articles?.find(a => a.id === link.article_id)
          return {
            relevance_score: link.relevance_score,
            news_articles: article
          }
        }).filter(link => link.news_articles)
      }
    }

    if (newsError && !newsError.message.includes("relation")) {
      console.error("Error fetching news:", newsError)
    }

    // Process news articles and calculate sentiment metrics
    const newsArticles = newsLinks?.map((link) => ({
      ...link.news_articles,
      relevance_score: link.relevance_score,
    })) || []

    // Calculate sentiment analytics
    const sentimentAnalytics = {
      total_articles: newsArticles.length,
      avg_sentiment: 0,
      positive_count: 0,
      negative_count: 0,
      neutral_count: 0,
      sentiment_trend: [] as { date: string, sentiment: number }[]
    }

    if (newsArticles.length > 0) {
      const validSentiments = newsArticles
        .filter(article => article.sentiment_score !== null)
        .map(article => ({ 
          score: article.sentiment_score, 
          date: new Date(article.published_at).toISOString().split('T')[0]
        }))

      if (validSentiments.length > 0) {
        // Calculate overall metrics
        sentimentAnalytics.avg_sentiment = validSentiments.reduce((sum, item) => sum + item.score, 0) / validSentiments.length
        sentimentAnalytics.positive_count = validSentiments.filter(item => item.score > 0.1).length
        sentimentAnalytics.negative_count = validSentiments.filter(item => item.score < -0.1).length
        sentimentAnalytics.neutral_count = validSentiments.filter(item => item.score >= -0.1 && item.score <= 0.1).length

        // Calculate daily sentiment trend
        const dailySentiments = new Map()
        validSentiments.forEach(item => {
          if (!dailySentiments.has(item.date)) {
            dailySentiments.set(item.date, [])
          }
          dailySentiments.get(item.date).push(item.score)
        })

        sentimentAnalytics.sentiment_trend = Array.from(dailySentiments.entries())
          .map(([date, scores]) => ({
            date,
            sentiment: scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length
          }))
          .sort((a, b) => a.date.localeCompare(b.date))
      }
    }

    // Get today's sentiment summary if available
    const { data: todaySentiment } = await supabase
      .from("daily_sentiment_summary")
      .select("*")
      .eq("fund_id", fund.id)
      .eq("date", new Date().toISOString().split('T')[0])
      .single()

    const fundWithNews = {
      ...fund,
      news_articles: newsArticles,
      sentiment_analytics: sentimentAnalytics,
      daily_sentiment: todaySentiment || {
        avg_sentiment: sentimentAnalytics.avg_sentiment,
        article_count: sentimentAnalytics.total_articles,
        positive_count: sentimentAnalytics.positive_count,
        negative_count: sentimentAnalytics.negative_count,
        neutral_count: sentimentAnalytics.neutral_count
      },
      data_freshness: {
        price_updated: fund.updated_at,
        news_updated: newsArticles.length > 0 ? newsArticles[0].processed_at : null,
        is_price_fresh: new Date(fund.updated_at).getTime() > Date.now() - (2 * 60 * 60 * 1000), // 2 hours
        is_news_fresh: newsArticles.length > 0 && new Date(newsArticles[0].processed_at).getTime() > Date.now() - (4 * 60 * 60 * 1000) // 4 hours
      }
    }

    return NextResponse.json(fundWithNews)
  } catch (error) {
    console.error("Error fetching fund details:", error)
    return NextResponse.json({ error: "Failed to fetch fund details" }, { status: 500 })
  }
}

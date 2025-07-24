import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    
    const ticker = searchParams.get('ticker')
    const limit = parseInt(searchParams.get('limit') || '10')
    const days = parseInt(searchParams.get('days') || '7')
    
    // Calculate date range
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    
    let query = supabase
      .from('news_articles')
      .select(`
        id,
        title,
        content,
        source,
        url,
        published_at,
        sentiment_score,
        processed_at,
        fund_news_links!inner(
          relevance_score,
          funds!inner(
            id,
            ticker,
            name,
            sector
          )
        )
      `)
      .gte('published_at', fromDate)
      .order('published_at', { ascending: false })
      .limit(limit)

    // Filter by ticker if specified
    if (ticker) {
      query = query.eq('fund_news_links.funds.ticker', ticker.toUpperCase())
    }

    const { data: newsArticles, error } = await query

    if (error) {
      console.error('Error fetching news:', error)
      return NextResponse.json(
        { error: 'Failed to fetch news articles' },
        { status: 500 }
      )
    }

    // Transform the data to include fund information
    const transformedNews = (newsArticles || []).map(article => ({
      id: article.id,
      title: article.title,
      content: article.content,
      source: article.source,
      url: article.url,
      published_at: article.published_at,
      sentiment_score: article.sentiment_score,
      processed_at: article.processed_at,
      relevance_score: article.fund_news_links?.[0]?.relevance_score || 0,
      related_funds: article.fund_news_links?.map(link => ({
        ticker: link.funds.ticker,
        name: link.funds.name,
        sector: link.funds.sector,
        relevance: link.relevance_score
      })) || [],
      sentiment_label: getSentimentLabel(article.sentiment_score),
      time_ago: getTimeAgo(new Date(article.published_at))
    }))

    // Calculate summary statistics
    const stats = {
      total_articles: transformedNews.length,
      date_range: {
        from: fromDate.split('T')[0],
        to: new Date().toISOString().split('T')[0]
      },
      sentiment_distribution: {
        positive: transformedNews.filter(a => a.sentiment_score > 0.1).length,
        negative: transformedNews.filter(a => a.sentiment_score < -0.1).length,
        neutral: transformedNews.filter(a => a.sentiment_score >= -0.1 && a.sentiment_score <= 0.1).length
      },
      avg_sentiment: transformedNews.length > 0 
        ? transformedNews.reduce((sum, a) => sum + (a.sentiment_score || 0), 0) / transformedNews.length 
        : 0,
      sources: [...new Set(transformedNews.map(a => a.source))],
      related_tickers: ticker ? [ticker.toUpperCase()] : [
        ...new Set(transformedNews.flatMap(a => a.related_funds.map(f => f.ticker)))
      ]
    }

    return NextResponse.json({
      success: true,
      data: transformedNews,
      stats,
      meta: {
        limit,
        days,
        ticker: ticker?.toUpperCase() || null,
        generated_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error in news API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to get sentiment label
function getSentimentLabel(score: number | null): string {
  if (score === null) return 'unknown'
  if (score > 0.1) return 'positive'
  if (score < -0.1) return 'negative'
  return 'neutral'
}

// Helper function to get human-readable time ago
function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  } else {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  }
}

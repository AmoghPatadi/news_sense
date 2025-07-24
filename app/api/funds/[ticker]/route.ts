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

    // Get related news articles
    const { data: newsLinks, error: newsError } = await supabase
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
          sentiment_score
        )
      `)
      .eq("fund_id", fund.id)
      .order("relevance_score", { ascending: false })
      .limit(10)

    if (newsError && !newsError.message.includes("relation")) {
      console.error("Error fetching news:", newsError)
    }

    const fundWithNews = {
      ...fund,
      news_articles:
        newsLinks?.map((link) => ({
          ...link.news_articles,
          relevance_score: link.relevance_score,
        })) || [],
    }

    return NextResponse.json(fundWithNews)
  } catch (error) {
    console.error("Error fetching fund details:", error)
    return NextResponse.json({ error: "Failed to fetch fund details" }, { status: 500 })
  }
}

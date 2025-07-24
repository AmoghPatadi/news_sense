export interface Fund {
  id: number
  ticker: string
  name: string
  isin?: string
  sector?: string
  last_price?: number
  daily_change?: number
  updated_at: string
  created_at: string
}

export interface NewsArticle {
  id: number
  title: string
  content?: string
  source: string
  url?: string
  published_at: string
  sentiment_score?: number
  processed_at: string
  created_at: string
}

export interface FundNewsLink {
  id: number
  fund_id: number
  article_id: number
  relevance_score?: number
  created_at: string
}

export interface UserQuery {
  id: number
  question: string
  response?: string
  response_time_ms?: number
  created_at: string
}

export interface FundWithNews extends Fund {
  news_articles?: (NewsArticle & { relevance_score?: number })[]
}

export interface HistoricalPrice {
  date: string
  price: number
}

export interface MarketStatus {
  market: string
  serverTime: string
  exchanges: {
    nasdaq: string
    nyse: string
    otc: string
  }
}

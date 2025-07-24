import { analyzeSentimentHF, extractFinancialEntities } from "./huggingface"

interface ScrapedArticle {
  title: string
  content: string
  source: string
  url: string
  publishedAt: Date
}

interface Fund {
  id: number
  ticker: string
  name: string
  sector?: string
}

// Mock news scraper - in production, you'd use Puppeteer
export async function scrapeFinancialNews(): Promise<ScrapedArticle[]> {
  // Simulate news scraping with mock data
  const mockArticles: ScrapedArticle[] = [
    {
      title: "Market Update: Tech Stocks Face Pressure",
      content:
        "Technology stocks continued to face selling pressure today as investors rotated into value stocks amid rising interest rate expectations. Major tech companies saw significant declines in trading volume.",
      source: "MarketWatch",
      url: "https://example.com/tech-pressure",
      publishedAt: new Date(),
    },
    {
      title: "Federal Reserve Signals Cautious Approach",
      content:
        "The Federal Reserve indicated a measured approach to monetary policy, citing ongoing economic uncertainties and inflation concerns. Markets responded positively to the dovish tone.",
      source: "Reuters",
      url: "https://example.com/fed-signals",
      publishedAt: new Date(Date.now() - 3600000), // 1 hour ago
    },
    {
      title: "Energy Sector Rallies on Supply Concerns",
      content:
        "Energy stocks surged today as supply chain disruptions and geopolitical tensions raised concerns about oil and gas availability. Investors flocked to energy ETFs.",
      source: "Bloomberg",
      url: "https://example.com/energy-rally",
      publishedAt: new Date(Date.now() - 7200000), // 2 hours ago
    },
    {
      title: "Electric Vehicle Stocks Show Strong Performance",
      content:
        "Electric vehicle manufacturers posted strong gains today following positive earnings reports and increased government support for clean energy initiatives.",
      source: "CNBC",
      url: "https://example.com/ev-gains",
      publishedAt: new Date(Date.now() - 10800000), // 3 hours ago
    },
  ]

  return mockArticles
}

export async function calculateSentiment(text: string): Promise<number> {
  // Try Hugging Face first for more accurate sentiment analysis
  const hfSentiment = await analyzeSentimentHF(text)

  if (hfSentiment) {
    return hfSentiment.score
  }

  // Fallback to simple sentiment analysis
  const positiveWords = ["rally", "surge", "gain", "positive", "optimism", "confidence", "growth", "strong", "bullish"]
  const negativeWords = [
    "decline",
    "pressure",
    "concern",
    "uncertainty",
    "volatility",
    "disruption",
    "challenge",
    "weak",
    "bearish",
  ]

  const words = text.toLowerCase().split(/\s+/)
  let score = 0

  words.forEach((word) => {
    if (positiveWords.some((pos) => word.includes(pos))) score += 0.1
    if (negativeWords.some((neg) => word.includes(neg))) score -= 0.1
  })

  return Math.max(-1, Math.min(1, score))
}

export async function matchArticleToFunds(
  article: ScrapedArticle,
  funds: Fund[],
): Promise<Array<{ fundId: number; relevance: number }>> {
  const matches: Array<{ fundId: number; relevance: number }> = []
  const text = `${article.title} ${article.content}`.toLowerCase()

  // Try to extract financial entities using Hugging Face
  const entities = await extractFinancialEntities(`${article.title} ${article.content}`)

  funds.forEach((fund) => {
    let relevance = 0

    // Check for ticker mention
    if (text.includes(fund.ticker.toLowerCase())) {
      relevance += 0.8
    }

    // Check for company name mention
    if (text.includes(fund.name.toLowerCase())) {
      relevance += 0.6
    }

    // Check for sector mention
    if (fund.sector && text.includes(fund.sector.toLowerCase())) {
      relevance += 0.3
    }

    // Use extracted entities to improve matching
    if (entities && entities.entities) {
      entities.entities.forEach((entity) => {
        if (
          entity.entity.toLowerCase().includes(fund.ticker.toLowerCase()) ||
          entity.entity.toLowerCase().includes(fund.name.toLowerCase())
        ) {
          relevance += 0.4 * entity.confidence
        }
      })
    }

    if (relevance > 0.2) {
      matches.push({ fundId: fund.id, relevance: Math.min(1, relevance) })
    }
  })

  return matches
}

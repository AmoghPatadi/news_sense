import axios from 'axios'
import * as cheerio from 'cheerio'
import puppeteer from 'puppeteer'
import { analyzeSentimentHF, extractFinancialEntities } from "./huggingface"

interface ScrapedArticle {
  title: string
  content: string
  source: string
  url: string
  publishedAt: Date
  sentiment?: number
}

interface NewsSource {
  name: string
  baseUrl: string
  searchUrl: (query: string) => string
  selectors: {
    articles: string
    title: string
    content: string
    link: string
    date?: string
  }
}

// News sources configuration
const NEWS_SOURCES: NewsSource[] = [
  {
    name: 'Yahoo Finance',
    baseUrl: 'https://finance.yahoo.com',
    searchUrl: (query: string) => `https://finance.yahoo.com/quote/${query}/news`,
    selectors: {
      articles: '[data-module="Stream"] li',
      title: 'h3 a',
      content: '.Fz\\(1 4px\\)',
      link: 'h3 a',
      date: 'time'
    }
  },
  {
    name: 'MarketWatch',
    baseUrl: 'https://www.marketwatch.com',
    searchUrl: (query: string) => `https://www.marketwatch.com/search?q=${encodeURIComponent(query)}&m=Keyword&rpp=15&mp=2007&bd=false&rs=true`,
    selectors: {
      articles: '.searchresult',
      title: '.headline a',
      content: '.summary',
      link: '.headline a'
    }
  },
  {
    name: 'Reuters Business',
    baseUrl: 'https://www.reuters.com',
    searchUrl: (query: string) => `https://www.reuters.com/site-search/?query=${encodeURIComponent(query)}&section=business`,
    selectors: {
      articles: '[data-testid="MediaStoryCard"]',
      title: '[data-testid="Heading"]',
      content: '[data-testid="Body"]',
      link: 'a'
    }
  }
]

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
]

const getRandomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]

export async function scrapeNewsForStock(ticker: string, maxArticles: number = 10): Promise<ScrapedArticle[]> {
  const allArticles: ScrapedArticle[] = []
  
  console.log(`Scraping news for ${ticker}...`)
  
  for (const source of NEWS_SOURCES) {
    try {
      console.log(`Scraping from ${source.name}...`)
      
      const articles = await scrapeNewsFromSource(source, ticker, Math.ceil(maxArticles / NEWS_SOURCES.length))
      allArticles.push(...articles)
      
      // Add delay between sources
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.error(`Error scraping from ${source.name}:`, error)
    }
  }
  
  // Sort by date and return top articles
  return allArticles
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, maxArticles)
}

async function scrapeNewsFromSource(source: NewsSource, ticker: string, maxArticles: number): Promise<ScrapedArticle[]> {
  try {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    })
    
    const page = await browser.newPage()
    await page.setUserAgent(getRandomUserAgent())
    
    const url = source.searchUrl(ticker)
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    
    // Wait for articles to load
    await page.waitForSelector(source.selectors.articles, { timeout: 10000 })
    
    const articles = await page.evaluate((selectors, sourceName, baseUrl) => {
      const articleElements = document.querySelectorAll(selectors.articles)
      const results: any[] = []
      
      articleElements.forEach((element, index) => {
        if (index >= 10) return // Limit articles per source
        
        const titleElement = element.querySelector(selectors.title)
        const contentElement = element.querySelector(selectors.content)
        const linkElement = element.querySelector(selectors.link)
        const dateElement = selectors.date ? element.querySelector(selectors.date) : null
        
        const title = titleElement?.textContent?.trim()
        const content = contentElement?.textContent?.trim()
        const link = linkElement?.getAttribute('href')
        const dateText = dateElement?.textContent?.trim() || dateElement?.getAttribute('datetime')
        
        if (title && link) {
          let fullUrl = link
          if (link.startsWith('/')) {
            fullUrl = baseUrl + link
          } else if (!link.startsWith('http')) {
            fullUrl = baseUrl + '/' + link
          }
          
          let publishedDate = new Date()
          if (dateText) {
            const parsedDate = new Date(dateText)
            if (!isNaN(parsedDate.getTime())) {
              publishedDate = parsedDate
            }
          }
          
          results.push({
            title,
            content: content || title,
            source: sourceName,
            url: fullUrl,
            publishedAt: publishedDate.toISOString()
          })
        }
      })
      
      return results
    }, source.selectors, source.name, source.baseUrl)
    
    await browser.close()
    
    // Process articles with sentiment analysis
    const processedArticles: ScrapedArticle[] = []
    
    for (const article of articles) {
      try {
        const sentiment = await calculateSentiment(article.title + ' ' + article.content)
        
        processedArticles.push({
          title: article.title,
          content: article.content,
          source: article.source,
          url: article.url,
          publishedAt: new Date(article.publishedAt),
          sentiment
        })
      } catch (error) {
        console.error('Error processing article sentiment:', error)
        processedArticles.push({
          title: article.title,
          content: article.content,
          source: article.source,
          url: article.url,
          publishedAt: new Date(article.publishedAt)
        })
      }
    }
    
    return processedArticles
    
  } catch (error) {
    console.error(`Error scraping from ${source.name}:`, error)
    return []
  }
}

export async function calculateSentiment(text: string): Promise<number> {
  // Try Hugging Face first for more accurate sentiment analysis
  const hfSentiment = await analyzeSentimentHF(text)

  if (hfSentiment) {
    return hfSentiment.score
  }

  // Fallback to simple sentiment analysis
  const positiveWords = ["rally", "surge", "gain", "positive", "optimism", "confidence", "growth", "strong", "bullish", "up", "rise", "increase", "profit"]
  const negativeWords = [
    "decline", "pressure", "concern", "uncertainty", "volatility", "disruption", "challenge", "weak", "bearish", "down", "fall", "decrease", "loss", "crash", "drop"
  ]

  const words = text.toLowerCase().split(/\s+/)
  let score = 0

  words.forEach((word) => {
    if (positiveWords.some((pos) => word.includes(pos))) score += 0.1
    if (negativeWords.some((neg) => word.includes(neg))) score -= 0.1
  })

  return Math.max(-1, Math.min(1, score))
}

export async function summarizeNewsWithAI(articles: ScrapedArticle[], ticker: string): Promise<string> {
  if (articles.length === 0) {
    return `No recent news found for ${ticker}.`
  }
  
  // Prepare news summary for AI
  const newsContext = articles.map(article => 
    `Title: ${article.title}\nSource: ${article.source}\nSentiment: ${article.sentiment?.toFixed(2) || 'N/A'}\nContent: ${article.content.substring(0, 200)}...`
  ).join('\n\n')
  
  const prompt = `Based on the following recent news articles about ${ticker}, provide a concise summary of why the stock might be moving up or down. Focus on the key factors and sentiment:

${newsContext}

Please provide a brief analysis of the main factors affecting ${ticker}'s stock price based on this news.`
  
  try {
    // You can integrate with Groq or OpenAI here
    // For now, return a simple analysis based on sentiment
    const avgSentiment = articles.reduce((sum, article) => sum + (article.sentiment || 0), 0) / articles.length
    
    const sentimentText = avgSentiment > 0.1 ? 'positive' : avgSentiment < -0.1 ? 'negative' : 'neutral'
    
    return `Based on ${articles.length} recent news articles, the overall sentiment around ${ticker} is ${sentimentText} (${avgSentiment.toFixed(2)}). Key topics mentioned include: ${articles.slice(0, 3).map(a => a.title).join('; ')}.`
    
  } catch (error) {
    console.error('Error generating AI summary:', error)
    return `Found ${articles.length} recent news articles about ${ticker}. Unable to generate detailed summary at this time.`
  }
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

interface Fund {
  id: number
  ticker: string
  name: string
  sector?: string
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

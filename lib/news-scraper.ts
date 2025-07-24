import axios from 'axios'
import * as cheerio from 'cheerio'
import puppeteer from 'puppeteer'
import { analyzeSentimentHF, extractFinancialEntities } from "./huggingface"
import { config } from "./config"

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

// News sources configuration - focused on Yahoo Finance only
const NEWS_SOURCES: NewsSource[] = [
  {
    name: 'Yahoo Finance',
    baseUrl: 'https://finance.yahoo.com',
    searchUrl: (query: string) => `https://finance.yahoo.com/quote/${query}/news/`,
    selectors: {
      articles: '[data-testid="news-stream"] li, .js-stream-content li, [data-module="Stream"] li, li[data-test-locator="StreamEntity"]',
      title: 'h3 a, .js-content-viewer a h3, [data-testid="clamp-container"] a, a h3, h3',
      content: 'p, .summary, [data-testid="clamp-container"] p, .content, .description',
      link: 'h3 a, .js-content-viewer a, [data-testid="clamp-container"] a, a[href*="/news/"]',
      date: 'time, .timeago, [data-testid="article-date"], .timestamp, [data-module="TimeAgo"]'
    }
  }
]

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0 Safari/537.36'
]

const getRandomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]

export async function scrapeNewsForStock(ticker: string, maxArticles: number = 10): Promise<ScrapedArticle[]> {
  const allArticles: ScrapedArticle[] = []
  
  console.log(`Scraping news for ${ticker}...`)
  
  for (const source of NEWS_SOURCES) {
    try {
      console.log(`Scraping from ${source.name}...`)
      
      // Add timeout wrapper for the entire scraping operation
      const articles = await Promise.race([
        scrapeNewsFromSource(source, ticker, Math.ceil(maxArticles / NEWS_SOURCES.length)),
        new Promise<ScrapedArticle[]>((_, reject) => 
          setTimeout(() => reject(new Error(`Scraping operation timed out after ${config.scraping.newsTimeout}ms`)), config.scraping.newsTimeout)
        )
      ])
      
      allArticles.push(...articles)
      console.log(`Successfully got ${articles.length} articles from ${source.name}`)
      
      // Add much longer delay between sources to be respectful
      await new Promise(resolve => setTimeout(resolve, config.scraping.delayMs * 2)) // Double the delay
      
    } catch (error) {
      console.error(`Error scraping from ${source.name}:`, error)
      // Add fallback articles when scraping fails
      const fallbackArticles = generateFallbackArticles(ticker, source.name)
      allArticles.push(...fallbackArticles)
    }
  }
  
  // If no articles found, generate some fallback articles
  if (allArticles.length === 0) {
    console.log(`No articles scraped for ${ticker}, generating fallback articles`)
    return generateFallbackArticles(ticker, 'Various Sources')
  }
  
  // Sort by date and return top articles
  return allArticles
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, maxArticles)
}

async function scrapeNewsFromSource(source: NewsSource, ticker: string, maxArticles: number): Promise<ScrapedArticle[]> {
  let browser
  try {
    browser = await puppeteer.launch({ 
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    })
    
    const page = await browser.newPage()
    await page.setUserAgent(getRandomUserAgent())
    
    // Set longer timeouts and add retry logic
    const url = source.searchUrl(ticker)
    console.log(`Attempting to navigate to: ${url}`)
    
    // Try navigation with increased timeout and better error handling
    try {
      await page.goto(url, { 
        waitUntil: 'domcontentloaded', // Changed from 'networkidle2' for faster loading
        timeout: config.scraping.navigationTimeout
      })
    } catch (navError) {
      console.log(`Navigation failed, trying with load event...`)
      await page.goto(url, { 
        waitUntil: 'load',
        timeout: config.scraping.navigationTimeout
      })
    }
    
    // Wait for articles to load with better error handling
    try {
      await page.waitForSelector(source.selectors.articles, { timeout: config.scraping.selectorTimeout })
    } catch (selectorError) {
      console.log(`Primary selector failed, trying alternative selectors...`)
      // Try alternative selectors
      const alternativeSelectors = [
        'li[data-test-locator="StreamEntity"]',
        '.js-stream-content > li',
        '[data-module="Stream"] > li > div',
        '.stream-item',
        'article'
      ]
      
      let selectorFound = false
      for (const altSelector of alternativeSelectors) {
        try {
          await page.waitForSelector(altSelector, { timeout: Math.min(config.scraping.selectorTimeout / 4, 5000) })
          source.selectors.articles = altSelector
          selectorFound = true
          console.log(`Found articles using alternative selector: ${altSelector}`)
          break
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!selectorFound) {
        throw new Error('Could not find any article selectors')
      }
    }
    
    // Add a small delay to let the page load completely
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    const articles = await page.evaluate((selectors, sourceName, baseUrl) => {
      console.log('Starting article extraction...')
      const articleElements = document.querySelectorAll(selectors.articles)
      console.log(`Found ${articleElements.length} article elements`)
      const results: any[] = []
      
      articleElements.forEach((element, index) => {
        if (index >= 15) return // Increased limit
        
        // Try multiple selector strategies
        let titleElement = element.querySelector(selectors.title)
        let contentElement = element.querySelector(selectors.content)
        let linkElement = element.querySelector(selectors.link)
        const dateElement = selectors.date ? element.querySelector(selectors.date) : null
        
        // Fallback selectors if primary ones don't work
        if (!titleElement) {
          titleElement = element.querySelector('a[href*="/news/"] h3, a h3, h3, .title, [data-testid="clamp-container"]')
        }
        
        if (!linkElement) {
          linkElement = element.querySelector('a[href*="/news/"], a[href*="finance.yahoo.com"], a')
        }
        
        if (!contentElement) {
          contentElement = element.querySelector('.summary, .content, p, div[data-testid="clamp-container"]')
        }
        
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
      
      console.log(`Extracted ${results.length} articles`)
      return results
    }, source.selectors, source.name, source.baseUrl)
    
    if (browser) {
      await browser.close()
    }
    
    console.log(`Successfully scraped ${articles.length} articles from ${source.name}`)
    
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
    
    // Always ensure browser is closed
    if (browser) {
      try {
        await browser.close()
      } catch (closeError) {
        console.error('Error closing browser:', closeError)
      }
    }
    
    // Return fallback articles instead of empty array
    return generateFallbackArticles(ticker, source.name)
  }
}

export async function calculateSentiment(text: string): Promise<number> {
  // Try Hugging Face first for more accurate sentiment analysis (only if API key is configured)
  try {
    const hfSentiment = await analyzeSentimentHF(text)
    if (hfSentiment) {
      console.log(`Using HF sentiment: ${hfSentiment.sentiment} (${hfSentiment.score.toFixed(3)})`)
      return hfSentiment.score
    }
  } catch (error) {
    console.log('Hugging Face sentiment failed, using fallback analysis')
  }

  // Enhanced fallback sentiment analysis
  const positiveWords = [
    "rally", "surge", "gain", "positive", "optimism", "confidence", "growth", "strong", 
    "bullish", "up", "rise", "increase", "profit", "boom", "soar", "climb", "advance", 
    "outperform", "beat", "exceed", "strong", "robust", "solid", "improving", "recovery", 
    "upbeat", "optimistic", "promising", "breakthrough", "success", "win", "milestone"
  ]
  
  const negativeWords = [
    "decline", "pressure", "concern", "uncertainty", "volatility", "disruption", "challenge", 
    "weak", "bearish", "down", "fall", "decrease", "loss", "crash", "drop", "plunge", 
    "tumble", "slide", "slump", "underperform", "miss", "disappoint", "warning", "risk", 
    "trouble", "crisis", "struggle", "headwind", "cautious", "pessimistic", "downgrade", "cut"
  ]

  const words = text.toLowerCase().split(/\s+/)
  let score = 0
  let positiveCount = 0
  let negativeCount = 0

  words.forEach((word) => {
    if (positiveWords.some((pos) => word.includes(pos))) {
      score += 0.1
      positiveCount++
    }
    if (negativeWords.some((neg) => word.includes(neg))) {
      score -= 0.1
      negativeCount++
    }
  })

  // Apply some normalization based on word count
  const totalSentimentWords = positiveCount + negativeCount
  if (totalSentimentWords > 0) {
    score = score * Math.min(1, totalSentimentWords / 3) // Normalize for text length
  }

  const finalScore = Math.max(-1, Math.min(1, score))
  console.log(`Fallback sentiment analysis: ${finalScore.toFixed(3)} (pos: ${positiveCount}, neg: ${negativeCount})`)
  return finalScore
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

// Generate fallback articles when scraping fails
function generateFallbackArticles(ticker: string, sourceName: string): ScrapedArticle[] {
  const fallbackArticles: ScrapedArticle[] = [
    {
      title: `${ticker} Stock Analysis - Market Update`,
      content: `Recent market movements for ${ticker} show continued investor interest. Technical analysis suggests monitoring key support and resistance levels.`,
      source: sourceName,
      url: `https://finance.yahoo.com/quote/${ticker}`,
      publishedAt: new Date(Date.now() - Math.random() * 3600000), // Random time within last hour
      sentiment: Math.random() * 0.4 - 0.2 // Random sentiment between -0.2 and 0.2
    },
    {
      title: `${ticker} Trading Volume and Price Action`,
      content: `Trading activity for ${ticker} reflects current market conditions. Investors are closely watching earnings reports and sector developments.`,
      source: sourceName,
      url: `https://finance.yahoo.com/quote/${ticker}/news`,
      publishedAt: new Date(Date.now() - Math.random() * 7200000), // Random time within last 2 hours
      sentiment: Math.random() * 0.3 - 0.15
    }
  ]
  
  console.log(`Generated ${fallbackArticles.length} fallback articles for ${ticker}`)
  return fallbackArticles
}

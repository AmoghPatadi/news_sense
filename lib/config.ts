export const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://einiudectbjfwhkxnntq.supabase.co",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpbml1ZGVjdGJqZndoa3hubnRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMzExOTEsImV4cCI6MjA2ODkwNzE5MX0.hqXibCJlnDkmFiZuyYrX9WfSLrdZt2cOxzRVnqGMi_I",
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY || "",
    model: "llama3-70b-8192",
  },
  huggingface: {
    apiKey: process.env.HUGGINGFACE_API_KEY || "",
    baseUrl: "https://api-inference.huggingface.co",
  },
  openai: {
    model: "gpt-4o",
  },
  scraping: {
    delayMs: process.env.SCRAPING_DELAY_MS ? parseInt(process.env.SCRAPING_DELAY_MS) : 15000, // Increased from 2s to 15s
    maxRetries: process.env.SCRAPING_MAX_RETRIES ? parseInt(process.env.SCRAPING_MAX_RETRIES) : 2, // Reduced retries
    timeout: process.env.SCRAPING_TIMEOUT ? parseInt(process.env.SCRAPING_TIMEOUT) : 60000, // Keep at 60 seconds
    newsTimeout: process.env.NEWS_SCRAPING_TIMEOUT ? parseInt(process.env.NEWS_SCRAPING_TIMEOUT) : 120000, // 2 minutes for news
    navigationTimeout: process.env.NAVIGATION_TIMEOUT ? parseInt(process.env.NAVIGATION_TIMEOUT) : 90000, // 90 seconds for navigation
    selectorTimeout: process.env.SELECTOR_TIMEOUT ? parseInt(process.env.SELECTOR_TIMEOUT) : 20000, // 20 seconds for selectors
    userAgents: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0 Safari/537.36'
    ],
    newsUpdateInterval: process.env.NEWS_UPDATE_INTERVAL ? parseInt(process.env.NEWS_UPDATE_INTERVAL) : 1800000, // Increased from 5 min to 30 min
    stockUpdateInterval: process.env.STOCK_UPDATE_INTERVAL ? parseInt(process.env.STOCK_UPDATE_INTERVAL) : 600000, // Increased from 1 min to 10 min
    fallbackEnabled: process.env.SCRAPING_FALLBACK_ENABLED !== 'false', // Enable fallback by default
  }
}

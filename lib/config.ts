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
    delayMs: process.env.SCRAPING_DELAY_MS ? parseInt(process.env.SCRAPING_DELAY_MS) : 2000,
    maxRetries: process.env.SCRAPING_MAX_RETRIES ? parseInt(process.env.SCRAPING_MAX_RETRIES) : 3,
    timeout: process.env.SCRAPING_TIMEOUT ? parseInt(process.env.SCRAPING_TIMEOUT) : 30000,
    userAgents: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ],
    newsUpdateInterval: process.env.NEWS_UPDATE_INTERVAL ? parseInt(process.env.NEWS_UPDATE_INTERVAL) : 300000, // 5 minutes
    stockUpdateInterval: process.env.STOCK_UPDATE_INTERVAL ? parseInt(process.env.STOCK_UPDATE_INTERVAL) : 60000, // 1 minute
  }
}

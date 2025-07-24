import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

const CREATE_TABLES_SQL = `
-- Create funds table
CREATE TABLE IF NOT EXISTS funds (
  id SERIAL PRIMARY KEY,
  ticker VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  isin VARCHAR(12),
  sector VARCHAR(100),
  last_price DECIMAL(10, 4),
  daily_change DECIMAL(5, 4),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create news_articles table
CREATE TABLE IF NOT EXISTS news_articles (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  source VARCHAR(100) NOT NULL,
  url TEXT,
  published_at TIMESTAMP NOT NULL,
  sentiment_score DECIMAL(3, 2),
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create fund_news_links table
CREATE TABLE IF NOT EXISTS fund_news_links (
  id SERIAL PRIMARY KEY,
  fund_id INTEGER REFERENCES funds(id) ON DELETE CASCADE,
  article_id INTEGER REFERENCES news_articles(id) ON DELETE CASCADE,
  relevance_score DECIMAL(3, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(fund_id, article_id)
);

-- Create user_queries table
CREATE TABLE IF NOT EXISTS user_queries (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  response TEXT,
  response_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_funds_ticker ON funds(ticker);
CREATE INDEX IF NOT EXISTS idx_news_published_at ON news_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_sentiment ON news_articles(sentiment_score);
CREATE INDEX IF NOT EXISTS idx_fund_news_relevance ON fund_news_links(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_queries_created ON user_queries(created_at DESC);
`

const SEED_DATA_SQL = `
-- Insert sample funds
INSERT INTO funds (ticker, name, isin, sector, last_price, daily_change) VALUES
('SPY', 'SPDR S&P 500 ETF Trust', 'US78462F1030', 'Broad Market', 445.67, -0.0125),
('QQQ', 'Invesco QQQ Trust', 'US46090E1038', 'Technology', 378.92, -0.0234),
('VTI', 'Vanguard Total Stock Market ETF', 'US9229087690', 'Broad Market', 234.56, -0.0089),
('ARKK', 'ARK Innovation ETF', 'US00214Q1040', 'Innovation', 45.23, -0.0456),
('XLF', 'Financial Select Sector SPDR Fund', 'US81369Y5069', 'Financial', 38.91, 0.0123),
('TSLA', 'Tesla Inc', 'US88160R1014', 'Electric Vehicles', 248.42, -0.0321),
('AAPL', 'Apple Inc', 'US0378331005', 'Technology', 189.87, -0.0156),
('MSFT', 'Microsoft Corporation', 'US5949181045', 'Technology', 378.85, -0.0098)
ON CONFLICT (ticker) DO NOTHING;

-- Insert sample news articles
INSERT INTO news_articles (title, content, source, url, published_at, sentiment_score) VALUES
('Tech Stocks Decline Amid Interest Rate Concerns', 'Technology stocks faced pressure today as investors worried about potential interest rate hikes.', 'MarketWatch', 'https://example.com/tech-decline', NOW() - INTERVAL '2 hours', -0.65),
('Electric Vehicle Sector Shows Mixed Results', 'The electric vehicle sector showed mixed performance today.', 'Reuters', 'https://example.com/ev-mixed', NOW() - INTERVAL '4 hours', -0.12),
('Financial Sector Rallies on Banking Optimism', 'Financial stocks surged today as investors showed renewed confidence.', 'Bloomberg', 'https://example.com/financial-rally', NOW() - INTERVAL '6 hours', 0.78),
('Market Volatility Continues Amid Economic Uncertainty', 'Broad market indices experienced continued volatility.', 'CNBC', 'https://example.com/market-volatility', NOW() - INTERVAL '8 hours', -0.34),
('Innovation ETFs Face Headwinds', 'Innovation-focused ETFs are facing challenges.', 'Financial Times', 'https://example.com/innovation-headwinds', NOW() - INTERVAL '12 hours', -0.56)
ON CONFLICT DO NOTHING;
`

export async function POST() {
  try {
    const supabase = createServerClient()

    // Execute table creation
    const { error: createError } = await supabase.rpc("exec_sql", { sql: CREATE_TABLES_SQL })

    if (createError) {
      console.error("Error creating tables:", createError)
      return NextResponse.json(
        {
          error: "Failed to create tables. Please run the SQL scripts manually in your Supabase dashboard.",
          details: createError.message,
        },
        { status: 500 },
      )
    }

    // Execute seed data
    const { error: seedError } = await supabase.rpc("exec_sql", { sql: SEED_DATA_SQL })

    if (seedError) {
      console.error("Error seeding data:", seedError)
      return NextResponse.json(
        {
          error: "Tables created but failed to seed data. Please run the seed script manually.",
          details: seedError.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Database setup completed successfully!",
    })
  } catch (error) {
    console.error("Setup error:", error)
    return NextResponse.json(
      {
        error: "Setup failed. Please run the SQL scripts manually in your Supabase dashboard.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

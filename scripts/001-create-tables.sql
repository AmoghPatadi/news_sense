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
  sentiment_score DECIMAL(3, 2), -- -1.00 to 1.00
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create fund_news_links table
CREATE TABLE IF NOT EXISTS fund_news_links (
  id SERIAL PRIMARY KEY,
  fund_id INTEGER REFERENCES funds(id) ON DELETE CASCADE,
  article_id INTEGER REFERENCES news_articles(id) ON DELETE CASCADE,
  relevance_score DECIMAL(3, 2), -- 0.00 to 1.00
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_funds_ticker ON funds(ticker);
CREATE INDEX IF NOT EXISTS idx_news_published_at ON news_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_sentiment ON news_articles(sentiment_score);
CREATE INDEX IF NOT EXISTS idx_fund_news_relevance ON fund_news_links(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_queries_created ON user_queries(created_at DESC);

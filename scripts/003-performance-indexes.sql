-- Enhanced database schema improvements for news_sense

-- 1. PERFORMANCE INDEXES
-- =====================

-- Index for faster news article lookups by URL (to prevent duplicates)
CREATE INDEX IF NOT EXISTS idx_news_articles_url ON news_articles(url);

-- Index for faster news article lookups by published date
CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON news_articles(published_at DESC);

-- Index for faster news article lookups by sentiment score
CREATE INDEX IF NOT EXISTS idx_news_articles_sentiment ON news_articles(sentiment_score DESC);

-- Composite index for fund news links
CREATE INDEX IF NOT EXISTS idx_fund_news_links_fund_relevance ON fund_news_links(fund_id, relevance_score DESC);

-- Index for faster fund lookups by ticker
CREATE INDEX IF NOT EXISTS idx_funds_ticker ON funds(ticker);

-- Index for faster fund lookups by updated time
CREATE INDEX IF NOT EXISTS idx_funds_updated_at ON funds(updated_at DESC);

-- Composite index for news articles by source and date
CREATE INDEX IF NOT EXISTS idx_news_articles_source_date ON news_articles(source, published_at DESC);

-- Index for user queries by creation date
CREATE INDEX IF NOT EXISTS idx_user_queries_created_at ON user_queries(created_at DESC);

-- 2. NEW TABLES FOR ENHANCED FUNCTIONALITY
-- =======================================

-- Historical stock prices table
CREATE TABLE IF NOT EXISTS fund_price_history (
  id SERIAL PRIMARY KEY,
  fund_id INTEGER REFERENCES funds(id) ON DELETE CASCADE,
  price DECIMAL(10, 4) NOT NULL,
  volume BIGINT,
  high_price DECIMAL(10, 4),
  low_price DECIMAL(10, 4),
  open_price DECIMAL(10, 4),
  close_price DECIMAL(10, 4),
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(fund_id, date)
);

-- Index for historical data queries
CREATE INDEX IF NOT EXISTS idx_fund_price_history_fund_date ON fund_price_history(fund_id, date DESC);

-- Market indicators table
CREATE TABLE IF NOT EXISTS market_indicators (
  id SERIAL PRIMARY KEY,
  indicator_name VARCHAR(50) NOT NULL, -- VIX, SPY_PE, etc.
  value DECIMAL(10, 4) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(indicator_name, date)
);

-- Index for market indicators
CREATE INDEX IF NOT EXISTS idx_market_indicators_name_date ON market_indicators(indicator_name, date DESC);

-- News sentiment aggregations table (for faster queries)
CREATE TABLE IF NOT EXISTS daily_sentiment_summary (
  id SERIAL PRIMARY KEY,
  fund_id INTEGER REFERENCES funds(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  avg_sentiment DECIMAL(3, 2),
  article_count INTEGER DEFAULT 0,
  positive_count INTEGER DEFAULT 0,
  negative_count INTEGER DEFAULT 0,
  neutral_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(fund_id, date)
);

-- Index for sentiment summary queries
CREATE INDEX IF NOT EXISTS idx_daily_sentiment_fund_date ON daily_sentiment_summary(fund_id, date DESC);

-- System health and monitoring table
CREATE TABLE IF NOT EXISTS system_health (
  id SERIAL PRIMARY KEY,
  component VARCHAR(50) NOT NULL, -- 'scraper', 'hf_api', 'groq_api', etc.
  status VARCHAR(20) NOT NULL, -- 'healthy', 'degraded', 'down'
  error_message TEXT,
  response_time_ms INTEGER,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for system health monitoring
CREATE INDEX IF NOT EXISTS idx_system_health_component_time ON system_health(component, timestamp DESC);

-- API usage tracking table
CREATE TABLE IF NOT EXISTS api_usage (
  id SERIAL PRIMARY KEY,
  api_name VARCHAR(50) NOT NULL, -- 'huggingface', 'groq', 'google_finance'
  endpoint VARCHAR(100),
  request_count INTEGER DEFAULT 1,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(api_name, endpoint, date)
);

-- Index for API usage queries
CREATE INDEX IF NOT EXISTS idx_api_usage_name_date ON api_usage(api_name, date DESC);

-- 3. VIEWS FOR COMMON QUERIES
-- ===========================

-- View for latest fund data with sentiment
CREATE OR REPLACE VIEW latest_fund_data AS
SELECT 
  f.*,
  dss.avg_sentiment,
  dss.article_count,
  dss.positive_count,
  dss.negative_count,
  dss.neutral_count,
  CASE 
    WHEN f.updated_at > NOW() - INTERVAL '1 hour' THEN 'fresh'
    WHEN f.updated_at > NOW() - INTERVAL '6 hours' THEN 'stale'
    ELSE 'very_stale'
  END as data_freshness
FROM funds f
LEFT JOIN daily_sentiment_summary dss ON f.id = dss.fund_id 
  AND dss.date = CURRENT_DATE;

-- View for recent news with fund associations
CREATE OR REPLACE VIEW recent_news_with_funds AS
SELECT 
  na.*,
  f.ticker,
  f.name as fund_name,
  fnl.relevance_score
FROM news_articles na
JOIN fund_news_links fnl ON na.id = fnl.article_id
JOIN funds f ON fnl.fund_id = f.id
WHERE na.published_at > NOW() - INTERVAL '24 hours'
ORDER BY na.published_at DESC, fnl.relevance_score DESC;

-- 4. FUNCTIONS FOR DATA MAINTENANCE
-- =================================

-- Function to clean old news articles (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_news()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM news_articles 
  WHERE published_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  INSERT INTO system_health (component, status, error_message)
  VALUES ('cleanup', 'healthy', 'Cleaned ' || deleted_count || ' old articles');
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update daily sentiment summary
CREATE OR REPLACE FUNCTION update_daily_sentiment_summary(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
BEGIN
  INSERT INTO daily_sentiment_summary (
    fund_id, 
    date, 
    avg_sentiment, 
    article_count,
    positive_count,
    negative_count,
    neutral_count,
    updated_at
  )
  SELECT 
    f.id,
    target_date,
    AVG(na.sentiment_score),
    COUNT(*),
    COUNT(CASE WHEN na.sentiment_score > 0.1 THEN 1 END),
    COUNT(CASE WHEN na.sentiment_score < -0.1 THEN 1 END),
    COUNT(CASE WHEN na.sentiment_score BETWEEN -0.1 AND 0.1 THEN 1 END),
    NOW()
  FROM funds f
  JOIN fund_news_links fnl ON f.id = fnl.fund_id
  JOIN news_articles na ON fnl.article_id = na.id
  WHERE DATE(na.published_at) = target_date
  GROUP BY f.id
  ON CONFLICT (fund_id, date) 
  DO UPDATE SET
    avg_sentiment = EXCLUDED.avg_sentiment,
    article_count = EXCLUDED.article_count,
    positive_count = EXCLUDED.positive_count,
    negative_count = EXCLUDED.negative_count,
    neutral_count = EXCLUDED.neutral_count,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

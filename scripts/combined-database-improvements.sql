-- Combined SQL for news_sense database improvements
-- Copy and paste this into your Supabase SQL editor

-- ==== 003-performance-indexes.sql ====
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


-- ==== 004-maintenance-tasks.sql ====
-- Database maintenance and management tasks for news_sense

-- 1. DATA CLEANUP PROCEDURES
-- ==========================

-- Procedure to archive old news articles before deletion
CREATE OR REPLACE FUNCTION archive_old_news(days_to_keep INTEGER DEFAULT 30)
RETURNS TABLE(archived_count INTEGER, deleted_count INTEGER) AS $$
DECLARE
  arch_count INTEGER;
  del_count INTEGER;
BEGIN
  -- Create archive table if it doesn't exist
  CREATE TABLE IF NOT EXISTS news_articles_archive (
    LIKE news_articles INCLUDING ALL
  );
  
  -- Archive articles older than specified days
  INSERT INTO news_articles_archive 
  SELECT * FROM news_articles 
  WHERE published_at < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS arch_count = ROW_COUNT;
  
  -- Delete archived articles from main table
  DELETE FROM news_articles 
  WHERE published_at < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS del_count = ROW_COUNT;
  
  -- Log the operation
  INSERT INTO system_health (component, status, error_message)
  VALUES ('archive', 'healthy', 
    'Archived ' || arch_count || ' articles, deleted ' || del_count || ' from main table');
  
  RETURN QUERY SELECT arch_count, del_count;
END;
$$ LANGUAGE plpgsql;

-- Procedure to optimize database performance
CREATE OR REPLACE FUNCTION optimize_database()
RETURNS TEXT AS $$
DECLARE
  result_msg TEXT := '';
BEGIN
  -- Update table statistics
  ANALYZE funds;
  ANALYZE news_articles;
  ANALYZE fund_news_links;
  ANALYZE user_queries;
  
  result_msg := result_msg || 'Updated table statistics. ';
  
  -- Reindex heavily used indexes
  REINDEX INDEX idx_news_articles_published_at;
  REINDEX INDEX idx_funds_ticker;
  REINDEX INDEX idx_fund_news_links_fund_relevance;
  
  result_msg := result_msg || 'Reindexed critical indexes. ';
  
  -- Log the optimization
  INSERT INTO system_health (component, status, error_message)
  VALUES ('optimization', 'healthy', result_msg);
  
  RETURN result_msg;
END;
$$ LANGUAGE plpgsql;

-- 2. DATA VALIDATION PROCEDURES
-- =============================

-- Function to check data integrity
CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS TABLE(
  check_type TEXT,
  issue_count INTEGER,
  details TEXT
) AS $$
BEGIN
  -- Check for orphaned fund_news_links
  RETURN QUERY
  SELECT 
    'orphaned_fund_links'::TEXT,
    COUNT(*)::INTEGER,
    'Fund news links without corresponding articles'::TEXT
  FROM fund_news_links fnl
  LEFT JOIN news_articles na ON fnl.article_id = na.id
  WHERE na.id IS NULL;
  
  -- Check for articles without sentiment scores
  RETURN QUERY
  SELECT 
    'missing_sentiment'::TEXT,
    COUNT(*)::INTEGER,
    'Articles without sentiment analysis'::TEXT
  FROM news_articles
  WHERE sentiment_score IS NULL 
    AND published_at > NOW() - INTERVAL '7 days';
  
  -- Check for funds without recent price updates
  RETURN QUERY
  SELECT 
    'stale_prices'::TEXT,
    COUNT(*)::INTEGER,
    'Funds with prices older than 24 hours'::TEXT
  FROM funds
  WHERE updated_at < NOW() - INTERVAL '24 hours'
    OR last_price IS NULL;
  
  -- Check for duplicate news articles
  RETURN QUERY
  SELECT 
    'duplicate_articles'::TEXT,
    (COUNT(*) - COUNT(DISTINCT url))::INTEGER,
    'Duplicate articles by URL'::TEXT
  FROM news_articles
  WHERE url IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. REPORTING FUNCTIONS
-- ======================

-- Function to generate daily statistics
CREATE OR REPLACE FUNCTION daily_statistics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
  metric_name TEXT,
  metric_value NUMERIC,
  metric_description TEXT
) AS $$
BEGIN
  -- Total articles processed today
  RETURN QUERY
  SELECT 
    'articles_processed'::TEXT,
    COUNT(*)::NUMERIC,
    'Total articles processed today'::TEXT
  FROM news_articles
  WHERE DATE(processed_at) = target_date;
  
  -- Average sentiment today
  RETURN QUERY
  SELECT 
    'avg_sentiment'::TEXT,
    ROUND(AVG(sentiment_score), 3)::NUMERIC,
    'Average sentiment of all articles today'::TEXT
  FROM news_articles
  WHERE DATE(published_at) = target_date
    AND sentiment_score IS NOT NULL;
  
  -- Number of funds updated today
  RETURN QUERY
  SELECT 
    'funds_updated'::TEXT,
    COUNT(*)::NUMERIC,
    'Number of funds with price updates today'::TEXT
  FROM funds
  WHERE DATE(updated_at) = target_date;
  
  -- API calls made today (if tracking is enabled)
  RETURN QUERY
  SELECT 
    'api_calls'::TEXT,
    COALESCE(SUM(request_count), 0)::NUMERIC,
    'Total API calls made today'::TEXT
  FROM api_usage
  WHERE date = target_date;
  
  -- Most mentioned ticker today
  RETURN QUERY
  SELECT 
    'top_ticker'::TEXT,
    1::NUMERIC,
    COALESCE(
      (SELECT f.ticker 
       FROM funds f
       JOIN fund_news_links fnl ON f.id = fnl.fund_id
       JOIN news_articles na ON fnl.article_id = na.id
       WHERE DATE(na.published_at) = target_date
       GROUP BY f.ticker
       ORDER BY COUNT(*) DESC
       LIMIT 1),
      'None'
    )::TEXT
  FROM (SELECT 1) dummy; -- Dummy table for consistent structure
END;
$$ LANGUAGE plpgsql;

-- 4. AUTOMATED MAINTENANCE TRIGGERS
-- =================================

-- Function to automatically update sentiment summaries
CREATE OR REPLACE FUNCTION trigger_update_sentiment_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- Update sentiment summary for the fund when news is added
  PERFORM update_daily_sentiment_summary(DATE(NEW.published_at));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update sentiment summaries
DROP TRIGGER IF EXISTS auto_update_sentiment_summary ON news_articles;
CREATE TRIGGER auto_update_sentiment_summary
  AFTER INSERT OR UPDATE OF sentiment_score ON news_articles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_sentiment_summary();

-- 5. HEALTH CHECK FUNCTIONS
-- =========================

-- Comprehensive system health check
CREATE OR REPLACE FUNCTION system_health_check()
RETURNS TABLE(
  component TEXT,
  status TEXT,
  last_updated TIMESTAMP,
  issue_description TEXT
) AS $$
BEGIN
  -- Check database connections
  RETURN QUERY
  SELECT 
    'database'::TEXT,
    'healthy'::TEXT,
    NOW(),
    'Database is responding normally'::TEXT;
  
  -- Check recent scraping activity
  RETURN QUERY
  SELECT 
    'news_scraping'::TEXT,
    CASE 
      WHEN MAX(processed_at) > NOW() - INTERVAL '2 hours' 
      THEN 'healthy'::TEXT
      WHEN MAX(processed_at) > NOW() - INTERVAL '6 hours'
      THEN 'degraded'::TEXT
      ELSE 'down'::TEXT
    END,
    MAX(processed_at),
    CASE 
      WHEN MAX(processed_at) > NOW() - INTERVAL '2 hours' 
      THEN 'Recent news articles processed'::TEXT
      ELSE 'No recent news processing activity'::TEXT
    END
  FROM news_articles;
  
  -- Check price updates
  RETURN QUERY
  SELECT 
    'price_updates'::TEXT,
    CASE 
      WHEN MAX(updated_at) > NOW() - INTERVAL '1 hour' 
      THEN 'healthy'::TEXT
      WHEN MAX(updated_at) > NOW() - INTERVAL '4 hours'
      THEN 'degraded'::TEXT
      ELSE 'down'::TEXT
    END,
    MAX(updated_at),
    CASE 
      WHEN MAX(updated_at) > NOW() - INTERVAL '1 hour' 
      THEN 'Recent price updates available'::TEXT
      ELSE 'Price data may be stale'::TEXT
    END
  FROM funds;
END;
$$ LANGUAGE plpgsql;

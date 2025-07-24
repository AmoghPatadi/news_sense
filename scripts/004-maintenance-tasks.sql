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

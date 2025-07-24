-- Insert sample funds without hardcoded prices (will be updated by data sync)
INSERT INTO funds (ticker, name, isin, sector, last_price, daily_change) VALUES
('SPY', 'SPDR S&P 500 ETF Trust', 'US78462F1030', 'Broad Market', NULL, NULL),
('QQQ', 'Invesco QQQ Trust', 'US46090E1038', 'Technology', NULL, NULL),
('VTI', 'Vanguard Total Stock Market ETF', 'US9229087690', 'Broad Market', NULL, NULL),
('ARKK', 'ARK Innovation ETF', 'US00214Q1040', 'Innovation', NULL, NULL),
('XLF', 'Financial Select Sector SPDR Fund', 'US81369Y5069', 'Financial', NULL, NULL),
('TSLA', 'Tesla Inc', 'US88160R1014', 'Electric Vehicles', NULL, NULL),
('AAPL', 'Apple Inc', 'US0378331005', 'Technology', NULL, NULL),
('MSFT', 'Microsoft Corporation', 'US5949181045', 'Technology', NULL, NULL)
ON CONFLICT (ticker) DO NOTHING;

-- Insert sample news articles
INSERT INTO news_articles (title, content, source, url, published_at, sentiment_score) VALUES
('Tech Stocks Decline Amid Interest Rate Concerns', 'Technology stocks faced pressure today as investors worried about potential interest rate hikes. Major tech companies saw significant declines in trading.', 'MarketWatch', 'https://example.com/tech-decline', NOW() - INTERVAL '2 hours', -0.65),
('Electric Vehicle Sector Shows Mixed Results', 'The electric vehicle sector showed mixed performance today, with some companies gaining while others declined on supply chain concerns.', 'Reuters', 'https://example.com/ev-mixed', NOW() - INTERVAL '4 hours', -0.12),
('Financial Sector Rallies on Banking Optimism', 'Financial stocks surged today as investors showed renewed confidence in the banking sector following positive earnings reports.', 'Bloomberg', 'https://example.com/financial-rally', NOW() - INTERVAL '6 hours', 0.78),
('Market Volatility Continues Amid Economic Uncertainty', 'Broad market indices experienced continued volatility as economic uncertainty persists among investors.', 'CNBC', 'https://example.com/market-volatility', NOW() - INTERVAL '8 hours', -0.34),
('Innovation ETFs Face Headwinds', 'Innovation-focused ETFs are facing challenges as growth stocks continue to underperform in the current market environment.', 'Financial Times', 'https://example.com/innovation-headwinds', NOW() - INTERVAL '12 hours', -0.56)
ON CONFLICT DO NOTHING;

-- Link news articles to funds
INSERT INTO fund_news_links (fund_id, article_id, relevance_score) VALUES
((SELECT id FROM funds WHERE ticker = 'QQQ'), (SELECT id FROM news_articles WHERE title LIKE '%Tech Stocks Decline%'), 0.95),
((SELECT id FROM funds WHERE ticker = 'AAPL'), (SELECT id FROM news_articles WHERE title LIKE '%Tech Stocks Decline%'), 0.87),
((SELECT id FROM funds WHERE ticker = 'MSFT'), (SELECT id FROM news_articles WHERE title LIKE '%Tech Stocks Decline%'), 0.82),
((SELECT id FROM funds WHERE ticker = 'TSLA'), (SELECT id FROM news_articles WHERE title LIKE '%Electric Vehicle%'), 0.92),
((SELECT id FROM funds WHERE ticker = 'XLF'), (SELECT id FROM news_articles WHERE title LIKE '%Financial Sector%'), 0.89),
((SELECT id FROM funds WHERE ticker = 'SPY'), (SELECT id FROM news_articles WHERE title LIKE '%Market Volatility%'), 0.78),
((SELECT id FROM funds WHERE ticker = 'VTI'), (SELECT id FROM news_articles WHERE title LIKE '%Market Volatility%'), 0.75),
((SELECT id FROM funds WHERE ticker = 'ARKK'), (SELECT id FROM news_articles WHERE title LIKE '%Innovation ETFs%'), 0.94)
ON CONFLICT DO NOTHING;

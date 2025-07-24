// Script to show exactly what the scraped data looks like
const fs = require('fs');
const path = require('path');

// Load environment variables
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    const envFile = fs.readFileSync(envPath, 'utf8');
    const env = {};
    
    envFile.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value && !key.startsWith('#')) {
        env[key.trim()] = value.trim();
      }
    });
    
    return env;
  } catch (error) {
    console.error('❌ Error loading .env file:', error.message);
    return {};
  }
}

async function showScrapedData() {
  console.log('📊 SCRAPED DATA EXAMINATION');
  console.log('=' .repeat(60));
  console.log();
  
  const env = loadEnv();
  
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.log('❌ Missing Supabase credentials');
    return;
  }

  try {
    // 1. Show news articles
    console.log('📰 NEWS ARTICLES TABLE:');
    console.log('-'.repeat(40));
    
    const newsUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/news_articles?select=*&order=published_at.desc&limit=5`;
    const newsResponse = await fetch(newsUrl, {
      headers: {
        'apikey': env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (newsResponse.ok) {
      const newsData = await newsResponse.json();
      
      newsData.forEach((article, index) => {
        console.log(`📄 Article ${index + 1}:`);
        console.log(`   ID: ${article.id}`);
        console.log(`   Title: "${article.title}"`);
        console.log(`   Source: ${article.source}`);
        console.log(`   URL: ${article.url}`);
        console.log(`   Published: ${new Date(article.published_at).toLocaleString()}`);
        console.log(`   Sentiment Score: ${article.sentiment_score} (${getSentimentLabel(article.sentiment_score)})`);
        console.log(`   Content Preview: "${article.content?.substring(0, 100)}..."`);
        console.log(`   Processed: ${new Date(article.processed_at).toLocaleString()}`);
        console.log();
      });
    } else {
      console.log('❌ Failed to fetch news articles');
    }
    
    // 2. Show fund news links
    console.log('🔗 FUND NEWS LINKS TABLE:');
    console.log('-'.repeat(40));
    
    const linksUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/fund_news_links?select=*,funds(ticker,name),news_articles(title,source)&limit=10`;
    const linksResponse = await fetch(linksUrl, {
      headers: {
        'apikey': env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (linksResponse.ok) {
      const linksData = await linksResponse.json();
      
      linksData.forEach((link, index) => {
        console.log(`🔗 Link ${index + 1}:`);
        console.log(`   Fund: ${link.funds?.ticker} (${link.funds?.name})`);
        console.log(`   Article: "${link.news_articles?.title}"`);
        console.log(`   Source: ${link.news_articles?.source}`);
        console.log(`   Relevance Score: ${(link.relevance_score * 100).toFixed(1)}%`);
        console.log(`   Created: ${new Date(link.created_at).toLocaleString()}`);
        console.log();
      });
    } else {
      console.log('❌ Failed to fetch fund news links');
    }
    
    // 3. Show funds with sentiment data
    console.log('📈 FUNDS TABLE:');
    console.log('-'.repeat(40));
    
    const fundsUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/funds?select=*&order=ticker`;
    const fundsResponse = await fetch(fundsUrl, {
      headers: {
        'apikey': env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (fundsResponse.ok) {
      const fundsData = await fundsResponse.json();
      
      fundsData.forEach((fund, index) => {
        console.log(`📊 Fund ${index + 1}:`);
        console.log(`   Ticker: ${fund.ticker}`);
        console.log(`   Name: ${fund.name}`);
        console.log(`   Sector: ${fund.sector || 'N/A'}`);
        console.log(`   Last Price: $${fund.last_price || 'N/A'}`);
        console.log(`   Daily Change: ${fund.daily_change ? (fund.daily_change * 100).toFixed(2) + '%' : 'N/A'}`);
        console.log(`   Last Updated: ${new Date(fund.updated_at).toLocaleString()}`);
        console.log();
      });
    } else {
      console.log('❌ Failed to fetch funds');
    }
    
    // 4. Show summary statistics
    console.log('📋 SUMMARY STATISTICS:');
    console.log('-'.repeat(40));
    
    // Count articles by source
    if (newsResponse.ok) {
      const newsData = await newsResponse.json();
      const sources = {};
      const sentiments = { positive: 0, negative: 0, neutral: 0 };
      
      newsData.forEach(article => {
        sources[article.source] = (sources[article.source] || 0) + 1;
        
        if (article.sentiment_score > 0.1) sentiments.positive++;
        else if (article.sentiment_score < -0.1) sentiments.negative++;
        else sentiments.neutral++;
      });
      
      console.log('📊 Articles by Source:');
      Object.entries(sources).forEach(([source, count]) => {
        console.log(`   ${source}: ${count} articles`);
      });
      
      console.log('\n😊 Sentiment Distribution:');
      console.log(`   Positive: ${sentiments.positive} articles`);
      console.log(`   Negative: ${sentiments.negative} articles`);
      console.log(`   Neutral: ${sentiments.neutral} articles`);
    }
    
    console.log('\n✅ Scraped data examination complete!');
    console.log('\n💡 This data comes from:');
    console.log('   • Yahoo Finance news scraping');
    console.log('   • Hugging Face sentiment analysis');
    console.log('   • Automated fund-news relevance matching');
    
  } catch (error) {
    console.error('❌ Error examining scraped data:', error.message);
  }
}

function getSentimentLabel(score) {
  if (score === null || score === undefined) return 'Unknown';
  if (score > 0.3) return 'Very Positive';
  if (score > 0.1) return 'Positive';
  if (score > -0.1) return 'Neutral';
  if (score > -0.3) return 'Negative';
  return 'Very Negative';
}

showScrapedData();

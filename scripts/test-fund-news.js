// Test individual fund news to see if it's working
async function testFundNews() {
  const fundTickers = ['TSLA', 'QQQ', 'SPY', 'VTI'];
  
  for (const ticker of fundTickers) {
    try {
      console.log(`🧪 Testing ${ticker} fund news...\n`);
      
      const response = await fetch(`http://localhost:3000/api/funds/${ticker}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      console.log(`📊 ${ticker} Fund API Response:`);
      console.log('   Fund Name:', data.name);
      console.log('   Last Price:', data.last_price);
      console.log('   Daily Change:', data.daily_change);
      console.log('   News Articles:', data.news_articles?.length || 0);
      
      if (data.sentiment_analytics) {
        console.log('   Sentiment Analytics:');
        console.log('     Total articles:', data.sentiment_analytics.total_articles);
        console.log('     Avg sentiment:', data.sentiment_analytics.avg_sentiment?.toFixed(3));
        console.log('     Positive/Negative/Neutral:', 
          `${data.sentiment_analytics.positive_count}/${data.sentiment_analytics.negative_count}/${data.sentiment_analytics.neutral_count}`);
      }
      
      if (data.news_articles && data.news_articles.length > 0) {
        console.log('\n📝 Sample article:');
        const article = data.news_articles[0];
        console.log('     Title:', article.title);
        console.log('     Source:', article.source);
        console.log('     Sentiment:', article.sentiment_score);
        console.log('     Relevance:', article.relevance_score);
      } else {
        console.log('\n❌ No articles returned for', ticker);
        console.log('   This could mean:');
        console.log('   1. No news has been scraped for this fund yet');
        console.log('   2. News not properly linked to this fund');
        console.log('   3. Need to run background sync');
      }
      
      console.log('\n' + '='.repeat(50) + '\n');
      
    } catch (error) {
      console.error(`❌ ${ticker} fund test failed:`, error.message);
    }
  }
}

testFundNews();

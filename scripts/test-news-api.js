// Test the news API to see if it's returning data
async function testNewsAPI() {
  try {
    console.log('🧪 Testing News API...\n');
    
    const response = await fetch('http://localhost:3000/api/news?limit=5&days=7');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('📊 News API Response:');
    console.log('   Success:', data.success);
    console.log('   Articles count:', data.data?.length || 0);
    
    if (data.stats) {
      console.log('   Stats:');
      console.log('     Total articles:', data.stats.total_articles);
      console.log('     Sentiment distribution:', data.stats.sentiment_distribution);
      console.log('     Sources:', data.stats.sources);
      console.log('     Related tickers:', data.stats.related_tickers);
    }
    
    if (data.data && data.data.length > 0) {
      console.log('\n📝 Sample article:');
      const article = data.data[0];
      console.log('     Title:', article.title);
      console.log('     Source:', article.source);
      console.log('     Sentiment:', article.sentiment_score);
      console.log('     Time ago:', article.time_ago);
      console.log('     Related funds:', article.related_funds?.map(f => f.ticker));
    } else {
      console.log('\n❌ No articles returned');
      console.log('   This means either:');
      console.log('   1. No news has been scraped yet');
      console.log('   2. Database is empty');
      console.log('   3. Run background sync to populate data');
    }
    
    console.log('\n✅ News API test complete');
    
  } catch (error) {
    console.error('❌ News API test failed:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Make sure your dev server is running: npm run dev');
    }
  }
}

testNewsAPI();

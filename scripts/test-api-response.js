// Quick test to see the exact API response
async function testAPIResponse() {
  try {
    console.log('🧪 Testing API response structure...\n');
    
    const response = await fetch('http://localhost:3000/api/funds');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('📊 API Response:');
    console.log('   Type:', Array.isArray(data) ? 'Array' : typeof data);
    console.log('   Length:', Array.isArray(data) ? data.length : 'N/A');
    
    if (Array.isArray(data) && data.length > 0) {
      console.log('\n📝 First item structure:');
      const firstItem = data[0];
      console.log('   Keys:', Object.keys(firstItem));
      console.log('   Sample data:');
      console.log('     ticker:', firstItem.ticker);
      console.log('     name:', firstItem.name);
      console.log('     last_price:', firstItem.last_price);
      console.log('     daily_change:', firstItem.daily_change);
      console.log('     sentiment:', firstItem.sentiment ? 'Present' : 'Missing');
      
      if (firstItem.sentiment) {
        console.log('     sentiment.avg_sentiment:', firstItem.sentiment.avg_sentiment);
        console.log('     sentiment.article_count:', firstItem.sentiment.article_count);
      }
    } else {
      console.log('\n❌ No data returned or wrong format');
      console.log('   Raw response:', data);
    }
    
    console.log('\n✅ API test complete');
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Make sure your dev server is running: npm run dev');
    }
  }
}

testAPIResponse();

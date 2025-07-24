// Test script to verify live data integration
// Run with: node scripts/test-live-data.js

const BASE_URL = 'http://localhost:3000'

async function testAPI(endpoint, description) {
  try {
    console.log(`🧪 Testing ${description}...`)
    const response = await fetch(`${BASE_URL}${endpoint}`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log(`✅ ${description} - Success`)
    
    // Log sample data structure
    if (Array.isArray(data)) {
      console.log(`   📊 Returned ${data.length} items`)
      if (data.length > 0) {
        console.log(`   📝 Sample keys:`, Object.keys(data[0]).slice(0, 5).join(', '))
      }
    } else if (data.data) {
      console.log(`   📊 Returned ${data.data.length} items`)
      if (data.stats) {
        console.log(`   📈 Stats:`, data.stats)
      }
    } else {
      console.log(`   📝 Keys:`, Object.keys(data).slice(0, 8).join(', '))
    }
    
    return data
  } catch (error) {
    console.error(`❌ ${description} - Failed:`, error.message)
    return null
  }
}

async function runTests() {
  console.log('🚀 Testing live data integration...\n')
  
  // Test basic endpoints
  await testAPI('/api/funds', 'Funds list with sentiment data')
  await testAPI('/api/funds/TSLA', 'Individual fund (TSLA) with news')
  await testAPI('/api/news', 'Recent news feed')
  await testAPI('/api/news?ticker=TSLA', 'News for specific ticker (TSLA)')
  await testAPI('/api/news?limit=5&days=3', 'News with custom params')
  
  // Test admin endpoints
  await testAPI('/api/admin/database?action=health', 'System health check')
  await testAPI('/api/admin/database?action=statistics', 'Daily statistics')
  await testAPI('/api/admin/database?action=integrity', 'Data integrity check')
  
  console.log('\n🎯 Testing complete!')
  console.log('\n📋 What to check on your dashboard:')
  console.log('   • Fund cards should show real sentiment scores')
  console.log('   • Individual fund pages should show actual news articles')
  console.log('   • Data freshness indicators should show recent timestamps')
  console.log('   • News should be properly linked to specific funds')
  console.log('   • Sentiment trends should reflect actual Hugging Face analysis')
}

// Run the tests
runTests().catch(console.error)

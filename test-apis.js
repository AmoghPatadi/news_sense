// Simple test script to verify API endpoints
const baseUrl = 'http://localhost:3000'

async function testAPI(endpoint, method = 'GET') {
  try {
    console.log(`Testing ${method} ${endpoint}...`)
    const response = await fetch(`${baseUrl}${endpoint}`, { method })
    const data = await response.json()
    console.log(`✅ ${endpoint} - Status: ${response.status}`)
    console.log('Response:', JSON.stringify(data, null, 2))
    return data
  } catch (error) {
    console.log(`❌ ${endpoint} - Error:`, error.message)
    return null
  }
}

async function runTests() {
  console.log('🧪 Testing API endpoints...\n')
  
  // Test basic endpoints
  await testAPI('/api/funds')
  console.log('\n---\n')
  
  await testAPI('/api/market-status')
  console.log('\n---\n')
  
  // Test data sync (POST)
  await testAPI('/api/data-sync', 'POST')
  console.log('\n---\n')
  
  // Test background sync status
  await testAPI('/api/sync-background')
  console.log('\n---\n')
  
  console.log('🎉 API tests completed!')
}

// Run tests if this script is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runTests()
}

module.exports = { testAPI, runTests }

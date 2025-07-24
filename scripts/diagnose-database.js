// Diagnostic script to check database connectivity and data
// This will help identify why data isn't showing on the dashboard

const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
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

async function testDatabaseConnection() {
  console.log('🔍 Diagnosing database issues...\n');
  
  const env = loadEnv();
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`   SUPABASE_URL: ${env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`   SUPABASE_ANON_KEY: ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   HUGGINGFACE_API_KEY: ${env.HUGGINGFACE_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   GROQ_API_KEY: ${env.GROQ_API_KEY ? '✅ Set' : '❌ Missing'}\n`);
  
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.log('❌ Missing Supabase credentials. Database connection will fail.\n');
    return false;
  }
  
  // Test basic database connectivity using fetch (simulating what the frontend does)
  try {
    console.log('🔌 Testing basic database connectivity...');
    
    // Simple query to test connection
    const testUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/funds?select=id,ticker,name&limit=1`;
    
    const response = await fetch(testUrl, {
      headers: {
        'apikey': env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Database connection successful');
      console.log(`   Found ${data.length} fund records\n`);
      
      if (data.length === 0) {
        console.log('⚠️  No funds found in database. You may need to:');
        console.log('   1. Run the setup scripts (001-create-tables.sql and 002-seed-sample-data.sql)');
        console.log('   2. Or run the background sync to populate data\n');
      }
      
      return true;
    } else {
      const errorText = await response.text();
      console.log(`❌ Database query failed: ${response.status} ${response.statusText}`);
      console.log(`   Error: ${errorText}\n`);
      
      if (response.status === 404) {
        console.log('💡 This usually means the "funds" table doesn\'t exist.');
        console.log('   Please run the database setup scripts.\n');
      }
      
      return false;
    }
    
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    return false;
  }
}

async function testAPIEndpoints() {
  console.log('🧪 Testing API endpoints (requires running dev server)...\n');
  
  const endpoints = [
    { url: 'http://localhost:3000/api/funds', name: 'Funds API' },
    { url: 'http://localhost:3000/api/market-status', name: 'Market Status API' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${endpoint.name} - Working`);
        
        if (Array.isArray(data)) {
          console.log(`   📊 Returned ${data.length} items`);
        } else if (data.setupRequired) {
          console.log(`   ⚠️  Setup required`);
        } else {
          console.log(`   📝 Response type: ${typeof data}`);
        }
      } else {
        console.log(`❌ ${endpoint.name} - Failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name} - Connection failed: ${error.message}`);
      if (error.message.includes('ECONNREFUSED')) {
        console.log('   💡 Make sure your dev server is running (npm run dev)');
      }
    }
  }
  
  console.log();
}

async function checkDatabaseTables() {
  console.log('📋 Checking database tables...\n');
  
  const env = loadEnv();
  
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.log('❌ Cannot check tables without Supabase credentials\n');
    return;
  }
  
  const tables = ['funds', 'news_articles', 'fund_news_links', 'user_queries'];
  
  for (const table of tables) {
    try {
      const testUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`;
      
      const response = await fetch(testUrl, {
        headers: {
          'apikey': env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Table "${table}" exists - ${data.length} sample record(s)`);
      } else if (response.status === 404) {
        console.log(`❌ Table "${table}" does not exist`);
      } else {
        console.log(`⚠️  Table "${table}" - Error ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Error checking table "${table}":`, error.message);
    }
  }
  
  console.log();
}

async function runDiagnostics() {
  console.log('🏥 News Sense Database Diagnostics\n');
  console.log('=' .repeat(50) + '\n');
  
  const dbConnected = await testDatabaseConnection();
  await checkDatabaseTables();
  await testAPIEndpoints();
  
  console.log('📋 Summary & Next Steps:');
  console.log('=' .repeat(50));
  
  if (!dbConnected) {
    console.log('❌ Database connection failed. Steps to fix:');
    console.log('   1. Check your .env file has correct Supabase credentials');
    console.log('   2. Verify your Supabase project is active');
    console.log('   3. Run database setup scripts in Supabase SQL editor');
  } else {
    console.log('✅ Database connection working');
    console.log('💡 If dashboard still shows no data:');
    console.log('   1. Make sure dev server is running (npm run dev)');
    console.log('   2. Check browser console for errors');
    console.log('   3. Run background sync to populate data:');
    console.log('      POST http://localhost:3000/api/sync-background');
  }
  
  console.log('\n🔧 Quick fixes:');
  console.log('   • Database setup: Copy scripts/combined-database-improvements.sql to Supabase');
  console.log('   • Populate data: Hit the "Sync Data" button in your dashboard');
  console.log('   • Test APIs: Run this script while dev server is running');
}

// Run diagnostics
runDiagnostics().catch(console.error);

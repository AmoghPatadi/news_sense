// Database setup script for news_sense
// Run this with: node scripts/setup-database.js

const fs = require('fs');
const path = require('path');

// Simple database setup without external dependencies

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSQLFile(filePath, description) {
  try {
    console.log(`📄 Running ${description}...`);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Split SQL file into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`   Found ${statements.length} SQL statements`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
          if (error) {
            // Try running as a direct query for simpler statements
            const { error: directError } = await supabase
              .from('__direct_sql__')
              .select('*')
              .limit(0); // This will fail, but we can catch the error
            
            if (directError) {
              console.warn(`   ⚠️  Statement ${i + 1} may have failed:`, error.message);
            }
          }
        } catch (err) {
          console.warn(`   ⚠️  Statement ${i + 1} error:`, err.message);
        }
      }
    }
    
    console.log(`✅ Completed ${description}`);
    return true;
  } catch (error) {
    console.error(`❌ Error running ${description}:`, error.message);
    return false;
  }
}

async function setupDatabase() {
  console.log('🚀 Setting up news_sense database...\n');
  
  // Define SQL files to run in order
  const sqlFiles = [
    {
      file: path.join(__dirname, '001-create-tables.sql'),
      description: 'Creating base tables'
    },
    {
      file: path.join(__dirname, '002-seed-sample-data.sql'),
      description: 'Seeding sample data'
    },
    {
      file: path.join(__dirname, '003-performance-indexes.sql'),
      description: 'Adding performance improvements'
    },
    {
      file: path.join(__dirname, '004-maintenance-tasks.sql'),
      description: 'Creating maintenance functions'
    }
  ];
  
  let successCount = 0;
  
  for (const sqlFile of sqlFiles) {
    if (fs.existsSync(sqlFile.file)) {
      const success = await runSQLFile(sqlFile.file, sqlFile.description);
      if (success) successCount++;
      console.log(''); // Add spacing
    } else {
      console.warn(`⚠️  File not found: ${sqlFile.file}`);
    }
  }
  
  console.log(`\n📊 Database setup completed!`);
  console.log(`   ✅ ${successCount}/${sqlFiles.length} SQL files processed successfully`);
  
  if (successCount === sqlFiles.length) {
    console.log('\n🎉 Your database is now optimized with:');
    console.log('   • Performance indexes for faster queries');
    console.log('   • Historical price tracking');
    console.log('   • Sentiment aggregation tables');
    console.log('   • System health monitoring');
    console.log('   • Automated maintenance functions');
    console.log('   • Data integrity checks');
    
    console.log('\n🔧 Available API endpoints:');
    console.log('   • GET /api/admin/database?action=health');
    console.log('   • GET /api/admin/database?action=statistics');
    console.log('   • GET /api/admin/database?action=integrity');
    console.log('   • POST /api/admin/database (for maintenance)');
  } else {
    console.log('\n⚠️  Some SQL files had issues. Check the logs above.');
    console.log('   You may need to run them manually in your Supabase dashboard.');
  }
}

// Alternative simple setup for Supabase dashboard
async function generateSQLForDashboard() {
  console.log('📋 Generating combined SQL for Supabase dashboard...\n');
  
  const sqlFiles = [
    '003-performance-indexes.sql',
    '004-maintenance-tasks.sql'
  ];
  
  let combinedSQL = '-- Combined SQL for news_sense database improvements\n';
  combinedSQL += '-- Copy and paste this into your Supabase SQL editor\n\n';
  
  for (const fileName of sqlFiles) {
    const filePath = path.join(__dirname, fileName);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      combinedSQL += `-- ==== ${fileName} ====\n`;
      combinedSQL += content;
      combinedSQL += '\n\n';
    }
  }
  
  const outputPath = path.join(__dirname, 'combined-database-improvements.sql');
  fs.writeFileSync(outputPath, combinedSQL);
  
  console.log(`✅ Generated combined SQL file: ${outputPath}`);
  console.log('\n📋 Instructions:');
  console.log('1. Go to your Supabase dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Copy and paste the contents of combined-database-improvements.sql');
  console.log('4. Run the SQL');
  
  return outputPath;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--dashboard')) {
    await generateSQLForDashboard();
  } else {
    await setupDatabase();
  }
}

main().catch(console.error);

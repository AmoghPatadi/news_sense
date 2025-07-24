import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

// Database administration API endpoint
export async function GET(request: Request) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'health':
        return await getSystemHealth(supabase)
      
      case 'statistics':
        return await getDailyStatistics(supabase, searchParams.get('date'))
      
      case 'integrity':
        return await checkDataIntegrity(supabase)
      
      case 'performance':
        return await getPerformanceMetrics(supabase)
        
      default:
        return NextResponse.json({
          error: "Invalid action. Use: health, statistics, integrity, or performance"
        }, { status: 400 })
    }

  } catch (error) {
    console.error("Database admin error:", error)
    return NextResponse.json({ 
      error: "Database administration failed", 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST endpoint for database maintenance operations
export async function POST(request: Request) {
  try {
    const supabase = createServerClient()
    const { action, params } = await request.json()

    switch (action) {
      case 'cleanup':
        return await cleanupDatabase(supabase, params?.days || 30)
      
      case 'optimize':
        return await optimizeDatabase(supabase)
      
      case 'archive':
        return await archiveOldNews(supabase, params?.days || 30)
      
      case 'update_sentiment':
        return await updateSentimentSummary(supabase, params?.date)
        
      default:
        return NextResponse.json({
          error: "Invalid action. Use: cleanup, optimize, archive, or update_sentiment"
        }, { status: 400 })
    }

  } catch (error) {
    console.error("Database maintenance error:", error)
    return NextResponse.json({ 
      error: "Database maintenance failed", 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// System health check
async function getSystemHealth(supabase: any) {
  const { data, error } = await supabase.rpc('system_health_check')
  
  if (error) {
    throw new Error(`Health check failed: ${error.message}`)
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    components: data,
    overall_status: data.some((c: any) => c.status === 'down') ? 'down' : 
                   data.some((c: any) => c.status === 'degraded') ? 'degraded' : 'healthy'
  })
}

// Daily statistics
async function getDailyStatistics(supabase: any, date?: string | null) {
  const targetDate = date || new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase.rpc('daily_statistics', { target_date: targetDate })
  
  if (error) {
    throw new Error(`Statistics query failed: ${error.message}`)
  }

  // Transform the data into a more readable format
  const stats: Record<string, any> = {}
  data.forEach((row: any) => {
    stats[row.metric_name] = {
      value: row.metric_value,
      description: row.metric_description
    }
  })

  return NextResponse.json({
    success: true,
    date: targetDate,
    statistics: stats
  })
}

// Data integrity check
async function checkDataIntegrity(supabase: any) {
  const { data, error } = await supabase.rpc('check_data_integrity')
  
  if (error) {
    throw new Error(`Integrity check failed: ${error.message}`)
  }

  const issues = data.filter((check: any) => check.issue_count > 0)
  
  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    checks: data,
    issues_found: issues.length,
    critical_issues: issues.filter((issue: any) => 
      ['orphaned_fund_links', 'missing_sentiment'].includes(issue.check_type)
    )
  })
}

// Performance metrics
async function getPerformanceMetrics(supabase: any) {
  // Get table sizes
  const { data: tableSizes, error: sizeError } = await supabase
    .from('information_schema.tables')
    .select('table_name, table_rows')
    .eq('table_schema', 'public')
    .in('table_name', ['funds', 'news_articles', 'fund_news_links', 'user_queries'])

  if (sizeError) {
    throw new Error(`Performance metrics query failed: ${sizeError.message}`)
  }

  // Get recent activity metrics
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const { data: recentArticles, error: articlesError } = await supabase
    .from('news_articles')
    .select('id')
    .gte('created_at', oneDayAgo.toISOString())

  const { data: recentQueries, error: queriesError } = await supabase
    .from('user_queries')
    .select('id, response_time_ms')
    .gte('created_at', oneDayAgo.toISOString())

  if (articlesError || queriesError) {
    throw new Error('Failed to fetch activity metrics')
  }

  // Calculate average response time
  const avgResponseTime = recentQueries.length > 0 
    ? recentQueries.reduce((sum: number, q: any) => sum + (q.response_time_ms || 0), 0) / recentQueries.length
    : 0

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    metrics: {
      table_sizes: tableSizes,
      activity_24h: {
        new_articles: recentArticles.length,
        user_queries: recentQueries.length,
        avg_response_time_ms: Math.round(avgResponseTime)
      }
    }
  })
}

// Database cleanup
async function cleanupDatabase(supabase: any, days: number) {
  const { data, error } = await supabase.rpc('cleanup_old_news')
  
  if (error) {
    throw new Error(`Cleanup failed: ${error.message}`)
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    deleted_articles: data,
    message: `Cleaned up articles older than ${days} days`
  })
}

// Database optimization
async function optimizeDatabase(supabase: any) {
  const { data, error } = await supabase.rpc('optimize_database')
  
  if (error) {
    throw new Error(`Optimization failed: ${error.message}`)
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    message: data,
    details: "Database statistics updated and indexes rebuilt"
  })
}

// Archive old news
async function archiveOldNews(supabase: any, days: number) {
  const { data, error } = await supabase.rpc('archive_old_news', { days_to_keep: days })
  
  if (error) {
    throw new Error(`Archive failed: ${error.message}`)
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    archived_count: data[0]?.archived_count || 0,
    deleted_count: data[0]?.deleted_count || 0,
    message: `Archived articles older than ${days} days`
  })
}

// Update sentiment summary
async function updateSentimentSummary(supabase: any, date?: string) {
  const targetDate = date || new Date().toISOString().split('T')[0]
  
  const { error } = await supabase.rpc('update_daily_sentiment_summary', { target_date: targetDate })
  
  if (error) {
    throw new Error(`Sentiment summary update failed: ${error.message}`)
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    updated_date: targetDate,
    message: "Daily sentiment summary updated successfully"
  })
}

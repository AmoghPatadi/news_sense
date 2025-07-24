"use client"

import { useEffect, useState } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { FundChart } from "@/components/fund-chart"
import { NewsFeed } from "@/components/news-feed"
import { ChatInterface } from "@/components/chat-interface"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import type { Fund, NewsArticle } from "@/lib/types"
import { SetupVerification } from "@/components/setup-verification"
import { RealTimeUpdater } from "@/components/real-time-updater"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AITestPanel } from "@/components/ai-test-panel"

export default function Dashboard() {
  const [funds, setFunds] = useState<Fund[]>([])
  const [selectedFund, setSelectedFund] = useState<Fund | null>(null)
  const [fundNews, setFundNews] = useState<(NewsArticle & { relevance_score?: number })[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null)

  useEffect(() => {
    fetchFunds()
  }, [])

  const handleRealTimeUpdate = () => {
    // Refresh data when real-time update occurs
    fetchFunds()
    setLastUpdateTime(new Date().toLocaleTimeString())
  }

  const fetchFunds = async () => {
    try {
      const response = await fetch("/api/funds")
      if (response.ok) {
        const data = await response.json()

        // Check if setup is required
        if (data.setupRequired) {
          setFunds([])
          return
        }

        // Handle both array response and object with funds array
        const fundsArray = Array.isArray(data) ? data : data.funds || []
        setFunds(fundsArray)

        if (fundsArray.length > 0) {
          setSelectedFund(fundsArray[0])
          fetchFundDetails(fundsArray[0].ticker)
        }
      }
    } catch (error) {
      console.error("Error fetching funds:", error)
      setFunds([])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchFundDetails = async (ticker: string) => {
    try {
      const response = await fetch(`/api/funds/${ticker}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedFund(data)
        setFundNews(data.news_articles || [])
      }
    } catch (error) {
      console.error("Error fetching fund details:", error)
    }
  }

  const filteredFunds = funds.filter(
    (fund) =>
      fund.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fund.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const topPerformers = funds
    .filter((fund) => fund.daily_change !== null)
    .sort((a, b) => (b.daily_change || 0) - (a.daily_change || 0))
    .slice(0, 5)

  const bottomPerformers = funds
    .filter((fund) => fund.daily_change !== null)
    .sort((a, b) => (a.daily_change || 0) - (b.daily_change || 0))
    .slice(0, 5)

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  if (funds.length === 0 && !isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <DashboardHeader />
        <SetupVerification />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Database Setup Required
            </CardTitle>
            <CardDescription>Your database tables need to be created before you can use the dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-medium text-yellow-800 mb-2">Setup Instructions:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
                <li>
                  Go to your Supabase dashboard:{" "}
                  <a
                    href="https://einiudectbjfwhkxnntq.supabase.co"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    https://einiudectbjfwhkxnntq.supabase.co
                  </a>
                </li>
                <li>Navigate to the SQL Editor</li>
                <li>
                  Run the script: <code className="bg-yellow-100 px-1 rounded">scripts/001-create-tables.sql</code>
                </li>
                <li>
                  Run the script: <code className="bg-yellow-100 px-1 rounded">scripts/002-seed-sample-data.sql</code>
                </li>
                <li>Refresh this page</li>
              </ol>
            </div>

            <Button onClick={() => window.location.reload()} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page After Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <RealTimeUpdater onDataUpdate={handleRealTimeUpdate} />
      <DashboardHeader />
      <SetupVerification />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="funds">Fund Analysis</TabsTrigger>
          <TabsTrigger value="chat">AI Assistant</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Top Performers</CardTitle>
                <CardDescription>Best performing funds today</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topPerformers.length > 0 ? (
                    topPerformers.map((fund) => (
                      <div key={fund.id} className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{fund.ticker}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            {fund.last_price ? `$${fund.last_price.toFixed(2)}` : 'Price updating...'}
                          </span>
                        </div>
                        <span className="text-green-600 font-medium">
                          {fund.daily_change ? `+${(fund.daily_change * 100).toFixed(2)}%` : '--'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      <div className="text-sm">No price data available</div>
                      <div className="text-xs mt-1">Run "Sync Data" to update prices</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Bottom Performers</CardTitle>
                <CardDescription>Worst performing funds today</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {bottomPerformers.length > 0 ? (
                    bottomPerformers.map((fund) => (
                      <div key={fund.id} className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{fund.ticker}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            {fund.last_price ? `$${fund.last_price.toFixed(2)}` : 'Price updating...'}
                          </span>
                        </div>
                        <span className="text-red-600 font-medium">
                          {fund.daily_change ? `${(fund.daily_change * 100).toFixed(2)}%` : '--'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      <div className="text-sm">No price data available</div>
                      <div className="text-xs mt-1">Run "Sync Data" to update prices</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <NewsFeed articles={fundNews.slice(0, 5)} title="Latest Market News" />
        </TabsContent>

        <TabsContent value="funds" className="space-y-6">
          <div className="flex gap-4">
            <div className="w-1/3">
              <Card>
                <CardHeader>
                  <CardTitle>Fund Search</CardTitle>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search funds..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredFunds.map((fund) => (
                      <div
                        key={fund.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedFund?.id === fund.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                        }`}
                        onClick={() => {
                          setSelectedFund(fund)
                          fetchFundDetails(fund.ticker)
                        }}
                      >
                        <div className="font-medium">{fund.ticker}</div>
                        <div className="text-sm opacity-70 truncate">{fund.name}</div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-sm">
                            {fund.last_price ? `$${fund.last_price.toFixed(2)}` : 'N/A'}
                          </span>
                          <span
                            className={`text-sm ${(fund.daily_change || 0) >= 0 ? "text-green-400" : "text-red-400"}`}
                          >
                            {fund.daily_change ? `${((fund.daily_change || 0) * 100).toFixed(2)}%` : '--'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="w-2/3 space-y-6">
              {selectedFund && (
                <>
                  <FundChart
                    ticker={selectedFund.ticker}
                    name={selectedFund.name}
                    currentPrice={selectedFund.last_price || 0}
                    dailyChange={selectedFund.daily_change || 0}
                  />
                  <NewsFeed articles={fundNews} title={`News for ${selectedFund.ticker}`} />
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="chat" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChatInterface />
            <AITestPanel />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Database, TrendingUp, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function DashboardHeader() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [marketStatus, setMarketStatus] = useState<string>("Loading...")
  const { toast } = useToast()

  useEffect(() => {
    fetchMarketStatus()
  }, [])

  const fetchMarketStatus = async () => {
    try {
      const response = await fetch("/api/market-status")
      if (response.ok) {
        const data = await response.json()
        setMarketStatus(data.market || "Unknown")
      }
    } catch (error) {
      console.error("Error fetching market status:", error)
      setMarketStatus("Unknown")
    }
  }

  const handleDataSync = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch("/api/data-sync", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Sync failed")
      }

      const result = await response.json()

      toast({
        title: "Data Sync Complete",
        description: `Updated ${result.updatedFunds} funds and processed ${result.processedArticles} articles in ${result.processingTimeMs}ms via ${result.dataProvider}`,
      })

      // Refresh market status after sync
      fetchMarketStatus()
    } catch (error) {
      console.error("Sync error:", error)
      toast({
        title: "Sync Failed",
        description: "Failed to sync data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financial AI Dashboard</h1>
        <p className="text-muted-foreground">AI-powered fund analysis with real-time news sentiment</p>
        <p className="text-sm text-muted-foreground mt-1">Powered by Polygon.io & OpenAI</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Market: {marketStatus}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            Polygon.io
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Groq AI
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            HuggingFace
          </Badge>
        </div>
        <Button onClick={handleDataSync} disabled={isSyncing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Syncing..." : "Sync Data"}
        </Button>
      </div>
    </div>
  )
}

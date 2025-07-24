"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Clock, RefreshCw, AlertTriangle } from "lucide-react"

interface DataFreshnessProps {
  lastUpdated: string | null
  label: string
  maxAgeHours?: number
  className?: string
}

export function DataFreshness({ 
  lastUpdated, 
  label, 
  maxAgeHours = 4, 
  className 
}: DataFreshnessProps) {
  const [timeAgo, setTimeAgo] = useState("")
  const [freshness, setFreshness] = useState<"fresh" | "stale" | "very_stale">("fresh")

  useEffect(() => {
    if (!lastUpdated) {
      setTimeAgo("Never")
      setFreshness("very_stale")
      return
    }

    const updateTimeAgo = () => {
      const now = new Date()
      const updated = new Date(lastUpdated)
      const diffMs = now.getTime() - updated.getTime()
      const diffMins = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      let timeText = ""
      if (diffMins < 1) {
        timeText = "Just now"
      } else if (diffMins < 60) {
        timeText = `${diffMins}m ago`
      } else if (diffHours < 24) {
        timeText = `${diffHours}h ago`
      } else {
        timeText = `${diffDays}d ago`
      }

      setTimeAgo(timeText)

      // Determine freshness
      if (diffHours < 1) {
        setFreshness("fresh")
      } else if (diffHours < maxAgeHours) {
        setFreshness("stale")
      } else {
        setFreshness("very_stale")
      }
    }

    updateTimeAgo()
    const interval = setInterval(updateTimeAgo, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [lastUpdated, maxAgeHours])

  const getVariant = () => {
    switch (freshness) {
      case "fresh":
        return "default" as const
      case "stale":
        return "secondary" as const
      case "very_stale":
        return "destructive" as const
      default:
        return "secondary" as const
    }
  }

  const getIcon = () => {
    switch (freshness) {
      case "fresh":
        return <RefreshCw className="h-3 w-3" />
      case "stale":
        return <Clock className="h-3 w-3" />
      case "very_stale":
        return <AlertTriangle className="h-3 w-3" />
      default:
        return <Clock className="h-3 w-3" />
    }
  }

  return (
    <Badge variant={getVariant()} className={`text-xs gap-1 ${className}`}>
      {getIcon()}
      <span>{label}: {timeAgo}</span>
    </Badge>
  )
}

interface LiveDataIndicatorProps {
  priceUpdated: string | null
  newsUpdated: string | null
  className?: string
}

export function LiveDataIndicator({ 
  priceUpdated, 
  newsUpdated, 
  className 
}: LiveDataIndicatorProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <DataFreshness 
        lastUpdated={priceUpdated} 
        label="Price" 
        maxAgeHours={2}
      />
      <DataFreshness 
        lastUpdated={newsUpdated} 
        label="News" 
        maxAgeHours={4}
      />
    </div>
  )
}

interface SentimentIndicatorProps {
  sentiment: number | null
  articleCount?: number
  className?: string
}

export function SentimentIndicator({ 
  sentiment, 
  articleCount = 0, 
  className 
}: SentimentIndicatorProps) {
  if (sentiment === null || sentiment === undefined) {
    return (
      <Badge variant="secondary" className={`text-xs ${className}`}>
        <AlertTriangle className="h-3 w-3 mr-1" />
        No sentiment data
      </Badge>
    )
  }

  const getSentimentInfo = (score: number) => {
    if (score > 0.3) return { label: "Very Positive", variant: "default", color: "text-green-600" }
    if (score > 0.1) return { label: "Positive", variant: "default", color: "text-green-500" }
    if (score > -0.1) return { label: "Neutral", variant: "secondary", color: "text-gray-500" }
    if (score > -0.3) return { label: "Negative", variant: "destructive", color: "text-red-500" }
    return { label: "Very Negative", variant: "destructive", color: "text-red-600" }
  }

  const { label, variant, color } = getSentimentInfo(sentiment)

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge variant={variant as any} className="text-xs">
        <span className={color}>{label}</span>
        <span className="ml-1">({sentiment.toFixed(2)})</span>
      </Badge>
      {articleCount > 0 && (
        <span className="text-xs text-muted-foreground">
          {articleCount} articles
        </span>
      )}
    </div>
  )
}

"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { NewsArticle } from "@/lib/types"

interface NewsFeedProps {
  articles: (NewsArticle & { relevance_score?: number })[]
  title?: string
}

export function NewsFeed({ articles, title = "Related News" }: NewsFeedProps) {
  const getSentimentIcon = (score?: number) => {
    if (!score) return <Minus className="h-4 w-4 text-gray-400" />
    if (score > 0.1) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (score < -0.1) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  const getSentimentColor = (score?: number) => {
    if (!score) return "bg-gray-100 text-gray-800"
    if (score > 0.1) return "bg-green-100 text-green-800"
    if (score < -0.1) return "bg-red-100 text-red-800"
    return "bg-gray-100 text-gray-800"
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    return `${Math.floor(diffInHours / 24)}d ago`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Latest financial news and market updates</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {articles.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No news articles found</p>
        ) : (
          articles.map((article) => (
            <div key={article.id} className="border-b pb-4 last:border-b-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className="font-medium leading-tight mb-2">{article.title}</h4>
                  {article.content && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {article.content.substring(0, 150)}...
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{article.source}</span>
                    <span>•</span>
                    <span>{formatTimeAgo(article.published_at)}</span>
                    {article.url && (
                      <>
                        <span>•</span>
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-primary"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Read more
                        </a>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {article.sentiment_score !== undefined && (
                    <Badge variant="secondary" className={getSentimentColor(article.sentiment_score)}>
                      <div className="flex items-center gap-1">
                        {getSentimentIcon(article.sentiment_score)}
                        <span className="text-xs">
                          {article.sentiment_score > 0 ? "+" : ""}
                          {(article.sentiment_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </Badge>
                  )}
                  {article.relevance_score && (
                    <Badge variant="outline" className="text-xs">
                      {(article.relevance_score * 100).toFixed(0)}% relevant
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

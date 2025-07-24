"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Brain, MessageSquare, TrendingUp, Zap } from "lucide-react"

export function AITestPanel() {
  const [testText, setTestText] = useState(
    "Tesla stock surged 5% today on positive earnings news and strong delivery numbers",
  )
  const [results, setResults] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const runTests = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/test-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: testText }),
      })

      if (response.ok) {
        const data = await response.json()
        setResults(data)
      }
    } catch (error) {
      console.error("Test error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Integration Testing
        </CardTitle>
        <CardDescription>Test Groq and Hugging Face AI capabilities</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Test Text:</label>
          <Textarea
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="Enter financial news text to analyze..."
            rows={3}
          />
        </div>

        <Button onClick={runTests} disabled={isLoading} className="w-full">
          {isLoading ? "Testing..." : "Run AI Tests"}
        </Button>

        {results && (
          <Tabs defaultValue="groq" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="groq" className="flex items-center gap-1">
                <Zap className="h-4 w-4" />
                Groq
              </TabsTrigger>
              <TabsTrigger value="sentiment" className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                Sentiment
              </TabsTrigger>
              <TabsTrigger value="entities" className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                Entities
              </TabsTrigger>
            </TabsList>

            <TabsContent value="groq" className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={results.groq?.success ? "default" : "destructive"}>
                  {results.groq?.success ? "Success" : "Error"}
                </Badge>
                {results.groq?.model && <Badge variant="outline">{results.groq.model}</Badge>}
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">{results.groq?.success ? results.groq.response : results.groq?.error}</p>
              </div>
            </TabsContent>

            <TabsContent value="sentiment" className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={results.huggingface?.sentiment?.success ? "default" : "destructive"}>
                  {results.huggingface?.sentiment?.success ? "Success" : "Error"}
                </Badge>
                {results.huggingface?.sentiment?.result && (
                  <Badge
                    variant="outline"
                    className={
                      results.huggingface.sentiment.result.sentiment === "positive"
                        ? "bg-green-100 text-green-800"
                        : results.huggingface.sentiment.result.sentiment === "negative"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                    }
                  >
                    {results.huggingface.sentiment.result.sentiment}
                  </Badge>
                )}
              </div>
              <div className="p-3 bg-muted rounded-lg">
                {results.huggingface?.sentiment?.success ? (
                  <div className="space-y-1">
                    <p className="text-sm">
                      <strong>Sentiment:</strong> {results.huggingface.sentiment.result.sentiment}
                    </p>
                    <p className="text-sm">
                      <strong>Score:</strong> {results.huggingface.sentiment.result.score.toFixed(3)}
                    </p>
                    <p className="text-sm">
                      <strong>Confidence:</strong> {(results.huggingface.sentiment.result.confidence * 100).toFixed(1)}%
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-red-600">{results.huggingface?.sentiment?.error}</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="entities" className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={results.huggingface?.entities?.success ? "default" : "destructive"}>
                  {results.huggingface?.entities?.success ? "Success" : "Error"}
                </Badge>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                {results.huggingface?.entities?.success ? (
                  <div className="space-y-2">
                    {results.huggingface.entities.result?.entities?.length > 0 ? (
                      results.huggingface.entities.result.entities.map((entity: any, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <Badge variant="outline">{entity.label}</Badge>
                          <span className="text-sm">{entity.entity}</span>
                          <span className="text-xs text-muted-foreground">
                            ({(entity.confidence * 100).toFixed(1)}%)
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No entities found</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-red-600">{results.huggingface?.entities?.error}</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}

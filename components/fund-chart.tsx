"use client"

import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface FundChartProps {
  ticker: string
  name: string
  currentPrice: number
  dailyChange: number
}

interface HistoricalData {
  date: string
  price: number
}

export function FundChart({ ticker, name, currentPrice, dailyChange }: FundChartProps) {
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchHistoricalData()
  }, [ticker])

  const fetchHistoricalData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/funds/${ticker}/historical`)
      if (response.ok) {
        const data = await response.json()
        setHistoricalData(data)
      } else {
        // Fallback to mock data if API fails
        generateMockData()
      }
    } catch (error) {
      console.error("Error fetching historical data:", error)
      generateMockData()
    } finally {
      setIsLoading(false)
    }
  }

  const generateMockData = () => {
    const data = Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (29 - i))
      const basePrice = currentPrice / (1 + dailyChange)
      const randomChange = (Math.random() - 0.5) * 0.1
      return {
        date: date.toISOString().split("T")[0],
        price: basePrice * (1 + randomChange * (i / 30)),
      }
    })
    setHistoricalData(data)
  }

  const changeColor = dailyChange >= 0 ? "text-green-600" : "text-red-600"
  const changeIcon = dailyChange >= 0 ? "↗" : "↘"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{ticker}</span>
          <span className={`text-sm ${changeColor}`}>
            {changeIcon} {(dailyChange * 100).toFixed(2)}%
          </span>
        </CardTitle>
        <CardDescription>{name}</CardDescription>
        <div className="text-2xl font-bold">${currentPrice.toFixed(2)}</div>
        <div className="text-xs text-muted-foreground">Powered by Polygon.io</div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[200px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <ChartContainer
            config={{
              price: {
                label: "Price",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[200px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                <YAxis domain={["dataMin - 5", "dataMax + 5"]} tickFormatter={(value) => `$${value.toFixed(0)}`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="price" stroke="var(--color-price)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

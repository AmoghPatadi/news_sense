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
        // Show message if API fails
        generateFallbackMessage()
      }
    } catch (error) {
      console.error("Error fetching historical data:", error)
      generateFallbackMessage()
    } finally {
      setIsLoading(false)
    }
  }

  const generateFallbackMessage = () => {
    // Instead of generating mock data, show a helpful message
    console.log(`Unable to fetch historical data for ${ticker}`)
    setHistoricalData([])
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
        <div className="text-xs text-muted-foreground">Powered by Google Finance</div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[200px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : historicalData.length > 0 ? (
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
        ) : (
          <div className="h-[200px] flex items-center justify-center border border-dashed border-gray-300 rounded-lg">
            <div className="text-center text-muted-foreground">
              <div className="text-sm font-medium mb-1">Historical Data Unavailable</div>
              <div className="text-xs">Chart will display when historical data is available</div>
              <div className="text-xs mt-2">Current Price: <span className="font-medium">${currentPrice.toFixed(2)}</span></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

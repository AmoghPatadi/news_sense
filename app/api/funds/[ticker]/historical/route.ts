import { NextResponse } from "next/server"
import { scrapeHistoricalData } from "@/lib/google-finance-scraper"

export async function GET(request: Request, { params }: { params: Promise<{ ticker: string }> }) {
  try {
    const { ticker } = await params
    console.log(`Fetching historical data for ${ticker}...`)
    
    const historicalData = await scrapeHistoricalData(ticker.toUpperCase(), 30)

    if (!historicalData || historicalData.length === 0) {
      console.log(`No historical data found for ${ticker}`)
      return NextResponse.json({ error: "No historical data found" }, { status: 404 })
    }

    console.log(`Successfully fetched ${historicalData.length} historical data points for ${ticker}`)
    return NextResponse.json(historicalData)
  } catch (error) {
    console.error(`Historical data API error for ${ticker}:`, error)
    return NextResponse.json({ error: "Failed to fetch historical data" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { fetchHistoricalData } from "@/lib/polygon"

export async function GET(request: Request, { params }: { params: Promise<{ ticker: string }> }) {
  try {
    const { ticker } = await params
    const url = new URL(request.url)
    const days = Number.parseInt(url.searchParams.get("days") || "30")

    const historicalData = await fetchHistoricalData(ticker, days)

    if (!historicalData) {
      return NextResponse.json({ error: "No historical data found" }, { status: 404 })
    }

    return NextResponse.json(historicalData)
  } catch (error) {
    console.error("Error fetching historical data:", error)
    return NextResponse.json({ error: "Failed to fetch historical data" }, { status: 500 })
  }
}

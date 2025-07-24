import { NextResponse } from "next/server"
import { getMarketStatus } from "@/lib/google-finance-scraper"

export async function GET() {
  try {
    const marketStatus = await getMarketStatus()
    return NextResponse.json(marketStatus)
  } catch (error) {
    console.error("Error fetching market status:", error)
    return NextResponse.json({ error: "Failed to fetch market status" }, { status: 500 })
  }
}

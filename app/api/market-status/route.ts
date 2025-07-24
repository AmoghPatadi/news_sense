import { NextResponse } from "next/server"
import { fetchMarketStatus } from "@/lib/polygon"

export async function GET() {
  try {
    const marketStatus = await fetchMarketStatus()

    if (!marketStatus) {
      return NextResponse.json({ error: "Failed to fetch market status" }, { status: 500 })
    }

    return NextResponse.json(marketStatus)
  } catch (error) {
    console.error("Error fetching market status:", error)
    return NextResponse.json({ error: "Failed to fetch market status" }, { status: 500 })
  }
}

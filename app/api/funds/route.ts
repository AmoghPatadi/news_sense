import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = createServerClient()

    const { data: funds, error } = await supabase.from("funds").select("*").order("ticker")

    if (error) {
      // Check if the error is due to missing table
      if (error.message.includes('relation "public.funds" does not exist')) {
        return NextResponse.json(
          {
            error: "Database tables not found. Please run the setup scripts first.",
            setupRequired: true,
            funds: [],
          },
          { status: 200 },
        ) // Return 200 so the frontend can handle setup gracefully
      }
      throw error
    }

    return NextResponse.json(funds || [])
  } catch (error) {
    console.error("Error fetching funds:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch funds",
        setupRequired: false,
        funds: [],
      },
      { status: 500 },
    )
  }
}

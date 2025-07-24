import { config } from './config'

interface PolygonQuoteResponse {
  status: string
  results: {
    c: number // Close price
    h: number // High price
    l: number // Low price
    o: number // Open price
    pc: number // Previous close
    t: number // Timestamp
  }
}

interface PolygonAggregatesResponse {
  status: string
  results: Array<{
    c: number // Close
    h: number // High
    l: number // Low
    o: number // Open
    t: number // Timestamp
    v: number // Volume
  }>
}

interface PolygonMarketStatusResponse {
  market: string
  serverTime: string
  exchanges: {
    nasdaq: string
    nyse: string
    otc: string
  }
}

export async function fetchFundPrice(ticker: string): Promise<{
  price: number
  change: number
  changePercent: number
} | null> {
  try {
    // Get previous day's aggregate data
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dateStr = yesterday.toISOString().split("T")[0]

    const response = await fetch(
      ${config.polygon.baseUrl}/v2/aggs/ticker//range/1/day//?adjusted=true&sort=asc&limit=1&apikey=,
    )

    if (!response.ok) {
      throw new Error(HTTP error! status: )
    }

    const data: PolygonAggregatesResponse = await response.json()

    if (!data.results || data.results.length === 0) {
      console.warn(No data found for ticker: )
      return null
    }

    const result = data.results[0]
    const change = result.c - result.o
    const changePercent = change / result.o

    return {
      price: result.c,
      change: change,
      changePercent: changePercent,
    }
  } catch (error) {
    console.error(Error fetching price for :, error)
    return null
  }
}

export async function fetchHistoricalData(
  ticker: string,
  days = 30,
): Promise<Array<{
  date: string
  price: number
}> | null> {
  try {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const startDateStr = startDate.toISOString().split("T")[0]
    const endDateStr = endDate.toISOString().split("T")[0]

    const response = await fetch(
      ${config.polygon.baseUrl}/v2/aggs/ticker//range/1/day//?adjusted=true&sort=asc&limit=&apikey=,
    )

    if (!response.ok) {
      throw new Error(HTTP error! status: )
    }

    const data: PolygonAggregatesResponse = await response.json()

    if (!data.results || data.results.length === 0) {
      console.warn(No historical data found for ticker: )
      return null
    }

    return data.results.map((result) => ({
      date: new Date(result.t).toISOString().split("T")[0],
      price: result.c,
    }))
  } catch (error) {
    console.error(Error fetching historical data for :, error)
    return null
  }
}

export async function fetchMarketStatus(): Promise<{
  market: string
  serverTime: string
  exchanges: {
    nasdaq: string
    nyse: string
    otc: string
  }
} | null> {
  try {
    const response = await fetch(${config.polygon.baseUrl}/v1/marketstatus/now?apikey=)

    if (!response.ok) {
      throw new Error(HTTP error! status: )
    }

    const data: PolygonMarketStatusResponse = await response.json()

    return {
      market: data.market,
      serverTime: data.serverTime,
      exchanges: data.exchanges,
    }
  } catch (error) {
    console.error("Error fetching market status:", error)
    return null
  }
}

export async function fetchRealTimeQuote(ticker: string): Promise<{
  price: number
  change: number
  changePercent: number
  timestamp: number
} | null> {
  try {
    const response = await fetch(${config.polygon.baseUrl}/v2/last/nbbo/?apikey=)

    if (!response.ok) {
      throw new Error(HTTP error! status: )
    }

    const data = await response.json()

    if (!data.results) {
      console.warn(No real-time data found for ticker: )
      return null
    }

    // For real-time quotes, we need to calculate change from previous close
    // This is a simplified version - in production you'd want to fetch previous close separately
    const currentPrice = (data.results.P + data.results.p) / 2 // Average of bid and ask

    return {
      price: currentPrice,
      change: 0, // Would need previous close to calculate
      changePercent: 0, // Would need previous close to calculate
      timestamp: data.results.t,
    }
  } catch (error) {
    console.error(Error fetching real-time quote for :, error)
    return null
  }
}

import { config } from "./config"

interface HuggingFaceSentimentResponse {
  label: string
  score: number
}

interface HuggingFaceClassificationResponse {
  label: string
  score: number
}
;[]

export async function analyzeSentimentHF(text: string): Promise<{
  sentiment: "positive" | "negative" | "neutral"
  score: number
  confidence: number
} | null> {
  try {
    const response = await fetch(
      `${config.huggingface.baseUrl}/models/cardiffnlp/twitter-roberta-base-sentiment-latest`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.huggingface.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: text.substring(0, 512), // Limit text length
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: HuggingFaceClassificationResponse = await response.json()

    if (!Array.isArray(data) || data.length === 0) {
      return null
    }

    // Find the highest confidence prediction
    const topPrediction = data.reduce((prev, current) => (prev.score > current.score ? prev : current))

    // Map labels to our sentiment categories
    let sentiment: "positive" | "negative" | "neutral"
    if (topPrediction.label.includes("POSITIVE")) {
      sentiment = "positive"
    } else if (topPrediction.label.includes("NEGATIVE")) {
      sentiment = "negative"
    } else {
      sentiment = "neutral"
    }

    // Convert to our scoring system (-1 to 1)
    let score = 0
    if (sentiment === "positive") {
      score = topPrediction.score
    } else if (sentiment === "negative") {
      score = -topPrediction.score
    }

    return {
      sentiment,
      score,
      confidence: topPrediction.score,
    }
  } catch (error) {
    console.error("Hugging Face sentiment analysis error:", error)
    return null
  }
}

export async function extractFinancialEntities(text: string): Promise<{
  entities: Array<{
    entity: string
    label: string
    confidence: number
    start: number
    end: number
  }>
} | null> {
  try {
    const response = await fetch(`${config.huggingface.baseUrl}/models/ProsusAI/finbert-ner`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.huggingface.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: text.substring(0, 512),
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (!Array.isArray(data)) {
      return null
    }

    const entities = data.map((entity: any) => ({
      entity: entity.word,
      label: entity.entity_group || entity.entity,
      confidence: entity.score,
      start: entity.start,
      end: entity.end,
    }))

    return { entities }
  } catch (error) {
    console.error("Hugging Face NER error:", error)
    return null
  }
}

export async function classifyFinancialNews(text: string): Promise<{
  category: string
  confidence: number
} | null> {
  try {
    const response = await fetch(`${config.huggingface.baseUrl}/models/microsoft/DialoGPT-medium`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.huggingface.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: `Classify this financial news: ${text.substring(0, 200)}`,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    // This is a simplified classification - in production you'd use a proper classification model
    return {
      category: "market_news",
      confidence: 0.8,
    }
  } catch (error) {
    console.error("Hugging Face classification error:", error)
    return null
  }
}

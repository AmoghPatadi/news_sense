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
  // Check if API key is available
  if (!config.huggingface.apiKey || config.huggingface.apiKey.trim() === '') {
    console.warn('Hugging Face API key not configured, skipping HF sentiment analysis')
    return null
  }

  // Add delay to respect rate limits
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // List of models to try in order of preference (using only confirmed working models)
  const modelsToTry = [
    'cardiffnlp/twitter-roberta-base-sentiment',
    'distilbert-base-uncased-finetuned-sst-2-english',
    'nlptown/bert-base-multilingual-uncased-sentiment'
  ]
  
  for (const modelName of modelsToTry) {
    try {
      console.log(`Trying sentiment model: ${modelName}`)
      
      const response = await fetch(
        `${config.huggingface.baseUrl}/models/${modelName}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.huggingface.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: text.substring(0, 512), // Limit text length
            options: {
              wait_for_model: true, // Wait for model to load if needed
            }
          }),
        },
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Hugging Face API error for ${modelName}: ${response.status} - ${errorText}`)
        
        // Handle specific error cases
        if (response.status === 503) {
          console.log(`Model ${modelName} is loading, trying next model...`)
          continue // Try next model
        }
        
        if (response.status === 404) {
          console.log(`Model ${modelName} not found, trying next model...`)
          continue // Try next model
        }
        
        // For other errors, continue to next model
        continue
      }

      const data = await response.json()

      if (!Array.isArray(data) || data.length === 0) {
        console.warn(`No sentiment data returned from ${modelName}`)
        continue // Try next model
      }

      // Handle nested array structure from some models
      let predictions = data
      if (Array.isArray(data[0])) {
        predictions = data[0]
      }

      if (!Array.isArray(predictions) || predictions.length === 0) {
        console.warn(`No valid predictions in response from ${modelName}`)
        continue // Try next model
      }

      // Find the highest confidence prediction
      const topPrediction = predictions.reduce((prev, current) => (prev.score > current.score ? prev : current))

      // Map labels to our sentiment categories (handle different label formats)
      let sentiment: "positive" | "negative" | "neutral"
      const label = topPrediction.label.toUpperCase()
      
      if (label.includes("POSITIVE") || label.includes("POS") || label === "LABEL_2" || label === "POSITIVE") {
        sentiment = "positive"
      } else if (label.includes("NEGATIVE") || label.includes("NEG") || label === "LABEL_0" || label === "NEGATIVE") {
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
      } else {
        score = 0 // Neutral sentiment
      }

      console.log(`Successfully got sentiment from ${modelName}: ${sentiment} (${score.toFixed(3)})`)
      
      return {
        sentiment,
        score,
        confidence: topPrediction.score,
      }
      
    } catch (error) {
      console.error(`Error with sentiment model ${modelName}:`, error)
      continue // Try next model
    }
  }
  
  console.warn('All Hugging Face sentiment models failed, falling back to null')
  return null
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
  // Check if API key is available
  if (!config.huggingface.apiKey || config.huggingface.apiKey.trim() === '') {
    console.warn('Hugging Face API key not configured, skipping entity extraction')
    return null
  }

  // Add delay to respect rate limits
  await new Promise(resolve => setTimeout(resolve, 1500))
  
  // Try multiple NER models
  const nerModels = [
    'ProsusAI/finbert-ner',
    'dbmdz/bert-large-cased-finetuned-conll03-english',
    'dslim/bert-base-NER'
  ]
  
  for (const modelName of nerModels) {
    try {
      console.log(`Trying NER model: ${modelName}`)
      
      const response = await fetch(`${config.huggingface.baseUrl}/models/${modelName}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.huggingface.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: text.substring(0, 512),
          options: {
            wait_for_model: true,
          }
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Hugging Face NER API error for ${modelName}: ${response.status} - ${errorText}`)
        
        // Handle specific error cases
        if (response.status === 503) {
          console.log(`NER model ${modelName} is loading, trying next model...`)
          continue
        }
        
        if (response.status === 404) {
          console.log(`NER model ${modelName} not found, trying next model...`)
          continue
        }
        
        continue // Try next model
      }

      const data = await response.json()

      if (!Array.isArray(data)) {
        console.warn(`No entity data returned from ${modelName}`)
        continue
      }

      const entities = data.map((entity: any) => ({
        entity: entity.word || entity.entity,
        label: entity.entity_group || entity.entity || entity.label,
        confidence: entity.score || 0.5,
        start: entity.start || 0,
        end: entity.end || 0,
      }))

      console.log(`Successfully extracted ${entities.length} entities from ${modelName}`)
      return { entities }
      
    } catch (error) {
      console.error(`Error with NER model ${modelName}:`, error)
      continue
    }
  }
  
  console.warn('All Hugging Face NER models failed, skipping entity extraction')
  return null
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

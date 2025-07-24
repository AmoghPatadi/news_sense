// Simple test to check if Hugging Face API is configured
const fs = require('fs');
const path = require('path');

// Load .env file manually
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    const envFile = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envFile.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value && !key.startsWith('#')) {
        envVars[key.trim()] = value.trim();
      }
    });
    
    return envVars;
  } catch (error) {
    console.log('Error loading .env file:', error.message);
    return {};
  }
}

const env = loadEnv();
const config = {
  huggingface: {
    apiKey: env.HUGGINGFACE_API_KEY || process.env.HUGGINGFACE_API_KEY || "",
    baseUrl: "https://api-inference.huggingface.co",
  }
}

async function testHuggingFace() {
  console.log('Testing Hugging Face API configuration...')
  
  if (!config.huggingface.apiKey || config.huggingface.apiKey.trim() === '') {
    console.log('❌ Hugging Face API key is not configured')
    console.log('Set the HUGGINGFACE_API_KEY environment variable or add it to your .env file')
    console.log('You can get a free API key at: https://huggingface.co/settings/tokens')
    return
  }
  
  console.log('✅ Hugging Face API key is configured')
  
  // Test multiple models to find a working one
  const modelsToTest = [
    'cardiffnlp/twitter-roberta-base-sentiment-latest',
    'cardiffnlp/twitter-roberta-base-sentiment',
    'distilbert-base-uncased-finetuned-sst-2-english',
    'microsoft/DialoGPT-medium'
  ];
  
  for (const modelName of modelsToTest) {
    console.log(`Testing model: ${modelName}`);
    
    try {
      const response = await fetch(
        `${config.huggingface.baseUrl}/models/${modelName}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.huggingface.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: "This is a positive test message",
            options: {
              wait_for_model: true,
            }
          }),
        }
      )
    
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Model ${modelName} is working correctly`)
        console.log('Sample response:', data)
        break; // Found a working model, stop testing
      } else {
        const errorText = await response.text()
        console.log(`❌ Model ${modelName} error: ${response.status} - ${errorText}`)
      }
      
    } catch (error) {
      console.log(`❌ Error testing model ${modelName}:`, error.message)
    }
  }
}

testHuggingFace()

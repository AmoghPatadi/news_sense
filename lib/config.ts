export const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://einiudectbjfwhkxnntq.supabase.co",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpbml1ZGVjdGJqZndoa3hubnRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMzExOTEsImV4cCI6MjA2ODkwNzE5MX0.hqXibCJlnDkmFiZuyYrX9WfSLrdZt2cOxzRVnqGMi_I",
  },
  polygon: {
    apiKey: process.env.POLYGON_API_KEY || "",
    baseUrl: "https://api.polygon.io",
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY || "",
    model: "llama3-70b-8192", // Updated to supported model
  },
  huggingface: {
    apiKey: process.env.HUGGINGFACE_API_KEY || "",
    baseUrl: "https://api-inference.huggingface.co",
  },
  openai: {
    model: "gpt-4o", // Fallback if needed
  },
}

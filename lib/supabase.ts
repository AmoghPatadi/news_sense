import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://einiudectbjfwhkxnntq.supabase.co"
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpbml1ZGVjdGJqZndoa3hubnRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMzExOTEsImV4cCI6MjA2ODkwNzE5MX0.hqXibCJlnDkmFiZuyYrX9WfSLrdZt2cOxzRVnqGMi_I"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client for API routes
export const createServerClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey)
}

import { createClient } from "@supabase/supabase-js"

// Check if environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Fallback values for development/demo purposes
const defaultUrl = "https://demo.supabase.co"
const defaultKey = "demo-key"

// Use actual values if available, otherwise use fallbacks
const url = supabaseUrl && supabaseUrl !== "your_supabase_url" ? supabaseUrl : defaultUrl
const key = supabaseAnonKey && supabaseAnonKey !== "your_supabase_anon_key" ? supabaseAnonKey : defaultKey

// 싱글톤 패턴으로 클라이언트 생성
let supabaseClient: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (!supabaseClient) {
    try {
      supabaseClient = createClient(url, key)
    } catch (error) {
      console.warn("Supabase client creation failed, using mock client:", error)
      // Return a mock client for development
      supabaseClient = {
        auth: {
          signInWithPassword: async () => ({ data: null, error: { message: "Supabase not configured" } }),
          signUp: async () => ({ data: null, error: { message: "Supabase not configured" } }),
          signOut: async () => ({ error: null }),
          getSession: async () => ({ data: { session: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          signInWithOAuth: async () => ({ data: null, error: { message: "Supabase not configured" } }),
          resetPasswordForEmail: async () => ({ data: null, error: { message: "Supabase not configured" } }),
          updateUser: async () => ({ data: null, error: { message: "Supabase not configured" } }),
          setSession: async () => ({ data: null, error: null }),
        },
      } as any
    }
  }
  return supabaseClient
}

export const supabase = getSupabaseClient()

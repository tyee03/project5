import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export async function createServerClient() {
  const cookieStore = await cookies()

  // Check if environment variables are available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Fallback values for development/demo purposes
  const defaultUrl = "https://demo.supabase.co"
  const defaultKey = "demo-key"

  // Use actual values if available, otherwise use fallbacks
  const url = supabaseUrl && supabaseUrl !== "your_supabase_url" ? supabaseUrl : defaultUrl
  const key = supabaseAnonKey && supabaseAnonKey !== "your_supabase_anon_key" ? supabaseAnonKey : defaultKey

  try {
    const value = cookieStore.get(key)?.value;
    return createClient(url, key, {
      auth: {
        storage: {
          getItem: (key: string) => {
            const value = cookieStore.get(key)?.value;
            return value === undefined ? null : value;
          },
          setItem: (key: string, value: string) => {
            cookieStore.set(key, value)
          },
          removeItem: (key: string) => {
            cookieStore.delete(key)
          },
        },
      },
    })
  } catch (error) {
    console.warn("Server Supabase client creation failed:", error)
    // Return a mock client for development
    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
      },
    } as any
  }
}

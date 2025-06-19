import { createClient } from "@supabase/supabase-js"

// ✅ Supabase 서비스 롤 키 기반 서버 전용 클라이언트
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, serviceRoleKey)

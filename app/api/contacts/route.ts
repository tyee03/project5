import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("contacts")
      .select(`
        "CONTACT_ID",
        "CUSTOMER_ID",
        "NAME",
        "EMAIL",
        "POSITION",
        "DEPARTMENT",
        "PHONE",
        "CONTACT_DATE"
      `)
      .order("CONTACT_ID", { ascending: true })

    if (error) {
      console.error("Supabase 쿼리 오류:", error)
      throw new Error(error.message)
    }

    const today = new Date()
    const processed = data.map((item) => {
      const contactDate = new Date(item.CONTACT_DATE)
      const daysSince = Math.floor(
        (today.getTime() - contactDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      return {
        ID: item.CONTACT_ID,
        NAME: item.NAME,
        EMAIL: item.EMAIL,
        POSITION: item.POSITION,
        DEPARTMENT: item.DEPARTMENT,
        PHONE: item.PHONE,
        DAYS_SINCE_CONTACT: daysSince,
      }
    })

    return NextResponse.json(processed)
  } catch (err) {
    return NextResponse.json(
      { error: "Supabase 연결 실패", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}

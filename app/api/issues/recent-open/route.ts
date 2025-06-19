// app/api/issues/recent-open/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    // 1. 이슈 중 미해결 상태인 최근 4건 가져오기
    const { data, error } = await supabase
      .from("issues")
      .select("ISSUE_DATE, ISSUE_TYPE, SEVERITY, STATUS")
      .or("STATUS.is.null,STATUS.neq.Resolved")
      .order("ISSUE_DATE", { ascending: false })
      .limit(4)

    if (error || !data) {
      return NextResponse.json({ error: "이슈 데이터를 불러오지 못했습니다." }, { status: 500 })
    }

    // 2. 현재 날짜 기준 경과일 계산
    const today = new Date()
    const result = data.map((issue) => {
      const issueDate = new Date(issue.ISSUE_DATE)
      const elapsedDays = Math.floor((today.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24))
      return {
        date: issueDate.toISOString().split("T")[0], // YYYY-MM-DD
        type: issue.ISSUE_TYPE ?? "N/A",
        severity: issue.SEVERITY ?? "N/A",
        daysAgo: elapsedDays,
      }
    })

    return NextResponse.json({ data: result })
  } catch (err) {
    console.error("❌ recent-open API 오류:", err)
    return NextResponse.json({ error: "서버 오류 발생" }, { status: 500 })
  }
}

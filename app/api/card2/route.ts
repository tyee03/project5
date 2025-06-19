// app/api/card2/route.ts

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Supabase 클라이언트 생성
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    // 1. orders 테이블에서 가장 마지막 ORDER_DATE 구함
    const { data: maxOrderDateData, error: orderDateError } = await supabase
      .from("orders")
      .select("ORDER_DATE")
      .order("ORDER_DATE", { ascending: false })
      .limit(1)

    if (orderDateError || !maxOrderDateData || maxOrderDateData.length === 0) {
      return NextResponse.json(
        { error: "최근 주문 날짜를 찾을 수 없습니다." },
        { status: 500 }
      )
    }

    // 기준 날짜: 마지막 주문일의 다음 달
    const baseDate = new Date(maxOrderDateData[0].ORDER_DATE)
    baseDate.setMonth(baseDate.getMonth() + 1)

    // 2. 6개월치 월 목록 생성
    const monthList: string[] = []
    for (let i = 0; i < 6; i++) {
      const d = new Date(baseDate)
      d.setMonth(d.getMonth() + i)
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      monthList.push(ym)
    }

    // 3. 예측 데이터 전부 가져와서 월별 필터링
    const { data: forecastData, error: forecastError } = await supabase
      .from("customer_order_forecast")
      .select("PREDICTED_DATE, PREDICTED_QUANTITY")

    if (forecastError || !forecastData) {
      return NextResponse.json(
        { error: "예측 데이터를 가져오지 못했습니다." },
        { status: 500 }
      )
    }

    // 4. 월별 집계
    const resultMap: Record<string, number> = {}
    for (const row of forecastData) {
      const date = new Date(row.PREDICTED_DATE)
      const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      if (monthList.includes(ym)) {
        resultMap[ym] = (resultMap[ym] || 0) + (row.PREDICTED_QUANTITY || 0)
      }
    }

    // 5. 결과 정리 (소숫점 제거)
    const result = monthList.map((month) => ({
      month,
      predicted_quantity: Math.round(resultMap[month] || 0),
    }))

    return NextResponse.json({ data: result })
  } catch (err) {
    console.error("❌ card2 API 오류:", err)
    return NextResponse.json(
      { error: "예측 수량 API 처리 중 오류 발생" },
      { status: 500 }
    )
  }
}

// app/api/chart/route.ts

import { NextResponse } from "next/server" // Next.js의 응답 유틸리티
import { createClient } from "@supabase/supabase-js" // Supabase 클라이언트 생성 함수

// Supabase 클라이언트 초기화 (환경변수 사용)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,       // Supabase 프로젝트 URL
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!   // 익명 키 (public API용)
)

// GET 요청 처리 함수 (차트용 주문 데이터 제공)
export async function GET() {
  try {
    // 1단계: 가장 최근 날짜(ORDER_DATE) 조회 -----------------------------
    const { data: latestDateData, error: latestError } = await supabase
      .from("orders")                            // ordersx 테이블 대상
      .select("ORDER_DATE")                       // 날짜만 선택
      .order("ORDER_DATE", { ascending: false })  // 가장 최근 날짜가 위로
      .limit(1)                                   // 한 개만 가져오기

    if (latestError || !latestDateData?.length) {
      console.error("최신 ORDER_DATE 조회 실패:", latestError)
      throw new Error("최신 날짜를 가져올 수 없습니다.")
    }

    // 가장 최신 ORDER_DATE (문자열 형태)
    const latestOrderDate = latestDateData[0].ORDER_DATE.split("T")[0] // yyyy-mm-dd 형식

    // 2단계: 기준 날짜로부터 6개월 전 날짜 계산 ---------------------------
    const latestDateObj = new Date(latestOrderDate)  // 기준 날짜 객체 생성
    latestDateObj.setMonth(latestDateObj.getMonth() - 6) // 6개월 전으로 이동
    const startDate = latestDateObj.toISOString().split("T")[0] // yyyy-mm-dd

    // 3단계: 6개월 범위의 주문 데이터 조회 -------------------------------
    const { data, error } = await supabase
      .from("orders")                            // ordersx 테이블 대상
      .select(`"ORDER_DATE", "AMOUNT", "COSTT", "REVENUE"`) // 필요한 컬럼만 선택
      .gte("ORDER_DATE", startDate)              // 6개월 전 이후 날짜 필터
      .lte("ORDER_DATE", latestOrderDate)        // 기준일 이하 필터
      .order("ORDER_DATE", { ascending: true })  // 날짜 오름차순 정렬

    if (error) {
      console.error("Supabase 쿼리 오류:", error)
      throw new Error(error.message)
    }

    // 4단계: 같은 날짜끼리 합산 처리 -------------------------------------
    const grouped = data.reduce((acc, row) => {
      const dateKey = row.ORDER_DATE.split("T")[0] // yyyy-mm-dd 기준 키 생성
      if (!acc[dateKey]) {
        acc[dateKey] = {
          ORDER_DATE: dateKey, // 날짜 문자열
          AMOUNT: 0,           // 총 주문 금액 초기화
          COSTT: 0,            // 총 원가 초기화
          REVENUE: 0,          // 총 수익 초기화
        }
      }
      // 값이 null일 경우 0으로 대체하여 누적
      acc[dateKey].AMOUNT += row.AMOUNT || 0
      acc[dateKey].COSTT += row.COSTT || 0
      acc[dateKey].REVENUE += row.REVENUE || 0
      return acc
    }, {} as Record<string, { ORDER_DATE: string; AMOUNT: number; COSTT: number; REVENUE: number }>)

    // 5단계: 객체를 배열로 변환하고 필드명 변환 -------------------------------
    const result = Object.values(grouped).map(item => ({
      date: item.ORDER_DATE,    // ORDER_DATE → date
      amount: item.AMOUNT,      // AMOUNT → amount
      cost: item.COSTT,         // COSTT → cost
      profit: item.REVENUE      // REVENUE → profit (마진)
    }))

    // 정상 응답 반환 (JSON)
    return NextResponse.json(result, {
      status: 200, // HTTP 200 OK
      headers: {
        "Content-Type": "application/json", // JSON 응답 타입 명시
      },
    })

  } catch (err) {
    // 에러 처리 응답
    console.error("API 오류:", err)
    return NextResponse.json(
      {
        error: "Supabase 연결 실패",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 } // HTTP 500 Internal Server Error
    )
  }
}

// app/api/card1/route.ts
import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/server-role"

export async function GET() {
  try {
    // 1️⃣ 가장 최근 매출 날짜 확인
    const { data: latestOrderDateData, error: dateError } = await supabase
      .from("orders")
      .select("ORDER_DATE")
      .order("ORDER_DATE", { ascending: false })
      .limit(1)

    if (dateError || !latestOrderDateData || !latestOrderDateData[0]?.ORDER_DATE) {
      throw new Error("가장 최근 주문 날짜를 찾을 수 없습니다.")
    }

    const latestOrderDate = new Date(latestOrderDateData[0].ORDER_DATE)
    const year = latestOrderDate.getUTCFullYear()
    const month = latestOrderDate.getUTCMonth() + 1 // JS는 0-indexed

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`
    const endDateObj = new Date(Date.UTC(year, month, 1)) // 다음 달 1일
    const endDate = endDateObj.toISOString().slice(0, 10)

    // 2️⃣ 해당 월의 orders 조회
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("ORDER_ID, CONTACT_ID, AMOUNT, ORDER_DATE")
      .gte("ORDER_DATE", startDate)
      .lt("ORDER_DATE", endDate)
      .range(0, 9998)

    if (ordersError || !ordersData) {
      throw new Error(`orders 조회 실패: ${ordersError?.message}`)
    }

    // 3️⃣ contacts 조회
    const contactIds = ordersData.map(o => o.CONTACT_ID).filter(Boolean)
    const { data: contactsData, error: contactsError } = await supabase
      .from("contacts")
      .select("CONTACT_ID, CUSTOMER_ID")
      .in("CONTACT_ID", contactIds)

    if (contactsError || !contactsData) {
      throw new Error(`contacts 조회 실패: ${contactsError?.message}`)
    }

    // 4️⃣ customers 조회
    const customerIds = contactsData.map(c => c.CUSTOMER_ID).filter(Boolean)
    const { data: customersData, error: customersError } = await supabase
      .from("customers")
      .select("CUSTOMER_ID, COMPANY_TYPE")
      .in("CUSTOMER_ID", customerIds)

    if (customersError || !customersData) {
      throw new Error(`customers 조회 실패: ${customersError?.message}`)
    }

    // 5️⃣ 조인 및 집계
    const summary: Record<string, number> = {}

    for (const order of ordersData) {
      const contact = contactsData.find(c => c.CONTACT_ID === order.CONTACT_ID)
      const customer = customersData.find(cu => cu.CUSTOMER_ID === contact?.CUSTOMER_ID)
      const companyType = customer?.COMPANY_TYPE || "Unknown"
      const amount = order.AMOUNT || 0

      summary[companyType] = (summary[companyType] || 0) + amount
    }

    // 6️⃣ 결과 포맷
    const result = Object.entries(summary).map(([company_type, total_amount]) => ({
      company_type,
      total_amount,
      month: `${year}-${String(month).padStart(2, "0")}`
    }))

    return NextResponse.json(result)

  } catch (err) {
    console.error("❌ 회사 유형별 매출 집계 실패:", err)
    return NextResponse.json(
      {
        error: "회사 유형별 매출 집계 실패",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

// app/api/check/route.ts
import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/server-role"

const baseUrl = "http://localhost:3000/api"
const endpoints = [
  "claims",
  "cust_profit_grade", 
  "customer_order_forecast",
  "customer_profit_analysis",
  "engagements",
  "issues",
  "orders",
  "predictions",
  "products",
  "sales_activities",
  "segments"
]

export async function GET() {
  try {
    // 1️⃣ API 연결 상태 및 샘플 확인
    const endpointResults = await Promise.all(
      endpoints.map(async (endpoint) => {
        const url = `${baseUrl}/${endpoint}`
        try {
          const res = await fetch(url)
          const json = await res.json()
          return {
            endpoint,
            status: res.status,
            ok: res.ok,
            sample: Array.isArray(json) ? json[0] : null,
            dataCount: Array.isArray(json) ? json.length : 0
          }
        } catch (err) {
          return {
            endpoint,
            status: null,
            ok: false,
            error: err instanceof Error ? err.message : "Unknown error",
          }
        }
      })
    )

    // 2️⃣ orders → contacts 수동 조인
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("ORDER_ID, CONTACT_ID, AMOUNT")
      .limit(1000)

    const contactIds = ordersData?.map(o => o.CONTACT_ID).filter(Boolean) || []
    const { data: contactsData, error: contactsError } = await supabase
      .from("contacts")
      .select("*")
      .in("CONTACT_ID", contactIds)

    const manualJoin1 = ordersData?.map(order => ({
      ...order,
      contact: contactsData?.find(c => c.CONTACT_ID === order.CONTACT_ID) || null
    }))

    // 3️⃣ contacts → customers 수동 조인
    const customerIds = contactsData?.map(c => c.CUSTOMER_ID).filter(Boolean) || []
    const { data: customersData, error: customersError } = await supabase
      .from("customers")
      .select("*")
      .in("CUSTOMER_ID", customerIds)

    const manualJoin2 = manualJoin1?.map(order => ({
      ...order,
      contact: {
        ...order.contact,
        customer: customersData?.find(cu => cu.CUSTOMER_ID === order.contact?.CUSTOMER_ID) || null
      }
    }))

    // 4️⃣ 9999개 대량 fetch 테스트 (orders + issues)
    const { data: ordersBulk, error: ordersBulkError } = await supabase
      .from("orders")
      .select("*")
      .range(0, 9998)

    const { data: issuesBulk, error: issuesBulkError } = await supabase
      .from("issues")
      .select("*")
      .range(0, 9998)

    return NextResponse.json({
      checkedAt: new Date().toISOString(),
      endpoints: endpointResults,
      join: {
        level1: {
          success: !ordersError && !contactsError,
          error: ordersError?.message || contactsError?.message || null,
          count: manualJoin1?.length || 0
        },
        level2: {
          success: !customersError,
          error: customersError?.message || null,
          count: manualJoin2?.length || 0,
          sample: manualJoin2?.[0]
        }
      },
      bulkFetch: {
        orders: {
          count: ordersBulk?.length || 0,
          error: ordersBulkError?.message || null
        },
        issues: {
          count: issuesBulk?.length || 0,
          error: issuesBulkError?.message || null
        }
      }
    })
  } catch (error) {
    console.error("Check API Error:", error)
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

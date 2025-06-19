import { NextResponse } from "next/server"

export async function GET() {
  try {
    // 실제 Oracle DB 연결 코드:
    /*
    import oracledb from "oracledb"
    
    const conn = await oracledb.getConnection({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECTION_STRING,
    })

    const result = await conn.execute(
      `SELECT ORDER_ID, CONTACT_ID, PRODUCT_ID, ORDER_DATE, 
              QUANTITY, AMOUNT, COST, MARGIN_RATE, 
              PAYMENT_STATUS, DELIVERY_STATUS,COSTT,REVENUE
       FROM ORDERS
       ORDER BY ORDER_DATE DESC`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    )
    
    await conn.close()
    return NextResponse.json(result.rows)
    */

    console.log("환경변수 확인:")
    console.log("ORACLE_USER:", process.env.ORACLE_USER ? "설정됨" : "설정안됨")
    console.log("ORACLE_PASSWORD:", process.env.ORACLE_PASSWORD ? "설정됨" : "설정안됨")
    console.log("ORACLE_CONNECTION_STRING:", process.env.ORACLE_CONNECTION_STRING ? "설정됨" : "설정안됨")

    // 임시 샘플 데이터 (ORDERS 테이블 구조에 맞게)
    const mockData = [
      {
        ORDER_ID: 2001,
        CONTACT_ID: 1001,
        PRODUCT_ID: "PRD-001",
        ORDER_DATE: "2024-01-15",
        QUANTITY: 5,
        AMOUNT: 250000.0,
        COST: 200000.0,
        MARGIN_RATE: 0.2,
        PAYMENT_STATUS: "결제완료",
        DELIVERY_STATUS: "배송완료",
      },
      {
        ORDER_ID: 2002,
        CONTACT_ID: 1002,
        PRODUCT_ID: "PRD-002",
        ORDER_DATE: "2024-01-20",
        QUANTITY: 3,
        AMOUNT: 150000.0,
        COST: 120000.0,
        MARGIN_RATE: 0.2,
        PAYMENT_STATUS: "결제완료",
        DELIVERY_STATUS: "미배송",
      },
      {
        ORDER_ID: 2003,
        CONTACT_ID: 1003,
        PRODUCT_ID: "PRD-003",
        ORDER_DATE: "2024-01-25",
        QUANTITY: 10,
        AMOUNT: 500000.0,
        COST: 400000.0,
        MARGIN_RATE: 0.2,
        PAYMENT_STATUS: "미결제",
        DELIVERY_STATUS: "미배송",
      },
      {
        ORDER_ID: 2004,
        CONTACT_ID: 1004,
        PRODUCT_ID: "PRD-004",
        ORDER_DATE: "2024-02-01",
        QUANTITY: 2,
        AMOUNT: 80000.0,
        COST: 64000.0,
        MARGIN_RATE: 0.2,
        PAYMENT_STATUS: "결제완료",
        DELIVERY_STATUS: "배송완료",
      },
      {
        ORDER_ID: 2005,
        CONTACT_ID: 1005,
        PRODUCT_ID: "PRD-005",
        ORDER_DATE: "2024-02-05",
        QUANTITY: 7,
        AMOUNT: 350000.0,
        COST: 280000.0,
        MARGIN_RATE: 0.2,
        PAYMENT_STATUS: "결제완료",
        DELIVERY_STATUS: "배송완료",
      },
      {
        ORDER_ID: 2006,
        CONTACT_ID: 1006,
        PRODUCT_ID: "PRD-006",
        ORDER_DATE: "2024-02-10",
        QUANTITY: 4,
        AMOUNT: 200000.0,
        COST: 160000.0,
        MARGIN_RATE: 0.2,
        PAYMENT_STATUS: "미결제",
        DELIVERY_STATUS: "미배송",
      },
      {
        ORDER_ID: 2007,
        CONTACT_ID: 1007,
        PRODUCT_ID: "PRD-007",
        ORDER_DATE: "2024-02-15",
        QUANTITY: 6,
        AMOUNT: 300000.0,
        COST: 240000.0,
        MARGIN_RATE: 0.2,
        PAYMENT_STATUS: "결제완료",
        DELIVERY_STATUS: "배송완료",
      },
      {
        ORDER_ID: 2008,
        CONTACT_ID: 1008,
        PRODUCT_ID: "PRD-008",
        ORDER_DATE: "2024-02-20",
        QUANTITY: 8,
        AMOUNT: 400000.0,
        COST: 320000.0,
        MARGIN_RATE: 0.2,
        PAYMENT_STATUS: "결제완료",
        DELIVERY_STATUS: "미배송",
      },
      {
        ORDER_ID: 2009,
        CONTACT_ID: 1009,
        PRODUCT_ID: "PRD-009",
        ORDER_DATE: "2024-02-25",
        QUANTITY: 1,
        AMOUNT: 50000.0,
        COST: 40000.0,
        MARGIN_RATE: 0.2,
        PAYMENT_STATUS: "미결제",
        DELIVERY_STATUS: "미배송",
      },
      {
        ORDER_ID: 2010,
        CONTACT_ID: 1010,
        PRODUCT_ID: "PRD-010",
        ORDER_DATE: "2024-03-01",
        QUANTITY: 12,
        AMOUNT: 600000.0,
        COST: 480000.0,
        MARGIN_RATE: 0.2,
        PAYMENT_STATUS: "결제완료",
        DELIVERY_STATUS: "배송완료",
      },
    ]

    return NextResponse.json(mockData, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    })
  } catch (err) {
    console.error("DB 오류:", err)
    return NextResponse.json(
      { error: "DB 연결 실패", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}

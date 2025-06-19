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
      `SELECT ISSUE_ID, ORDER_ID, ISSUE_DATE, ISSUE_TYPE, 
              SEVERITY, DESCRIPTION, RESOLVED_DATE, STATUS
       FROM ISSUES
       ORDER BY ISSUE_DATE DESC`,
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

    // 임시 샘플 데이터 (ISSUES 테이블 구조에 맞게)
    const mockData = [
      {
        ISSUE_ID: 3001,
        ORDER_ID: 2001,
        ISSUE_DATE: "2024-01-20",
        ISSUE_TYPE: "배송 지연",
        SEVERITY: "Medium",
        DESCRIPTION: "고객이 배송 지연에 대해 문의했습니다.",
        RESOLVED_DATE: "2024-01-22",
        STATUS: "해결됨",
      },
      {
        ISSUE_ID: 3002,
        ORDER_ID: 2002,
        ISSUE_DATE: "2024-01-25",
        ISSUE_TYPE: "제품 불량",
        SEVERITY: "High",
        DESCRIPTION: "제품에 결함이 발견되어 교환 요청이 들어왔습니다.",
        RESOLVED_DATE: null,
        STATUS: "처리중",
      },
      {
        ISSUE_ID: 3003,
        ORDER_ID: 2003,
        ISSUE_DATE: "2024-02-01",
        ISSUE_TYPE: "결제 문제",
        SEVERITY: "High",
        DESCRIPTION: "결제 처리 중 오류가 발생했습니다.",
        RESOLVED_DATE: null,
        STATUS: "미해결",
      },
      {
        ISSUE_ID: 3004,
        ORDER_ID: 2004,
        ISSUE_DATE: "2024-02-05",
        ISSUE_TYPE: "고객 문의",
        SEVERITY: "Low",
        DESCRIPTION: "제품 사용법에 대한 문의입니다.",
        RESOLVED_DATE: "2024-02-05",
        STATUS: "해결됨",
      },
      {
        ISSUE_ID: 3005,
        ORDER_ID: 2005,
        ISSUE_DATE: "2024-02-10",
        ISSUE_TYPE: "배송 주소 변경",
        SEVERITY: "Medium",
        DESCRIPTION: "고객이 배송 주소 변경을 요청했습니다.",
        RESOLVED_DATE: "2024-02-11",
        STATUS: "해결됨",
      },
      {
        ISSUE_ID: 3006,
        ORDER_ID: 2006,
        ISSUE_DATE: "2024-02-15",
        ISSUE_TYPE: "환불 요청",
        SEVERITY: "High",
        DESCRIPTION: "고객이 제품 환불을 요청했습니다.",
        RESOLVED_DATE: null,
        STATUS: "처리중",
      },
      {
        ISSUE_ID: 3007,
        ORDER_ID: 2007,
        ISSUE_DATE: "2024-02-20",
        ISSUE_TYPE: "포장 문제",
        SEVERITY: "Low",
        DESCRIPTION: "제품 포장이 손상된 상태로 배송되었습니다.",
        RESOLVED_DATE: "2024-02-21",
        STATUS: "해결됨",
      },
      {
        ISSUE_ID: 3008,
        ORDER_ID: 2008,
        ISSUE_DATE: "2024-02-25",
        ISSUE_TYPE: "수량 오류",
        SEVERITY: "Medium",
        DESCRIPTION: "주문한 수량과 다른 수량이 배송되었습니다.",
        RESOLVED_DATE: null,
        STATUS: "처리중",
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

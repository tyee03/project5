import { NextResponse } from "next/server"

export async function GET() {
  try {
    // 실제 Oracle DB 연결을 위해서는 oracledb 패키지가 필요하지만
    // v0 환경에서는 설치할 수 없으므로 임시 데이터를 사용합니다.

    // 실제 환경에서 사용할 Oracle DB 연결 코드:
    /*
    import oracledb from "oracledb"
    
    const conn = await oracledb.getConnection({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECTION_STRING,
    })

    const result = await conn.execute(
      `SELECT CUSTOMER_ID, COMPANY_NAME, COMPANY_TYPE, REGION, 
              REG_DATE, INDUSTRY_TYPE, COUNTRY, COMPANY_SIZE
       FROM CUSTOMERS
       ORDER BY CUSTOMER_ID`,
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

    // 임시 샘플 데이터 (CUSTOMERS 테이블 구조에 맞게)
    const mockData = [
      {
        CUSTOMER_ID: 1001,
        COMPANY_NAME: "현대자동차",
        COMPANY_TYPE: "완성차",
        REGION: "서울",
        REG_DATE: "2024-01-15",
        INDUSTRY_TYPE: "자동차 제조",
        COUNTRY: "대한민국",
        COMPANY_SIZE: "대기업",
      },
      {
        CUSTOMER_ID: 1002,
        COMPANY_NAME: "기아자동차",
        COMPANY_TYPE: "완성차",
        REGION: "경기",
        REG_DATE: "2024-02-20",
        INDUSTRY_TYPE: "자동차 제조",
        COUNTRY: "대한민국",
        COMPANY_SIZE: "대기업",
      },
      {
        CUSTOMER_ID: 1003,
        COMPANY_NAME: "롯데렌터카",
        COMPANY_TYPE: "렌터카",
        REGION: "서울",
        REG_DATE: "2024-03-10",
        INDUSTRY_TYPE: "렌터카 서비스",
        COUNTRY: "대한민국",
        COMPANY_SIZE: "중견기업",
      },
      {
        CUSTOMER_ID: 1004,
        COMPANY_NAME: "SK네트웍스",
        COMPANY_TYPE: "유통",
        REGION: "서울",
        REG_DATE: "2024-01-25",
        INDUSTRY_TYPE: "자동차 유통",
        COUNTRY: "대한민국",
        COMPANY_SIZE: "대기업",
      },
      {
        CUSTOMER_ID: 1005,
        COMPANY_NAME: "오토큐",
        COMPANY_TYPE: "정비소",
        REGION: "부산",
        REG_DATE: "2024-04-05",
        INDUSTRY_TYPE: "자동차 정비",
        COUNTRY: "대한민국",
        COMPANY_SIZE: "중소기업",
      },
      {
        CUSTOMER_ID: 1006,
        COMPANY_NAME: "쏘카",
        COMPANY_TYPE: "렌터카",
        REGION: "서울",
        REG_DATE: "2024-02-14",
        INDUSTRY_TYPE: "카셰어링",
        COUNTRY: "대한민국",
        COMPANY_SIZE: "중견기업",
      },
      {
        CUSTOMER_ID: 1007,
        COMPANY_NAME: "한국GM",
        COMPANY_TYPE: "완성차",
        REGION: "인천",
        REG_DATE: "2024-01-30",
        INDUSTRY_TYPE: "자동차 제조",
        COUNTRY: "대한민국",
        COMPANY_SIZE: "대기업",
      },
      {
        CUSTOMER_ID: 1008,
        COMPANY_NAME: "카닥",
        COMPANY_TYPE: "정비소",
        REGION: "서울",
        REG_DATE: "2024-03-20",
        INDUSTRY_TYPE: "자동차 정비",
        COUNTRY: "대한민국",
        COMPANY_SIZE: "중소기업",
      },
      {
        CUSTOMER_ID: 1009,
        COMPANY_NAME: "하나로카",
        COMPANY_TYPE: "유통",
        REGION: "대구",
        REG_DATE: "2024-02-28",
        INDUSTRY_TYPE: "자동차 유통",
        COUNTRY: "대한민국",
        COMPANY_SIZE: "중견기업",
      },
      {
        CUSTOMER_ID: 1010,
        COMPANY_NAME: "그린카",
        COMPANY_TYPE: "렌터카",
        REGION: "서울",
        REG_DATE: "2024-04-12",
        INDUSTRY_TYPE: "카셰어링",
        COUNTRY: "대한민국",
        COMPANY_SIZE: "중견기업",
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

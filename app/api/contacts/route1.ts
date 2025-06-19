import { NextResponse } from "next/server" // Next.js의 응답 객체 불러오기

export async function GET() {
  // GET 요청 처리 함수 정의
  try {
    // 실제 Oracle DB 연결을 위해서는 oracledb 패키지가 필요하지만
    // v0 환경에서는 설치할 수 없으므로 임시 데이터를 사용합니다.

    // 실제 환경에서 사용할 Oracle DB 연결 코드:
    /*
    import oracledb from "oracledb"
    
    // ✅ Azure 모듈 불러오지 않도록 방지
    oracledb.initOracleClient?.({ configDir: undefined })
    
    const conn = await oracledb.getConnection({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECTION_STRING,
    })

    const result = await conn.execute(
      `SELECT customer_id AS ID, name AS NAME, email AS EMAIL, position AS POSITION, 
              department AS DEPARTMENT, phone AS PHONE, 
              TRUNC(SYSDATE - contact_date) AS DAYS_SINCE_CONTACT
       FROM CONTACTS
       ORDER BY customer_id`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    )
    
    await conn.close()
    return NextResponse.json(result.rows)
    */

    // 현재 v0 환경에서는 임시 데이터 사용 (20개로 확장)
    console.log("환경변수 확인:")
    console.log("ORACLE_USER:", process.env.ORACLE_USER ? "설정됨" : "설정안됨")
    console.log("ORACLE_PASSWORD:", process.env.ORACLE_PASSWORD ? "설정됨" : "설정안됨")
    console.log("ORACLE_CONNECTION_STRING:", process.env.ORACLE_CONNECTION_STRING ? "설정됨" : "설정안됨")

    // 임시 샘플 데이터 (20개로 확장)
    const mockData = [
      {
        ID: 1001,
        NAME: "김철수",
        EMAIL: "kim@company.com",
        POSITION: "부장",
        DEPARTMENT: "영업부",
        PHONE: "010-1234-5678",
        DAYS_SINCE_CONTACT: 15,
      },
      {
        ID: 1002,
        NAME: "이영희",
        EMAIL: "lee@company.com",
        POSITION: "과장",
        DEPARTMENT: "마케팅부",
        PHONE: "010-2345-6789",
        DAYS_SINCE_CONTACT: 7,
      },
      {
        ID: 1003,
        NAME: "박민수",
        EMAIL: "park@company.com",
        POSITION: "팀장",
        DEPARTMENT: "개발부",
        PHONE: "010-3456-7890",
        DAYS_SINCE_CONTACT: 23,
      },
      {
        ID: 1004,
        NAME: "최지은",
        EMAIL: "choi@company.com",
        POSITION: "대리",
        DEPARTMENT: "인사부",
        PHONE: "010-4567-8901",
        DAYS_SINCE_CONTACT: 3,
      },
      {
        ID: 1005,
        NAME: "정우진",
        EMAIL: "jung@company.com",
        POSITION: "차장",
        DEPARTMENT: "재무부",
        PHONE: "010-5678-9012",
        DAYS_SINCE_CONTACT: 45,
      },
      {
        ID: 1006,
        NAME: "한소영",
        EMAIL: "han@company.com",
        POSITION: "사원",
        DEPARTMENT: "기획부",
        PHONE: "010-6789-0123",
        DAYS_SINCE_CONTACT: 12,
      },
      {
        ID: 1007,
        NAME: "임동혁",
        EMAIL: "lim@company.com",
        POSITION: "사원",
        DEPARTMENT: "영업부",
        PHONE: "010-7890-1234",
        DAYS_SINCE_CONTACT: 8,
      },
      {
        ID: 1008,
        NAME: "송미라",
        EMAIL: "song@company.com",
        POSITION: "팀장",
        DEPARTMENT: "고객서비스부",
        PHONE: "010-8901-2345",
        DAYS_SINCE_CONTACT: 31,
      },
      {
        ID: 1009,
        NAME: "강태호",
        EMAIL: "kang@company.com",
        POSITION: "선임",
        DEPARTMENT: "개발부",
        PHONE: "010-9012-3456",
        DAYS_SINCE_CONTACT: 19,
      },
      {
        ID: 1010,
        NAME: "윤서연",
        EMAIL: "yoon@company.com",
        POSITION: "주임",
        DEPARTMENT: "마케팅부",
        PHONE: "010-0123-4567",
        DAYS_SINCE_CONTACT: 6,
      },
      {
        ID: 1011,
        NAME: "조현우",
        EMAIL: "cho@company.com",
        POSITION: "과장",
        DEPARTMENT: "IT부",
        PHONE: "010-1111-2222",
        DAYS_SINCE_CONTACT: 2,
      },
      {
        ID: 1012,
        NAME: "신민정",
        EMAIL: "shin@company.com",
        POSITION: "변호사",
        DEPARTMENT: "법무부",
        PHONE: "010-3333-4444",
        DAYS_SINCE_CONTACT: 18,
      },
      {
        ID: 1013,
        NAME: "오성민",
        EMAIL: "oh@company.com",
        POSITION: "주임",
        DEPARTMENT: "총무부",
        PHONE: "010-5555-6666",
        DAYS_SINCE_CONTACT: 9,
      },
      {
        ID: 1014,
        NAME: "장혜진",
        EMAIL: "jang@company.com",
        POSITION: "대리",
        DEPARTMENT: "회계부",
        PHONE: "010-7777-8888",
        DAYS_SINCE_CONTACT: 25,
      },
      {
        ID: 1015,
        NAME: "문준호",
        EMAIL: "moon@company.com",
        POSITION: "과장",
        DEPARTMENT: "구매부",
        PHONE: "010-9999-0000",
        DAYS_SINCE_CONTACT: 14,
      },
      {
        ID: 1016,
        NAME: "서유진",
        EMAIL: "seo@company.com",
        POSITION: "사원",
        DEPARTMENT: "디자인부",
        PHONE: "010-1122-3344",
        DAYS_SINCE_CONTACT: 4,
      },
      {
        ID: 1017,
        NAME: "홍길동",
        EMAIL: "hong@company.com",
        POSITION: "부장",
        DEPARTMENT: "품질관리부",
        PHONE: "010-5566-7788",
        DAYS_SINCE_CONTACT: 37,
      },
      {
        ID: 1018,
        NAME: "김미영",
        EMAIL: "kimmy@company.com",
        POSITION: "팀장",
        DEPARTMENT: "교육부",
        PHONE: "010-9900-1122",
        DAYS_SINCE_CONTACT: 11,
      },
      {
        ID: 1019,
        NAME: "박상현",
        EMAIL: "parksh@company.com",
        POSITION: "선임",
        DEPARTMENT: "보안부",
        PHONE: "010-3344-5566",
        DAYS_SINCE_CONTACT: 28,
      },
      {
        ID: 1020,
        NAME: "이수정",
        EMAIL: "leesj@company.com",
        POSITION: "차장",
        DEPARTMENT: "전략기획부",
        PHONE: "010-7788-9900",
        DAYS_SINCE_CONTACT: 5,
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

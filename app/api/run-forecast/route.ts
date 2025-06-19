// app/api/run-forecast/route.ts
// FastAPI 서버의 GET 엔드포인트에 맞춰 수정

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('프록시: 새 예측 실행 요청 받음');
    
    // FastAPI 서버의 /forecast는 GET 메서드를 사용합니다
    const response = await fetch('http://127.0.0.1:8000/forecast', {
      method: 'GET', // POST에서 GET으로 변경
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`FastAPI 응답 상태: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FastAPI 에러:', errorText);
      return NextResponse.json(
        { 
          success: false, 
          message: `예측 실행 실패: ${response.status}`,
          detail: errorText 
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('FastAPI 성공 응답:', result);

    return NextResponse.json({
      success: true,
      message: '예측이 성공적으로 완료되었습니다.',
      data: result
    });

  } catch (error) {
    console.error('프록시 에러:', error);
    
    // 연결 에러인 경우 (FastAPI 서버가 실행되지 않은 경우)
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'FastAPI 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.',
          detail: 'http://127.0.0.1:8000 서버에 연결할 수 없습니다.'
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: '예측 실행 중 오류가 발생했습니다.',
        detail: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

// OPTIONS 요청 처리 (CORS preflight)
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
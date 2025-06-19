// app/api/run-forecast/route.ts
// Vercel 배포용 수정

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('프록시: 새 예측 실행 요청 받음');
    
    // 환경변수로 FastAPI 서버 URL 관리
    const fastApiUrl = process.env.FASTAPI_URL || 'http://127.0.0.1:8000';
    const forecastEndpoint = `${fastApiUrl}/forecast`;
    
    console.log('FastAPI 서버 URL:', forecastEndpoint);
    
    // Vercel에서는 로컬 서버에 접근할 수 없으므로 에러 처리
    if (process.env.NODE_ENV === 'production' && fastApiUrl.includes('127.0.0.1')) {
      return NextResponse.json({
        success: false,
        message: 'FastAPI 서버가 클라우드에 배포되지 않았습니다.',
        detail: 'FastAPI 서버를 클라우드에 배포하고 FASTAPI_URL 환경변수를 설정해주세요.',
        action: 'deploy_fastapi_server'
      }, { status: 503 });
    }
    
    const response = await fetch(forecastEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Vercel에서는 타임아웃 설정 추가
      signal: AbortSignal.timeout(25000), // 25초 타임아웃
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
    
    // 연결 에러인 경우
    if (error instanceof Error && (
      error.message.includes('ECONNREFUSED') || 
      error.message.includes('fetch failed') ||
      error.name === 'TimeoutError'
    )) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'FastAPI 서버에 연결할 수 없습니다.',
          detail: process.env.NODE_ENV === 'production' 
            ? 'FastAPI 서버가 클라우드에 배포되지 않았거나 접근할 수 없습니다.'
            : 'http://127.0.0.1:8000 서버에 연결할 수 없습니다.',
          action: 'check_fastapi_deployment'
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
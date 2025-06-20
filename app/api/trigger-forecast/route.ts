import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // GitHub Personal Access Token이 필요합니다
    const githubToken = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER; // "tyee03"
    const repo = process.env.GITHUB_REPO;   // "project5"
    
    if (!githubToken || !owner || !repo) {
      return NextResponse.json(
        { error: 'GitHub 설정이 필요합니다' },
        { status: 500 }
      );
    }

    // GitHub Actions workflow dispatch API 호출
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/run_forecast.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${githubToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'main', // 또는 사용하는 브랜치명
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API Error:', errorText);
      return NextResponse.json(
        { error: 'GitHub Actions 트리거 실패' },
        { status: response.status }
      );
    }

    return NextResponse.json({ 
      message: '예측 작업이 시작되었습니다',
      success: true 
    });

  } catch (error) {
    console.error('Forecast trigger error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

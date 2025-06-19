// app/layout.tsx
// Next.js 13+ App Router의 루트 레이아웃 컴포넌트

"use client" // 이 컴포넌트를 Client Component로 설정

// 전역 CSS 스타일 import
import "@/app/globals.css"

// Geist 폰트 패밀리 import (모던한 웹 폰트)
import { GeistMono } from "geist/font/mono"  // 모노스페이스 폰트 (코드용)
import { GeistSans } from "geist/font/sans"  // 산세리프 폰트 (일반 텍스트용)

// 커스텀 컴포넌트들 import
import { ThemeProvider } from "@/components/theme-provider"  // 다크/라이트 테마 관리
import { AuthProvider } from "@/lib/auth-context"           // 인증 상태 관리
import { SidebarProvider } from "@/components/ui/sidebar"   // 사이드바 상태 관리
import { AppSidebar } from "@/components/app-sidebar"       // 앱 사이드바
import { SiteHeader } from "@/components/site-header"       // 사이트 헤더

// Next.js 훅 - 현재 경로 정보를 가져오기 위함
import { usePathname } from "next/navigation"

// 폰트 변수 설정 (CSS 변수로 사용됨)
const fontSans = GeistSans  // 기본 산세리프 폰트
const fontMono = GeistMono  // 모노스페이스 폰트

/**
 * RootLayout 컴포넌트
 * - 앱 전체의 최상위 레이아웃을 정의
 * - 모든 페이지에서 공통으로 사용되는 레이아웃
 * - 인증 페이지와 일반 페이지에 따라 다른 레이아웃 적용
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  // 현재 페이지의 경로를 가져옴
  const pathname = usePathname()
  
  // 인증 관련 페이지인지 확인 (로그인, 회원가입, 비밀번호 재설정)
  const isAuthPage = ["/login", "/signup", "/reset-password"].includes(pathname)

  return (
    // HTML 최상위 요소
    <html lang="en" suppressHydrationWarning>
      <head />
      <body 
        className={`
          ${fontSans.variable}     // 산세리프 폰트 CSS 변수 적용
          ${fontMono.variable}     // 모노스페이스 폰트 CSS 변수 적용
          min-h-screen            // 최소 높이를 화면 높이로 설정
          bg-background           // 배경색 설정 (테마에 따라 변경됨)
          font-sans               // 기본 폰트를 산세리프로 설정
          antialiased             // 폰트 안티앨리어싱 적용
        `}
      >
        {/* 테마 제공자 - 다크/라이트 모드 관리 */}
        <ThemeProvider 
          attribute="class"                    // 테마를 class 속성으로 적용
          defaultTheme="system"               // 기본값은 시스템 테마 따라가기
          enableSystem                        // 시스템 테마 감지 활성화
          disableTransitionOnChange          // 테마 변경 시 전환 애니메이션 비활성화
        >
          {/* 인증 상태 제공자 - 로그인/로그아웃 상태 관리 */}
          <AuthProvider>
            {isAuthPage ? (
              // 인증 페이지 (로그인/회원가입/비밀번호 재설정)의 경우
              // → 중앙 정렬된 깔끔한 레이아웃
              <div className="flex min-h-screen items-center justify-center">
                {children} {/* 페이지 콘텐츠가 여기에 렌더링됨 */}
              </div>
            ) : (
              // 일반 페이지의 경우
              // → 사이드바 + 헤더 + 메인 콘텐츠 영역으로 구성된 대시보드 레이아웃
              <SidebarProvider>
                <div className="flex min-h-screen w-full">
                  {/* 왼쪽 고정 사이드바 */}
                  <AppSidebar />
                  
                  {/* 오른쪽 메인 영역 (헤더 + 콘텐츠) */}
                  <div className="flex flex-col w-full">
                    {/* 상단 헤더 */}
                    <SiteHeader />
                    
                    {/* 메인 콘텐츠 영역 */}
                    <main className="
                      flex-1           // 남은 공간을 모두 차지
                      p-4              // 기본 패딩 16px
                      lg:p-6           // 큰 화면에서 패딩 24px
                      xl:p-8           // 매우 큰 화면에서 패딩 32px
                    ">
                      {children} {/* 각 페이지의 실제 콘텐츠가 여기에 렌더링됨 */}
                    </main>
                  </div>
                </div>
              </SidebarProvider>
            )}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

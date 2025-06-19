//components/chart-area-interactive.tsx
"use client" // Next.js에서 클라이언트 측 렌더링을 지정

import * as React from "react" // React 라이브러리 전체 가져오기
import { useEffect, useState } from "react"  // 상태 관리 함수 가져오기
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts" // Recharts에서 차트 관련 컴포넌트 가져오기

import { useIsMobile } from "@/hooks/use-mobile" // 모바일 화면 여부를 확인하는 커스텀 훅
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card" // UI 카드 컴포넌트 가져오기
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart" // 차트 설정 및 툴팁 컴포넌트 가져오기
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select" // 드롭다운 메뉴 컴포넌트 가져오기
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group" // 토글 버튼 그룹 컴포넌트 가져오기

// 차트 설정: 데이터 키별 레이블과 색상 정의
const chartConfig = {
  amount: {
    label: "Total Amount", // 총액 레이블
    color: "hsl(var(--chart-1))", // 색상 CSS 변수
  },
  cost: {
    label: "Total Cost", // 원가 레이블
    color: "hsl(var(--chart-2))",
  },
  profit: {
    label: "Profit (Revenue)", // 이익 레이블
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig // ChartConfig 타입 준수 확인

// 인터랙티브 차트 컴포넌트 정의
export function ChartAreaInteractive() {
  const isMobile = useIsMobile() // 디바이스가 모바일인지 확인
  const [timeRange, setTimeRange] = useState("1m") // 시간 범위 상태 (기본: 1개월)
  const [chartData, setChartData] = useState<
    { date: string; amount: number; cost: number; profit: number }[]
  >([]) // API로부터 불러올 chartData 상태 정의

  // 모바일 환경에서 시간 범위 자동 설정
  useEffect(() => {
    if (isMobile) {
      setTimeRange("1m") // 모바일에서는 1개월로 설정
    }
  }, [isMobile]) // isMobile 변경 시 실행

  // API에서 차트 데이터 가져오기
  useEffect(() => {
    fetch("/api/chart")
      .then((res) => res.json())
      .then((data) => setChartData(data))
      .catch((err) => console.error("API fetch error:", err))
  }, [])

  // 시간 범위에 따라 데이터 필터링
  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date) // 데이터 날짜를 Date 객체로 변환
    const referenceDate = chartData.length
      ? new Date(chartData[chartData.length - 1].date)
      : new Date() // 기준 날짜 설정 (가장 최신 데이터 기준)
    let daysToSubtract = 30  // 기본 30일 데이터
    if (timeRange === "6m") {
      daysToSubtract = 180  // 6개월 = 180일
    } else if (timeRange === "3m") {
      daysToSubtract = 90  // 3개월 = 90일
    } else if (timeRange === "1m") {
      daysToSubtract = 30  // 1개월 = 30일
    }
    const startDate = new Date(referenceDate) // 기준 날짜 설정
    startDate.setDate(startDate.getDate() - daysToSubtract) // 날짜 계산
    return date >= startDate // 시작 날짜 이후 데이터 반환
  })

  // JSX로 UI 렌더링
  return (
    <Card className="@container/card"> {/* 반응형 컨테이너 스타일 적용 */}
      <CardHeader className="relative"> {/* 헤더, 상대 위치 설정 */}
        <CardTitle>Sales Analytics</CardTitle> {/* 차트 제목 */}
        <CardDescription> {/* 차트 설명 */}
          <span className="@[540px]/card:block hidden">Revenue, profit, and margin analysis</span> {/* 540px 이상에서 표시 */}
          <span className="@[540px]/card:hidden">Sales overview</span> {/* 540px 미만에서 표시 */}
        </CardDescription>
        <div className="absolute right-4 top-4"> {/* 우측 상단 위치 */}
          <ToggleGroup
            type="single" // 단일 선택 토글
            value={timeRange} // 현재 시간 범위 값
            onValueChange={setTimeRange} // 시간 범위 변경 처리
            variant="outline" // 아웃라인 스타일
            className="@[767px]/card:flex hidden" // 767px 이상에서 표시
          >  
            <ToggleGroupItem value="6m" className="h-8 px-2.5">  {/* 6개월 선택 버튼 */}
              Last 6 months
            </ToggleGroupItem>
            <ToggleGroupItem value="3m" className="h-8 px-2.5">  {/* 3개월 선택 버튼 */}
              Last 3 months
            </ToggleGroupItem>
            <ToggleGroupItem value="1m" className="h-8 px-2.5">  {/* 1개월 선택 버튼 */}
              Last 1 month
            </ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="@[767px]/card:hidden flex w-40" aria-label="Select a value">
              <SelectValue placeholder="Last 1 month" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="6m" className="rounded-lg">
                Last 6 months
              </SelectItem>
              <SelectItem value="3m" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="1m" className="rounded-lg">
                Last 1 month
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6"> {/* 컨텐츠 영역, 반응형 패딩 */}
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full"> 
          <AreaChart data={filteredData}> {/* 필터링된 데이터로 AreaChart 렌더링 */}
            <defs> {/* SVG 그래디언트 정의 */}
              <linearGradient id="fillAmount" x1="0" y1="0" x2="0" y2="1"> {/* amount용 그래디언트 */}
                <stop offset="5%" stopColor="var(--color-amount)" stopOpacity={0.8} /> {/* 시작 색상 */}
                <stop offset="95%" stopColor="var(--color-amount)" stopOpacity={0.1} /> {/* 종료 색상 */}
              </linearGradient>
              <linearGradient id="fillCost" x1="0" y1="0" x2="0" y2="1"> {/* cost용 그래디언트 */}
                <stop offset="5%" stopColor="var(--color-cost)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-cost)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillProfit" x1="0" y1="0" x2="0" y2="1"> {/* profit용 그래디언트 */}
                <stop offset="5%" stopColor="var(--color-profit)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-profit)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} /> {/* 수평선만 표시하는 그리드 */}
            <XAxis
              dataKey="date" // X축 데이터 키
              tickLine={false} // 눈금선 비활성화
              axisLine={false} // 축선 비활성화
              tickMargin={8} // 눈금과 레이블 간 여백
              minTickGap={32} // 최소 눈금 간격
              tickFormatter={(value) => { // X축 날짜 포맷팅
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                }) // "Apr 1" 형식
              }}
            />
            <ChartTooltip
              cursor={false} // 툴팁 커서 비활성화
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => { // 툴팁 날짜 포맷팅
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot" // 툴팁 포인터 스타일
                />
              }
            />
            <Area
              dataKey="amount" // amount 데이터 표시
              type="natural" // 자연스러운 곡선 스타일
              fill="url(#fillAmount)" // 그래디언트 채우기
              stroke="var(--color-amount)" // 선 색상
              stackId="a" // 스택 그룹 지정
            />
            <Area
              dataKey="cost" // cost 데이터 표시
              type="natural" // 자연스러운 곡선
              fill="url(#fillCost)" // 그래디언트 채우기
              stroke="var(--color-cost)" // 선 색상
              stackId="b" // 스택 그룹 지정
            />
            <Area
              dataKey="profit" // profit 데이터 표시
              type="natural" // 자연스러운 곡선
              fill="url(#fillProfit)" // 그래디언트 채우기
              stroke="var(--color-profit)" // 선 색상
              stackId="c" // 스택 그룹 지정
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

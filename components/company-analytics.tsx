"use client"
import { useEffect, useState } from "react"
import { TrendingUp, Building2, Globe, Target, AlertTriangle } from "lucide-react"
import { Label, Pie, PieChart, CartesianGrid, LabelList, Bar, BarChart, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

// 권역 분류 함수
function mapCountryToRegion(country: string): string {
  if (country?.includes("한국") || country?.includes("Korea")) return "한국"
  if (["중국", "일본", "인도", "베트남", "China", "Japan", "India", "Vietnam"].some((v) => country?.includes(v)))
    return "아시아"
  if (
    ["독일", "프랑스", "영국", "이탈리아", "스페인", "Germany", "France", "UK", "Italy", "Spain"].some((v) =>
      country?.includes(v),
    )
  )
    return "유럽"
  if (["미국", "캐나다", "멕시코", "브라질", "USA", "Canada", "Mexico", "Brazil"].some((v) => country?.includes(v)))
    return "아메리카"
  return "기타"
}

export default function CompanyAnalytics() {
  const [companyTypeData, setCompanyTypeData] = useState<{ type: string; amount: number; fill: string }[]>([])
  const [regionData, setRegionData] = useState<{ region: string; amount: number }[]>([])
  const [profitabilityData, setProfitabilityData] = useState<{ size: string; margin: number }[]>([])
  const [riskIssueData, setRiskIssueData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true)

        // 1. 고객사 유형별 매출 데이터
        const card1Response = await fetch("/api/card1")
        const card1Data = await card1Response.json()

        const typeChartData = card1Data.map((item: any, index: number) => ({
          type: item.company_type,
          amount: item.total_amount,
          fill: `hsl(var(--chart-${(index % 5) + 1}))`,
        }))
        setCompanyTypeData(typeChartData)

        // 2. 지역별 매출 데이터 (customers + orders + contacts 조인)
        const [customersRes, ordersRes, contactsRes] = await Promise.all([
          fetch("/api/customers"),
          fetch("/api/orders"),
          fetch("/api/contacts"),
        ])

        const [customers, orders, contacts] = await Promise.all([
          customersRes.json(),
          ordersRes.json(),
          contactsRes.json(),
        ])

        // 지역별 매출 집계
        const regionSummary: Record<string, number> = {}

        orders.forEach((order: any) => {
          const contact = contacts.find((c: any) => c.CONTACT_ID === order.CONTACT_ID)
          const customer = customers.find((cu: any) => cu.CUSTOMER_ID === contact?.CUSTOMER_ID)

          if (customer?.COUNTRY) {
            const region = mapCountryToRegion(customer.COUNTRY)
            regionSummary[region] = (regionSummary[region] || 0) + (order.AMOUNT || 0)
          }
        })

        const regionChartData = Object.entries(regionSummary).map(([region, amount]) => ({
          region,
          amount,
        }))
        setRegionData(regionChartData)

        // 3. 회사 규모별 수익성 데이터
        const [segmentsRes, profitRes] = await Promise.all([
          fetch("/api/segments"),
          fetch("/api/customer_profit_analysis"),
        ])

        const [segments, profitAnalysis] = await Promise.all([segmentsRes.json(), profitRes.json()])

        // 회사 규모별 수익률 집계
        const sizeProfitMap: Record<string, { totalMargin: number; count: number }> = {}

        segments.forEach((segment: any) => {
          const profit = profitAnalysis.find((p: any) => p.CONTACT_ID === segment.CONTACT_ID)
          if (segment.COMPANY_SIZE && profit?.PROFIT_MARGIN) {
            if (!sizeProfitMap[segment.COMPANY_SIZE]) {
              sizeProfitMap[segment.COMPANY_SIZE] = { totalMargin: 0, count: 0 }
            }
            sizeProfitMap[segment.COMPANY_SIZE].totalMargin += profit.PROFIT_MARGIN
            sizeProfitMap[segment.COMPANY_SIZE].count += 1
          }
        })

        const profitChartData = Object.entries(sizeProfitMap).map(([size, data]) => ({
          size,
          margin: data.totalMargin / data.count,
        }))
        setProfitabilityData(profitChartData)

        // 4. 리스크 & 이슈 통합 데이터
        const issuesRes = await fetch("/api/issues")
        const issues = await issuesRes.json()

        // 리스크와 이슈 데이터 조인
        const riskIssueMap: Record<string, any> = {}

        segments.forEach((segment: any) => {
          const contact = contacts.find((c: any) => c.CONTACT_ID === segment.CONTACT_ID)
          const customer = customers.find((cu: any) => cu.CUSTOMER_ID === contact?.CUSTOMER_ID)
          const relatedIssues = issues.filter((issue: any) => {
            const issueContact = contacts.find((c: any) => c.CONTACT_ID === issue.ORDER_ID) // 간접 연결
            return issueContact?.CUSTOMER_ID === customer?.CUSTOMER_ID
          })

          if (customer?.COMPANY_NAME) {
            riskIssueMap[customer.COMPANY_NAME] = {
              company: customer.COMPANY_NAME,
              riskScore: segment.HIGH_RISK_PROBABILITY || 0,
              riskLevel: segment.PREDICTED_RISK_LEVEL || "Low",
              issues:
                relatedIssues.length > 0
                  ? relatedIssues
                  : [
                      {
                        ISSUE_TYPE: "없음",
                        SEVERITY: "Low",
                        STATUS: "정상",
                      },
                    ],
            }
          }
        })

        setRiskIssueData(Object.values(riskIssueMap))
      } catch (error) {
        console.error("Analytics data fetch error:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalyticsData()
  }, [])

  // 차트 설정
  const companyTypeConfig = {
    amount: { label: "매출액" },
  } satisfies ChartConfig

  const regionConfig = {
    amount: { label: "매출액", color: "hsl(var(--chart-2))" },
  } satisfies ChartConfig

  const profitConfig = {
    margin: { label: "수익률", color: "hsl(var(--chart-3))" },
  } satisfies ChartConfig

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading analytics data...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 카드형 시각화 차트 3종 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. 고객사 유형별 매출 분석 */}
        <Card className="flex flex-col">
          <CardHeader className="items-center pb-0">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              고객사 유형별 매출
            </CardTitle>
            <CardDescription>회사 유형별 매출 분포</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <ChartContainer config={companyTypeConfig} className="mx-auto aspect-square max-h-[250px]">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie data={companyTypeData} dataKey="amount" nameKey="type" innerRadius={60} strokeWidth={5}>
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        const total = companyTypeData.reduce((sum, item) => sum + item.amount, 0)
                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                              {(total / 1_000_000).toFixed(1)}M
                            </tspan>
                            <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 20} className="fill-muted-foreground">
                              총 매출
                            </tspan>
                          </text>
                        )
                      }
                      return null
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex-col gap-2 text-sm">
            <div className="flex items-center gap-2 font-medium leading-none">
              유형별 매출 분석 <TrendingUp className="h-4 w-4" />
            </div>
            <div className="leading-none text-muted-foreground">고객사 유형별 매출 비중</div>
          </CardFooter>
        </Card>

        {/* 2. 지역별 고객사 매출 현황 */}
        <Card className="flex flex-col">
          <CardHeader className="items-center pb-0">
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              지역별 매출 현황
            </CardTitle>
            <CardDescription>권역별 매출 분포</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <ChartContainer config={regionConfig}>
              <BarChart data={regionData} margin={{ top: 20 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="region" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis hide />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="amount" fill="hsl(var(--chart-2))" radius={8}>
                  <LabelList
                    dataKey="amount"
                    position="top"
                    offset={12}
                    className="fill-foreground"
                    fontSize={12}
                    formatter={(value: number) => `${(value / 1_000_000).toFixed(1)}M`}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex-col gap-2 text-sm">
            <div className="flex items-center gap-2 font-medium leading-none">
              권역별 매출 분석 <TrendingUp className="h-4 w-4" />
            </div>
            <div className="leading-none text-muted-foreground">지역별 매출 현황</div>
          </CardFooter>
        </Card>

        {/* 3. 회사 규모별 수익성 비교 */}
        <Card className="flex flex-col">
          <CardHeader className="items-center pb-0">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              규모별 수익성
            </CardTitle>
            <CardDescription>회사 규모별 수익률</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <ChartContainer config={profitConfig}>
              <BarChart data={profitabilityData} margin={{ top: 20 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="size" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis hide />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="margin" fill="hsl(var(--chart-3))" radius={8}>
                  <LabelList
                    dataKey="margin"
                    position="top"
                    offset={12}
                    className="fill-foreground"
                    fontSize={12}
                    formatter={(value: number) => `${(value * 100).toFixed(1)}%`}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex-col gap-2 text-sm">
            <div className="flex items-center gap-2 font-medium leading-none">
              수익성 분석 <TrendingUp className="h-4 w-4" />
            </div>
            <div className="leading-none text-muted-foreground">규모별 평균 수익률</div>
          </CardFooter>
        </Card>
      </div>

      {/* 리스크 & 이슈 통합 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            고객사 리스크 & 이슈 현황
          </CardTitle>
          <CardDescription>고객사별 리스크 수준과 관련 이슈 통합 분석</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>고객사명</TableHead>
                  <TableHead className="text-center">리스크 확률</TableHead>
                  <TableHead className="text-center">리스크 등급</TableHead>
                  <TableHead className="text-center">이슈 개수</TableHead>
                  <TableHead className="text-center">상세 정보</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {riskIssueData.slice(0, 10).map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.company}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={item.riskScore > 0.7 ? "destructive" : item.riskScore > 0.4 ? "default" : "secondary"}
                      >
                        {(item.riskScore * 100).toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          item.riskLevel === "High"
                            ? "destructive"
                            : item.riskLevel === "Medium"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {item.riskLevel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{item.issues.length}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button variant="outline" size="sm">
                            상세보기
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="flex flex-col">
                          <SheetHeader>
                            <SheetTitle>{item.company} 상세 정보</SheetTitle>
                            <SheetDescription>리스크 및 이슈 상세 분석</SheetDescription>
                          </SheetHeader>
                          <div className="flex-1 space-y-4 py-4">
                            <div className="space-y-2">
                              <h4 className="font-medium">리스크 정보</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="text-sm text-muted-foreground">리스크 확률</span>
                                  <div className="font-medium">{(item.riskScore * 100).toFixed(1)}%</div>
                                </div>
                                <div>
                                  <span className="text-sm text-muted-foreground">리스크 등급</span>
                                  <div className="font-medium">{item.riskLevel}</div>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-medium">관련 이슈</h4>
                              <div className="space-y-2">
                                {item.issues.map((issue: any, idx: number) => (
                                  <div key={idx} className="border rounded p-3 space-y-1">
                                    <div className="flex justify-between items-center">
                                      <span className="font-medium">{issue.ISSUE_TYPE}</span>
                                      <Badge
                                        variant={
                                          issue.SEVERITY === "High"
                                            ? "destructive"
                                            : issue.SEVERITY === "Medium"
                                              ? "default"
                                              : "secondary"
                                        }
                                      >
                                        {issue.SEVERITY}
                                      </Badge>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      상태: <Badge variant="outline">{issue.STATUS}</Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          <SheetFooter>
                            <SheetClose asChild>
                              <Button variant="outline">닫기</Button>
                            </SheetClose>
                          </SheetFooter>
                        </SheetContent>
                      </Sheet>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

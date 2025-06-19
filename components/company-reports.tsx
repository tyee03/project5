"use client"
import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, AlertTriangle, Calendar, DollarSign, Users, Eye } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList } from "recharts"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"

// 데이터 타입 정의
interface ProfitabilityData {
  company: string
  profit: number
  margin: number
  type: "top" | "bottom"
}

interface HighRiskData {
  company: string
  riskLevel: string
  probability: number
}

interface RegistrationTrendData {
  month: string
  count: number
}

interface RiskSummaryData {
  company: string
  riskScore: number
  riskLevel: string
  segmentLabel: string
  contactId: number
  customerId: number
}

// 리스크 요약 테이블 컬럼 정의
const riskSummaryColumns: ColumnDef<RiskSummaryData>[] = [
  {
    accessorKey: "company",
    header: "고객사명",
    cell: ({ row }) => <div className="font-medium">{row.getValue("company")}</div>,
  },
  {
    accessorKey: "riskScore",
    header: "리스크 확률",
    cell: ({ row }) => {
      const score = Number.parseFloat(row.getValue("riskScore"))
      return (
        <div className="text-center">
          <Badge variant={score > 0.7 ? "destructive" : score > 0.4 ? "default" : "secondary"}>
            {(score * 100).toFixed(1)}%
          </Badge>
        </div>
      )
    },
  },
  {
    accessorKey: "riskLevel",
    header: "리스크 등급",
    cell: ({ row }) => {
      const level = row.getValue("riskLevel") as string
      return (
        <div className="text-center">
          <Badge variant={level === "High" ? "destructive" : level === "Medium" ? "default" : "secondary"}>
            {level}
          </Badge>
        </div>
      )
    },
  },
  {
    accessorKey: "segmentLabel",
    header: "세그먼트 라벨",
    cell: ({ row }) => <div className="text-center">{row.getValue("segmentLabel") || "-"}</div>,
  },
  {
    id: "actions",
    header: "상세보기",
    cell: ({ row }) => <RiskDetailSheet data={row.original} />,
  },
]

// 상세보기 Sheet 컴포넌트
function RiskDetailSheet({ data }: { data: RiskSummaryData }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader className="gap-1">
          <SheetTitle>{data.company} 상세 정보</SheetTitle>
          <SheetDescription>고객사 세그먼트 및 리스크 상세 분석</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto py-4 text-sm">
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label>리스크 확률</Label>
                <div className="text-2xl font-bold text-red-600">{(data.riskScore * 100).toFixed(1)}%</div>
              </div>
              <div className="flex flex-col gap-3">
                <Label>리스크 등급</Label>
                <Badge
                  variant={
                    data.riskLevel === "High" ? "destructive" : data.riskLevel === "Medium" ? "default" : "secondary"
                  }
                >
                  {data.riskLevel}
                </Badge>
              </div>
            </div>
            <Separator />
            <div className="grid gap-3">
              <Label>세그먼트 정보</Label>
              <div>
                <Label className="text-xs text-muted-foreground">세그먼트 라벨</Label>
                <div>{data.segmentLabel || "미분류"}</div>
              </div>
            </div>
            <Separator />
            <div className="grid gap-3">
              <Label>고객 정보</Label>
              <div className="grid gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Contact ID</Label>
                  <div>{data.contactId}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Customer ID</Label>
                  <div>{data.customerId}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <SheetFooter className="mt-auto">
          <SheetClose asChild>
            <Button variant="outline" className="w-full">
              닫기
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export default function CompanyReports() {
  const [profitabilityData, setProfitabilityData] = useState<ProfitabilityData[]>([])
  const [highRiskData, setHighRiskData] = useState<HighRiskData[]>([])
  const [registrationTrendData, setRegistrationTrendData] = useState<RegistrationTrendData[]>([])
  const [riskSummaryData, setRiskSummaryData] = useState<RiskSummaryData[]>([])
  const [loading, setLoading] = useState(true)

  // 테이블 상태
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})

  useEffect(() => {
    const fetchReportsData = async () => {
      try {
        setLoading(true)

        // 1. 수익성 분석 데이터
        const [profitAnalysisRes, contactsRes, customersRes] = await Promise.all([
          fetch("/api/customer_profit_analysis"),
          fetch("/api/contacts"),
          fetch("/api/customers"),
        ])

        const [profitAnalysis, contacts, customers] = await Promise.all([
          profitAnalysisRes.json(),
          contactsRes.json(),
          customersRes.json(),
        ])

        // 수익성 데이터 조인 및 정렬
        const profitWithCompany = profitAnalysis
          .map((profit: any) => {
            const contact = contacts.find((c: any) => c.CONTACT_ID === profit.CONTACT_ID)
            const customer = customers.find((cu: any) => cu.CUSTOMER_ID === contact?.CUSTOMER_ID)
            return {
              company: customer?.COMPANY_NAME || "Unknown",
              profit: profit.TOTAL_PROFIT || 0,
              margin: profit.PROFIT_MARGIN || 0,
            }
          })
          .filter((item: any) => item.company !== "Unknown")
          .sort((a: any, b: any) => b.profit - a.profit)

        const topProfitable = profitWithCompany.slice(0, 5).map((item: any) => ({ ...item, type: "top" as const }))
        const bottomProfitable = profitWithCompany
          .slice(-5)
          .reverse()
          .map((item: any) => ({ ...item, type: "bottom" as const }))

        setProfitabilityData([...topProfitable, ...bottomProfitable])

        // 2. 고위험 고객사 데이터
        const segmentsRes = await fetch("/api/segments")
        const segments = await segmentsRes.json()

        const highRiskCustomers = segments
          .filter((segment: any) => segment.HIGH_RISK_PROBABILITY > 0.8)
          .map((segment: any) => {
            const contact = contacts.find((c: any) => c.CONTACT_ID === segment.CONTACT_ID)
            const customer = customers.find((cu: any) => cu.CUSTOMER_ID === contact?.CUSTOMER_ID)
            return {
              company: customer?.COMPANY_NAME || "Unknown",
              riskLevel: segment.PREDICTED_RISK_LEVEL || "High",
              probability: segment.HIGH_RISK_PROBABILITY || 0,
            }
          })
          .filter((item: any) => item.company !== "Unknown")
          .sort((a: any, b: any) => b.probability - a.probability)
          .slice(0, 5)

        setHighRiskData(highRiskCustomers)

        // 3. 고객사 등록 추이 (최근 12개월)
        const now = new Date()
        const monthlyRegistrations: Record<string, number> = {}

        // 최근 12개월 초기화
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
          monthlyRegistrations[monthKey] = 0
        }

        // 고객사 등록일 집계
        customers.forEach((customer: any) => {
          if (customer.REG_DATE) {
            const regDate = new Date(customer.REG_DATE)
            const monthKey = `${regDate.getFullYear()}-${String(regDate.getMonth() + 1).padStart(2, "0")}`
            if (monthlyRegistrations.hasOwnProperty(monthKey)) {
              monthlyRegistrations[monthKey]++
            }
          }
        })

        const trendData = Object.entries(monthlyRegistrations).map(([month, count]) => ({
          month,
          count,
        }))
        setRegistrationTrendData(trendData)

        // 4. 리스크 요약 테이블 데이터
        const riskSummary = segments
          .map((segment: any) => {
            const contact = contacts.find((c: any) => c.CONTACT_ID === segment.CONTACT_ID)
            const customer = customers.find((cu: any) => cu.CUSTOMER_ID === contact?.CUSTOMER_ID)
            return {
              company: customer?.COMPANY_NAME || "Unknown",
              riskScore: segment.HIGH_RISK_PROBABILITY || 0,
              riskLevel: segment.PREDICTED_RISK_LEVEL || "Low",
              segmentLabel: segment.SEGMENT_LABEL || "미분류",
              contactId: segment.CONTACT_ID,
              customerId: customer?.CUSTOMER_ID || 0,
            }
          })
          .filter((item: any) => item.company !== "Unknown")
          .sort((a: any, b: any) => b.riskScore - a.riskScore)

        setRiskSummaryData(riskSummary)
      } catch (error) {
        console.error("Reports data fetch error:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchReportsData()
  }, [])

  const table = useReactTable({
    data: riskSummaryData,
    columns: riskSummaryColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  // 차트 설정
  const registrationConfig = {
    count: { label: "등록 수", color: "hsl(var(--chart-1))" },
  } satisfies ChartConfig

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading reports data...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 리포트 카드 3종 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. 수익성 상위/하위 고객사 리스트 */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              수익성 분석
            </CardTitle>
            <CardDescription>상위/하위 수익 고객사</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-4">
              {/* 상위 수익 고객사 */}
              <div>
                <h4 className="flex items-center gap-2 text-sm font-medium text-green-600 mb-2">
                  <TrendingUp className="h-4 w-4" />
                  상위 5개 고객사
                </h4>
                <div className="space-y-2">
                  {profitabilityData
                    .filter((item) => item.type === "top")
                    .map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="font-medium text-sm">{item.company}</span>
                        <div className="text-right">
                          <div className="text-sm font-bold text-green-600">
                            ${(item.profit / 1_000_000).toFixed(1)}M
                          </div>
                          <div className="text-xs text-muted-foreground">{(item.margin * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* 하위 수익 고객사 */}
              <div>
                <h4 className="flex items-center gap-2 text-sm font-medium text-red-600 mb-2">
                  <TrendingDown className="h-4 w-4" />
                  하위 5개 고객사
                </h4>
                <div className="space-y-2">
                  {profitabilityData
                    .filter((item) => item.type === "bottom")
                    .map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-red-50 rounded">
                        <span className="font-medium text-sm">{item.company}</span>
                        <div className="text-right">
                          <div className="text-sm font-bold text-red-600">${(item.profit / 1_000_000).toFixed(1)}M</div>
                          <div className="text-xs text-muted-foreground">{(item.margin * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. 고위험 고객사 요약 카드 */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              고위험 고객사
            </CardTitle>
            <CardDescription>리스크 확률 80% 이상</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-3">
              {highRiskData.map((item, index) => (
                <div key={index} className="p-3 border border-red-200 bg-red-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-sm">{item.company}</span>
                    <Badge variant="destructive">{item.riskLevel}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">리스크 확률</span>
                    <span className="text-sm font-bold text-red-600">{(item.probability * 100).toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 3. 고객사 등록 추이 (월별) */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              등록 추이
            </CardTitle>
            <CardDescription>최근 12개월 신규 고객사</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ChartContainer config={registrationConfig}>
              <BarChart data={registrationTrendData} margin={{ top: 20 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(-2)}
                />
                <YAxis hide />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={4}>
                  <LabelList dataKey="count" position="top" offset={8} className="fill-foreground" fontSize={10} />
                </Bar>
              </BarChart>
            </ChartContainer>
            <div className="mt-4 text-center">
              <div className="text-2xl font-bold">
                {registrationTrendData.reduce((sum, item) => sum + item.count, 0)}
              </div>
              <div className="text-sm text-muted-foreground">총 신규 고객사</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 리스크 요약 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            고객사 리스크 요약
          </CardTitle>
          <CardDescription>고객사별 리스크 등급 및 세그먼트 정보</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table
                    .getRowModel()
                    .rows.slice(0, 15)
                    .map((row) => (
                      <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={riskSummaryColumns.length} className="h-24 text-center">
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-end space-x-2 py-4">
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import * as React from "react"
import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  ArrowUpDownIcon,
  PieChartIcon,
  FilterIcon,
  DownloadIcon,
  EyeIcon,
  BuildingIcon,
  UsersIcon,
  TrendingUpIcon,
} from "lucide-react"
import { Bar, BarChart, Pie, PieChart, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartContainer } from "@/components/ui/chart"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"

// Types
interface Contact {
  CONTACT_ID: number
  CUSTOMER_ID: number
  NAME: string
  EMAIL: string
  POSITION: string
  DEPARTMENT: string
  PHONE: string
  PREFERRED_CHANNEL?: string
}

interface Customer {
  CUSTOMER_ID: number
  COMPANY_NAME: string
  COMPANY_TYPE: string
  REGION: string
  INDUSTRY_TYPE: string
  COUNTRY: string
  COMPANY_SIZE: string
}

interface ProfitAnalysis {
  CONTACT_ID: number
  CUSTOMER_GRADE: string
  PROFIT_MARGIN: number
  TOTAL_PROFIT: number
}

interface CombinedContactData {
  contactId: number
  contactName: string
  department: string
  position: string
  preferredChannel: string
  companyName: string
  companyType: string
  region: string
  industryType: string
  country: string
  companySize: string
  customerGrade: string
  profitMargin: number
  totalProfit: number
}

interface ChartData {
  name: string
  value: number
  color?: string
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FFC658", "#FF7C7C"]

const getGradeBadge = (grade: string) => {
  switch (grade?.toUpperCase()) {
    case "A":
      return <Badge className="bg-green-500">A급</Badge>
    case "B":
      return <Badge className="bg-blue-500">B급</Badge>
    case "C":
      return <Badge className="bg-yellow-500">C급</Badge>
    case "D":
      return <Badge variant="destructive">D급</Badge>
    default:
      return <Badge variant="outline">{grade || "미분류"}</Badge>
  }
}

const getCompanyTypeBadge = (type: string) => {
  const colorMap: Record<string, string> = {
    완성차: "bg-blue-100 text-blue-800",
    유통: "bg-green-100 text-green-800",
    정비소: "bg-yellow-100 text-yellow-800",
    렌터카: "bg-purple-100 text-purple-800",
  }

  return (
    <Badge variant="outline" className={colorMap[type] || "bg-gray-100 text-gray-800"}>
      {type}
    </Badge>
  )
}

export default function ContactsReports() {
  const [loading, setLoading] = React.useState(true)

  // Filter states
  const [distributionFilter, setDistributionFilter] = React.useState("department") // department, position, channel
  const [showPercentage, setShowPercentage] = React.useState(false)
  const [companyTypeFilter, setCompanyTypeFilter] = React.useState("all")
  const [regionFilter, setRegionFilter] = React.useState("all")
  const [gradeFilter, setGradeFilter] = React.useState("all")
  const [searchTerm, setSearchTerm] = React.useState("")

  // Data states
  const [contacts, setContacts] = React.useState<Contact[]>([])
  const [customers, setCustomers] = React.useState<Customer[]>([])
  const [profitAnalysis, setProfitAnalysis] = React.useState<ProfitAnalysis[]>([])
  const [combinedData, setCombinedData] = React.useState<CombinedContactData[]>([])

  // Chart data states
  const [distributionData, setDistributionData] = React.useState<ChartData[]>([])
  const [companyAnalysisData, setCompanyAnalysisData] = React.useState<ChartData[]>([])
  const [gradeDistributionData, setGradeDistributionData] = React.useState<ChartData[]>([])

  // Fetch data
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        const [contactsRes, customersRes, profitRes] = await Promise.all([
          fetch("/api/contacts").then((res) => res.json()),
          fetch("/api/customers").then((res) => res.json()),
          fetch("/api/customer_profit_analysis").then((res) => res.json()),
        ])

        const contactsData = contactsRes || []
        const customersData = customersRes || []
        const profitData = profitRes || []

        setContacts(contactsData)
        setCustomers(customersData)
        setProfitAnalysis(profitData)

        // Process combined data
        processCombinedData(contactsData, customersData, profitData)
      } catch (error) {
        console.error("Error fetching contacts reports data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const processCombinedData = React.useCallback(
    (contactsData: Contact[], customersData: Customer[], profitData: ProfitAnalysis[]) => {
      // Create maps for efficient lookup
      const customerMap = new Map()
      customersData.forEach((customer) => {
        customerMap.set(customer.CUSTOMER_ID, customer)
      })

      const profitMap = new Map()
      profitData.forEach((profit) => {
        profitMap.set(profit.CONTACT_ID, profit)
      })

      // Combine data
      const combined = contactsData.map((contact) => {
        const customer = customerMap.get(contact.CUSTOMER_ID)
        const profit = profitMap.get(contact.CONTACT_ID)

        return {
          contactId: contact.CONTACT_ID,
          contactName: contact.NAME,
          department: contact.DEPARTMENT || "미분류",
          position: contact.POSITION || "미분류",
          preferredChannel: contact.PREFERRED_CHANNEL || "이메일",
          companyName: customer?.COMPANY_NAME || "Unknown",
          companyType: customer?.COMPANY_TYPE || "미분류",
          region: customer?.REGION || "미분류",
          industryType: customer?.INDUSTRY_TYPE || "미분류",
          country: customer?.COUNTRY || "미분류",
          companySize: customer?.COMPANY_SIZE || "미분류",
          customerGrade: profit?.CUSTOMER_GRADE || "미분류",
          profitMargin: profit?.PROFIT_MARGIN || 0,
          totalProfit: profit?.TOTAL_PROFIT || 0,
        }
      })

      setCombinedData(combined)
      processChartData(combined)
    },
    [],
  )

  const processChartData = React.useCallback(
    (data: CombinedContactData[]) => {
      // 1. Distribution data based on filter
      const distributionMap = new Map()
      data.forEach((item) => {
        let key = ""
        switch (distributionFilter) {
          case "department":
            key = item.department
            break
          case "position":
            key = item.position
            break
          case "channel":
            key = item.preferredChannel
            break
          default:
            key = item.department
        }
        distributionMap.set(key, (distributionMap.get(key) || 0) + 1)
      })

      const distributionResult = Array.from(distributionMap.entries()).map(([name, value], index) => ({
        name,
        value,
        color: COLORS[index % COLORS.length],
      }))

      setDistributionData(distributionResult)

      // 2. Company analysis data
      const companyMap = new Map()
      data.forEach((item) => {
        const key = item.companyType
        companyMap.set(key, (companyMap.get(key) || 0) + 1)
      })

      const companyResult = Array.from(companyMap.entries()).map(([name, value], index) => ({
        name,
        value,
        color: COLORS[index % COLORS.length],
      }))

      setCompanyAnalysisData(companyResult)

      // 3. Grade distribution data
      const gradeMap = new Map()
      data.forEach((item) => {
        const key = item.customerGrade
        gradeMap.set(key, (gradeMap.get(key) || 0) + 1)
      })

      const gradeResult = Array.from(gradeMap.entries()).map(([name, value], index) => ({
        name,
        value,
        color: COLORS[index % COLORS.length],
      }))

      setGradeDistributionData(gradeResult)
    },
    [distributionFilter],
  )

  // Re-process chart data when filter changes
  React.useEffect(() => {
    if (combinedData.length > 0) {
      processChartData(combinedData)
    }
  }, [distributionFilter, processChartData, combinedData])

  // Filter combined data for table
  const filteredCombinedData = React.useMemo(() => {
    return combinedData.filter((item) => {
      if (companyTypeFilter !== "all" && item.companyType !== companyTypeFilter) return false
      if (regionFilter !== "all" && item.region !== regionFilter) return false
      if (gradeFilter !== "all" && item.customerGrade !== gradeFilter) return false
      if (searchTerm && !item.contactName.toLowerCase().includes(searchTerm.toLowerCase())) return false
      return true
    })
  }, [combinedData, companyTypeFilter, regionFilter, gradeFilter, searchTerm])

  // Get unique values for filters
  const uniqueCompanyTypes = React.useMemo(() => {
    return Array.from(new Set(combinedData.map((item) => item.companyType).filter(Boolean)))
  }, [combinedData])

  const uniqueRegions = React.useMemo(() => {
    return Array.from(new Set(combinedData.map((item) => item.region).filter(Boolean)))
  }, [combinedData])

  const uniqueGrades = React.useMemo(() => {
    return Array.from(new Set(combinedData.map((item) => item.customerGrade).filter(Boolean)))
  }, [combinedData])

  // Table columns
  const columns: ColumnDef<CombinedContactData>[] = [
    {
      accessorKey: "contactName",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          연락처 이름
          <ArrowUpDownIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="link" className="p-0 h-auto font-medium text-left">
              {row.original.contactName}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[540px]">
            <SheetHeader>
              <SheetTitle>연락처 상세 정보</SheetTitle>
              <SheetDescription>{row.original.contactName}의 종합 정보</SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">부서</Label>
                  <p className="text-sm">{row.original.department}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">직위</Label>
                  <p className="text-sm">{row.original.position}</p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">선호 채널</Label>
                <p className="text-sm">{row.original.preferredChannel}</p>
              </div>
              <Separator />
              <div>
                <Label className="text-sm font-medium text-muted-foreground">고객사명</Label>
                <p className="text-sm font-medium">{row.original.companyName}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">회사 유형</Label>
                  <div className="mt-1">{getCompanyTypeBadge(row.original.companyType)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">지역</Label>
                  <p className="text-sm">{row.original.region}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">산업 유형</Label>
                  <p className="text-sm">{row.original.industryType}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">기업 규모</Label>
                  <p className="text-sm">{row.original.companySize}</p>
                </div>
              </div>
              <Separator />
              <div>
                <Label className="text-sm font-medium text-muted-foreground">수익성 등급</Label>
                <div className="mt-1">{getGradeBadge(row.original.customerGrade)}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">수익 마진</Label>
                  <p className="text-sm font-bold">{(row.original.profitMargin * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">총 수익</Label>
                  <p className="text-sm font-bold">₩{row.original.totalProfit.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      ),
    },
    {
      accessorKey: "department",
      header: "부서",
      cell: ({ row }) => <div className="text-center">{row.original.department}</div>,
    },
    {
      accessorKey: "position",
      header: "직위",
      cell: ({ row }) => <div className="text-center">{row.original.position}</div>,
    },
    {
      accessorKey: "companyName",
      header: "고객사명",
      cell: ({ row }) => <div className="font-medium">{row.original.companyName}</div>,
    },
    {
      accessorKey: "companyType",
      header: "회사 유형",
      cell: ({ row }) => <div className="text-center">{getCompanyTypeBadge(row.original.companyType)}</div>,
    },
    {
      accessorKey: "customerGrade",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          수익성 등급
          <ArrowUpDownIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-center">{getGradeBadge(row.original.customerGrade)}</div>,
    },
    {
      accessorKey: "profitMargin",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          수익 마진
          <ArrowUpDownIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-center font-medium">{(row.original.profitMargin * 100).toFixed(1)}%</div>,
    },
    {
      accessorKey: "totalProfit",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          총 수익
          <ArrowUpDownIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-center font-medium">₩{row.original.totalProfit.toLocaleString()}</div>,
    },
  ]

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  const table = useReactTable({
    data: filteredCombinedData,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-48 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Contact Reports</h2>
          <p className="text-muted-foreground">연락처 데이터 기반 종합 분석 리포트</p>
        </div>
        <Button variant="outline" className="gap-2">
          <DownloadIcon className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              연락처 유형별 분포
            </CardTitle>
            <CardDescription>부서, 직위, 선호 채널별 연락처 분포</CardDescription>
            <div className="flex items-center gap-4">
              <Select value={distributionFilter} onValueChange={setDistributionFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="department">부서별</SelectItem>
                  <SelectItem value="position">직위별</SelectItem>
                  <SelectItem value="channel">채널별</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center space-x-2">
                <Checkbox id="percentage" checked={showPercentage} onCheckedChange={setShowPercentage} />
                <Label htmlFor="percentage" className="text-sm">
                  비율 표시
                </Label>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                value: { label: "연락처 수", color: "hsl(var(--chart-1))" },
              }}
              className="h-64 w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value, percent }) =>
                      showPercentage ? `${name} ${(percent * 100).toFixed(0)}%` : `${name} (${value})`
                    }
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Company Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BuildingIcon className="h-5 w-5" />
              고객사 유형별 분포
            </CardTitle>
            <CardDescription>회사 유형별 연락처 수량 분석</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                value: { label: "연락처 수", color: "hsl(var(--chart-2))" },
              }}
              className="h-64 w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={companyAnalysisData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={10} tick={{ fontSize: 10 }} />
                  <YAxis fontSize={10} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--chart-2))" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Grade Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUpIcon className="h-5 w-5" />
              수익성 등급별 분포
            </CardTitle>
            <CardDescription>고객 등급별 연락처 수 및 수익성 분석</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                value: { label: "연락처 수", color: "hsl(var(--chart-3))" },
              }}
              className="h-64 w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradeDistributionData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={10} tick={{ fontSize: 10 }} />
                  <YAxis fontSize={10} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--chart-3))" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              요약 통계
            </CardTitle>
            <CardDescription>전체 연락처 현황 요약</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{combinedData.length}</div>
                  <div className="text-sm text-muted-foreground">총 연락처</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{uniqueCompanyTypes.length}</div>
                  <div className="text-sm text-muted-foreground">회사 유형</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{uniqueRegions.length}</div>
                  <div className="text-sm text-muted-foreground">지역</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {(
                      (combinedData.reduce((sum, item) => sum + item.profitMargin, 0) / combinedData.length) *
                      100
                    ).toFixed(1)}
                    %
                  </div>
                  <div className="text-sm text-muted-foreground">평균 수익률</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FilterIcon className="h-5 w-5" />
            필터 설정
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>회사 유형</Label>
              <Select value={companyTypeFilter} onValueChange={setCompanyTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {uniqueCompanyTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>지역</Label>
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {uniqueRegions.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>수익성 등급</Label>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {uniqueGrades.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>연락처 검색</Label>
              <Input
                placeholder="이름으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comprehensive Report Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <EyeIcon className="h-5 w-5" />
            종합 보고서 테이블
          </CardTitle>
          <CardDescription>
            전체 연락처 종합 정보 (총 {filteredCombinedData.length}건 / {combinedData.length}건)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
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
                    .rows.slice(0, 50)
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
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      조건에 맞는 연락처가 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {table.getRowModel().rows.length > 50 && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              상위 50개 결과만 표시됩니다. 필터를 사용하여 결과를 좁혀보세요.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

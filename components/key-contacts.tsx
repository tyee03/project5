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
  UserCheckIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  FilterIcon,
  SearchIcon,
  PhoneIcon,
  MailIcon,
  BuildingIcon,
} from "lucide-react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartContainer } from "@/components/ui/chart"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
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
  IS_KEYMAN?: boolean
  IS_EXECUTIVE?: boolean
}

interface Customer {
  CUSTOMER_ID: number
  COMPANY_NAME: string
  COMPANY_TYPE: string
  REGION: string
}

interface ProfitAnalysis {
  CUSTOMER_ID: number
  TOTAL_SALES: number
  TOTAL_PROFIT: number
  PROFIT_MARGIN: number
  CUSTOMER_GRADE: string
}

interface Segment {
  CUSTOMER_ID: number
  HIGH_RISK_PROBABILITY: number
  PREDICTED_RISK_LEVEL: string
  SEGMENT_LABEL: string
}

interface KeyContactData {
  contactId: number
  contactName: string
  department: string
  position: string
  phone: string
  email: string
  customerId: number
  companyName: string
  companyType: string
  region: string
  totalSales: number
  totalProfit: number
  profitMargin: number
  customerGrade: string
  highRiskProbability: number
  predictedRiskLevel: string
  segmentLabel: string
  isKeyman: boolean
  isExecutive: boolean
}

interface ChartData {
  name: string
  profit: number
  margin: number
  sales: number
}

interface RiskChartData {
  name: string
  count: number
  riskLevel: string
}

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

const getRiskBadge = (riskLevel: string) => {
  switch (riskLevel?.toLowerCase()) {
    case "high":
      return <Badge variant="destructive">고위험</Badge>
    case "medium":
      return <Badge className="bg-yellow-500">중위험</Badge>
    case "low":
      return <Badge className="bg-green-500">저위험</Badge>
    default:
      return <Badge variant="outline">{riskLevel || "미분류"}</Badge>
  }
}

const getSegmentBadge = (segment: string) => {
  const colorMap: Record<string, string> = {
    성장군: "bg-green-100 text-green-800",
    안정군: "bg-blue-100 text-blue-800",
    고위험군: "bg-red-100 text-red-800",
    관찰군: "bg-yellow-100 text-yellow-800",
  }

  return (
    <Badge variant="outline" className={colorMap[segment] || "bg-gray-100 text-gray-800"}>
      {segment}
    </Badge>
  )
}

export default function KeyContacts() {
  const [loading, setLoading] = React.useState(true)

  // Filter states
  const [gradeFilter, setGradeFilter] = React.useState("all")
  const [riskFilter, setRiskFilter] = React.useState("all")
  const [segmentFilter, setSegmentFilter] = React.useState("all")
  const [searchTerm, setSearchTerm] = React.useState("")
  const [contactTypeFilter, setContactTypeFilter] = React.useState("all") // all, keyman, executive

  // Data states
  const [contacts, setContacts] = React.useState<Contact[]>([])
  const [customers, setCustomers] = React.useState<Customer[]>([])
  const [profitAnalysis, setProfitAnalysis] = React.useState<ProfitAnalysis[]>([])
  const [segments, setSegments] = React.useState<Segment[]>([])
  const [keyContactsData, setKeyContactsData] = React.useState<KeyContactData[]>([])

  // Chart data states
  const [profitabilityData, setProfitabilityData] = React.useState<ChartData[]>([])
  const [riskDistributionData, setRiskDistributionData] = React.useState<RiskChartData[]>([])

  // Fetch data
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        const [contactsRes, customersRes, profitRes, segmentsRes] = await Promise.all([
          fetch("/api/contacts").then((res) => res.json()),
          fetch("/api/customers").then((res) => res.json()),
          fetch("/api/customer_profit_analysis").then((res) => res.json()),
          fetch("/api/segments").then((res) => res.json()),
        ])

        const contactsData = contactsRes || []
        const customersData = customersRes || []
        const profitData = profitRes || []
        const segmentsData = segmentsRes || []

        setContacts(contactsData)
        setCustomers(customersData)
        setProfitAnalysis(profitData)
        setSegments(segmentsData)

        // Process key contacts data
        processKeyContactsData(contactsData, customersData, profitData, segmentsData)
      } catch (error) {
        console.error("Error fetching key contacts data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const processKeyContactsData = React.useCallback(
    (contactsData: Contact[], customersData: Customer[], profitData: ProfitAnalysis[], segmentsData: Segment[]) => {
      // Create maps for efficient lookup
      const customerMap = new Map()
      customersData.forEach((customer) => {
        customerMap.set(customer.CUSTOMER_ID, customer)
      })

      const profitMap = new Map()
      profitData.forEach((profit) => {
        profitMap.set(profit.CUSTOMER_ID, profit)
      })

      const segmentMap = new Map()
      segmentsData.forEach((segment) => {
        segmentMap.set(segment.CUSTOMER_ID, segment)
      })

      // Filter key contacts (IS_KEYMAN = true OR IS_EXECUTIVE = true)
      const keyContacts = contactsData.filter((contact) => contact.IS_KEYMAN === true || contact.IS_EXECUTIVE === true)

      // Combine data
      const combined = keyContacts.map((contact) => {
        const customer = customerMap.get(contact.CUSTOMER_ID)
        const profit = profitMap.get(contact.CUSTOMER_ID)
        const segment = segmentMap.get(contact.CUSTOMER_ID)

        return {
          contactId: contact.CONTACT_ID,
          contactName: contact.NAME,
          department: contact.DEPARTMENT || "미분류",
          position: contact.POSITION || "미분류",
          phone: contact.PHONE || "",
          email: contact.EMAIL || "",
          customerId: contact.CUSTOMER_ID,
          companyName: customer?.COMPANY_NAME || "Unknown",
          companyType: customer?.COMPANY_TYPE || "미분류",
          region: customer?.REGION || "미분류",
          totalSales: profit?.TOTAL_SALES || 0,
          totalProfit: profit?.TOTAL_PROFIT || 0,
          profitMargin: profit?.PROFIT_MARGIN || 0,
          customerGrade: profit?.CUSTOMER_GRADE || "미분류",
          highRiskProbability: segment?.HIGH_RISK_PROBABILITY || 0,
          predictedRiskLevel: segment?.PREDICTED_RISK_LEVEL || "미분류",
          segmentLabel: segment?.SEGMENT_LABEL || "미분류",
          isKeyman: contact.IS_KEYMAN === true,
          isExecutive: contact.IS_EXECUTIVE === true,
        }
      })

      setKeyContactsData(combined)
      processChartData(combined)
    },
    [],
  )

  const processChartData = React.useCallback((data: KeyContactData[]) => {
    // 1. Profitability data (top 10 by profit)
    const profitData = data
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .slice(0, 10)
      .map((item) => ({
        name: item.contactName.length > 8 ? item.contactName.substring(0, 8) + "..." : item.contactName,
        profit: item.totalProfit,
        margin: item.profitMargin * 100,
        sales: item.totalSales,
      }))

    setProfitabilityData(profitData)

    // 2. Risk distribution data
    const riskMap = new Map()
    data.forEach((item) => {
      const key = item.predictedRiskLevel
      riskMap.set(key, (riskMap.get(key) || 0) + 1)
    })

    const riskData = Array.from(riskMap.entries()).map(([riskLevel, count]) => ({
      name: riskLevel,
      count,
      riskLevel,
    }))

    setRiskDistributionData(riskData)
  }, [])

  // Re-process chart data when data changes
  React.useEffect(() => {
    if (keyContactsData.length > 0) {
      processChartData(keyContactsData)
    }
  }, [keyContactsData, processChartData])

  // Filter key contacts data for table
  const filteredKeyContactsData = React.useMemo(() => {
    return keyContactsData.filter((item) => {
      if (gradeFilter !== "all" && item.customerGrade !== gradeFilter) return false
      if (riskFilter !== "all" && item.predictedRiskLevel !== riskFilter) return false
      if (segmentFilter !== "all" && item.segmentLabel !== segmentFilter) return false
      if (contactTypeFilter === "keyman" && !item.isKeyman) return false
      if (contactTypeFilter === "executive" && !item.isExecutive) return false
      if (
        searchTerm &&
        !item.contactName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !item.department.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !item.position.toLowerCase().includes(searchTerm.toLowerCase())
      )
        return false
      return true
    })
  }, [keyContactsData, gradeFilter, riskFilter, segmentFilter, contactTypeFilter, searchTerm])

  // Get unique values for filters
  const uniqueGrades = React.useMemo(() => {
    return Array.from(new Set(keyContactsData.map((item) => item.customerGrade).filter(Boolean)))
  }, [keyContactsData])

  const uniqueRiskLevels = React.useMemo(() => {
    return Array.from(new Set(keyContactsData.map((item) => item.predictedRiskLevel).filter(Boolean)))
  }, [keyContactsData])

  const uniqueSegments = React.useMemo(() => {
    return Array.from(new Set(keyContactsData.map((item) => item.segmentLabel).filter(Boolean)))
  }, [keyContactsData])

  // Table columns
  const columns: ColumnDef<KeyContactData>[] = [
    {
      accessorKey: "contactName",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          이름
          <ArrowUpDownIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="link" className="p-0 h-auto font-medium text-left">
              <div className="flex items-center gap-2">
                {row.original.isExecutive && <UserCheckIcon className="h-4 w-4 text-purple-500" />}
                {row.original.isKeyman && <UserCheckIcon className="h-4 w-4 text-blue-500" />}
                {row.original.contactName}
              </div>
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[540px]">
            <SheetHeader>
              <SheetTitle>핵심 담당자 상세 정보</SheetTitle>
              <SheetDescription>{row.original.contactName}의 종합 분석</SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2">
                {row.original.isExecutive && (
                  <Badge className="bg-purple-500">
                    <UserCheckIcon className="h-3 w-3 mr-1" />
                    임원
                  </Badge>
                )}
                {row.original.isKeyman && (
                  <Badge className="bg-blue-500">
                    <UserCheckIcon className="h-3 w-3 mr-1" />
                    핵심담당자
                  </Badge>
                )}
              </div>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">전화번호</Label>
                  <p className="text-sm flex items-center gap-1">
                    <PhoneIcon className="h-3 w-3" />
                    {row.original.phone}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">이메일</Label>
                  <p className="text-sm flex items-center gap-1">
                    <MailIcon className="h-3 w-3" />
                    {row.original.email}
                  </p>
                </div>
              </div>
              <Separator />
              <div>
                <Label className="text-sm font-medium text-muted-foreground">소속 고객사</Label>
                <p className="text-sm font-medium flex items-center gap-1">
                  <BuildingIcon className="h-3 w-3" />
                  {row.original.companyName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {row.original.companyType} • {row.original.region}
                </p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">총 판매액</Label>
                  <p className="text-sm font-bold">₩{row.original.totalSales.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">총 수익</Label>
                  <p className="text-sm font-bold">₩{row.original.totalProfit.toLocaleString()}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">수익 마진</Label>
                  <p className="text-sm font-bold">{(row.original.profitMargin * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">고객 등급</Label>
                  <div className="mt-1">{getGradeBadge(row.original.customerGrade)}</div>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">위험 확률</Label>
                  <p className="text-sm font-bold">{(row.original.highRiskProbability * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">위험 수준</Label>
                  <div className="mt-1">{getRiskBadge(row.original.predictedRiskLevel)}</div>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">세그먼트</Label>
                <div className="mt-1">{getSegmentBadge(row.original.segmentLabel)}</div>
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
      accessorKey: "phone",
      header: "전화번호",
      cell: ({ row }) => <div className="text-center font-mono text-sm">{row.original.phone}</div>,
    },
    {
      accessorKey: "customerGrade",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          고객등급
          <ArrowUpDownIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-center">{getGradeBadge(row.original.customerGrade)}</div>,
    },
    {
      accessorKey: "totalProfit",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          수익
          <ArrowUpDownIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-center font-medium">₩{row.original.totalProfit.toLocaleString()}</div>,
    },
    {
      accessorKey: "profitMargin",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          마진율
          <ArrowUpDownIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-center font-medium">{(row.original.profitMargin * 100).toFixed(1)}%</div>,
    },
    {
      accessorKey: "predictedRiskLevel",
      header: "리스크",
      cell: ({ row }) => <div className="text-center">{getRiskBadge(row.original.predictedRiskLevel)}</div>,
    },
    {
      accessorKey: "segmentLabel",
      header: "세그먼트",
      cell: ({ row }) => <div className="text-center">{getSegmentBadge(row.original.segmentLabel)}</div>,
    },
  ]

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  const table = useReactTable({
    data: filteredKeyContactsData,
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
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-muted rounded animate-pulse" />
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
          <h2 className="text-2xl font-bold">Key Contacts</h2>
          <p className="text-muted-foreground">핵심 담당자 및 임원진 분석</p>
        </div>
        <div className="text-sm text-muted-foreground">총 {keyContactsData.length}명의 핵심 담당자</div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profitability Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUpIcon className="h-5 w-5" />
              핵심 담당자 수익성 분석
            </CardTitle>
            <CardDescription>상위 10명의 수익 및 마진율 현황</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                profit: { label: "수익", color: "hsl(var(--chart-1))" },
                margin: { label: "마진율", color: "hsl(var(--chart-2))" },
              }}
              className="h-64 w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitabilityData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    fontSize={10}
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis fontSize={10} tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === "profit") return [`₩${Number(value).toLocaleString()}`, "수익"]
                      if (name === "margin") return [`${Number(value).toFixed(1)}%`, "마진율"]
                      return [value, name]
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="profit" fill="hsl(var(--chart-1))" name="수익" />
                  <Bar dataKey="margin" fill="hsl(var(--chart-2))" name="마진율" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Risk & Segment Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="h-5 w-5" />
              위험도 & 세그먼트 분포
            </CardTitle>
            <CardDescription>핵심 담당자별 위험 수준 분포</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: { label: "담당자 수", color: "hsl(var(--chart-3))" },
              }}
              className="h-64 w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskDistributionData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={10} tick={{ fontSize: 10 }} />
                  <YAxis fontSize={10} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    fill={(entry) => {
                      switch (entry?.riskLevel?.toLowerCase()) {
                        case "high":
                          return "#ef4444"
                        case "medium":
                          return "#f59e0b"
                        case "low":
                          return "#10b981"
                        default:
                          return "hsl(var(--chart-3))"
                      }
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>담당자 유형</Label>
              <Select value={contactTypeFilter} onValueChange={setContactTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="executive">임원</SelectItem>
                  <SelectItem value="keyman">핵심담당자</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>고객 등급</Label>
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
              <Label>위험 수준</Label>
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {uniqueRiskLevels.map((risk) => (
                    <SelectItem key={risk} value={risk}>
                      {risk}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>세그먼트</Label>
              <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {uniqueSegments.map((segment) => (
                    <SelectItem key={segment} value={segment}>
                      {segment}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>검색</Label>
              <div className="relative">
                <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="이름, 부서, 직위..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Contacts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheckIcon className="h-5 w-5" />
            핵심 담당자 종합 리포트
          </CardTitle>
          <CardDescription>
            필터링된 결과: {filteredKeyContactsData.length}명 / 전체 {keyContactsData.length}명
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
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      조건에 맞는 핵심 담당자가 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

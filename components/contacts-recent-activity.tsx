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
  CalendarIcon,
  PhoneIcon,
  MailIcon,
  UserIcon,
  ActivityIcon,
  TrendingUpIcon,
  FilterIcon,
  EyeIcon,
} from "lucide-react"
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Tooltip,
} from "recharts"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartContainer } from "@/components/ui/chart"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"

// Types
interface SalesActivity {
  ACTIVITY_ID: number
  CONTACT_ID: number
  ACTIVITY_TYPE: string
  ACTIVITY_DATE: string
  ACTIVITY_DETAILS: string
  OUTCOME: string
}

interface Engagement {
  ENGAGEMENT_ID: number
  CONTACT_ID: number
  NEWSLETTER_OPENS: number
  SITE_VISITS: number
  SURVEY_RESPONSE: string | null
  LAST_ACTIVE_DATE: string
}

interface Contact {
  CONTACT_ID: number
  NAME: string
  EMAIL: string
  POSITION: string
  DEPARTMENT: string
}

interface CombinedActivity {
  contactId: number
  contactName: string
  activityType: string
  activityDate: string
  activityDetails: string
  outcome: string
  newsletterOpens: number
  siteVisits: number
  surveyResponse: string | null
  lastActiveDate: string
}

interface ActivityTypeData {
  type: string
  count: number
  color: string
}

interface EngagementData {
  name: string
  opens: number
  visits: number
}

interface ActivityTrendData {
  date: string
  count: number
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

const getActivityIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case "전화":
    case "phone":
      return <PhoneIcon className="h-4 w-4" />
    case "이메일":
    case "email":
      return <MailIcon className="h-4 w-4" />
    case "방문":
    case "visit":
      return <UserIcon className="h-4 w-4" />
    default:
      return <ActivityIcon className="h-4 w-4" />
  }
}

const getOutcomeBadge = (outcome: string) => {
  switch (outcome.toLowerCase()) {
    case "성공":
    case "success":
      return <Badge variant="default">성공</Badge>
    case "미응답":
    case "no response":
      return <Badge variant="destructive">미응답</Badge>
    case "진행중":
    case "in progress":
      return <Badge variant="secondary">진행중</Badge>
    default:
      return <Badge variant="outline">{outcome}</Badge>
  }
}

export default function ContactsRecentActivity() {
  const [loading, setLoading] = React.useState(true)
  const [dateFilter, setDateFilter] = React.useState("30") // days
  const [activityTypeFilter, setActivityTypeFilter] = React.useState("all")
  const [responseFilter, setResponseFilter] = React.useState("all")

  // Data states
  const [salesActivities, setSalesActivities] = React.useState<SalesActivity[]>([])
  const [engagements, setEngagements] = React.useState<Engagement[]>([])
  const [contacts, setContacts] = React.useState<Contact[]>([])
  const [combinedActivities, setCombinedActivities] = React.useState<CombinedActivity[]>([])

  // Chart data states
  const [activityTypeData, setActivityTypeData] = React.useState<ActivityTypeData[]>([])
  const [engagementData, setEngagementData] = React.useState<EngagementData[]>([])
  const [activityTrendData, setActivityTrendData] = React.useState<ActivityTrendData[]>([])

  // Fetch data
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        const [activitiesRes, engagementsRes, contactsRes] = await Promise.all([
          fetch("/api/sales_activities").then((res) => res.json()),
          fetch("/api/engagements").then((res) => res.json()),
          fetch("/api/contacts").then((res) => res.json()),
        ])

        const activities = activitiesRes || []
        const engagementsData = engagementsRes || []
        const contactsData = contactsRes || []

        setSalesActivities(activities)
        setEngagements(engagementsData)
        setContacts(contactsData)

        // Process data
        processData(activities, engagementsData, contactsData)
      } catch (error) {
        console.error("Error fetching recent activity data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const processData = React.useCallback(
    (activities: SalesActivity[], engagementsData: Engagement[], contactsData: Contact[]) => {
      // Create contact map
      const contactMap = new Map()
      contactsData.forEach((contact) => {
        contactMap.set(contact.CONTACT_ID, contact)
      })

      // Create engagement map
      const engagementMap = new Map()
      engagementsData.forEach((engagement) => {
        engagementMap.set(engagement.CONTACT_ID, engagement)
      })

      // Filter activities by date
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - Number.parseInt(dateFilter))

      const filteredActivities = activities.filter((activity) => {
        const activityDate = new Date(activity.ACTIVITY_DATE)
        return activityDate >= cutoffDate
      })

      // Process activity type data
      const typeCount = new Map()
      filteredActivities.forEach((activity) => {
        const type = activity.ACTIVITY_TYPE || "기타"
        typeCount.set(type, (typeCount.get(type) || 0) + 1)
      })

      const activityTypes = Array.from(typeCount.entries()).map(([type, count], index) => ({
        type,
        count,
        color: COLORS[index % COLORS.length],
      }))

      setActivityTypeData(activityTypes)

      // Process engagement data
      const engagementStats = engagementsData
        .filter((engagement) => contactMap.has(engagement.CONTACT_ID))
        .slice(0, 10)
        .map((engagement) => {
          const contact = contactMap.get(engagement.CONTACT_ID)
          return {
            name: contact?.NAME || "Unknown",
            opens: engagement.NEWSLETTER_OPENS || 0,
            visits: engagement.SITE_VISITS || 0,
          }
        })

      setEngagementData(engagementStats)

      // Process activity trend data (last 7 days)
      const trendMap = new Map()
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateKey = date.toISOString().split("T")[0]
        trendMap.set(dateKey, 0)
      }

      filteredActivities.forEach((activity) => {
        const dateKey = activity.ACTIVITY_DATE.split("T")[0]
        if (trendMap.has(dateKey)) {
          trendMap.set(dateKey, trendMap.get(dateKey) + 1)
        }
      })

      const trendData = Array.from(trendMap.entries()).map(([date, count]) => ({
        date: new Date(date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
        count,
      }))

      setActivityTrendData(trendData)

      // Combine activities with engagements
      const combined = filteredActivities
        .map((activity) => {
          const contact = contactMap.get(activity.CONTACT_ID)
          const engagement = engagementMap.get(activity.CONTACT_ID)

          if (!contact) return null

          return {
            contactId: activity.CONTACT_ID,
            contactName: contact.NAME,
            activityType: activity.ACTIVITY_TYPE || "기타",
            activityDate: activity.ACTIVITY_DATE,
            activityDetails: activity.ACTIVITY_DETAILS || "",
            outcome: activity.OUTCOME || "진행중",
            newsletterOpens: engagement?.NEWSLETTER_OPENS || 0,
            siteVisits: engagement?.SITE_VISITS || 0,
            surveyResponse: engagement?.SURVEY_RESPONSE || null,
            lastActiveDate: engagement?.LAST_ACTIVE_DATE || activity.ACTIVITY_DATE,
          }
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b!.activityDate).getTime() - new Date(a!.activityDate).getTime())

      setCombinedActivities(combined as CombinedActivity[])
    },
    [dateFilter],
  )

  // Re-process data when filters change
  React.useEffect(() => {
    if (salesActivities.length > 0) {
      processData(salesActivities, engagements, contacts)
    }
  }, [dateFilter, processData, salesActivities, engagements, contacts])

  // Filter combined activities
  const filteredCombinedActivities = React.useMemo(() => {
    return combinedActivities.filter((activity) => {
      if (activityTypeFilter !== "all" && activity.activityType !== activityTypeFilter) {
        return false
      }
      if (responseFilter !== "all") {
        if (responseFilter === "responded" && !activity.surveyResponse) {
          return false
        }
        if (responseFilter === "not_responded" && activity.surveyResponse) {
          return false
        }
      }
      return true
    })
  }, [combinedActivities, activityTypeFilter, responseFilter])

  // Get unique activity types for filter
  const activityTypes = React.useMemo(() => {
    const types = new Set(salesActivities.map((a) => a.ACTIVITY_TYPE).filter(Boolean))
    return Array.from(types)
  }, [salesActivities])

  // Table columns
  const columns: ColumnDef<CombinedActivity>[] = [
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
              {row.original.contactName}
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>연락처 상세 정보</SheetTitle>
              <SheetDescription>{row.original.contactName}의 활동 및 참여 현황</SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">연락처 ID</Label>
                  <p className="text-sm">{row.original.contactId}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">최근 활동</Label>
                  <p className="text-sm">{new Date(row.original.activityDate).toLocaleDateString("ko-KR")}</p>
                </div>
              </div>
              <Separator />
              <div>
                <Label className="text-sm font-medium text-muted-foreground">활동 내용</Label>
                <p className="text-sm mt-1">{row.original.activityDetails}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">결과</Label>
                <div className="mt-1">{getOutcomeBadge(row.original.outcome)}</div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">뉴스레터 열람</Label>
                  <p className="text-sm font-bold">{row.original.newsletterOpens}회</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">사이트 방문</Label>
                  <p className="text-sm font-bold">{row.original.siteVisits}회</p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">설문 응답</Label>
                <p className="text-sm">{row.original.surveyResponse || "미응답"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">최종 접속일</Label>
                <p className="text-sm">{new Date(row.original.lastActiveDate).toLocaleDateString("ko-KR")}</p>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      ),
    },
    {
      accessorKey: "activityType",
      header: "활동 유형",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {getActivityIcon(row.original.activityType)}
          <span>{row.original.activityType}</span>
        </div>
      ),
    },
    {
      accessorKey: "activityDate",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          활동일자
          <ArrowUpDownIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-center">{new Date(row.original.activityDate).toLocaleDateString("ko-KR")}</div>
      ),
    },
    {
      accessorKey: "engagement",
      header: "참여지표",
      cell: ({ row }) => (
        <div className="text-center">
          <div className="text-sm">
            📧 {row.original.newsletterOpens} / 🌐 {row.original.siteVisits}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "outcome",
      header: "결과",
      cell: ({ row }) => <div className="text-center">{getOutcomeBadge(row.original.outcome)}</div>,
    },
    {
      accessorKey: "lastActiveDate",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          최종접속일
          <ArrowUpDownIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-center">{new Date(row.original.lastActiveDate).toLocaleDateString("ko-KR")}</div>
      ),
    },
  ]

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  const table = useReactTable({
    data: filteredCombinedActivities,
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FilterIcon className="h-5 w-5" />
            필터 설정
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Label>기간:</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">최근 7일</SelectItem>
                  <SelectItem value="30">최근 30일</SelectItem>
                  <SelectItem value="90">최근 90일</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label>활동 유형:</Label>
              <Select value={activityTypeFilter} onValueChange={setActivityTypeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {activityTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label>응답 여부:</Label>
              <Select value={responseFilter} onValueChange={setResponseFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="responded">응답함</SelectItem>
                  <SelectItem value="not_responded">미응답</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ActivityIcon className="h-5 w-5" />
              활동 유형별 분포
            </CardTitle>
            <CardDescription>최근 {dateFilter}일간 활동 유형 비중</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: { label: "활동 수", color: "hsl(var(--chart-1))" },
              }}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activityTypeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
                  >
                    {activityTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Engagement Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUpIcon className="h-5 w-5" />
              고객 참여도 요약
            </CardTitle>
            <CardDescription>뉴스레터 열람 및 사이트 방문 현황</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                opens: { label: "뉴스레터 열람", color: "hsl(var(--chart-1))" },
                visits: { label: "사이트 방문", color: "hsl(var(--chart-2))" },
              }}
              className="h-48 w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={engagementData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    fontSize={10}
                    tick={{ fontSize: 10 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis fontSize={10} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="opens" fill="hsl(var(--chart-1))" name="뉴스레터 열람" />
                  <Bar dataKey="visits" fill="hsl(var(--chart-2))" name="사이트 방문" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Activity Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              활동 발생 추이
            </CardTitle>
            <CardDescription>최근 7일간 일별 활동 현황</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: { label: "활동 수", color: "hsl(var(--chart-3))" },
              }}
              className="h-48 w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityTrendData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={10} tick={{ fontSize: 10 }} height={40} />
                  <YAxis fontSize={10} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--chart-3))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--chart-3))", r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Combined Activities Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <EyeIcon className="h-5 w-5" />
            최근 활동 및 참여도 통합 현황
          </CardTitle>
          <CardDescription>
            영업 활동과 고객 참여도를 통합한 종합 현황 (총 {filteredCombinedActivities.length}건)
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
                    .rows.slice(0, 20)
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
                      활동 데이터가 없습니다.
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

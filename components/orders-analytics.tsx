"use client"

import * as React from "react"
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Target, BarChart3, Calendar, Filter } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Area, AreaChart } from "recharts"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { useRouter } from "next/navigation"

// 타입 정의
interface KPIData {
  totalSales: number
  totalRevenue: number
  avgMarginRate: number
  totalOrders: number
  // 전월 대비 증감률
  salesGrowth: number
  revenueGrowth: number
  marginGrowth: number
  ordersGrowth: number
}

interface CategoryData {
  category: string
  total_amount: number
  total_quantity: number
}

interface ForecastData {
  customer_id: number
  predicted_date: string
  predicted_quantity: number
  company_name?: string
}

interface OrderData {
  ORDER_ID: number
  CONTACT_ID: number
  PRODUCT_ID: string
  ORDER_DATE: string
  QUANTITY: number
  AMOUNT: number
  COST: number
  MARGIN_RATE: number
  REVENUE: number
  PAYMENT_STATUS: string
  DELIVERY_STATUS: string
}

export default function OrdersAnalytics() {
  const router = useRouter()
  const [kpiData, setKpiData] = React.useState<KPIData>({
    totalSales: 0,
    totalRevenue: 0,
    avgMarginRate: 0,
    totalOrders: 0,
    salesGrowth: 0,
    revenueGrowth: 0,
    marginGrowth: 0,
    ordersGrowth: 0,
  })
  const [categoryData, setCategoryData] = React.useState<CategoryData[]>([])
  const [forecastData, setForecastData] = React.useState<ForecastData[]>([])
  const [loading, setLoading] = React.useState(true)

  // 필터 상태
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>()
  const [productFilter, setProductFilter] = React.useState("")
  const [customerFilter, setCustomerFilter] = React.useState("")
  const [products, setProducts] = React.useState<any[]>([])
  const [customers, setCustomers] = React.useState<any[]>([])

  // 월별 추이 데이터
  const [monthlyTrend, setMonthlyTrend] = React.useState<any[]>([])

  // 전월 대비 증감률 계산 함수
  const calculateGrowth = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  // 데이터 필터링 함수
  const filterOrdersByDate = (orders: OrderData[], dateRange?: DateRange) => {
    if (!dateRange?.from) return orders

    return orders.filter((order) => {
      const orderDate = new Date(order.ORDER_DATE)
      const fromDate = dateRange.from!
      const toDate = dateRange.to || dateRange.from

      return orderDate >= fromDate && orderDate <= toDate
    })
  }

  // 데이터 fetch
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // 1. Orders 데이터
        const ordersRes = await fetch("/api/orders")
        const ordersData: OrderData[] = await ordersRes.json()

        // 2. Products 데이터
        const productsRes = await fetch("/api/products")
        const productsData = await productsRes.json()
        setProducts(productsData || [])

        // 3. Customers 데이터
        const customersRes = await fetch("/api/customers")
        const customersData = await customersRes.json()
        setCustomers(customersData || [])

        if (ordersData && Array.isArray(ordersData)) {
          // 필터링된 주문 데이터
          const filteredOrders = filterOrdersByDate(ordersData, dateRange)

          // 제품 필터링
          const productFilteredOrders = productFilter
            ? filteredOrders.filter((order) => order.PRODUCT_ID?.includes(productFilter))
            : filteredOrders

          // 현재 월과 이전 월 데이터 분리
          const now = new Date()
          const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

          const currentMonthOrders = productFilteredOrders.filter((order) => new Date(order.ORDER_DATE) >= currentMonth)
          const previousMonthOrders = productFilteredOrders.filter((order) => {
            const orderDate = new Date(order.ORDER_DATE)
            return orderDate >= previousMonth && orderDate <= previousMonthEnd
          })

          // 현재 월 KPI 계산
          const totalSales = currentMonthOrders.reduce((sum, order) => sum + (order.AMOUNT || 0), 0)
          const totalRevenue = currentMonthOrders.reduce((sum, order) => sum + (order.REVENUE || 0), 0)
          const avgMarginRate =
            currentMonthOrders.length > 0
              ? currentMonthOrders.reduce((sum, order) => sum + (order.MARGIN_RATE || 0), 0) / currentMonthOrders.length
              : 0
          const totalOrders = currentMonthOrders.length

          // 이전 월 KPI 계산
          const prevTotalSales = previousMonthOrders.reduce((sum, order) => sum + (order.AMOUNT || 0), 0)
          const prevTotalRevenue = previousMonthOrders.reduce((sum, order) => sum + (order.REVENUE || 0), 0)
          const prevAvgMarginRate =
            previousMonthOrders.length > 0
              ? previousMonthOrders.reduce((sum, order) => sum + (order.MARGIN_RATE || 0), 0) /
                previousMonthOrders.length
              : 0
          const prevTotalOrders = previousMonthOrders.length

          // 증감률 계산
          const salesGrowth = calculateGrowth(totalSales, prevTotalSales)
          const revenueGrowth = calculateGrowth(totalRevenue, prevTotalRevenue)
          const marginGrowth = calculateGrowth(avgMarginRate, prevAvgMarginRate)
          const ordersGrowth = calculateGrowth(totalOrders, prevTotalOrders)

          setKpiData({
            totalSales,
            totalRevenue,
            avgMarginRate,
            totalOrders,
            salesGrowth,
            revenueGrowth,
            marginGrowth,
            ordersGrowth,
          })

          // 월별 추이 데이터 생성 (최근 6개월)
          const monthlyData = []
          for (let i = 5; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)

            const monthOrders = productFilteredOrders.filter((order) => {
              const orderDate = new Date(order.ORDER_DATE)
              return orderDate >= monthStart && orderDate <= monthEnd
            })

            monthlyData.push({
              month: format(monthStart, "MMM yyyy"),
              sales: monthOrders.reduce((sum, order) => sum + (order.AMOUNT || 0), 0),
              revenue: monthOrders.reduce((sum, order) => sum + (order.REVENUE || 0), 0),
              orders: monthOrders.length,
            })
          }
          setMonthlyTrend(monthlyData)
        }

        // Orders와 Products 조인하여 카테고리별 집계
        if (ordersData && productsData && Array.isArray(ordersData) && Array.isArray(productsData)) {
          const filteredOrders = filterOrdersByDate(ordersData, dateRange)
          const categoryMap = new Map<string, { total_amount: number; total_quantity: number }>()

          filteredOrders.forEach((order) => {
            const product = productsData.find((p) => p.PRODUCT_ID === order.PRODUCT_ID)
            if (product && product.CATEGORY) {
              const category = product.CATEGORY
              const existing = categoryMap.get(category) || { total_amount: 0, total_quantity: 0 }
              categoryMap.set(category, {
                total_amount: existing.total_amount + (order.AMOUNT || 0),
                total_quantity: existing.total_quantity + (order.QUANTITY || 0),
              })
            }
          })

          const categoryResult = Array.from(categoryMap.entries()).map(([category, data]) => ({
            category,
            ...data,
          }))
          setCategoryData(categoryResult)
        }

        // Customer Order Forecast 데이터
        const forecastRes = await fetch("/api/customer_order_forecast")
        const forecastRawData = await forecastRes.json()

        if (forecastRawData && customersData && Array.isArray(forecastRawData) && Array.isArray(customersData)) {
          let enrichedForecast = forecastRawData
            .map((forecast) => {
              const customer = customersData.find((c) => c.CUSTOMER_ID === forecast.CUSTOMER_ID)
              return {
                ...forecast,
                company_name: customer?.COMPANY_NAME || `Customer ${forecast.CUSTOMER_ID}`,
              }
            })
            .filter((f) => new Date(f.PREDICTED_DATE) >= new Date())

          // 고객 필터링
          if (customerFilter) {
            enrichedForecast = enrichedForecast.filter((f) =>
              f.company_name?.toLowerCase().includes(customerFilter.toLowerCase()),
            )
          }

          enrichedForecast = enrichedForecast
            .sort((a, b) => new Date(a.PREDICTED_DATE).getTime() - new Date(b.PREDICTED_DATE).getTime())
            .slice(0, 10)

          setForecastData(enrichedForecast)
        }
      } catch (error) {
        console.error("Error fetching analytics data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [dateRange, productFilter, customerFilter])

  // 드릴다운 함수
  const handleCustomerDrillDown = (customerId: number) => {
    router.push(`/orders?customer=${customerId}`)
  }

  // 차트 설정
  const categoryChartConfig = React.useMemo(() => {
    const config: ChartConfig = {
      total_amount: { label: "Sales Amount", color: "hsl(var(--chart-1))" },
      total_quantity: { label: "Quantity", color: "hsl(var(--chart-2))" },
    }
    return config
  }, [])

  const trendChartConfig: ChartConfig = {
    sales: { label: "Sales", color: "hsl(var(--chart-1))" },
    revenue: { label: "Revenue", color: "hsl(var(--chart-2))" },
  }

  const pieChartData = categoryData.map((item, index) => ({
    category: item.category,
    value: item.total_amount,
    fill: `hsl(var(--chart-${(index % 5) + 1}))`,
  }))

  const forecastChartData = forecastData.map((item) => ({
    customer: item.company_name?.substring(0, 10) + "..." || `Customer ${item.customer_id}`,
    quantity: item.predicted_quantity,
    date: new Date(item.predicted_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    customerId: item.customer_id,
  }))

  if (loading || !kpiData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading analytics data...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 헤더 및 필터 섹션 */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Orders Analytics</h2>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-fit">
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 필터 입력 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div htmlFor="product-filter">Filter by Product ID</div>
            <Input
              id="product-filter"
              placeholder="Enter product ID..."
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div htmlFor="customer-filter">Filter by Customer</div>
            <Input
              id="customer-filter"
              placeholder="Enter customer name..."
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 1. KPI 카드 섹션 (전월 대비 증감률 포함) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₩{(kpiData.totalSales || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              {(kpiData.salesGrowth || 0) >= 0 ? (
                <TrendingUp className="inline h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="inline h-3 w-3 mr-1 text-red-500" />
              )}
              <span className={(kpiData.salesGrowth || 0) >= 0 ? "text-green-500" : "text-red-500"}>
                {(kpiData.salesGrowth || 0).toFixed(1)}%
              </span>
              <span className="ml-1">from last month</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₩{(kpiData.totalRevenue || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              {(kpiData.revenueGrowth || 0) >= 0 ? (
                <TrendingUp className="inline h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="inline h-3 w-3 mr-1 text-red-500" />
              )}
              <span className={(kpiData.revenueGrowth || 0) >= 0 ? "text-green-500" : "text-red-500"}>
                {(kpiData.revenueGrowth || 0).toFixed(1)}%
              </span>
              <span className="ml-1">from last month</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Margin Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{((kpiData.avgMarginRate || 0) * 100).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground flex items-center">
              {(kpiData.marginGrowth || 0) >= 0 ? (
                <TrendingUp className="inline h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="inline h-3 w-3 mr-1 text-red-500" />
              )}
              <span className={(kpiData.marginGrowth || 0) >= 0 ? "text-green-500" : "text-red-500"}>
                {(kpiData.marginGrowth || 0).toFixed(1)}%
              </span>
              <span className="ml-1">from last month</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(kpiData.totalOrders || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              {(kpiData.ordersGrowth || 0) >= 0 ? (
                <TrendingUp className="inline h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="inline h-3 w-3 mr-1 text-red-500" />
              )}
              <span className={(kpiData.ordersGrowth || 0) >= 0 ? "text-green-500" : "text-red-500"}>
                {(kpiData.ordersGrowth || 0).toFixed(1)}%
              </span>
              <span className="ml-1">from last month</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 월별 추이 차트 */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Trend</CardTitle>
          <CardDescription>Sales and revenue trend over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={trendChartConfig}>
            <AreaChart data={monthlyTrend} margin={{ top: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="sales"
                stackId="1"
                stroke="hsl(var(--chart-1))"
                fill="hsl(var(--chart-1))"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stackId="2"
                stroke="hsl(var(--chart-2))"
                fill="hsl(var(--chart-2))"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* 2. 제품 카테고리별 판매 현황 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 파이 차트 */}
        <Card>
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
            <CardDescription>Revenue distribution across product categories</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={categoryChartConfig} className="mx-auto aspect-square max-h-[300px]">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie data={pieChartData} dataKey="value" nameKey="category" innerRadius={60} strokeWidth={5}>
                  <div
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        const total = pieChartData.reduce((sum, item) => sum + item.value, 0)
                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                              {(total / 1_000_000).toFixed(1)}M
                            </tspan>
                            <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 20} className="fill-muted-foreground">
                              Total Sales
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
        </Card>

        {/* 막대 차트 */}
        <Card>
          <CardHeader>
            <CardTitle>Quantity by Category</CardTitle>
            <CardDescription>Units sold per product category</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={categoryChartConfig}>
              <BarChart data={categoryData} margin={{ top: 20 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="category"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.substring(0, 8)}
                />
                <YAxis />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey="total_quantity" fill="hsl(var(--chart-2))" radius={8} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* 3. 고객별 예측 주문 현황 (드릴다운 포함) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 예측 차트 */}
        <Card>
          <CardHeader>
            <CardTitle>Predicted Orders</CardTitle>
            <CardDescription>Upcoming order forecasts by customer (click to drill down)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ quantity: { label: "Predicted Quantity", color: "hsl(var(--chart-3))" } }}>
              <BarChart data={forecastChartData} margin={{ top: 20 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="customer"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey="quantity" fill="hsl(var(--chart-3))" radius={8} className="cursor-pointer" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* 예측 테이블 (드릴다운 포함) */}
        <Card>
          <CardHeader>
            <CardTitle>Forecast Details</CardTitle>
            <CardDescription>Detailed prediction timeline (click customer to view orders)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forecastData.slice(0, 8).map((forecast, index) => (
                  <TableRow key={index} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">
                      {forecast.company_name?.substring(0, 15)}
                      {(forecast.company_name?.length || 0) > 15 ? "..." : ""}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {new Date(forecast.predicted_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {(forecast.predicted_quantity || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleCustomerDrillDown(forecast.customer_id)}>
                        View Orders
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">
              View All Forecasts
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

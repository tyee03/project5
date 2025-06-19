"use client"

import * as React from "react"
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDownIcon, TrophyIcon, PackageIcon, TrendingUpIcon, UsersIcon, BarChart3Icon } from "lucide-react"
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

// Types
interface ProductPerformance {
  productId: string
  productName: string
  category: string
  totalSales: number
  totalQuantity: number
  totalRevenue: number
  averageMargin: number
}

interface CustomerSummary {
  customerId: number
  companyName: string
  orderCount: number
  totalSales: number
  averageMargin: number
}

interface TopProduct {
  productId: string
  productName: string
  value: number
  rank: number
}

interface ForecastComparison {
  month: string
  predicted: number
  actual: number
  difference: number
}

interface ProductDetail {
  productId: string
  productName: string
  model: string
  size: string
  listPrice: number
  salePrice: number
  category: string
  notes: string
}

export default function OrdersReports() {
  const [loading, setLoading] = React.useState(true)
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all")

  // Data states
  const [productPerformance, setProductPerformance] = React.useState<ProductPerformance[]>([])
  const [customerSummary, setCustomerSummary] = React.useState<CustomerSummary[]>([])
  const [topPopularProducts, setTopPopularProducts] = React.useState<TopProduct[]>([])
  const [topProfitableProducts, setTopProfitableProducts] = React.useState<TopProduct[]>([])
  const [forecastComparison, setForecastComparison] = React.useState<ForecastComparison[]>([])
  const [productDetails, setProductDetails] = React.useState<ProductDetail[]>([])

  // Fetch all data
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch orders, products, customers, contacts, forecasts
        const [ordersRes, productsRes, customersRes, contactsRes, forecastRes] = await Promise.all([
          fetch("/api/orders").then((res) => res.json()),
          fetch("/api/products").then((res) => res.json()),
          fetch("/api/customers").then((res) => res.json()),
          fetch("/api/contacts").then((res) => res.json()),
          fetch("/api/customer_order_forecast").then((res) => res.json()),
        ])

        const orders = ordersRes.data || []
        const products = productsRes.data || []
        const customers = customersRes.data || []
        const contacts = contactsRes.data || []
        const forecasts = forecastRes.data || []

        // Process product performance data
        const productMap = new Map()
        products.forEach((product: any) => {
          productMap.set(product.PRODUCT_ID, product)
        })

        const productStats = new Map()
        orders.forEach((order: any) => {
          const productId = order.PRODUCT_ID
          if (!productId || !productMap.has(productId)) return

          const product = productMap.get(productId)
          const key = productId

          if (!productStats.has(key)) {
            productStats.set(key, {
              productId,
              productName: product.PRODUCT_NAME || productId,
              category: product.CATEGORY || "Unknown",
              totalSales: 0,
              totalQuantity: 0,
              totalRevenue: 0,
              marginSum: 0,
              orderCount: 0,
            })
          }

          const stats = productStats.get(key)
          stats.totalSales += order.AMOUNT || 0
          stats.totalQuantity += order.QUANTITY || 0
          stats.totalRevenue += (order.AMOUNT || 0) - (order.COST || 0)
          stats.marginSum += order.MARGIN_RATE || 0
          stats.orderCount += 1
        })

        const productPerformanceData = Array.from(productStats.values()).map((stats: any) => ({
          ...stats,
          averageMargin: stats.orderCount > 0 ? stats.marginSum / stats.orderCount : 0,
        }))

        setProductPerformance(productPerformanceData)

        // Process customer summary data
        const customerMap = new Map()
        customers.forEach((customer: any) => {
          customerMap.set(customer.CUSTOMER_ID, customer)
        })

        const contactMap = new Map()
        contacts.forEach((contact: any) => {
          contactMap.set(contact.CONTACT_ID, contact)
        })

        const customerStats = new Map()
        orders.forEach((order: any) => {
          const contact = contactMap.get(order.CONTACT_ID)
          if (!contact) return

          const customer = customerMap.get(contact.CUSTOMER_ID)
          if (!customer) return

          const customerId = customer.CUSTOMER_ID

          if (!customerStats.has(customerId)) {
            customerStats.set(customerId, {
              customerId,
              companyName: customer.COMPANY_NAME || "Unknown",
              orderCount: 0,
              totalSales: 0,
              marginSum: 0,
              orderCountForMargin: 0,
            })
          }

          const stats = customerStats.get(customerId)
          stats.orderCount += 1
          stats.totalSales += order.AMOUNT || 0
          stats.marginSum += order.MARGIN_RATE || 0
          stats.orderCountForMargin += 1
        })

        const customerSummaryData = Array.from(customerStats.values()).map((stats: any) => ({
          customerId: stats.customerId,
          companyName: stats.companyName,
          orderCount: stats.orderCount,
          totalSales: stats.totalSales,
          averageMargin: stats.orderCountForMargin > 0 ? stats.marginSum / stats.orderCountForMargin : 0,
        }))

        setCustomerSummary(customerSummaryData)

        // Process top products
        const topByQuantity = productPerformanceData
          .sort((a, b) => b.totalQuantity - a.totalQuantity)
          .slice(0, 10)
          .map((product, index) => ({
            productId: product.productId,
            productName: product.productName,
            value: product.totalQuantity,
            rank: index + 1,
          }))

        const topByRevenue = productPerformanceData
          .sort((a, b) => b.totalRevenue - a.totalRevenue)
          .slice(0, 10)
          .map((product, index) => ({
            productId: product.productId,
            productName: product.productName,
            value: product.totalRevenue,
            rank: index + 1,
          }))

        setTopPopularProducts(topByQuantity)
        setTopProfitableProducts(topByRevenue)

        // Process forecast comparison
        const monthlyActual = new Map()
        orders.forEach((order: any) => {
          const date = new Date(order.ORDER_DATE)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

          if (!monthlyActual.has(monthKey)) {
            monthlyActual.set(monthKey, 0)
          }
          monthlyActual.set(monthKey, monthlyActual.get(monthKey) + (order.QUANTITY || 0))
        })

        const monthlyForecast = new Map()
        forecasts.forEach((forecast: any) => {
          const date = new Date(forecast.PREDICTED_DATE)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

          if (!monthlyForecast.has(monthKey)) {
            monthlyForecast.set(monthKey, 0)
          }
          monthlyForecast.set(monthKey, monthlyForecast.get(monthKey) + (forecast.PREDICTED_QUANTITY || 0))
        })

        const comparisonData = []
        const currentDate = new Date()
        for (let i = 5; i >= 0; i--) {
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
          const monthName = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })

          const predicted = monthlyForecast.get(monthKey) || 0
          const actual = monthlyActual.get(monthKey) || 0
          const difference = actual > 0 ? ((actual - predicted) / actual) * 100 : 0

          comparisonData.push({
            month: monthName,
            predicted,
            actual,
            difference,
          })
        }

        setForecastComparison(comparisonData)

        // Set product details
        const productDetailsData = products.map((product: any) => ({
          productId: product.PRODUCT_ID,
          productName: product.PRODUCT_NAME || product.PRODUCT_ID,
          model: product.MODEL || "N/A",
          size: product.INCH ? `${product.INCH}"` : "N/A",
          listPrice: product.LIST_PRICE || 0,
          salePrice: product.SALE_PRICE || 0,
          category: product.CATEGORY || "Unknown",
          notes: product.NOTES || "No notes available",
        }))

        setProductDetails(productDetailsData)
      } catch (error) {
        console.error("Error fetching reports data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filter product performance by category
  const filteredProductPerformance = React.useMemo(() => {
    if (categoryFilter === "all") return productPerformance
    return productPerformance.filter((product) => product.category === categoryFilter)
  }, [productPerformance, categoryFilter])

  // Get unique categories
  const categories = React.useMemo(() => {
    const cats = new Set(productPerformance.map((p) => p.category))
    return Array.from(cats)
  }, [productPerformance])

  // Table columns for product performance
  const productColumns: ColumnDef<ProductPerformance>[] = [
    {
      accessorKey: "productName",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Product Name
          <ArrowUpDownIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="link" className="p-0 h-auto font-medium text-left">
              {row.original.productName}
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Product Details</SheetTitle>
              <SheetDescription>Detailed information for {row.original.productName}</SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              {(() => {
                const detail = productDetails.find((p) => p.productId === row.original.productId)
                if (!detail) return <p>No details available</p>

                return (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Product ID</label>
                      <p className="text-sm">{detail.productId}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Model</label>
                      <p className="text-sm">{detail.model}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Size</label>
                      <p className="text-sm">{detail.size}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Category</label>
                      <p className="text-sm">{detail.category}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">List Price</label>
                      <p className="text-sm">₩{detail.listPrice.toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Sale Price</label>
                      <p className="text-sm">₩{detail.salePrice.toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Notes</label>
                      <p className="text-sm">{detail.notes}</p>
                    </div>
                  </div>
                )
              })()}
            </div>
          </SheetContent>
        </Sheet>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => <Badge variant="outline">{row.original.category}</Badge>,
    },
    {
      accessorKey: "totalSales",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Total Sales
          <ArrowUpDownIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium">₩{(row.original.totalSales || 0).toLocaleString()}</div>
      ),
    },
    {
      accessorKey: "totalQuantity",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Quantity
          <ArrowUpDownIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-right">{(row.original.totalQuantity || 0).toLocaleString()}</div>,
    },
    {
      accessorKey: "totalRevenue",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Revenue
          <ArrowUpDownIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium">₩{(row.original.totalRevenue || 0).toLocaleString()}</div>
      ),
    },
    {
      accessorKey: "averageMargin",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Avg Margin
          <ArrowUpDownIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-right">{((row.original.averageMargin || 0) * 100).toFixed(1)}%</div>,
    },
  ]

  // Table columns for customer summary
  const customerColumns: ColumnDef<CustomerSummary>[] = [
    {
      accessorKey: "companyName",
      header: "Company Name",
      cell: ({ row }) => <div className="font-medium">{row.original.companyName}</div>,
    },
    {
      accessorKey: "orderCount",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Orders
          <ArrowUpDownIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-right">{row.original.orderCount}</div>,
    },
    {
      accessorKey: "totalSales",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Total Sales
          <ArrowUpDownIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium">₩{(row.original.totalSales || 0).toLocaleString()}</div>
      ),
    },
    {
      accessorKey: "averageMargin",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Avg Margin
          <ArrowUpDownIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-right">{((row.original.averageMargin || 0) * 100).toFixed(1)}%</div>,
    },
  ]

  const [productSorting, setProductSorting] = React.useState<SortingState>([])
  const [customerSorting, setCustomerSorting] = React.useState<SortingState>([])

  const productTable = useReactTable({
    data: filteredProductPerformance,
    columns: productColumns,
    state: { sorting: productSorting },
    onSortingChange: setProductSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const customerTable = useReactTable({
    data: customerSummary,
    columns: customerColumns,
    state: { sorting: customerSorting },
    onSortingChange: setCustomerSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  // Chart data for product performance
  const productChartData = filteredProductPerformance.slice(0, 10).map((product) => ({
    name: product.productName.length > 15 ? product.productName.substring(0, 15) + "..." : product.productName,
    sales: product.totalSales,
    revenue: product.totalRevenue,
  }))

  // Chart data for customer summary
  const customerChartData = customerSummary.slice(0, 10).map((customer) => ({
    name: customer.companyName.length > 15 ? customer.companyName.substring(0, 15) + "..." : customer.companyName,
    sales: customer.totalSales,
    margin: customer.averageMargin * 100,
  }))

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return "🥇"
      case 2:
        return "🥈"
      case 3:
        return "🥉"
      default:
        return `#${rank}`
    }
  }

  const getProfitColor = (rank: number) => {
    if (rank <= 3) return "text-green-600"
    if (rank <= 6) return "text-blue-600"
    return "text-gray-600"
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
      {/* Product Performance & Customer Summary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageIcon className="h-5 w-5" />
              Product Sales & Revenue
            </CardTitle>
            <CardDescription>Top 10 products by performance</CardDescription>
            <div className="flex items-center gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                sales: { label: "Sales", color: "hsl(var(--chart-1))" },
                revenue: { label: "Revenue", color: "hsl(var(--chart-2))" },
              }}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="sales" fill="hsl(var(--chart-1))" name="Sales" />
                  <Bar dataKey="revenue" fill="hsl(var(--chart-2))" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              Customer Sales & Margin
            </CardTitle>
            <CardDescription>Top 10 customers by sales volume</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                sales: { label: "Sales", color: "hsl(var(--chart-3))" },
                margin: { label: "Margin %", color: "hsl(var(--chart-4))" },
              }}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={customerChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="sales" fill="hsl(var(--chart-3))" name="Sales" />
                  <Bar dataKey="margin" fill="hsl(var(--chart-4))" name="Margin %" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Products Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrophyIcon className="h-5 w-5" />
              Top Popular Products
            </CardTitle>
            <CardDescription>Ranked by total quantity sold</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPopularProducts.map((product) => (
                <div key={product.productId} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold w-8">{getRankIcon(product.rank)}</span>
                    <div>
                      <p className="font-medium">{product.productName}</p>
                      <p className="text-sm text-muted-foreground">ID: {product.productId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{product.value.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">units sold</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUpIcon className="h-5 w-5" />
              Top Profitable Products
            </CardTitle>
            <CardDescription>Ranked by total revenue generated</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProfitableProducts.map((product) => (
                <div key={product.productId} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold w-8">{getRankIcon(product.rank)}</span>
                    <div>
                      <p className="font-medium">{product.productName}</p>
                      <p className="text-sm text-muted-foreground">ID: {product.productId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${getProfitColor(product.rank)}`}>₩{product.value.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">revenue</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forecast vs Actual Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3Icon className="h-5 w-5" />
            Forecast vs Actual Sales Comparison
          </CardTitle>
          <CardDescription>6-month comparison of predicted vs actual sales quantities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium mb-3">Monthly Trend</h4>
              <ChartContainer
                config={{
                  predicted: { label: "Predicted", color: "hsl(var(--chart-1))" },
                  actual: { label: "Actual", color: "hsl(var(--chart-2))" },
                }}
                className="h-48"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={forecastComparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      name="Predicted"
                    />
                    <Line type="monotone" dataKey="actual" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Actual" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-3">Comparison Table</h4>
              <div className="space-y-2">
                {forecastComparison.map((item) => (
                  <div key={item.month} className="flex items-center justify-between p-2 rounded border">
                    <span className="font-medium">{item.month}</span>
                    <div className="flex items-center gap-4 text-sm">
                      <span>P: {item.predicted}</span>
                      <span>A: {item.actual}</span>
                      <span className={`font-medium ${item.difference >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {item.difference >= 0 ? "+" : ""}
                        {item.difference.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Product Performance Details</CardTitle>
            <CardDescription>Complete product sales and profitability data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  {productTable.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {productTable.getRowModel().rows?.length ? (
                    productTable
                      .getRowModel()
                      .rows.slice(0, 10)
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
                      <TableCell colSpan={productColumns.length} className="h-24 text-center">
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Sales Summary</CardTitle>
            <CardDescription>Customer performance and order statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  {customerTable.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {customerTable.getRowModel().rows?.length ? (
                    customerTable
                      .getRowModel()
                      .rows.slice(0, 10)
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
                      <TableCell colSpan={customerColumns.length} className="h-24 text-center">
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

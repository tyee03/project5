"use client"

import * as React from "react"
import Link from "next/link"
import { TrendingUp } from "lucide-react"
import {
  Label,
  Pie,
  PieChart,
  CartesianGrid,
  LabelList,
  Bar,
  BarChart,
  XAxis,
} from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export function SectionCards() {
  const [pieData, setPieData] = React.useState<
    { company_type: string; total_amount: number; month: string }[]
  >([])
  const [barData, setBarData] = React.useState<
    { month: string; predicted_quantity: number }[]
  >([])
  const [issues, setIssues] = React.useState<
    { date: string; type: string; severity: string; daysAgo: number }[]
  >([])

  React.useEffect(() => {
    fetch("/api/card1")
      .then((res) => res.json())
      .then((json) => setPieData(json.data ?? json))
      .catch(console.error)

    fetch("/api/card2")
      .then((res) => res.json())
      .then((json) => setBarData(json.data ?? json))
      .catch(console.error)

    fetch("/api/issues/recent-open")
      .then((res) => res.json())
      .then((json) => setIssues(json.data ?? json))
      .catch(console.error)
  }, [])

  const totalAmount = React.useMemo(() => {
    return pieData.reduce((sum, item) => sum + item.total_amount, 0)
  }, [pieData])

  const formattedMonth = React.useMemo(() => {
    if (pieData.length === 0) return ""
    const rawMonth = pieData[0].month
    const [year, month] = rawMonth.split("-").map(Number)
    const date = new Date(year, month - 1)
    return date.toLocaleString("en-US", { year: "numeric", month: "long" })
  }, [pieData])

  const pieChartData = pieData.map((item, index) => ({
    browser: item.company_type,
    visitors: item.total_amount,
    fill: `hsl(var(--chart-${(index % 5) + 1}))`,
  }))

  const pieChartConfig = React.useMemo(() => {
    const config: ChartConfig = { visitors: { label: "Amount" } }
    pieData.forEach((item, index) => {
      config[item.company_type.toLowerCase()] = {
        label: item.company_type,
        color: `hsl(var(--chart-${(index % 5) + 1}))`,
      }
    })
    return config
  }, [pieData])

  const barChartData = barData.map((item) => ({
    month: new Date(item.month + "-01").toLocaleString("en-US", { month: "short" }),
    forecast: Math.round(item.predicted_quantity / 1_000_000),
  }))

  const barChartConfig = {
    forecast: {
      label: "Forecast",
      color: "hsl(var(--chart-3))",
    },
  } satisfies ChartConfig

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4 lg:px-6">
      {/* Left Card */}
      <Link href="/orders" className="block w-full h-full">
        <Card className="flex flex-col h-full">
          <CardHeader className="items-center pb-0">
            <CardTitle className="text-center w-full">Company Type Sales</CardTitle>
            <CardDescription className="text-center w-full">{formattedMonth}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <ChartContainer config={pieChartConfig} className="mx-auto aspect-square max-h-[250px]">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={pieChartData}
                  dataKey="visitors"
                  nameKey="browser"
                  innerRadius={60}
                  strokeWidth={5}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-3xl font-bold">
                              {(totalAmount / 1_000_000).toFixed(1)}M
                            </tspan>
                            <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground">
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
          <CardFooter className="flex-col items-center justify-end gap-2 text-sm grow">
            <div className="flex items-center gap-2 font-medium leading-none">
              Total based on latest month <TrendingUp className="h-4 w-4" />
            </div>
            <div className="leading-none text-muted-foreground">Sales breakdown by company type</div>
          </CardFooter>
        </Card>
      </Link>

      {/* Middle Card */}
      <Link href="#" className="block w-full h-full">
        <Card className="flex flex-col h-full">
          <CardHeader className="items-center pb-0">
            <CardTitle className="text-center w-full">Forecasted Sales</CardTitle>
            <CardDescription className="text-center w-full">Next 6 months</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <ChartContainer config={barChartConfig}>
              <BarChart data={barChartData} margin={{ top: 20 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="forecast" fill="hsl(var(--chart-3))" radius={8}>
                  <LabelList
                    dataKey="forecast"
                    position="top"
                    offset={12}
                    className="fill-foreground"
                    fontSize={12}
                    formatter={(value: number) => `${value}M`}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex-col items-center justify-end gap-2 text-sm grow">
            <div className="flex items-center gap-2 font-medium leading-none">
              6-month forecast based on last order <TrendingUp className="h-4 w-4" />
            </div>
            <div className="leading-none text-muted-foreground">Predicted order quantity per month</div>
          </CardFooter>
        </Card>
      </Link>

      {/* Right Card */}
      <Link href="/issues" className="block w-full h-full">
        <Card className="flex flex-col h-full">
          <CardHeader className="items-center pb-0">
            <CardTitle className="text-center w-full">Recent Open Issues</CardTitle>
            <CardDescription className="text-center w-full">Last 4 unresolved issues</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Elapsed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue, index) => {
                  const dayBadgeVariant =
                    issue.daysAgo > 9 ? "destructive" : issue.daysAgo > 5 ? "secondary" : "default"
                  const severityVariant =
                    issue.severity.toLowerCase() === "high"
                      ? "destructive"
                      : issue.severity.toLowerCase() === "medium"
                      ? "secondary"
                      : "default"

                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{issue.date}</TableCell>
                      <TableCell>
                        <Badge variant={severityVariant}>{issue.severity}</Badge>
                      </TableCell>
                      <TableCell>{issue.type}</TableCell>
                      <TableCell className="text-right font-medium">
                        <Badge variant={dayBadgeVariant}>{issue.daysAgo} day</Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="flex-col items-center justify-end gap-2 text-sm grow">
            <div className="flex items-center gap-2 font-medium leading-none">
              {issues.length} unresolved issues <TrendingUp className="h-4 w-4" />
            </div>
            <div className="leading-none text-muted-foreground">Oldest shown in red</div>
          </CardFooter>
        </Card>
      </Link>
    </div>
  )
}

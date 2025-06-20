"use client"

import * as React from "react"
import {
  Activity, ArrowUpRight, ChevronLeft, ChevronRight, Copy, CreditCard, DollarSign, Download, File, ListFilter, MoreVertical, Search, Truck, Users,
} from "lucide-react"
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Pie, PieChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts"
import { DateRange } from "react-day-picker"
import { addDays, format } from "date-fns"

// 요청하신 목록의 shadcn/ui 컴포넌트들을 대거 임포트합니다.
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePickerWithRange } from "@/components/ui/date-range-picker" // DatePicker 사용 예시 (별도 컴포넌트로 관리)
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { toast, Toaster } from "sonner" // Sonner (Toast)

// --- 메인 대시보드 컴포넌트 ---
export default function AnalyticsDashboard() {
  const [loading, setLoading] = React.useState(true);
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  // 데이터 로딩 시뮬레이션
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <TooltipProvider>
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          {/* 상단 헤더: Breadcrumb, Date Picker, Button */}
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <Breadcrumb className="hidden md:flex">
              <BreadcrumbList>
                <BreadcrumbItem><BreadcrumbLink href="#">Home</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem><BreadcrumbPage>Analytics Dashboard</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="flex items-center gap-2">
              <DatePickerWithRange date={date} onDateChange={setDate} />
              <Button size="sm" variant="outline"><Download className="mr-2 h-4 w-4" />Download Report</Button>
            </div>
          </header>

          {/* 핵심 지표(KPI) 영역: Card, Progress, Tooltip */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard title="Total Revenue" value="$45,231.89" change="+20.1% from last month" icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} />
            <KPICard title="Subscriptions" value="+2350" change="+180.1% from last month" icon={<Users className="h-4 w-4 text-muted-foreground" />} />
            <KPICard title="Sales" value="+12,234" change="+19% from last month" icon={<CreditCard className="h-4 w-4 text-muted-foreground" />} />
            <KPICard title="Active Now" value="+573" change="201 since last hour" icon={<Activity className="h-4 w-4 text-muted-foreground" />} progressValue={75} />
          </section>

          {/* 메인 콘텐츠: Tabs, Chart, Data Table 등 */}
          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">User Analytics</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* 개요 탭 */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                  <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
                  <CardContent className="pl-2">
                    <OverviewChart />
                  </CardContent>
                </Card>
                <RecentSalesCard />
              </div>
            </TabsContent>

            {/* 사용자 분석 탭 */}
            <TabsContent value="users" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <UserDemographicsChart />
                    <UserListCard />
                </div>
            </TabsContent>
            
            {/* 설정 탭 */}
            <TabsContent value="settings">
              <SettingsAccordion />
            </TabsContent>
          </Tabs>
        </main>
        <Toaster richColors />
      </div>
    </TooltipProvider>
  );
}

// --- 하위 컴포넌트 및 섹션 ---

const KPICard = ({ title, value, change, icon, progressValue }: { title: string, value: string, change: string, icon: React.ReactNode, progressValue?: number }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{change}</p>
      {progressValue && <Progress value={progressValue} className="mt-4" />}
    </CardContent>
  </Card>
);

const OverviewChart = () => (
  <ResponsiveContainer width="100%" height={350}>
    <BarChart data={[
      { name: "Jan", total: Math.floor(Math.random() * 5000) + 1000 },
      { name: "Feb", total: Math.floor(Math.random() * 5000) + 1000 },
      { name: "Mar", total: Math.floor(Math.random() * 5000) + 1000 },
      { name: "Apr", total: Math.floor(Math.random() * 5000) + 1000 },
      { name: "May", total: Math.floor(Math.random() * 5000) + 1000 },
      { name: "Jun", total: Math.floor(Math.random() * 5000) + 1000 },
    ]}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
      <Tooltip contentStyle={{ backgroundColor: 'black', border: '1px solid #333' }} />
      <Bar dataKey="total" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
    </BarChart>
  </ResponsiveContainer>
);

const RecentSalesCard = () => (
    <Card className="col-span-3">
        <CardHeader><CardTitle>Recent Sales</CardTitle><CardDescription>You made 265 sales this month.</CardDescription></CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell><div className="font-medium">Liam Johnson</div><div className="text-sm text-muted-foreground">liam@example.com</div></TableCell>
                        <TableCell><Badge>Fulfilled</Badge></TableCell>
                        <TableCell className="text-right">$250.00</TableCell>
                    </TableRow>
                     <TableRow>
                        <TableCell><div className="font-medium">Olivia Smith</div><div className="text-sm text-muted-foreground">olivia@example.com</div></TableCell>
                        <TableCell><Badge variant="outline">Declined</Badge></TableCell>
                        <TableCell className="text-right">$150.00</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </CardContent>
    </Card>
);

const UserDemographicsChart = () => (
    <Card className="col-span-4 lg:col-span-3">
        <CardHeader><CardTitle>User Demographics</CardTitle></CardHeader>
        <CardContent>
            <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                    <Pie data={[ { name: 'USA', value: 400 }, { name: 'Europe', value: 300 }, { name: 'Asia', value: 300 } ]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} >
                        <Cell key="cell-0" fill="var(--color-a)" />
                        <Cell key="cell-1" fill="var(--color-b)" />
                        <Cell key="cell-2" fill="var(--color-c)" />
                    </Pie>
                    <Legend />
                    <Tooltip />
                </PieChart>
            </ResponsiveContainer>
        </CardContent>
    </Card>
);

const UserListCard = () => (
    <Card className="col-span-4">
        <CardHeader><CardTitle>New Users</CardTitle></CardHeader>
        <CardContent className="grid gap-8">
            <div className="flex items-center gap-4">
                <Avatar className="hidden h-9 w-9 sm:flex"><AvatarImage src="/avatars/01.png" alt="Avatar" /><AvatarFallback>OM</AvatarFallback></Avatar>
                <div className="grid gap-1"><p className="text-sm font-medium leading-none">Olivia Martin</p><p className="text-sm text-muted-foreground">olivia.martin@email.com</p></div>
                <div className="ml-auto font-medium">+$1,999.00</div>
            </div>
             <div className="flex items-center gap-4">
                <Avatar className="hidden h-9 w-9 sm:flex"><AvatarImage src="/avatars/02.png" alt="Avatar" /><AvatarFallback>JL</AvatarFallback></Avatar>
                <div className="grid gap-1"><p className="text-sm font-medium leading-none">Jackson Lee</p><p className="text-sm text-muted-foreground">jackson.lee@email.com</p></div>
                <div className="ml-auto font-medium">+$39.00</div>
            </div>
        </CardContent>
    </Card>
);


const SettingsAccordion = () => (
    <Card>
        <CardHeader><CardTitle>Dashboard Settings</CardTitle><CardDescription>Manage your dashboard preferences and notification settings.</CardDescription></CardHeader>
        <CardContent>
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                    <AccordionTrigger>Report Settings</AccordionTrigger>
                    <AccordionContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="include-pii" />
                            <label htmlFor="include-pii" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Include personal identifying information (PII) in reports
                            </label>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Default Report Format</label>
                             <Select defaultValue="csv">
                                <SelectTrigger className="w-[180px] mt-2"><SelectValue placeholder="Select format" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="csv">CSV</SelectItem>
                                    <SelectItem value="json">JSON</SelectItem>
                                    <SelectItem value="pdf">PDF</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                    <AccordionTrigger>Notification Settings</AccordionTrigger>
                    <AccordionContent className="space-y-4">
                        <Alert>
                            <Activity className="h-4 w-4" />
                            <AlertTitle>Heads up!</AlertTitle>
                            <AlertDescription>These settings control the toast notifications you receive.</AlertDescription>
                        </Alert>
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium">Sales Alerts</label>
                                <p className="text-xs text-muted-foreground">Receive a notification for every new sale.</p>
                            </div>
                            <Switch />
                        </div>
                         <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium">Weekly Summary</label>
                                <p className="text-xs text-muted-foreground">Get a summary of analytics every Monday morning.</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </CardContent>
        <CardFooter>
            <Button onClick={() => toast.success("Settings saved successfully!")}>Save Changes</Button>
        </CardFooter>
    </Card>
);

const DashboardSkeleton = () => (
  <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-48" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
      <Card className="col-span-4">
        <CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader>
        <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
      </Card>
      <Card className="col-span-3">
        <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    </div>
  </div>
);

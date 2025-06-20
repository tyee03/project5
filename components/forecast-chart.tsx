"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Calendar as CalendarIcon } from "lucide-react"
import { format, subMonths, addYears } from "date-fns" // subMonths, addYears 추가
import { DateRange } from "react-day-picker" // DateRange 타입 명시적 임포트
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

// --- API 응답 및 데이터 타입 정의 ---
export type Forecast = {
  predictedDate: string;
  predictedQuantity: number;
};

export type ActualSales = {
  date: string;
  quantity: number;
};

export type Company = {
  customerId: number | string;
  companyName: string | null;
  companySize: string | null;
};

// --- 차트 설정 ---
const chartConfig = {
  predictedQuantity: { label: "예측 수량 (월별)", color: "hsl(var(--chart-1))" },
  actualSalesMonthly: { label: "실제 수량 (월별)", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig

// --- 메인 차트 컴포넌트 ---

/**
 * 주문량 예측 및 실제 데이터를 비교하는 차트 컴포넌트
 * @param allCompanies - 전체 회사 목록
 * @param selectedCompanyId - 현재 선택된 회사 ID
 * @param onCompanyChange - 회사 선택 시 호출될 콜백 함수
 * @param forecastData - 예측 데이터 배열
 * @param actualSalesData - 실제 매출 데이터 배열 (일별)
 */
export function ForecastChart({
  allCompanies,
  selectedCompanyId,
  onCompanyChange,
  forecastData,
  actualSalesData
}: {
  allCompanies: Company[];
  selectedCompanyId: string | null;
  onCompanyChange: (id: string) => void;
  forecastData: Forecast[];
  actualSalesData: ActualSales[];
}) {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const [period, setPeriod] = React.useState<string>("12months");

  // 일별 실제 매출 데이터를 월별로 집계
  const monthlyActualSales = React.useMemo(() => {
    if (!actualSalesData || !Array.isArray(actualSalesData)) return [];

    const monthlyMap = new Map<string, number>();
    actualSalesData.forEach(item => {
      const date = new Date(item.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
      const currentSum = monthlyMap.get(monthKey) || 0;
      monthlyMap.set(monthKey, currentSum + (item.quantity || 0));
    });

    return Array.from(monthlyMap.entries())
      .map(([date, quantity]) => ({ date, quantity }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [actualSalesData]);

  // 예측 데이터와 월별 실제 매출 데이터를 결합
  const combinedChartData = React.useMemo(() => {
    const dataMap = new Map<string, { predictedQuantity?: number; actualSalesMonthly?: number }>();

    (forecastData || []).forEach(item => {
      const dateKey = item.predictedDate.split('T')[0];
      dataMap.set(dateKey, { ...dataMap.get(dateKey), predictedQuantity: item.predictedQuantity });
    });

    monthlyActualSales.forEach(item => {
      dataMap.set(item.date, { ...dataMap.get(item.date), actualSalesMonthly: item.quantity });
    });

    return Array.from(dataMap.entries())
      .map(([date, values]) => ({
        date,
        predictedQuantity: values.predictedQuantity || 0,
        actualSalesMonthly: values.actualSalesMonthly || 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [forecastData, monthlyActualSales]);

  // 선택된 날짜 범위에 따라 차트 데이터 필터링
  const filteredChartData = React.useMemo(() => {
    if (!dateRange?.from) return combinedChartData;

    const fromTime = dateRange.from.getTime();
    const toTime = dateRange.to ? dateRange.to.getTime() : Infinity;

    return combinedChartData.filter(d => {
      const date = new Date(d.date).getTime();
      return date >= fromTime && date <= toTime;
    });
  }, [combinedChartData, dateRange]);

  // '기간 선택' 드롭다운 핸들러
  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    const today = new Date();
    let from: Date | undefined;
    let to: Date | undefined = addYears(today, 5); // 예측은 미래까지 있을 수 있으므로 넉넉하게 설정

    switch (value) {
      case "6months":
        from = subMonths(today, 6);
        break;
      case "12months":
        from = subMonths(today, 12);
        break;
      case "24months":
        from = subMonths(today, 24);
        break;
      case "all":
      default:
        from = undefined;
        to = undefined;
        break;
    }
    setDateRange({ from, to });
  };
  
  // 컴포넌트 마운트 시 기본 기간 설정
  React.useEffect(() => {
    handlePeriodChange("12months");
  }, []);

  return (
    <Card className="@container">
      <CardHeader className="flex-col items-start gap-4 @md:flex-row @md:items-center">
        <div className="flex-1">
          <CardTitle>주문량 예측 추이 (월별 비교)</CardTitle>
          <CardDescription>
            선택된 회사의 월별 주문 예측 및 실제 수량 추이입니다.
          </CardDescription>
        </div>
        <div className="flex w-full flex-col gap-2 @md:ml-auto @md:w-auto @md:flex-row">
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-full @md:w-[150px]">
              <SelectValue placeholder="기간 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 기간</SelectItem>
              <SelectItem value="6months">최근 6개월</SelectItem>
              <SelectItem value="12months">최근 12개월</SelectItem>
              <SelectItem value="24months">최근 24개월</SelectItem>
            </SelectContent>
          </Select>

          <DateRangePicker date={dateRange} onDateChange={setDateRange} />

          <CompanySearchCombobox
            companies={allCompanies}
            value={selectedCompanyId}
            onSelect={onCompanyChange}
          />
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={filteredChartData}>
            <defs>
              <linearGradient id="fillPredicted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-predictedQuantity)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-predictedQuantity)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-actualSalesMonthly)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-actualSalesMonthly)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => format(new Date(value), "yy-MM")}
            />
            <YAxis
              tickFormatter={(value) => value.toLocaleString()}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => format(new Date(label), "yyyy년 MM월")}
                  indicator="dot"
                  formatter={(value) => `${Number(value).toLocaleString()} 개`} // ❗단위 수정: 원 -> 개
                />
              }
            />
            {/* 🔥 간결해진 범례(Legend) 코드 */}
            <ChartLegend content={<ChartLegendContent />} />
            
            <Area
              dataKey="predictedQuantity"
              type="natural"
              fill="url(#fillPredicted)"
              stroke="var(--color-predictedQuantity)"
              name={chartConfig.predictedQuantity.label} // name prop 추가
            />
            <Area
              dataKey="actualSalesMonthly"
              type="natural"
              fill="url(#fillActual)"
              stroke="var(--color-actualSalesMonthly)"
              name={chartConfig.actualSalesMonthly.label} // name prop 추가
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}


// --- 하위 컴포넌트들 ---

function CompanySearchCombobox({
  companies,
  value,
  onSelect,
}: {
  companies: Company[];
  value: string | null;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = React.useState(false)
  const selectedCompany = companies.find(c => String(c.customerId) === value)

  const getDisplayValue = (company: Company | undefined) => {
    if (!company) return "회사를 선택하세요...";
    const name = company.companyName || `Customer ${company.customerId}`;
    return company.companySize ? `${name} (${company.companySize})` : name;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between @md:w-56">
          <span className="truncate">{getDisplayValue(selectedCompany)}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="회사명 또는 규모로 검색..." />
          <CommandList>
            <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
            <CommandGroup>
              {companies.map((company) => (
                <CommandItem
                  key={company.customerId}
                  value={`${company.companyName || ''} ${company.companySize || ''}`}
                  onSelect={() => {
                    onSelect(String(company.customerId))
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === String(company.customerId) ? "opacity-100" : "opacity-0")} />
                  <span>{getDisplayValue(company)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function DateRangePicker({
  date,
  onDateChange,
  className,
}: {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
  className?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal @md:w-[280px]",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date?.from ? (
            date.to ? (
              <>
                {format(date.from, "yyyy/MM/dd")} - {format(date.to, "yyyy/MM/dd")}
              </>
            ) : (
              format(date.from, "yyyy/MM/dd")
            )
          ) : (
            <span>날짜 범위 선택</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={date?.from}
          selected={date}
          onSelect={onDateChange}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}

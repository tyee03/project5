// forecast-chart.tsx

"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { type ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart"

// 날짜 관련 유틸리티 (date-fns 및 shadcn/ui calendar)
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
// 기간 선택 드롭다운 (shadcn/ui select)
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// API 응답 타입과 일치하도록 정의
export type Forecast = {
  predictedDate: string; // "YYYY-MM-DDTHH:MM:SS" 형식 (예측 날짜)
  predictedQuantity: number;
};

export type ActualSales = {
    date: string; // "YYYY-MM-DD" 형식 (실제 주문 날짜)
    quantity: number; // 실제 매출액
};

export type Company = {
  customerId: number | string;
  companyName: string | null;
  companySize: string | null;
};

// API의 최종 응답 타입 (ForecastChart 컴포넌트의 부모 컴포넌트가 이 타입을 전달해야 함)
export type CustomerChartData = { // API의 CustomerForecastResponse와 동일
    customerId: number;
    companyName: string | null;
    customerName: string | null;
    companySize: string | null;
    forecasts: Forecast[]; // 미래 예측 데이터 배열
    actualSales: ActualSales[]; // 과거 실제 매출 데이터 배열
}


// 회사 검색 콤보박스 컴포넌트
function CompanySearchCombobox({
  companies,
  value,
  onSelect,
  className,
}: {
  companies: Company[];
  value: string | null;
  onSelect: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false)

  const selectedCompany = companies.find(
    (company) => String(company.customerId) === value
  )

  const getDisplayValue = (company: Company | undefined) => {
    if (!company) return "회사를 선택하세요...";
    const name = company.companyName || `Customer ${company.customerId}`;
    return company.companySize ? `${name} (${company.companySize})` : name;
  }
  
  const commandFilter = (value: string, search: string): number => {
    if (value.toLowerCase().includes(search.toLowerCase())) {
      return 1
    }
    return 0
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between @md:w-56", className)}
        >
          <span className="truncate">{getDisplayValue(selectedCompany)}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      {/* PopoverContent가 PopoverTrigger의 자식으로 있도록 수정되었음 */}
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command filter={commandFilter}>
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
                  <Check
                    className={cn("mr-2 h-4 w-4", value === String(company.customerId) ? "opacity-100" : "opacity-0")}
                  />
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

// 날짜 범위 선택기 컴포넌트
interface DateRangePickerProps {
  selectedRange: { from: Date | undefined; to: Date | undefined } | undefined;
  onSelectRange: (range: { from: Date | undefined; to: Date | undefined } | undefined) => void;
  className?: string;
}

function DateRangePicker({ selectedRange, onSelectRange, className }: DateRangePickerProps) {
  const displayValue = selectedRange?.from ? (
    selectedRange.to ? (
      `${format(selectedRange.from, "yyyy년 MM월 dd일")} - ${format(selectedRange.to, "yyyy년 MM월 dd일")}`
    ) : (
      format(selectedRange.from, "yyyy년 MM월 dd일")
    )
  ) : (
    "날짜 범위 선택"
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id="date"
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal @md:w-[280px]",
            !selectedRange && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayValue}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={selectedRange?.from}
          selected={selectedRange}
          onSelect={onSelectRange}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}

// 차트 설정: 예측 수량과 실제 수량 각각의 라벨과 색상 정의
const chartConfig = {
  predictedQuantity: { label: "예측 수량", color: "hsl(var(--chart-1))" }, // 예측 라인 색상
  actualSales: { label: "실제 수량", color: "hsl(var(--chart-2))" }, // 실제 매출 라인 색상
} satisfies ChartConfig

export function ForecastChart({
  allCompanies,
  selectedCompanyId,
  onCompanyChange,
  // API에서 전달받는 두 개의 배열을 직접 받습니다.
  forecastData,    // Forecast[] 타입
  actualSalesData  // ActualSales[] 타입
}: {
  allCompanies: Company[];
  selectedCompanyId: string | null;
  onCompanyChange: (id: string) => void;
  forecastData: Forecast[]; 
  actualSalesData: ActualSales[];
}) {
  const [selectedRange, setSelectedRange] = React.useState<{ from: Date | undefined; to: Date | undefined } | undefined>(undefined);
  const [period, setPeriod] = React.useState<string>("12months"); 

  // ✨ 디버깅을 위한 콘솔 로그 추가
  React.useEffect(() => {
    console.log("ForecastChart received forecastData:", forecastData);
    console.log("ForecastChart received actualSalesData:", actualSalesData);
  }, [forecastData, actualSalesData]);


  // 예측 데이터와 실제 매출 데이터를 하나의 배열로 병합합니다.
  // X축에 사용할 'date' 키를 통일하고, 해당 날짜에 예측/실제 값이 있으면 채웁니다.
  const combinedChartData = React.useMemo(() => {
    const dataMap = new Map<string, { predictedQuantity?: number; actualSales?: number }>();

    // ✨ forecastData가 유효한 배열일 때만 forEach를 실행합니다.
    if (forecastData && Array.isArray(forecastData)) {
      forecastData.forEach(item => {
        const dateKey = item.predictedDate.split('T')[0];
        dataMap.set(dateKey, { ...dataMap.get(dateKey), predictedQuantity: item.predictedQuantity });
      });
    }

    // ✨ actualSalesData가 유효한 배열일 때만 forEach를 실행합니다.
    if (actualSalesData && Array.isArray(actualSalesData)) {
      actualSalesData.forEach(item => {
        const dateKey = item.date;
        dataMap.set(dateKey, { ...dataMap.get(dateKey), actualSales: item.quantity });
      });
    }

    const sortedData = Array.from(dataMap.entries())
      .map(([date, values]) => ({
        date: date,
        // ✨ predictedQuantity가 null이면 0으로, 아니면 값 그대로 사용
        predictedQuantity: values.predictedQuantity === null ? 0 : values.predictedQuantity, 
        // ✨ actualSales가 null이면 0으로, 아니면 값 그대로 사용
        actualSales: values.actualSales === null ? 0 : values.actualSales, 
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    console.log("Combined Chart Data:", sortedData);

    return sortedData;
  }, [forecastData, actualSalesData]); // 의존성 배열은 그대로 유지


  // 날짜 범위 필터링 (combinedChartData를 필터링)
  const filteredCombinedChartData = React.useMemo(() => {
    if (!selectedRange?.from && !selectedRange?.to) {
      // 날짜 범위가 지정되지 않은 경우, 전체 병합 데이터를 반환
      return combinedChartData; 
    }

    // 선택된 날짜 범위의 시작과 끝 시간을 설정 (시간까지 고려하여 정확한 범위 필터링)
    const fromTime = selectedRange.from ? new Date(selectedRange.from.setHours(0,0,0,0)).getTime() : -Infinity;
    const toTime = selectedRange.to ? new Date(selectedRange.to.setHours(23,59,59,999)).getTime() : Infinity;

    const filteredData = combinedChartData.filter(d => {
      const date = new Date(d.date).getTime(); 
      return date >= fromTime && date <= toTime;
    });

    // ✨ 디버깅을 위한 콘솔 로그 추가
    console.log("Filtered Combined Chart Data:", filteredData);

    return filteredData;
  }, [combinedChartData, selectedRange]);

  // 기간 선택 드롭다운 변경 핸들러
  const handlePeriodChange = (value: string) => {
  setPeriod(value);
  const today = new Date();
  let fromDate: Date | undefined;
  let toDate: Date | undefined; // ✨ toDate의 초기값을 undefined로 변경

  switch (value) {
    case "6months":
      fromDate = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
      // ✨ 종료일을 미래로 넉넉하게 설정 (예: 5년 후)
      toDate = new Date(today.getFullYear() + 5, today.getMonth(), today.getDate());
      break;
    case "12months":
      fromDate = new Date(today.getFullYear(), today.getMonth() - 12, today.getDate());
      // ✨ 종료일을 미래로 넉넉하게 설정
      toDate = new Date(today.getFullYear() + 5, today.getMonth(), today.getDate());
      break;
    case "24months":
      fromDate = new Date(today.getFullYear(), today.getMonth() - 24, today.getDate());
      // ✨ 종료일을 미래로 넉넉하게 설정
      toDate = new Date(today.getFullYear() + 5, today.getMonth(), today.getDate());
      break;
    case "all":
    default:
      // "전체 기간"은 시작과 끝을 모두 undefined로 설정하여 필터링하지 않음
      fromDate = undefined; 
      toDate = undefined; 
      break;
  }
  setSelectedRange({ from: fromDate, to: toDate });
};


  return (
    <Card>
      <CardHeader className="relative flex-col items-start @md:flex-row @md:items-center">
        <div>
          <CardTitle>주문량 예측 추이</CardTitle>
          <CardDescription>선택된 회사의 월별 주문 예측 및 실제 수량 추이입니다.</CardDescription>
        </div>
        <div className="mt-4 flex w-full flex-col gap-2 @md:ml-auto @md:mt-0 @md:w-auto @md:flex-row">
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-full @md:w-[180px]">
              <SelectValue placeholder="기간 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 기간</SelectItem>
              <SelectItem value="6months">최근 6개월</SelectItem>
              <SelectItem value="12months">최근 12개월</SelectItem>
              <SelectItem value="24months">최근 24개월</SelectItem>
            </SelectContent>
          </Select>

          <DateRangePicker 
            selectedRange={selectedRange} 
            onSelectRange={setSelectedRange} 
          />

          <CompanySearchCombobox
            companies={allCompanies}
            value={selectedCompanyId}
            onSelect={onCompanyChange}
          />
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={filteredCombinedChartData}>
            <defs>
              <linearGradient id="fillPredictedQuantity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-predictedQuantity)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-predictedQuantity)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillActualSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-actualSales)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-actualSales)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date" 
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => new Date(value).toLocaleDateString("ko-KR", { year: 'numeric', month: 'short' })}
            />
            <YAxis 
              tickFormatter={(value) => value.toLocaleString()}
              domain={[(dataMin) => (dataMin < 0 ? dataMin * 1.1 : -10000), (dataMax) => (dataMax > 0 ? dataMax * 1.1 : 10000)]}
            />
            <Tooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => new Date(value).toLocaleDateString("ko-KR", { year: 'numeric', month: 'long', day: 'numeric' })}
                  indicator="dot"
                />
              }
            />
            <Legend 
              verticalAlign="top" 
              height={36} 
              wrapperStyle={{ top: -20, left: 'auto', right: 0 }} 
              content={({ payload }) => {
                return (
                  <ul className="flex flex-wrap justify-end gap-4 text-sm">
                    {payload?.map((entry, index) => {
                      const config = chartConfig[entry.dataKey as keyof typeof chartConfig];
                      if (!config) return null;
                      return (
                        <li
                          key={`item-${index}`}
                          className="flex items-center gap-1.5"
                        >
                          <span
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{
                              backgroundColor: config.color,
                            }}
                          />
                          <span className="text-muted-foreground">{config.label}</span>
                        </li>
                      );
                    })}
                  </ul>
                );
              }}
            />
            {/* 예측 수량 Area */}
            <Area
              dataKey="predictedQuantity" 
              type="natural" 
              fill="url(#fillPredictedQuantity)"
              stroke="var(--color-predictedQuantity)"
            />
            {/* 실제 수량 Area */}
            <Area 
              dataKey="actualSales" 
              type="natural" 
              fill="url(#fillActualSales)" 
              stroke="var(--color-actualSales)" 
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
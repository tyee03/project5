// forecast-chart.tsx - 날짜 범위 선택기 제거 및 회사 규모별 필터링 강화

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

// API 응답 타입
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

// 차트 설정
const chartConfig = {
  predictedQuantity: { label: "예측 수량 (월별)", color: "hsl(var(--chart-1))" },
  actualSalesMonthly: { label: "실제 수량 (월별)", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig

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

export function ForecastChart({
  allCompanies,
  selectedCompanyId,
  onCompanyChange,
  forecastData,
  actualSalesData,
  sizeFilters,
  onSizeFiltersChange
}: {
  allCompanies: Company[];
  selectedCompanyId: string | null;
  onCompanyChange: (id: string) => void;
  forecastData: Forecast[]; 
  actualSalesData: ActualSales[];
  sizeFilters?: string[];
  onSizeFiltersChange?: (values: string[]) => void;
}) {
  const [period, setPeriod] = React.useState<string>("12months"); 

  // 일별 매출을 월별로 집계
  const monthlyActualSales = React.useMemo(() => {
    console.log("Original actualSalesData:", actualSalesData);
    
    if (!actualSalesData || !Array.isArray(actualSalesData)) {
      return [];
    }

    // 월별로 그룹화하여 합계 계산
    const monthlyMap = new Map<string, number>();
    
    actualSalesData.forEach(item => {
      // "2024-12-15" -> "2024-12-01" (월 첫날로 변환)
      const date = new Date(item.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
      
      const currentSum = monthlyMap.get(monthKey) || 0;
      monthlyMap.set(monthKey, currentSum + (item.quantity || 0));
    });

    const result = Array.from(monthlyMap.entries()).map(([date, quantity]) => ({
      date,
      quantity
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log("Monthly aggregated actualSales:", result);
    return result;
  }, [actualSalesData]);

  // 예측과 실제 매출을 모두 월별 기준으로 결합
  const combinedChartData = React.useMemo(() => {
    const dataMap = new Map<string, { predictedQuantity?: number; actualSalesMonthly?: number }>();

    // 예측 데이터 추가 (이미 월별)
    if (forecastData && Array.isArray(forecastData)) {
      forecastData.forEach(item => {
        const dateKey = item.predictedDate.split('T')[0];
        dataMap.set(dateKey, { 
          ...dataMap.get(dateKey), 
          predictedQuantity: item.predictedQuantity 
        });
      });
    }

    // 월별 집계된 실제 매출 데이터 추가
    monthlyActualSales.forEach(item => {
      dataMap.set(item.date, { 
        ...dataMap.get(item.date), 
        actualSalesMonthly: item.quantity 
      });
    });

    const sortedData = Array.from(dataMap.entries())
      .map(([date, values]) => ({
        date: date,
        predictedQuantity: values.predictedQuantity || 0,
        actualSalesMonthly: values.actualSalesMonthly || 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    console.log("Combined Chart Data (월별 기준):", sortedData);
    return sortedData;
  }, [forecastData, monthlyActualSales]);

  // 기간별 필터링된 차트 데이터
  const filteredCombinedChartData = React.useMemo(() => {
    if (period === "all") {
      return combinedChartData;
    }

    const today = new Date();
    let fromDate: Date;
    let toDate: Date;

    switch (period) {
      case "6months":
        fromDate = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
        toDate = new Date(today.getFullYear() + 5, today.getMonth(), today.getDate());
        break;
      case "12months":
        fromDate = new Date(today.getFullYear(), today.getMonth() - 12, today.getDate());
        toDate = new Date(today.getFullYear() + 5, today.getMonth(), today.getDate());
        break;
      case "24months":
        fromDate = new Date(today.getFullYear(), today.getMonth() - 24, today.getDate());
        toDate = new Date(today.getFullYear() + 5, today.getMonth(), today.getDate());
        break;
      default:
        return combinedChartData;
    }

    const fromTime = fromDate.getTime();
    const toTime = toDate.getTime();

    const filteredData = combinedChartData.filter(d => {
      const date = new Date(d.date).getTime(); 
      return date >= fromTime && date <= toTime;
    });

    console.log("Filtered Combined Chart Data:", filteredData);
    return filteredData;
  }, [combinedChartData, period]);

  // 선택된 회사 정보 표시
  const selectedCompanyInfo = React.useMemo(() => {
    if (selectedCompanyId === "all") {
      if (!sizeFilters || sizeFilters.length === 0) {
        return "전체 회사";
      } else if (sizeFilters.length === 3) {
        return "전체 회사";
      } else {
        return `${sizeFilters.join(", ")} 회사`;
      }
    }
    const company = allCompanies.find(c => String(c.customerId) === selectedCompanyId);
    if (!company) return "회사 정보 없음";
    
    const name = company.companyName || `Customer ${company.customerId}`;
    return company.companySize ? `${name} (${company.companySize})` : name;
  }, [selectedCompanyId, allCompanies, sizeFilters]);

  return (
    <Card>
      <CardHeader className="relative flex-col items-start @md:flex-row @md:items-center">
        <div>
          <CardTitle>주문량 예측 추이 (월별 비교)</CardTitle>
          <CardDescription>
            {selectedCompanyInfo}의 월별 주문 예측 및 실제 수량 추이입니다. 
            실제 매출은 일별 데이터를 월별로 집계하여 표시됩니다.
          </CardDescription>
        </div>
        <div className="mt-4 flex w-full flex-col gap-2 @md:ml-auto @md:mt-0 @md:w-auto @md:flex-row">
          <Select value={period} onValueChange={setPeriod}>
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

          <CompanySearchCombobox
            companies={allCompanies}
            value={selectedCompanyId}
            onSelect={onCompanyChange}
          />
        </div>
        
        {/* 회사 규모 필터를 별도 행에 배치 */}
        {onSizeFiltersChange && (
          <div className="mt-4 flex justify-center">
            <ToggleGroup
              type="multiple"
              value={sizeFilters || []}
              onValueChange={onSizeFiltersChange}
              variant="outline"
              aria-label="회사 규모 필터"
            >
              <ToggleGroupItem value="대기업" aria-label="대기업 선택">대기업</ToggleGroupItem>
              <ToggleGroupItem value="중견기업" aria-label="중견기업 선택">중견기업</ToggleGroupItem>
              <ToggleGroupItem value="중소기업" aria-label="중소기업 선택">중소기업</ToggleGroupItem>
            </ToggleGroup>
          </div>
        )}
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={filteredCombinedChartData}>
            <defs>
              <linearGradient id="fillPredictedQuantity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-predictedQuantity)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-predictedQuantity)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillActualSalesMonthly" x1="0" y1="0" x2="0" y2="1">
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
              tickFormatter={(value) => new Date(value).toLocaleDateString("ko-KR", { year: 'numeric', month: 'short' })}
            />
            <YAxis 
              tickFormatter={(value) => value.toLocaleString()}
              domain={[(dataMin) => Math.max(0, dataMin * 0.9), (dataMax) => dataMax * 1.1]}
            />
            <Tooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => new Date(value).toLocaleDateString("ko-KR", { year: 'numeric', month: 'long' })}
                  indicator="dot"
                  formatter={(value, name) => [
                    `${Number(value).toLocaleString()}원`,
                    name === "predictedQuantity" ? "예측 수량 (월별)" : "실제 수량 (월별)"
                  ]}
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
            {/* 실제 수량 Area (월별 집계) */}
            <Area 
              dataKey="actualSalesMonthly" 
              type="natural" 
              fill="url(#fillActualSalesMonthly)" 
              stroke="var(--color-actualSalesMonthly)" 
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// components/forecast-chart.tsx - 기존 구조로 롤백 (검색 기능 복원)

"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart } from "recharts"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { type ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart"

import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// ✨ Forecast 타입에 probability 추가
export type Forecast = {
  predictedDate: string;
  predictedQuantity: number;
  probability?: number | null;
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

// ✨ 차트 설정에 확률 라인 추가
const chartConfig = {
  predictedQuantity: { label: "예측 수량 (월별)", color: "hsl(var(--chart-1))" },
  actualSalesMonthly: { label: "실제 수량 (월별)", color: "hsl(var(--chart-2))" },
  averageProbability: { label: "구매 확률 (%)", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig

// 회사 검색 콤보박스 컴포넌트 (기존과 동일)
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

// 날짜 범위 선택기 컴포넌트 (기존과 동일)
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
  const [selectedRange, setSelectedRange] = React.useState<{ from: Date | undefined; to: Date | undefined } | undefined>(undefined);
  const [period, setPeriod] = React.useState<string>("12months"); 

  // 월별 실제 매출 집계 (기존과 동일)
  const monthlyActualSales = React.useMemo(() => {
    console.log("Original actualSalesData:", actualSalesData);
    
    if (!actualSalesData || !Array.isArray(actualSalesData)) {
      return [];
    }

    const monthlyMap = new Map<string, number>();
    
    actualSalesData.forEach(item => {
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

  // ✨ 핵심 수정: 확률 정보도 포함하여 차트 데이터 생성
  const combinedChartData = React.useMemo(() => {
    const dataMap = new Map<string, { 
      predictedQuantity?: number; 
      actualSalesMonthly?: number; 
      probabilityValues?: number[]; // ✨ 확률 값들을 배열로 수집
    }>();

    // 예측 데이터 추가 (확률 정보 포함)
    if (forecastData && Array.isArray(forecastData)) {
      forecastData.forEach(item => {
        const dateKey = item.predictedDate.split('T')[0];
        const existing = dataMap.get(dateKey) || {};
        
        dataMap.set(dateKey, { 
          ...existing,
          predictedQuantity: (existing.predictedQuantity || 0) + item.predictedQuantity,
          probabilityValues: [
            ...(existing.probabilityValues || []),
            ...(item.probability !== null && item.probability !== undefined ? [item.probability] : [])
          ]
        });
      });
    }

    // 월별 집계된 실제 매출 데이터 추가
    monthlyActualSales.forEach(item => {
      const existing = dataMap.get(item.date) || {};
      dataMap.set(item.date, { 
        ...existing,
        actualSalesMonthly: item.quantity 
      });
    });

    // Map을 차트 데이터로 변환 (확률 평균 계산)
    const sortedData = Array.from(dataMap.entries())
      .map(([date, values]) => {
        // 해당 월의 확률들의 평균 계산
        const avgProbability = values.probabilityValues && values.probabilityValues.length > 0
          ? (values.probabilityValues.reduce((sum, prob) => sum + prob, 0) / values.probabilityValues.length) * 100 // 퍼센트로 변환
          : null;

        return {
          date: date,
          predictedQuantity: values.predictedQuantity || 0,
          actualSalesMonthly: values.actualSalesMonthly || 0,
          averageProbability: avgProbability, // ✨ 평균 확률 추가
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    console.log("Combined Chart Data with Probability:", sortedData);
    return sortedData;
  }, [forecastData, monthlyActualSales]);

  // 날짜 범위 필터링 (기존과 동일)
  const filteredCombinedChartData = React.useMemo(() => {
    if (!selectedRange?.from && !selectedRange?.to) {
      return combinedChartData; 
    }

    const fromTime = selectedRange.from ? new Date(selectedRange.from.setHours(0,0,0,0)).getTime() : -Infinity;
    const toTime = selectedRange.to ? new Date(selectedRange.to.setHours(23,59,59,999)).getTime() : Infinity;

    const filteredData = combinedChartData.filter(d => {
      const date = new Date(d.date).getTime(); 
      return date >= fromTime && date <= toTime;
    });

    console.log("Filtered Combined Chart Data:", filteredData);
    return filteredData;
  }, [combinedChartData, selectedRange]);

  // 기간 선택 핸들러 (기존과 동일)
  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    const today = new Date();
    let fromDate: Date | undefined;
    let toDate: Date | undefined;

    switch (value) {
      case "6months":
        fromDate = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
        toDate = new Date(today.getFullYear(), today.getMonth() + 12, today.getDate());
        break;
      case "12months":
        fromDate = new Date(today.getFullYear(), today.getMonth() - 12, today.getDate());
        toDate = new Date(today.getFullYear(), today.getMonth() + 12, today.getDate());
        break;
      case "24months":
        fromDate = new Date(today.getFullYear(), today.getMonth() - 24, today.getDate());
        toDate = new Date(today.getFullYear(), today.getMonth() + 12, today.getDate());
        break;
      case "all":
      default:
        fromDate = undefined; 
        toDate = undefined; 
        break;
    }
    setSelectedRange({ from: fromDate, to: toDate });
  };

  // ✨ 확률 데이터가 있는지 확인
  const hasProbabilityData = filteredCombinedChartData.some(d => d.averageProbability !== null);

  return (
    <Card>
      <CardHeader className="relative flex-col items-start @md:flex-row @md:items-center">
        <div>
          <CardTitle>주문량 예측 추이 {hasProbabilityData && "및 구매 확률"}</CardTitle>
          <CardDescription>
            선택된 회사의 월별 주문 예측 및 실제 수량 추이입니다. 
            {hasProbabilityData && " B그룹 고객의 경우 구매 확률도 함께 표시됩니다."}
          </CardDescription>
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
        <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
          {/* ✨ 확률 데이터가 있으면 ComposedChart, 없으면 AreaChart */}
          {hasProbabilityData ? (
            <ComposedChart data={filteredCombinedChartData}>
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
              {/* 왼쪽 Y축: 수량 */}
              <YAxis 
                yAxisId="quantity"
                orientation="left"
                tickFormatter={(value) => value.toLocaleString()}
                domain={[(dataMin) => Math.max(0, dataMin * 0.9), (dataMax) => dataMax * 1.1]}
              />
              {/* 오른쪽 Y축: 확률 (%) */}
              <YAxis 
                yAxisId="probability"
                orientation="right"
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => new Date(value).toLocaleDateString("ko-KR", { year: 'numeric', month: 'long' })}
                    indicator="dot"
                    formatter={(value, name) => {
                      if (name === "averageProbability") {
                        return [`${Number(value).toFixed(1)}%`, "구매 확률"];
                      }
                      return [
                        `${Number(value).toLocaleString()}원`,
                        name === "predictedQuantity" ? "예측 수량" : "실제 수량"
                      ];
                    }}
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
                yAxisId="quantity"
                dataKey="predictedQuantity" 
                type="natural" 
                fill="url(#fillPredictedQuantity)"
                stroke="var(--color-predictedQuantity)"
              />
              {/* 실제 수량 Area */}
              <Area 
                yAxisId="quantity"
                dataKey="actualSalesMonthly" 
                type="natural" 
                fill="url(#fillActualSalesMonthly)" 
                stroke="var(--color-actualSalesMonthly)" 
              />
              {/* ✨ 확률 라인 */}
              <Line
                yAxisId="probability"
                type="monotone"
                dataKey="averageProbability"
                stroke="var(--color-averageProbability)"
                strokeWidth={2}
                dot={{ fill: "var(--color-averageProbability)", strokeWidth: 2, r: 4 }}
                connectNulls={false}
              />
            </ComposedChart>
          ) : (
            // 확률 데이터가 없는 경우 기존 AreaChart 사용
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
                      name === "predictedQuantity" ? "예측 수량" : "실제 수량"
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
                      {payload?.filter(entry => entry.dataKey !== "averageProbability").map((entry, index) => {
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
              <Area
                dataKey="predictedQuantity" 
                type="natural" 
                fill="url(#fillPredictedQuantity)"
                stroke="var(--color-predictedQuantity)"
              />
              <Area 
                dataKey="actualSalesMonthly" 
                type="natural" 
                fill="url(#fillActualSalesMonthly)" 
                stroke="var(--color-actualSalesMonthly)" 
              />
            </AreaChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  )
}predictedQuantity || 0,
          actualSalesMonthly: values.actualSalesMonthly || 0,
          averageProbability: avgProbability,
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    console.log("Combined Chart Data with Probability:", sortedData);
    return sortedData;
  }, [forecastData, monthlyActualSales]);

  // ✨ 확률 데이터가 있는지 확인
  const hasProbabilityData = combinedChartData.some(d => d.averageProbability !== null);

  // 선택된 회사 정보
  const selectedCompany = allCompanies.find(company => String(company.customerId) === selectedCompanyId);

  // 차트 제목 생성
  const getChartTitle = () => {
    if (selectedCompanyId && selectedCompany) {
      const companyName = selectedCompany.companyName || `Customer ${selectedCompany.customerId}`;
      const companySize = selectedCompany.companySize ? ` (${selectedCompany.companySize})` : '';
      return `${companyName}${companySize} - 주문량 예측 추이`;
    } else if (selectedCompanySize) {
      return `${selectedCompanySize} - 전체 주문량 예측 추이`;
    } else {
      return "전체 고객 - 주문량 예측 추이";
    }
  };

  const getChartDescription = () => {
    if (selectedCompanyId) {
      return "선택된 회사의 월별 주문 예측 및 실제 수량 추이입니다.";
    } else if (selectedCompanySize) {
      return `${selectedCompanySize} 고객들의 월별 주문 예측 및 실제 수량 추이입니다.`;
    } else {
      return "전체 고객의 월별 주문 예측 및 실제 수량 추이입니다.";
    }
  };

  return (
    <Card>
      <CardHeader className="relative flex-col items-start @md:flex-row @md:items-center">
        <div className="flex-1">
          <CardTitle>{getChartTitle()}</CardTitle>
          <CardDescription>
            {getChartDescription()}
            {hasProbabilityData && " B그룹 고객의 경우 구매 확률도 함께 표시됩니다."}
          </CardDescription>
        </div>
        
        {/* 기업 규모별 필터링 버튼 (개별 회사가 선택되지 않은 경우만 표시) */}
        {!selectedCompanyId && (
          <div className="mt-4 @md:mt-0">
            <div className="text-sm text-muted-foreground mb-2">기업 규모별 필터</div>
            <CompanySizeFilter
              selectedSize={selectedCompanySize}
              onSizeChange={onCompanySizeChange}
            />
          </div>
        )}
      </CardHeader>
      
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
          {hasProbabilityData ? (
            <ComposedChart data={combinedChartData}>
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
              {/* 왼쪽 Y축: 수량 */}
              <YAxis 
                yAxisId="quantity"
                orientation="left"
                tickFormatter={(value) => value.toLocaleString()}
                domain={[(dataMin) => Math.max(0, dataMin * 0.9), (dataMax) => dataMax * 1.1]}
              />
              {/* 오른쪽 Y축: 확률 (%) */}
              <YAxis 
                yAxisId="probability"
                orientation="right"
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => new Date(value).toLocaleDateString("ko-KR", { year: 'numeric', month: 'long' })}
                    indicator="dot"
                    formatter={(value, name) => {
                      if (name === "averageProbability") {
                        return [`${Number(value).toFixed(1)}%`, "구매 확률"];
                      }
                      return [
                        `${Number(value).toLocaleString()}`,
                        name === "predictedQuantity" ? "예측 수량" : "실제 수량"
                      ];
                    }}
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
                yAxisId="quantity"
                dataKey="predictedQuantity" 
                type="natural" 
                fill="url(#fillPredictedQuantity)"
                stroke="var(--color-predictedQuantity)"
              />
              {/* 실제 수량 Area */}
              <Area 
                yAxisId="quantity"
                dataKey="actualSalesMonthly" 
                type="natural" 
                fill="url(#fillActualSalesMonthly)" 
                stroke="var(--color-actualSalesMonthly)" 
              />
              {/* 확률 라인 */}
              <Line
                yAxisId="probability"
                type="monotone"
                dataKey="averageProbability"
                stroke="var(--color-averageProbability)"
                strokeWidth={2}
                dot={{ fill: "var(--color-averageProbability)", strokeWidth: 2, r: 4 }}
                connectNulls={false}
              />
            </ComposedChart>
          ) : (
            // 확률 데이터가 없는 경우 기존 AreaChart 사용
            <AreaChart data={combinedChartData}>
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
                      `${Number(value).toLocaleString()}`,
                      name === "predictedQuantity" ? "예측 수량" : "실제 수량"
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
                      {payload?.filter(entry => entry.dataKey !== "averageProbability").map((entry, index) => {
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
              <Area
                dataKey="predictedQuantity" 
                type="natural" 
                fill="url(#fillPredictedQuantity)"
                stroke="var(--color-predictedQuantity)"
              />
              <Area 
                dataKey="actualSalesMonthly" 
                type="natural" 
                fill="url(#fillActualSalesMonthly)" 
                stroke="var(--color-actualSalesMonthly)" 
              />
            </AreaChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

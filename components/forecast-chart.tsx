// components/forecast-chart.tsx - 기업 규모별 필터링 수정본

"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart } from "recharts"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"

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

// ✨ 차트 설정
const chartConfig = {
  predictedQuantity: { label: "예측 수량 (월별)", color: "hsl(var(--chart-1))" },
  actualSalesMonthly: { label: "실제 수량 (월별)", color: "hsl(var(--chart-2))" },
  averageProbability: { label: "구매 확률 (%)", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig

// 기업 규모별 필터 버튼 컴포넌트
function CompanySizeFilter({
  selectedSize,
  onSizeChange,
  className,
}: {
  selectedSize: string | null;
  onSizeChange: (size: string | null) => void;
  className?: string;
}) {
  const sizes = [
    { value: null, label: "전체" },
    { value: "대기업", label: "대기업" },
    { value: "중견기업", label: "중견기업" },
    { value: "중소기업", label: "중소기업" },
  ];

  return (
    <div className="flex gap-2">
      {sizes.map((size) => (
        <Button
          key={size.value || 'all'}
          variant={selectedSize === size.value ? "default" : "outline"}
          size="sm"
          onClick={() => onSizeChange(size.value)}
        >
          {size.label}
        </Button>
      ))}
    </div>
  );
}

export function ForecastChart({
  allCompanies,
  selectedCompanyId,
  forecastData,
  actualSalesData,
  selectedCompanySize,
  onCompanySizeChange,
}: {
  allCompanies: Company[];
  selectedCompanyId: string | null;
  forecastData: Forecast[]; 
  actualSalesData: ActualSales[];
  selectedCompanySize: string | null;
  onCompanySizeChange: (size: string | null) => void;
}) {
  // 월별 실제 매출 집계
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

  // ✨ 차트 데이터 생성 (확률 정보 포함)
  const combinedChartData = React.useMemo(() => {
    const dataMap = new Map<string, { 
      predictedQuantity?: number; 
      actualSalesMonthly?: number; 
      probabilityValues?: number[];
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
          ? (values.probabilityValues.reduce((sum, prob) => sum + prob, 0) / values.probabilityValues.length) * 100
          : null;

        return {
          date: date,
          predictedQuantity: values.predictedQuantity || 0,
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

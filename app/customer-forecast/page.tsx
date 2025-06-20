// app/customer-forecast/page.tsx

"use client"

import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable, type Forecast } from "@/components/forecasts-data-table"
// ForecastChart와 그에 필요한 타입들을 임포트합니다.
import { ForecastChart, type Company, type Forecast as ChartForecastType, type ActualSales as ChartActualSalesType } from "@/components/forecast-chart"
import { PageHeader } from "@/components/page-header"

// API 응답 타입과 동일하게 정의합니다.
// Forecast와 ActualSales는 forecast-chart.tsx에서 이미 Export되어 있으므로 재정의하지 않습니다.
// 단, Forecast는 Forecasts-data-table에서도 쓰이고 이름이 겹치므로,
// ForecastChart에서 쓰는 Forecast와 ActualSales는 별칭을 부여하여 혼동을 피합니다.
type ApiCustomerForecastResponse = { // API의 CustomerForecastResponse와 일치
  customerId: number;
  companyName: string | null;
  customerName: string | null;
  companySize: string | null;
  forecasts: ChartForecastType[]; // ForecastChart에서 쓰는 Forecast 타입
  actualSales: ChartActualSalesType[]; // ForecastChart에서 쓰는 ActualSales 타입
};

export default function CustomerForecastPage() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  // `allForecastData`는 이제 API의 `CustomerForecastResponse` 타입 배열입니다.
  const [allForecastData, setAllForecastData] = React.useState<ApiCustomerForecastResponse[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string>("all");
  const [sizeFilter, setSizeFilter] = React.useState<string>("all");
  
  // ✨ 새 예측 실행 상태 추가
  const [isForecasting, setIsForecasting] = React.useState(false);

  // ✨ 데이터 페칭 함수를 별도로 분리
  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/customer-forecast`);
      if (!response.ok) {
          // API 응답이 200 OK가 아니면 에러 처리
          const errorText = await response.text();
          throw new Error(`데이터를 불러오는 데 실패했습니다: ${response.status} ${errorText}`);
      }
      // API 응답 타입을 명시적으로 지정
      const result: ApiCustomerForecastResponse[] = await response.json();
      
      // API 자체에서 에러 필드를 반환할 경우
      if (result && (result as any).error) { // 'result.error'가 있을 수 있으므로 타입 단언
          throw new Error((result as any).detail || "API에서 오류를 반환했습니다.");
      }
      
      setAllForecastData(result);
      // 초기 선택 회사 설정: 'all' 또는 첫 번째 회사
      if (result.length > 0) {
          // 기본값으로 'all'을 설정하고, 실제 데이터가 있으면 필터링된 첫 번째 회사를 보여줄 수 있도록
          // selectedCompanyId가 "all"일 때는 나중에 chartDataForSelectedCompany에서 모든 데이터를 집계합니다.
      }

    } catch (err: any) {
      console.error("데이터 Fetching 실패:", err);
      setError(err.message || "데이터를 불러오는 데 실패했습니다.");
      setAllForecastData([]); // 에러 발생 시 데이터 초기화
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ✨ 새 예측 실행 함수 정의
  const handleRunForecast = React.useCallback(async () => {
    console.log('새 예측 실행 시작...');
    
    setIsForecasting(true);
    
    try {
      // 새 예측 실행 API 호출 (프록시를 통해) - 이 부분이 중요!
      const response = await fetch('/api/trigger-forecast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.detail || `HTTP ${response.status}: 예측 실행에 실패했습니다.`);
      }

      const result = await response.json();
      console.log('예측 실행 결과:', result);
      
      // 성공 후 데이터 새로고침
      await fetchData();
      
      alert('새 예측이 성공적으로 완료되었습니다!');
      
    } catch (error) {
      console.error('예측 실행 실패:', error);
      alert(error instanceof Error ? error.message : '예측 실행 중 오류가 발생했습니다.');
    } finally {
      setIsForecasting(false);
    }
  }, [fetchData]);

  // 회사 규모 필터가 적용된 회사 목록을 계산합니다.
  const filteredCompanies = React.useMemo<ApiCustomerForecastResponse[]>(() => {
    if (sizeFilter === "all") {
      return allForecastData;
    }
    return allForecastData.filter(c => c.companySize === sizeFilter);
  }, [allForecastData, sizeFilter]);

  // 필터링된 회사 목록으로 드롭다운 옵션을 만듭니다.
  const companiesForSelector = React.useMemo<Company[]>(() => [
    { customerId: "all", companyName: "전체 회사", companySize: null },
    ...filteredCompanies.map(c => ({
      customerId: c.customerId,
      companyName: c.companyName,
      companySize: c.companySize,
    })),
  ], [filteredCompanies]);
  
  // 필터가 변경될 때, 회사 선택을 '전체 회사'로 초기화합니다.
  React.useEffect(() => {
    setSelectedCompanyId("all");
  }, [sizeFilter]);


  // ✨✨✨ ForecastChart에 전달할 데이터 계산 로직 대폭 수정 ✨✨✨
  const chartDataForDisplay = React.useMemo(() => {
    let forecastsToDisplay: ChartForecastType[] = [];
    let actualSalesToDisplay: ChartActualSalesType[] = [];

    if (selectedCompanyId === "all") {
      // '전체 회사' 선택 시 모든 필터링된 회사의 데이터를 합산
      const combinedForecastsMap = new Map<string, number>(); // YYYY-MM-DD -> total predicted quantity
      const combinedActualSalesMap = new Map<string, number>(); // YYYY-MM-DD -> total actual sales revenue

      filteredCompanies.forEach(company => {
        company.forecasts.forEach(forecast => {
          const dateKey = forecast.predictedDate.split('T')[0]; // YYYY-MM-DD
          combinedForecastsMap.set(dateKey, (combinedForecastsMap.get(dateKey) || 0) + forecast.predictedQuantity);
        });
        company.actualSales.forEach(sale => {
          const dateKey = sale.date; // YYYY-MM-DD
          combinedActualSalesMap.set(dateKey, (combinedActualSalesMap.get(dateKey) || 0) + sale.quantity);
        });
      });

      // Map을 Forecast 타입과 ActualSales 타입 배열로 변환
      forecastsToDisplay = Array.from(combinedForecastsMap.entries())
        .map(([date, quantity]) => ({ predictedDate: `${date}T00:00:00`, predictedQuantity: quantity }))
        .sort((a, b) => new Date(a.predictedDate).getTime() - new Date(b.predictedDate).getTime());
      
      actualSalesToDisplay = Array.from(combinedActualSalesMap.entries())
        .map(([date, quantity]) => ({ date: date, quantity: quantity }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    } else {
      // 특정 회사 선택 시 해당 회사의 데이터만 사용
      const company = filteredCompanies.find(c => String(c.customerId) === selectedCompanyId);
      if (company) {
        forecastsToDisplay = company.forecasts;
        actualSalesToDisplay = company.actualSales;
      }
    }
    
    return { forecasts: forecastsToDisplay, actualSales: actualSalesToDisplay };
  }, [selectedCompanyId, filteredCompanies]);


  // 테이블 데이터 계산 시, 필터링된 회사 목록을 사용합니다.
  const tableData = React.useMemo<Forecast[]>(() => {
    if (selectedCompanyId === "all") {
      // '전체 회사' 선택 시 모든 회사의 예측 데이터를 플랫맵합니다.
      return filteredCompanies.flatMap(company => company.forecasts)
              .sort((a, b) => new Date(a.predictedDate).getTime() - new Date(b.predictedDate).getTime());
    }
    const company = filteredCompanies.find(c => String(c.customerId) === selectedCompanyId);
    return company?.forecasts.sort((a, b) => new Date(a.predictedDate).getTime() - new Date(b.predictedDate).getTime()) || [];
  }, [selectedCompanyId, filteredCompanies]);

  const pageTitle = "고객 주문 예측";
  const pageDescription = "차트를 통해 회사별 예측 추이를 확인하고, 아래 테이블에서 상세 데이터를 관리하세요.";

  // 로딩 및 에러 UI
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8 space-y-6">
        <PageHeader title={pageTitle} description={pageDescription} />
        <Skeleton className="h-[250px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-8 space-y-6">
        <PageHeader title={pageTitle} description={pageDescription} />
        <div className="text-red-500 font-bold">오류 발생: {error}</div>
      </div>
    );
  }

  // 데이터가 없는 경우의 UI
  if (!allForecastData || allForecastData.length === 0) {
    return (
        <div className="container mx-auto p-4 md:p-8 space-y-6">
            <PageHeader title={pageTitle} description={pageDescription} />
            <div className="text-center text-muted-foreground">
                <p>표시할 데이터가 없습니다.</p>
            </div>
        </div>
    );
  }

  return (
    <>
      <PageHeader
        title={pageTitle}
        description={pageDescription}
      />
      <div className="container mx-auto p-4 md:p-8">
        <div className="space-y-6">
          <ForecastChart
            allCompanies={companiesForSelector}
            selectedCompanyId={selectedCompanyId}
            onCompanyChange={setSelectedCompanyId}
            forecastData={chartDataForDisplay.forecasts}
            actualSalesData={chartDataForDisplay.actualSales}
            sizeFilter={sizeFilter}
            onSizeFilterChange={setSizeFilter}
          />
          {/* ✨ DataTable에 onRunForecast와 isForecasting props 추가 */}
          <DataTable 
            data={tableData} 
            onRunForecast={handleRunForecast}
            isForecasting={isForecasting}
          />
        </div>
      </div>
    </>
  );
}

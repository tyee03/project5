// app/customer-forecast/page.tsx - 새로운 구조에 맞게 수정된 버전

"use client"

import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { CustomerForecastsDataTable, type Forecast } from "@/components/customer-forecasts-data-table"
import { ForecastChart, type Company, type Forecast as ChartForecastType, type ActualSales as ChartActualSalesType } from "@/components/forecast-chart"
import { PageHeader } from "@/components/page-header"

// ✨ API 응답 타입을 PROBABILITY 필드를 포함하도록 수정
type ApiCustomerForecastResponse = { 
  customerId: number;
  companyName: string | null;
  customerName: string | null;
  companySize: string | null;
  forecasts: (ChartForecastType & { 
    cofId: number; 
    customerId: number;
    companyName: string | null;
    customerName: string | null;
    companySize: string | null;
    mape: number | null; 
    predictionModel: string; 
    probability: number | null;
    forecastGenerationDate: string; 
  })[]; 
  actualSales: ChartActualSalesType[];
};

export default function CustomerForecastPage() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [allForecastData, setAllForecastData] = React.useState<ApiCustomerForecastResponse[]>([]);
  
  // ✨ 새로운 상태 관리
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string | null>(null);
  const [selectedCompanySize, setSelectedCompanySize] = React.useState<string | null>(null);
  const [isForecasting, setIsForecasting] = React.useState(false);

  // ✨ 데이터 페칭 함수
  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/customer-forecast`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`데이터를 불러오는 데 실패했습니다: ${response.status} ${errorText}`);
      }
      
      const result: ApiCustomerForecastResponse[] = await response.json();
      
      if (result && (result as any).error) {
        throw new Error((result as any).detail || "API에서 오류를 반환했습니다.");
      }
      
      setAllForecastData(result);

    } catch (err: any) {
      console.error("데이터 Fetching 실패:", err);
      setError(err.message || "데이터를 불러오는 데 실패했습니다.");
      setAllForecastData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ✨ 새 예측 실행 함수
  const handleRunForecast = React.useCallback(async () => {
    console.log('새 예측 실행 시작...');
    
    setIsForecasting(true);
    
    try {
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
      
      await fetchData();
      alert('새 예측이 성공적으로 완료되었습니다!');
      
    } catch (error) {
      console.error('예측 실행 실패:', error);
      alert(error instanceof Error ? error.message : '예측 실행 중 오류가 발생했습니다.');
    } finally {
      setIsForecasting(false);
    }
  }, [fetchData]);

  // ✨ 기업 규모별 필터링된 데이터
  const filteredForecastData = React.useMemo(() => {
    if (!selectedCompanySize) {
      return allForecastData;
    }
    return allForecastData.filter(company => company.companySize === selectedCompanySize);
  }, [allForecastData, selectedCompanySize]);

  // ✨ 모든 회사 정보 (드롭다운용)
  const allCompanies = React.useMemo<Company[]>(() => {
    return allForecastData.map(company => ({
      customerId: company.customerId,
      companyName: company.companyName,
      companySize: company.companySize,
    }));
  }, [allForecastData]);

  // ✨ 차트에 표시할 데이터 계산
  const chartDataForDisplay = React.useMemo(() => {
    let forecastsToDisplay: ChartForecastType[] = [];
    let actualSalesToDisplay: ChartActualSalesType[] = [];

    if (selectedCustomerId) {
      // 특정 고객 선택 시 해당 고객의 데이터만
      const company = allForecastData.find(c => String(c.customerId) === selectedCustomerId);
      if (company) {
        forecastsToDisplay = company.forecasts;
        actualSalesToDisplay = company.actualSales;
      }
    } else {
      // 전체 데이터 또는 기업 규모별 필터링된 데이터
      const dataToAggregate = filteredForecastData;
      
      // 날짜별로 데이터 집계
      const combinedForecastsMap = new Map<string, { 
        quantity: number; 
        probabilities: number[]; 
      }>();
      const combinedActualSalesMap = new Map<string, number>();

      dataToAggregate.forEach(company => {
        company.forecasts.forEach(forecast => {
          const dateKey = forecast.predictedDate.split('T')[0];
          const existing = combinedForecastsMap.get(dateKey) || { quantity: 0, probabilities: [] };
          
          existing.quantity += forecast.predictedQuantity;
          if (forecast.probability !== null && forecast.probability !== undefined) {
            existing.probabilities.push(forecast.probability);
          }
          
          combinedForecastsMap.set(dateKey, existing);
        });
        
        company.actualSales.forEach(sale => {
          const dateKey = sale.date;
          combinedActualSalesMap.set(dateKey, (combinedActualSalesMap.get(dateKey) || 0) + sale.quantity);
        });
      });

      // Map을 배열로 변환
      forecastsToDisplay = Array.from(combinedForecastsMap.entries())
        .map(([date, data]) => ({
          predictedDate: `${date}T00:00:00`,
          predictedQuantity: data.quantity,
          probability: data.probabilities.length > 0 
            ? data.probabilities.reduce((sum, p) => sum + p, 0) / data.probabilities.length 
            : null
        }))
        .sort((a, b) => new Date(a.predictedDate).getTime() - new Date(b.predictedDate).getTime());
      
      actualSalesToDisplay = Array.from(combinedActualSalesMap.entries())
        .map(([date, quantity]) => ({ date: date, quantity: quantity }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    
    return { forecasts: forecastsToDisplay, actualSales: actualSalesToDisplay };
  }, [selectedCustomerId, filteredForecastData, allForecastData]);

  // ✨ 테이블용 플랫 데이터
  const flatForecastData = React.useMemo<Forecast[]>(() => {
    return allForecastData.flatMap(company => 
      company.forecasts.map(forecast => ({
        cofId: forecast.cofId,
        customerId: forecast.customerId,
        companyName: forecast.companyName,
        customerName: forecast.customerName,
        companySize: forecast.companySize,
        predictedDate: forecast.predictedDate,
        predictedQuantity: forecast.predictedQuantity,
        mape: forecast.mape,
        predictionModel: forecast.predictionModel,
        probability: forecast.probability,
        forecastGenerationDate: forecast.forecastGenerationDate
      } as Forecast))
    ).sort((a, b) => new Date(a.predictedDate).getTime() - new Date(b.predictedDate).getTime());
  }, [allForecastData]);

  const pageTitle = "고객 주문 예측";
  const pageDescription = "차트를 통해 전체 또는 기업 규모별 예측 추이를 확인하고, 아래에서 고객별 상세 데이터를 관리하세요.";

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8 space-y-6">
        <PageHeader title={pageTitle} description={pageDescription} />
        <Skeleton className="h-[350px] w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-8 space-y-6">
        <PageHeader title={pageTitle} description={pageDescription} />
        <div className="text-red-500 font-bold">오류 발생: {error}</div>
      </div>
    );
  }

  // 데이터 없음
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
          {/* ✨ 새로운 차트 컴포넌트 */}
          <ForecastChart
            allCompanies={allCompanies}
            selectedCompanyId={selectedCustomerId}
            forecastData={chartDataForDisplay.forecasts}
            actualSalesData={chartDataForDisplay.actualSales}
            selectedCompanySize={selectedCompanySize}
            onCompanySizeChange={setSelectedCompanySize}
          />
          
          {/* ✨ 새로운 테이블 컴포넌트 */}
          <CustomerForecastsDataTable
            data={flatForecastData}
            onRunForecast={handleRunForecast}
            isForecasting={isForecasting}
            selectedCustomerId={selectedCustomerId}
            onCustomerSelect={setSelectedCustomerId}
            selectedCompanySize={selectedCompanySize}
          />
        </div>
      </div>
    </>
  );
}

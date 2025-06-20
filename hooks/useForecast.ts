'use client';

import { DataTable } from '@/components/DataTable';
import { useForecast } from '@/hooks/useForecast';
import { useEffect, useState } from 'react';
import type { Forecast } from '@/components/DataTable';

export default function ForecastPage() {
  const [data, setData] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(true);
  const { runForecast, isForecasting } = useForecast();

  // 데이터 로딩
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/customer-forecast');
        if (response.ok) {
          const result = await response.json();
          setData(result.data || []);
        }
      } catch (error) {
        console.error('데이터 로딩 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">데이터를 로딩 중입니다...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">예측 관리</h1>
        <p className="text-muted-foreground mt-2">
          고객별 수요 예측 데이터를 관리하고 새로운 예측을 실행할 수 있습니다.
        </p>
      </div>
      
      <DataTable 
        data={data}
        onRunForecast={runForecast}
        isForecasting={isForecasting}
      />
    </div>
  );
}

'use client';

import { useState } from 'react';

export function useForecast() {
  const [isForecasting, setIsForecasting] = useState(false);

  const runForecast = async () => {
    setIsForecasting(true);
    
    try {
      console.log('예측 실행 시작...');
      
      const response = await fetch('/api/trigger-forecast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('API 응답 상태:', response.status);
      
      const result = await response.json();
      console.log('API 응답 결과:', result);

      if (!response.ok) {
        throw new Error(result.error || '예측 실행에 실패했습니다');
      }

      // 성공 알림
      alert('예측 작업이 시작되었습니다. GitHub Actions에서 실행 중입니다.');
      
      // 선택사항: 일정 시간 후 새로고침 제안
      setTimeout(() => {
        if (confirm('새로운 예측 결과를 확인하시겠습니까?')) {
          window.location.reload();
        }
      }, 60000); // 1분 후

    } catch (error) {
      console.error('Forecast execution error:', error);
      alert(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setIsForecasting(false);
    }
  };

  return {
    runForecast,
    isForecasting,
  };
}

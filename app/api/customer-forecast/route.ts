// customer_forecast/route.ts 파일 전체

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// (타입 정의는 기존과 동일)
export type ForecastData = {
  cofId: number;
  customerId: number;
  companyName: string | null;
  customerName: string | null;
  companySize: string | null;
  predictedDate: string;
  predictedQuantity: number;
  mape: number | null;
  predictionModel: string;
  forecastGenerationDate: string;
};

export type ActualSalesData = {
  date: string;
  quantity: number;
};

export type CustomerForecastResponse = {
  customerId: number;
  companyName: string | null;
  customerName: string | null;
  companySize: string | null;
  forecasts: ForecastData[];
  actualSales: ActualSalesData[];
};

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ✨ 1. 기업 규모별 정렬 순서 정의
    const sizeOrder: { [key: string]: number } = {
      "대기업": 1,
      "중견기업": 2,
      "중소기업": 3,
    };

    // 2. customer_order_forecast 테이블에서 예측 데이터 가져오기 (이전과 동일)
    const { data: rawForecasts, error: forecastError } = await supabase
      .from("customer_order_forecast")
      .select(`
        COF_ID,
        CUSTOMER_ID,
        PREDICTED_DATE,
        PREDICTED_QUANTITY,
        MAPE,
        PREDICTION_MODEL,
        FORECAST_GENERATION_DATETIME,
        customers (
          COMPANY_NAME,
          NAME,
          COMPANY_SIZE
        )
      `)
      .order("PREDICTED_DATE", { ascending: true });

    if (forecastError) {
      console.error("Supabase forecast fetch error:", forecastError);
      throw forecastError;
    }

    const customerIds = [...new Set(rawForecasts.map(f => f.CUSTOMER_ID))];

    // 3. 실제 주문 데이터 가져오기 (이전과 동일)
    const { data: rawOrdersWithDetails, error: orderJoinError } = await supabase
        .from("orders")
        .select(`
            ORDER_DATE,
            QUANTITY,
            products (
                "SELLINGPRICE" 
            ),
            contacts (  
                CUSTOMER_ID 
            )
        `)
        .in('contacts.CUSTOMER_ID', customerIds) 
        .order("ORDER_DATE", { ascending: true });

    if (orderJoinError) {
        console.error("Supabase orders join fetch error:", orderJoinError);
        throw orderJoinError;
    }

    const actualSalesMap = new Map<number, Map<string, number>>();
    rawOrdersWithDetails.forEach(order => { 
        const customerId = order.contacts?.CUSTOMER_ID; 
        if (customerId === undefined || customerId === null) return; 

        const orderDate = new Date(order.ORDER_DATE);
        const yearMonthDay = `${orderDate.getFullYear()}-${(orderDate.getMonth() + 1).toString().padStart(2, '0')}-${orderDate.getDate().toString().padStart(2, '0')}`;
        
        const sellingPrice = order.products?.SELLINGPRICE || 0;
        const calculatedRevenue = order.QUANTITY * sellingPrice;

        if (!actualSalesMap.has(customerId)) {
            actualSalesMap.set(customerId, new Map<string, number>());
        }
        const customerDailyMap = actualSalesMap.get(customerId)!;
        customerDailyMap.set(yearMonthDay, (customerDailyMap.get(yearMonthDay) || 0) + calculatedRevenue);
    });
    
    // 4. 예측 데이터를 ForecastData 타입으로 변환 (이전과 동일)
    const forecastsData: ForecastData[] = rawForecasts.map(item => ({
        cofId: item.COF_ID,
        customerId: item.CUSTOMER_ID,
        companyName: item.customers?.COMPANY_NAME || null,
        customerName: item.customers?.NAME || null,
        companySize: item.customers?.COMPANY_SIZE || null,
        predictedDate: item.PREDICTED_DATE, 
        predictedQuantity: item.PREDICTED_QUANTITY,
        mape: item.MAPE,
        predictionModel: item.PREDICTION_MODEL,
        forecastGenerationDate: item.FORECAST_GENERATION_DATETIME 
    }));

    // 5. 고객별로 데이터 그룹화 (이전과 동일)
    const customerMap = new Map<number, CustomerForecastResponse>();
    customerIds.forEach(cId => {
      const customerDetails = rawForecasts.find(rf => rf.CUSTOMER_ID === cId)?.customers;
      customerMap.set(cId, {
          customerId: cId,
          companyName: customerDetails?.COMPANY_NAME || null,
          customerName: customerDetails?.NAME || null,
          companySize: customerDetails?.COMPANY_SIZE || null,
          forecasts: [],
          actualSales: [],
      });
    });

    forecastsData.forEach(forecast => {
        if (customerMap.has(forecast.customerId)) {
            customerMap.get(forecast.customerId)!.forecasts.push(forecast);
        }
    });

    customerMap.forEach(customerData => {
        const customerId = customerData.customerId;
        const dailySalesForCustomer = actualSalesMap.get(customerId);
        if (dailySalesForCustomer) {
            customerData.actualSales = Array.from(dailySalesForCustomer.entries()).map(([date, quantity]) => ({
                date: date,
                quantity: quantity,
            })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }
    });

    const customerForecastResponses: CustomerForecastResponse[] = Array.from(customerMap.values());
    
    // ✨ 6. 최종 응답 데이터를 정렬
    customerForecastResponses.sort((a, b) => {
        // companySize가 null이거나 정의되지 않은 경우 가장 낮은 순위(Infinity) 부여
        const orderA = a.companySize ? sizeOrder[a.companySize] : Infinity;
        const orderB = b.companySize ? sizeOrder[b.companySize] : Infinity;

        // 기업 규모 순으로 정렬
        if (orderA !== orderB) {
            return orderA - orderB;
        }

        // 기업 규모가 같다면 회사 이름 가나다순으로 2차 정렬
        return (a.companyName || '').localeCompare(b.companyName || '');
    });

    return NextResponse.json(customerForecastResponses);

  } catch (err: any) {
    console.error("❌ Supabase 처리 실패:", err);
    return NextResponse.json(
      {
        error: "데이터베이스 처리 중 오류가 발생했습니다.",
        detail: err.message,
      },
      { status: 500 }
    );
  }
}
// =================================================================
// 2. app/api/customer-forecast/route.ts - 수정본
// =================================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ✨ 타입 정의에 probability 추가
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
  probability: number | null; // ✨ 새로 추가
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

    const sizeOrder: { [key: string]: number } = {
      "대기업": 1,
      "중견기업": 2,
      "중소기업": 3,
    };

    // ✨ SELECT 쿼리에 PROBABILITY 추가
    const { data: rawForecasts, error: forecastError } = await supabase
      .from("customer_order_forecast")
      .select(`
        COF_ID,
        CUSTOMER_ID,
        PREDICTED_DATE,
        PREDICTED_QUANTITY,
        MAPE,
        PREDICTION_MODEL,
        PROBABILITY,
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

    // 실제 주문 데이터 가져오기 (기존과 동일)
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
    
    // ✨ 예측 데이터 변환 시 probability 추가
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
        probability: item.PROBABILITY, // ✨ 새로 추가
        forecastGenerationDate: item.FORECAST_GENERATION_DATETIME 
    }));

    // 고객별로 데이터 그룹화 (기존과 동일)
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
    
    // 최종 응답 데이터 정렬
    customerForecastResponses.sort((a, b) => {
        const orderA = a.companySize ? sizeOrder[a.companySize] : Infinity;
        const orderB = b.companySize ? sizeOrder[b.companySize] : Infinity;

        if (orderA !== orderB) {
            return orderA - orderB;
        }

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

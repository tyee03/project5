// app/api/customer-forecast/[cof_id]/route.ts (최종 수정본)

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PATCH(
  request: Request,
  { params }: { params: { cof_id: string } }
) {
  try {
    const body = await request.json();
    const cofId = params.cof_id;

    if (!cofId) {
      return NextResponse.json({ error: "Forecast ID is required" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const dataToUpdate: { [key: string]: any } = {};
    if (body.predictedDate) dataToUpdate['PREDICTED_DATE'] = body.predictedDate;
    if (body.predictedQuantity !== undefined) dataToUpdate['PREDICTED_QUANTITY'] = body.predictedQuantity;
    if (body.mape !== undefined) dataToUpdate['MAPE'] = body.mape;
    if (body.predictionModel) dataToUpdate['PREDICTION_MODEL'] = body.predictionModel;
    
    if (Object.keys(dataToUpdate).length === 0) {
        return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { error } = await supabase
      .from("customer_order_forecast")
      .update(dataToUpdate)
      .eq("COF_ID", cofId);

    if (error) {
      throw error;
    }

    // ✨ 가장 중요: 성공 시, 내용 없이 204 상태 코드만 반환합니다.
    return new Response(null, { status: 204 });

  } catch (err: any) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    console.error("❌ Supabase PATCH 실패:", detail);
    return NextResponse.json(
      { error: "데이터베이스 업데이트 중 오류가 발생했습니다.", detail: detail },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { cof_id: string } }
) {
  const cofId = params.cof_id;

  if (!cofId) {
    return NextResponse.json({ error: "Forecast ID is required" }, { status: 400 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from("customer_order_forecast")
      .delete()
      .eq("COF_ID", cofId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: `Forecast ID ${cofId} deleted successfully.` });

  } catch (err: any) {
    console.error("❌ Supabase DELETE 실패:", err);
    return NextResponse.json(
      {
        error: "데이터베이스 삭제 중 오류가 발생했습니다.",
        detail: err.message,
      },
      { status: 500 }
    );
  }
}
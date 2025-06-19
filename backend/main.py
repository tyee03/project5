# backend/main.py - 완전한 버전
# 실제 예측 파이프라인 실행

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import sys
import os
import json

# 경로 설정
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# 실제 forecast 함수 import
try:
    from forecast.forecast import run_monthly_forecast_pipeline
    FORECAST_AVAILABLE = True
    print("✅ forecast.forecast 모듈 성공적으로 import됨")
except ImportError as e:
    print(f"❌ forecast.forecast 모듈 import 실패: {e}")
    FORECAST_AVAILABLE = False

# FastAPI 앱 생성
app = FastAPI(title="Customer Forecast API")

@app.get("/")
async def root():
    return {
        "message": "Customer Forecast API",
        "forecast_available": FORECAST_AVAILABLE,
        "environment": "vercel"
    }

@app.get("/forecast")
@app.post("/forecast")
async def forecast_handler(request: Request = None):
    try:
        print("🚀 Vercel 함수: 실제 예측 파이프라인 실행 시작...")
        
        if FORECAST_AVAILABLE:
            print("📊 실제 run_monthly_forecast_pipeline() 실행 중...")
            
            # 실제 예측 파이프라인 실행!
            run_monthly_forecast_pipeline()
            
            print("✅ 실제 예측 파이프라인 실행 완료!")
            
            result = {
                "status": "success",
                "message": "월별 주문 예측 파이프라인이 성공적으로 완료되었습니다!",
                "environment": "vercel-production",
                "forecast_executed": True,
                "pipeline": "run_monthly_forecast_pipeline",
                "features": [
                    "Prophet 모델",
                    "ARIMA 모델", 
                    "교차 검증",
                    "MAPE 최적화",
                    "Supabase 연동"
                ]
            }
        else:
            print("⚠️ forecast 모듈을 사용할 수 없음 - 시뮬레이션 모드")
            result = {
                "status": "success",
                "message": "예측 시뮬레이션이 완료되었습니다 (실제 모듈 없음)",
                "environment": "vercel-simulation",
                "forecast_executed": False,
                "note": "forecast.forecast 모듈을 찾을 수 없어 시뮬레이션으로 처리됨",
                "missing_module": "forecast.forecast"
            }
        
        print("📤 Vercel 함수: 응답 준비 완료")
        return result
        
    except Exception as e:
        print(f"💥 Vercel 함수 실행 중 오류: {e}")
        import traceback
        error_trace = traceback.format_exc()
        print(f"상세 오류:\n{error_trace}")
        
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": "예측 파이프라인 실행 중 오류가 발생했습니다",
                "detail": str(e),
                "forecast_executed": False,
                "error_type": type(e).__name__
            }
        )

# Vercel 서버리스 함수 핸들러
def handler(request):
    try:
        from mangum import Mangum
        asgi_app = Mangum(app)
        return asgi_app(request)
    except ImportError as e:
        print(f"mangum import 실패: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({
                "status": "error",
                "message": "mangum 라이브러리를 사용할 수 없습니다",
                "detail": str(e),
                "forecast_executed": False
            })
        }
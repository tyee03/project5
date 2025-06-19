# api/index.py - Vercel용 올바른 위치
# FastAPI 애플리케이션

from fastapi import FastAPI
import sys
import os

# 백엔드 폴더 경로 추가
backend_path = os.path.join(os.path.dirname(__file__), '../backend')
sys.path.insert(0, backend_path)

# 실제 forecast 함수 import 시도
try:
    from forecast.forecast import run_monthly_forecast_pipeline
    FORECAST_AVAILABLE = True
    print("✅ forecast.forecast 모듈 성공적으로 import됨")
except ImportError as e:
    print(f"❌ forecast.forecast 모듈 import 실패: {e}")
    FORECAST_AVAILABLE = False

# FastAPI 앱 생성
app = FastAPI(
    title="Customer Forecast API",
    description="고객 주문 예측 API",
    version="1.0.0"
)

@app.get("/")
async def root():
    return {
        "message": "Customer Forecast API is running!",
        "forecast_available": FORECAST_AVAILABLE,
        "environment": "vercel-serverless"
    }

@app.get("/forecast")
@app.post("/forecast")
async def run_forecast():
    """실제 예측 파이프라인 실행"""
    try:
        print("🚀 예측 파이프라인 실행 시작...")
        
        if FORECAST_AVAILABLE:
            print("📊 실제 run_monthly_forecast_pipeline() 실행")
            
            # 실제 예측 함수 실행
            run_monthly_forecast_pipeline()
            
            return {
                "status": "success", 
                "message": "월별 주문 예측 파이프라인이 성공적으로 완료되었습니다!",
                "forecast_executed": True,
                "environment": "vercel-python"
            }
        else:
            return {
                "status": "success",
                "message": "예측 시뮬레이션 완료 (forecast 모듈 없음)", 
                "forecast_executed": False,
                "note": "forecast.forecast 모듈을 찾을 수 없음"
            }
            
    except Exception as e:
        print(f"💥 예측 실행 중 오류: {e}")
        return {
            "status": "error",
            "message": "예측 파이프라인 실행 실패",
            "detail": str(e),
            "forecast_executed": False
        }

@app.get("/health")
async def health_check():
    """헬스 체크"""
    return {"status": "healthy", "service": "forecast-api"}
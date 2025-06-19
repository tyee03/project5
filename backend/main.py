# backend/main.py
from fastapi import FastAPI, HTTPException
from forecast.forecast import run_monthly_forecast_pipeline

# Vercel 함수용 FastAPI 앱
app = FastAPI()

# Vercel에서 함수로 실행될 핸들러
def handler(request):
    return app(request)

@app.get("/forecast")
async def trigger_forecast_pipeline():
    try:
        print("API 요청: run_monthly_forecast_pipeline 실행 시작...")
        run_monthly_forecast_pipeline()
        print("API 요청: run_monthly_forecast_pipeline 실행 완료 및 DB 업데이트됨.")
        return {"status": "Forecast pipeline executed successfully and data updated in DB."}
    except Exception as e:
        print(f"API 요청 중 run_monthly_forecast_pipeline 실행 오류: {e}")
        raise HTTPException(status_code=500, detail=f"Pipeline execution failed: {str(e)}")
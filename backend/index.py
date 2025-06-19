from fastapi import FastAPI
from mangum import Mangum
import json

# 기존 예측 코드 import
from forecast import run_monthly_forecast_pipeline  # 또는 해당 함수

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Backend API is running"}

@app.post("/api/run-forecast")
def run_forecast():
    try:
        run_monthly_forecast_pipeline()
        return {"status": "success", "message": "예측 완료"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Vercel용 핸들러
handler = Mangum(app)
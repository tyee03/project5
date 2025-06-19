from fastapi import FastAPI, HTTPException
from forecast.forecast import run_monthly_forecast_pipeline

app = FastAPI()

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

# 예시: DB에서 결과를 조회하는 별도 API 엔드포인트
# from forecast.forecast import get_forecast_results_json # forecast.py에 해당 함수가 정의되어 있어야 함
# @app.get("/forecast/results")
# async def get_results(customer_id: str = None, start_date: str = None, end_date: str = None):
#     results = get_forecast_results_json(customer_id=customer_id, start_date_str=start_date, end_date_str=end_date)
#     return results
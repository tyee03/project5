# backend/main.py
# Vercel 서버리스 함수용

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import sys
import os

# FastAPI 앱 생성
app = FastAPI()

@app.get("/")
@app.get("/forecast")
async def forecast_handler(request: Request = None):
    try:
        print("Vercel 함수: 예측 파이프라인 실행 시작...")
        
        # 임시로 테스트 응답 (실제 forecast 함수는 나중에 추가)
        result = {
            "status": "success",
            "message": "Forecast pipeline executed successfully on Vercel!",
            "environment": "vercel",
            "python_version": sys.version,
            "path": os.getcwd()
        }
        
        print("Vercel 함수: 예측 완료")
        return result
        
    except Exception as e:
        print(f"Vercel 함수 오류: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": "Pipeline execution failed",
                "detail": str(e)
            }
        )

# Vercel 서버리스 함수 핸들러
def handler(request):
    from mangum import Mangum
    asgi_app = Mangum(app)
    return asgi_app(request)
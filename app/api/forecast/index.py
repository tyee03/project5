# app/api/forecast/index.py - 완전한 버전
# 실제 백엔드 예측 프로그램 실행

from http.server import BaseHTTPRequestHandler
import json
import sys
import os

# 백엔드 forecast 모듈 import 시도
try:
    # 경로 추가
    backend_path = os.path.join(os.path.dirname(__file__), '../../../backend')
    sys.path.insert(0, backend_path)
    
    from forecast.forecast import run_monthly_forecast_pipeline
    FORECAST_AVAILABLE = True
    print("✅ forecast.forecast 모듈 성공적으로 import됨")
except ImportError as e:
    print(f"❌ Forecast 모듈 import 실패: {e}")
    FORECAST_AVAILABLE = False

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        try:
            if FORECAST_AVAILABLE:
                print("🚀 실제 예측 파이프라인 실행 시작...")
                
                # 실제 예측 함수 실행
                run_monthly_forecast_pipeline()
                
                result = {
                    "status": "success",
                    "message": "월별 주문 예측 파이프라인이 성공적으로 실행되었습니다!",
                    "environment": "vercel-python-api",
                    "forecast_executed": True,
                    "pipeline": "run_monthly_forecast_pipeline"
                }
                print("✅ 예측 파이프라인 실행 완료!")
                
            else:
                result = {
                    "status": "success",
                    "message": "예측 시뮬레이션이 완료되었습니다 (forecast 모듈 없음)",
                    "environment": "vercel-python-simulation",
                    "forecast_executed": False,
                    "note": "실제 forecast 모듈을 찾을 수 없어 시뮬레이션으로 처리됨"
                }
            
            self.wfile.write(json.dumps(result).encode())
            
        except Exception as e:
            print(f"💥 예측 실행 중 오류: {e}")
            error_response = {
                "status": "error", 
                "message": "예측 파이프라인 실행 실패",
                "detail": str(e),
                "forecast_executed": False
            }
            self.wfile.write(json.dumps(error_response).encode())
    
    def do_POST(self):
        # POST 요청도 같은 방식으로 처리
        self.do_GET()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
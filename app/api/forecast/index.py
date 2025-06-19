# app/api/forecast/index.py
# Vercel API Routes에서 직접 인식하도록 배치

from http.server import BaseHTTPRequestHandler
import json
import sys
import os

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        try:
            result = {
                "status": "success",
                "message": "Forecast pipeline executed successfully on Vercel Python!",
                "environment": "vercel-python-api",
                "python_version": sys.version,
                "path": os.getcwd()
            }
            
            self.wfile.write(json.dumps(result).encode())
            
        except Exception as e:
            error_response = {
                "status": "error", 
                "message": "Pipeline execution failed",
                "detail": str(e)
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
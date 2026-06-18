import os
import sys
import shutil
import json
import csv
from typing import Annotated, List
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import traceback
import main
import pandas as pd
from backend_analytics import generate_analytics_payload

sys.stdout.reconfigure(encoding='utf-8')

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

INPUT_DIR = "input_data/sample"
OUTPUT_CSV = "extraction_output/sample_claims.csv"
OUTPUT_JSON = "extraction_output/sample_metrics.json"

@app.get("/health")
def health_check():
    return {"status": "ok"}

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    print(f"422 Error: {exc.errors()}")
    print(f"Body: {exc.body}")
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

from typing import Optional

@app.post("/api/process-loss-run")
async def process_loss_run(
    files: Optional[List[UploadFile]] = File(None),
    file: Optional[UploadFile] = File(None)
):
    upload_files = []
    if files:
        upload_files.extend(files)
    if file:
        upload_files.append(file)
        
    print("Received files:", [f.filename for f in upload_files])
    
    files = upload_files  # to maintain compatibility with the rest of the code
    # 1. Clear input_data/sample directory
    if os.path.exists(INPUT_DIR):
        shutil.rmtree(INPUT_DIR)
    os.makedirs(INPUT_DIR, exist_ok=True)
    
    # 2. Save uploaded files
    saved_files = 0
    for file in files:
        if file.filename:
            file_path = os.path.join(INPUT_DIR, file.filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            saved_files += 1

    if saved_files == 0:
        raise HTTPException(status_code=400, detail="No valid files uploaded.")

    try:
        # 3. Trigger main pipeline in a subprocess to avoid asyncio loop conflicts
        import subprocess
        result = subprocess.run(
            [sys.executable, "main.py"],
            cwd=os.path.dirname(os.path.abspath(__file__)),
            capture_output=True,
            text=True,
            timeout=600
        )
        if result.returncode != 0:
            raise Exception(f"Subprocess failed with code {result.returncode}\nStdout: {result.stdout}\nStderr: {result.stderr}")
    except Exception as e:
        err = traceback.format_exc()
        with open("error_traceback.log", "w", encoding="utf-8") as f:
            f.write(err)
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}\n\nTraceback: {err}")

    # 4. Check if outputs exist
    if not os.path.exists(OUTPUT_CSV) or not os.path.exists(OUTPUT_JSON):
        raise HTTPException(status_code=500, detail="Processing completed but output files are missing.")

    # 5. Parse and aggregate via backend_analytics
    try:
        df = pd.read_csv(OUTPUT_CSV)
    except Exception as e:
        df = pd.DataFrame()
        print(f"Warning: Failed to read CSV for analytics: {e}")

    metrics = {}
    try:
        with open(OUTPUT_JSON, mode="r", encoding="utf-8") as f:
            metrics = json.load(f)
    except Exception as e:
        pass
        
    total_time = 0.0
    if metrics and "sample" in metrics and "COMPANY_TOTAL" in metrics["sample"]:
        total_time = metrics["sample"]["COMPANY_TOTAL"].get("time_seconds", 0.0)

    try:
        payload = generate_analytics_payload(df, saved_files, total_time)
        payload["status"] = "success"
    except Exception as e:
        err = traceback.format_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate analytics payload: {str(e)}\n{err}")

    # Log to backend console
    print("\n" + "="*50)
    print("API RESPONSE")
    print(json.dumps(payload, indent=2))
    print("="*50 + "\n")

    return payload

@app.get("/api/download/csv")
def download_csv():
    if not os.path.exists(OUTPUT_CSV):
        raise HTTPException(status_code=404, detail="CSV not found")
    return FileResponse(OUTPUT_CSV, media_type="text/csv", filename="sample_claims.csv")

@app.get("/api/download/json")
def download_json():
    if not os.path.exists(OUTPUT_JSON):
        raise HTTPException(status_code=404, detail="JSON not found")
    return FileResponse(OUTPUT_JSON, media_type="application/json", filename="sample_metrics.json")

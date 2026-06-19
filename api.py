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
import math
from backend_analytics import generate_analytics_payload, generate_excel_report

def replace_nan(obj):
    if isinstance(obj, dict):
        return {k: replace_nan(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [replace_nan(v) for v in obj]
    elif isinstance(obj, float) and math.isnan(obj):
        return None
    return obj

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
OUTPUT_EXCEL = "extraction_output/loss_run_output.xlsx"

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
    
    print("Cleaning previous run folders")
    for folder in ["input_data", "output_data", "extraction_output"]:
        if os.path.exists(folder):
            for filename in os.listdir(folder):
                file_path = os.path.join(folder, filename)
                try:
                    if os.path.isfile(file_path) or os.path.islink(file_path):
                        os.unlink(file_path)
                    elif os.path.isdir(file_path):
                        shutil.rmtree(file_path)
                except Exception as e:
                    pass
        else:
            os.makedirs(folder, exist_ok=True)
            
    os.makedirs(INPUT_DIR, exist_ok=True)
    
    # 2. Save uploaded files
    saved_files = 0
    filenames = []
    for file in files:
        if file.filename:
            file_path = os.path.join(INPUT_DIR, file.filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            saved_files += 1
            filenames.append(file.filename)

    print("Saved uploaded files:", filenames)
    print("Input folder after cleanup:", os.listdir(INPUT_DIR))

    if saved_files == 0:
        raise HTTPException(status_code=400, detail="No valid files uploaded.")

    try:
        # 3. Trigger main pipeline in a subprocess to avoid asyncio loop conflicts
        import subprocess
        print("STEP 2: Starting main.py subprocess")
        try:
            process = subprocess.Popen(
                [sys.executable, "-u", "main.py"],
                cwd=os.path.dirname(os.path.abspath(__file__)),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                bufsize=1
            )
            
            for line in process.stdout:
                print("[MAIN]", line.rstrip(), flush=True)
                
            return_code = process.wait(timeout=600)
            
            print("STEP 3: main.py subprocess finished with code", return_code, flush=True)
            
            if return_code != 0:
                raise Exception(f"Subprocess failed with code {return_code}")
        except subprocess.TimeoutExpired:
            print("STEP 3: main.py subprocess timed out")
            process.kill()
            raise Exception("main.py timed out after 600 seconds")
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

    extraction_mode = "llm"
    if not df.empty and "extractionMode" in df.columns:
        modes = df["extractionMode"].dropna().unique()
        if len(modes) > 0:
            if "direct_pandas" in modes:
                extraction_mode = "direct_pandas"
            elif "pdf_text_fallback" in modes:
                extraction_mode = "pdf_text_fallback"
            elif "fallback_no_llm" in modes:
                extraction_mode = "fallback_no_llm"
                
    if extraction_mode == "pdf_text_fallback":
        print("[PDF FALLBACK] extractionMode propagated: pdf_text_fallback")

    try:
        payload = generate_analytics_payload(df, saved_files, total_time, extraction_mode)
        
        # Build the full multi-sheet Excel file
        generate_excel_report(df, payload, metrics, OUTPUT_EXCEL)
        
        payload["status"] = "success"
        payload = replace_nan(payload)
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

@app.get("/api/download/excel")
def download_excel():
    print("[DOWNLOAD] Excel requested", flush=True)
    if not os.path.exists(OUTPUT_EXCEL):
        raise HTTPException(status_code=404, detail="Master Excel output not found")
    print(f"[DOWNLOAD] Returning: {OUTPUT_EXCEL}", flush=True)
    return FileResponse(OUTPUT_EXCEL, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename="loss_run_output.xlsx")

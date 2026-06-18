import os
import shutil
import json
import csv
from typing import List
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import traceback
import main

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

@app.post("/api/process-loss-run")
def process_loss_run(files: List[UploadFile] = File(...)):
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
        # 3. Trigger main pipeline
        main.main()
    except Exception as e:
        err = traceback.format_exc()
        with open("error_traceback.log", "w", encoding="utf-8") as f:
            f.write(err)
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}\n\nTraceback: {err}")

    # 4. Check if outputs exist
    if not os.path.exists(OUTPUT_CSV) or not os.path.exists(OUTPUT_JSON):
        raise HTTPException(status_code=500, detail="Processing completed but output files are missing.")

    # 5. Parse preview data
    claims_preview = []
    try:
        with open(OUTPUT_CSV, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                if i >= 100:  # Limit preview to 100 rows
                    break
                claims_preview.append(row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read CSV output: {str(e)}")

    metrics = {}
    try:
        with open(OUTPUT_JSON, mode="r", encoding="utf-8") as f:
            metrics = json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read JSON output: {str(e)}")

    return {
        "status": "success",
        "filesProcessed": saved_files,
        "outputCsvPath": OUTPUT_CSV,
        "metrics": metrics,
        "claimsPreview": claims_preview
    }

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

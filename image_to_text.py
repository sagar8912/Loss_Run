import os
import json
import re

try:
    import pytesseract
    from PIL import Image
    try:
        pytesseract.get_tesseract_version()
        OCR_AVAILABLE = True
    except Exception:
        OCR_AVAILABLE = False
except ImportError:
    OCR_AVAILABLE = False

def extract_text_from_images(companies, output_root, is_file_loss_run_dict):
    for company in companies:
        company_dir = os.path.join(output_root, company)
        if not os.path.isdir(company_dir):
            continue
            
        for subfolder in os.listdir(company_dir):
            if subfolder.lower() in ["csvs", "excel_sheets"]:
                continue
                
            info = is_file_loss_run_dict.get((company, subfolder))
            if info is not None and not bool(info.get("is_loss_run")):
                continue
                
            subfolder_path = os.path.join(company_dir, subfolder)
            if not os.path.isdir(subfolder_path):
                continue
                
            image_files = [f for f in os.listdir(subfolder_path) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
            if not image_files:
                continue
                
            json_path = os.path.join(subfolder_path, "page_response.json")
            if os.path.isfile(json_path):
                continue  # already generated
                
            print(f"[OCR] Processing folder: {subfolder}")
            print(f"[OCR] Images found: {len(image_files)}")
            
            page_text_map = {}
            
            if not OCR_AVAILABLE:
                print("[OCR ERROR] OCR engine not available")
                # Fallback: extract text directly from PDF so pipeline succeeds
                try:
                    import fitz
                    input_dir = os.path.join("input_data", company)
                    pdf_found = False
                    if os.path.exists(input_dir):
                        for f in os.listdir(input_dir):
                            if f.lower().endswith(".pdf"):
                                root = os.path.splitext(f)[0]
                                sanitized_root = re.sub(r"[^A-Za-z0-9_.-]+", "_", root).strip("_")
                                if sanitized_root[:15] in subfolder or subfolder[:15] in sanitized_root:
                                    pdf_path = os.path.join(input_dir, f)
                                    doc = fitz.open(pdf_path)
                                    for i, page in enumerate(doc):
                                        page_text_map[str(i+1)] = page.get_text("text")
                                    pdf_found = True
                                    print(f"[OCR] Extracted text from PDF directly using PyMuPDF (fitz) fallback")
                                    break
                    
                    if not pdf_found:
                        # Fallback empty string if pdf text extraction failed
                        for img_file in image_files:
                            match = re.search(r"image-page-(\d+)\.", img_file, re.IGNORECASE)
                            if match:
                                page_text_map[match.group(1)] = ""
                except Exception as e:
                    print(f"[OCR ERROR] PDF Text fallback failed: {e}")
                    for img_file in image_files:
                        match = re.search(r"image-page-(\d+)\.", img_file, re.IGNORECASE)
                        if match:
                            page_text_map[match.group(1)] = ""
            else:
                for img_file in image_files:
                    match = re.search(r"image-page-(\d+)\.", img_file, re.IGNORECASE)
                    if match:
                        page_num = match.group(1)
                        img_path = os.path.join(subfolder_path, img_file)
                        try:
                            text = pytesseract.image_to_string(Image.open(img_path))
                            page_text_map[page_num] = text
                        except Exception as e:
                            print(f"[OCR ERROR] Failed to OCR {img_file}: {e}")
                            page_text_map[page_num] = ""
            
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(page_text_map, f, ensure_ascii=False, indent=4)
                
            print(f"[OCR] page_response.json saved: {json_path}")

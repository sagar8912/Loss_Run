import os
import sys
import shutil
from docx_to_pdf import convert_docx_to_pdf
from detect_loss_runs import detect_loss_runs
from pdf_to_images import turn_pdf_to_images
from determine_pdf_cutoff import determine_page_cutoffs
from extract import extract_claims
from clean_extraction_output import process_claims_df
from detect_duplicates import detect_duplicate_claims_across_files
from metrics import save_metrics_json, reset_metrics

sys.stdout.reconfigure(encoding='utf-8')

def prepare_excel_csv_files(input_data_dir, output_data_dir, company_names):
    """
    Finds Excel and CSV files in the input_data folder and copies them
    to the output_data folder under excel_sheets/ and csvs/ subfolders
    as expected by the downstream detection and extraction steps.
    """
    for company in company_names:
        company_input_dir = os.path.join(input_data_dir, company)
        if not os.path.isdir(company_input_dir):
            continue
            
        company_output_dir = os.path.join(output_data_dir, company)
        excel_out_dir = os.path.join(company_output_dir, "excel_sheets")
        csv_out_dir = os.path.join(company_output_dir, "csvs")
        
        for root, _, files in os.walk(company_input_dir):
            for file in files:
                file_lower = file.lower()
                src_path = os.path.join(root, file)
                
                if file_lower.endswith((".xls", ".xlsx", ".xlsm", ".xlsb")):
                    os.makedirs(excel_out_dir, exist_ok=True)
                    shutil.copy2(src_path, os.path.join(excel_out_dir, file))
                    print(f"Copied Excel: {file} to output_data")
                elif file_lower.endswith(".csv"):
                    os.makedirs(csv_out_dir, exist_ok=True)
                    shutil.copy2(src_path, os.path.join(csv_out_dir, file))
                    print(f"Copied CSV: {file} to output_data")

def main():
    print("MAIN STARTED", flush=True)
    reset_metrics()
    input_data_dir = "input_data"
    output_data_dir = "output_data"
    extraction_data_dir = "extraction_output"
    
    # Configure the folder name under input_data and the output prefix
    company_names = ["sample"]
    file_path_prefix = "sample_"
    
    # 1. Convert Word (.docx) documents to PDF
    print("DOCX CONVERSION STARTED", flush=True)
    convert_docx_to_pdf(input_data_dir, company_names)
    print("DOCX CONVERSION COMPLETED", flush=True)
    
    # 2. Copy raw Excel/CSV files to output folders
    print("EXCEL COPY STARTED", flush=True)
    prepare_excel_csv_files(input_data_dir, output_data_dir, company_names)
    print("EXCEL COPY COMPLETED", flush=True)
    
    # 3. Detect which documents are loss runs
    print("LOSS RUN DETECTION STARTED", flush=True)
    is_file_loss_run_dict = detect_loss_runs(output_data_dir, company_names)
    print("LOSS RUN DETECTION COMPLETED", flush=True)
    
    # 4. Convert PDF pages to image sheets (handles rotation check)
    print("PDF TO IMAGE CONVERSION STARTED", flush=True)
    turn_pdf_to_images(company_names, input_data_dir, output_data_dir, is_file_loss_run_dict)
    print("PDF TO IMAGE CONVERSION COMPLETED", flush=True)
    
    # 4.5 Image to Text OCR
    print("OCR STARTED", flush=True)
    from image_to_text import extract_text_from_images
    extract_text_from_images(company_names, output_data_dir, is_file_loss_run_dict)
    print("OCR COMPLETED", flush=True)
    
    # 5. Calculate page cutoff boundaries
    print("PAGE CUTOFF CALCULATION STARTED", flush=True)
    pages_to_join_dict = determine_page_cutoffs(output_data_dir, company_names, is_file_loss_run_dict)
    print("PAGE CUTOFF CALCULATION COMPLETED", flush=True)
    
    # 6. Extract structured claims JSON
    print("CLAIM EXTRACTION STARTED", flush=True)
    claims_df = extract_claims(output_data_dir, company_names, pages_to_join_dict, is_file_loss_run_dict)
    print("CLAIM EXTRACTION COMPLETED", flush=True)
    
    # 7. Clean and normalize the output DataFrame
    print("CLEANING STARTED", flush=True)
    claims_df = process_claims_df(claims_df)
    print("CLEANING COMPLETED", flush=True)
    
    # 9. Save CSV output
    print("OUTPUT GENERATION STARTED", flush=True)
    os.makedirs(extraction_data_dir, exist_ok=True)
    
    print(f"[CLEANING] Rows before CSV save: {len(claims_df)}", flush=True)

    claims_df.to_csv(f"{extraction_data_dir}/{file_path_prefix}claims.csv", index=False)
    
    # 10. Save metrics JSON
    metrics_output_path = f"{extraction_data_dir}/{file_path_prefix}metrics.json"
    save_metrics_json(metrics_output_path)
    print("OUTPUT GENERATION COMPLETED", flush=True)

if __name__ == "__main__":
    main()

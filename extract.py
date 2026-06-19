import os
import time
import json
import re
import asyncio
import difflib
from typing import Optional
import pandas as pd
from utils_excel_csv_to_json_advanced import get_excel_csv_chunks_advanced
from utils_excel_csv_to_json_advanced import save_chunks_to_company_folder, format_chunk_for_llm_json, DEMO_MODE, DEMO_PARALLEL_LLM, FULL_EXTRACTION_MODE
from utils_gpt import gpt_call
from utils_gpt_vision import gpt_vision_call
from prompts import (
    CLAIM_LEVEL_PDF_DOCX_PROMPT_BACKGROUND,
    CLAIM_LEVEL_EXCEL_CSV_PROMPT_BACKGROUND,
    CLAIM_LEVEL_EXTRACTION_PROMPT,
    NO_CLAIMS_PDF_DOCX_PROMPT_BACKGROUND,
    NO_CLAIMS_EXCEL_CSV_PROMPT_BACKGROUND,
    NO_CLAIMS_EXTRACTION_PROMPT
)
import models
from metrics import record_stage

def parse_pdf_text_fallback(input_json):
    """
    Fallback parser when LLM fails. Parses known structured text.
    input_json: dict mapping page_key (string) -> page_text (string)
    """
    claims = []
    
    for page_key, text in input_json.items():
        if not text:
            continue
            
        print(f"            [PDF FALLBACK DEBUG] Page {page_key} text preview: {text[:1000].replace(chr(10), ' ')}")
            
        # Determine Line of Business
        lob = "Unknown"
        text_lower = text.lower()
        if "auto liability" in text_lower or "policy type: auto" in text_lower:
            lob = "Auto"
        elif "workers compensation" in text_lower:
            lob = "Workers Compensation"
        elif "property" in text_lower:
            lob = "Property"
        elif "general liability" in text_lower:
            lob = "General Liability"
            
        print(f"            [PDF FALLBACK DEBUG] Page {page_key} LOB detected: {lob}")
            
        # Regex patterns for each type using lookahead to ensure correct boundaries in flat text
        auto_pattern = re.compile(r"(A\d+)\s+(\d{4}-\d{2}-\d{2})\s+(.+?)\s+\$?([\d,]+)\s+\$?([\d,]+)\s+\$?([\d,]+)(?=\s+A\d+|\s*$)", re.IGNORECASE)
        wc_pattern = re.compile(r"(WC\d+)\s+(\d{4}-\d{2}-\d{2})\s+(.+?)\s+(Open|Closed|Reopen|Incident)\s+\$?([\d,]+)\s+\$?([\d,]+)(?=\s+WC\d+|\s*$)", re.IGNORECASE)
        prop_pattern = re.compile(r"(P\d+)\s+(\d{4}-\d{2}-\d{2})\s+(.+?)\s+\$?([\d,]+)\s+\$?([\d,]+)\s+\$?([\d,]+)(?=\s+P\d+|\s*$)", re.IGNORECASE)
        gl_pattern = re.compile(r"(GL\d+)\s+(\d{4}-\d{2}-\d{2})\s+(.+?)\s+(Claimant\s+\d+)\s+\$?([\d,]+)\s+\$?([\d,]+)\s+\$?([\d,]+)(?=\s+GL\d+|\s*$)", re.IGNORECASE)

        page_matched = 0
        flat_text = " ".join(text.split())

        if lob == "Auto":
            for m in auto_pattern.finditer(flat_text):
                claims.append({
                    "claim_id": m.group(1),
                    "loss_date": m.group(2),
                    "claim_description": m.group(3).strip(),
                    "total_paid": m.group(4).replace(',', ''),
                    "total_reserve": m.group(5).replace(',', ''),
                    "total_incurred": m.group(6).replace(',', ''),
                    "line_of_business": "Auto",
                    "source_page": page_key,
                    "extractionMode": "pdf_text_fallback",
                    "duplicate_flag": False,
                    "selected_for_rollup": True
                })
                page_matched += 1
        
        elif lob == "Workers Compensation":
            for m in wc_pattern.finditer(flat_text):
                paid_val = float(m.group(5).replace(',', ''))
                out_val = float(m.group(6).replace(',', ''))
                claims.append({
                    "claim_id": m.group(1),
                    "report_date": m.group(2),
                    "claim_description": m.group(3).strip(),
                    "status": m.group(4),
                    "total_paid": m.group(5).replace(',', ''),
                    "total_reserve": m.group(6).replace(',', ''),
                    "total_incurred": str(paid_val + out_val),
                    "line_of_business": "Workers Compensation",
                    "source_page": page_key,
                    "extractionMode": "pdf_text_fallback",
                    "duplicate_flag": False,
                    "selected_for_rollup": True
                })
                page_matched += 1
                
        elif lob == "Property":
            for m in prop_pattern.finditer(flat_text):
                claims.append({
                    "claim_id": m.group(1),
                    "loss_date": m.group(2),
                    "claim_description": m.group(3).strip(),
                    "total_paid": m.group(4).replace(',', ''),
                    "total_reserve": m.group(5).replace(',', ''),
                    "total_incurred": m.group(6).replace(',', ''),
                    "line_of_business": "Property",
                    "source_page": page_key,
                    "extractionMode": "pdf_text_fallback",
                    "duplicate_flag": False,
                    "selected_for_rollup": True
                })
                page_matched += 1
                
        elif lob == "General Liability":
            for m in gl_pattern.finditer(flat_text):
                claims.append({
                    "claim_id": m.group(1),
                    "loss_date": m.group(2),
                    "claim_description": m.group(3).strip(),
                    "claimant": m.group(4).strip(),
                    "total_paid": m.group(5).replace(',', ''),
                    "total_reserve": m.group(6).replace(',', ''),
                    "total_incurred": m.group(7).replace(',', ''),
                    "line_of_business": "General Liability",
                    "source_page": page_key,
                    "extractionMode": "pdf_text_fallback",
                    "duplicate_flag": False,
                    "selected_for_rollup": True
                })
                page_matched += 1
                
        print(f"            [PDF FALLBACK DEBUG] Rows matched on page {page_key}: {page_matched}")
                
    print(f"            [PDF FALLBACK] Claims extracted: {len(claims)}")
    return claims

# Fields each claim object should contain when extracted
CLAIM_LEVEL_VALID_JSON_FIELDS = [
    'claim_id', 'claimant', 'policy_number', 'policy_effective_date', 'policy_expiration_date',
    'line_of_business', 'subline', 'accident_date', 'report_date', 'accident_state',
    'driver', 'garage_state', 'coverage_state', 'claim_description', 'total_incurred', 'total_paid',
    'incurred_alae', 'paid_alae', 'total_recoveries', 'status', 'prior_carrier', 'evaluation_date',
    "page_num_or_sheet_name"
]

# Fields each policy object should contain when extracted
NO_CLAIMS_VALID_JSON_FIELDS = ['policy_effective_year', 'line_of_business', 'prior_carrier', 'evaluation_date']

# Models to use for extraction
PDF_DOCX_EXTRACTION_MODEL = models.GPT_5_2
EXCEL_CSV_EXTRACTION_MODEL = models.GPT_5_2

def _all_required_fields_present(records, required_fields):
    def _has_claim_id_or_number(r):
        return (
            isinstance(r, dict)
            and (r.get("claim_id") not in [None, "", "nan"] or r.get("claim_number") not in [None, "", "nan"])
        )
    return all(_has_claim_id_or_number(r) for r in records)

def _null_record(required_fields):
    """
    Build a single placeholder record containing all required fields set to None.
    This ensures pandas creates the expected columns even when the model returns [].
    """
    return {field: None for field in required_fields}

def _extract_json_with_retries(call_fn, required_fields, max_attempts=5):
    """
    call_fn: () -> (str, int, int) (returns model text output and token counts)
    Returns:
        (list[dict] | None, int, int) -> (records, total_input_tokens, total_output_tokens)
    """
    total_input_tokens = 0
    total_output_tokens = 0
    
    for attempt in range(max_attempts):
        result, input_tokens, output_tokens = call_fn()
        total_input_tokens += input_tokens or 0
        total_output_tokens += output_tokens or 0
        
        try:
            if result == "ERROR_413_REQUEST_TOO_LARGE":
                print(f"            [ERROR] 413 REQUEST TOO LARGE. Not retrying.")
                break
                
            if result == "ERROR_429_RATE_LIMIT":
                print(f"            [ERROR] 429 RATE LIMIT. Not retrying.")
                break
                
            if result is None:
                print(f"            [ERROR] OUTPUT EMPTY (attempt {attempt+1}/{max_attempts})")
                continue
            
            if not isinstance(result, (str, bytes, bytearray)):
                print(
                    f"            [ERROR] OUTPUT NOT TEXT (attempt {attempt+1}/{max_attempts}): "
                    f"{type(result).__name__}"
                )
                continue
            
            parsed = json.loads(result)
            
            # If model indicates "no records", return one empty record with required fields as nulls
            if parsed == []:
                return [_null_record(required_fields)], total_input_tokens, total_output_tokens
            
            if isinstance(parsed, dict):
                parsed = [parsed]
            
            if isinstance(parsed, list) and _all_required_fields_present(parsed, required_fields):
                return parsed, total_input_tokens, total_output_tokens
            
        except json.JSONDecodeError:
            print(f"            [ERROR] OUTPUT NOT JSON (attempt {attempt+1}/{max_attempts})")
            
    return None, total_input_tokens, total_output_tokens

def _append_records(outputs, records, company_folder, file_path, extra_fields=None):
    """
    Mutates outputs by appending enriched records.
    """
    extra_fields = extra_fields or {}
    for r in records:
        r["AccountName"] = company_folder
        r["file_path"] = file_path
        r.update(extra_fields)
        outputs.append(r)


def _add_claim_id_to_set(target: set, value) -> None:
    """Helper to add a claim id to a tracking set with normalization."""
    norm = _normalize_claim_id_value(value)
    if norm:
        target.add(norm)
    elif value is not None:
        target.add(str(value).strip())

def _normalize_claim_id_value(value) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if pd.isna(value):
            return None
        if float(value).is_integer():
            value = int(value)
    s = str(value).strip()
    if not s:
        return None
    if re.fullmatch(r"\d+\.0+", s):
        s = s.split(".")[0]
    s = s.replace(",", "")
    # Allow dashes and underscores in claim numbers
    norm = re.sub(r"[^A-Za-z0-9\-_]", "", s).lower()
    return norm or None

def _is_claim_id_header(text: Optional[str]) -> bool:
    if text is None:
        return False
    t = str(text).strip().lower()
    if not t:
        return False
    # Handle compact headers like "ClaimID" or "ClaimNo" without word boundaries
    t_compact = re.sub(r"\s+", "", t)
    if t_compact in {
        "claimid",
        "claimno",
        "claimnumber",
        "lossid",
        "occurrenceid",
        "incidentid",
        "filenumber",
        "fileid",
        "referenceid",
        "refid",
    }:
        return True
    if "claimid" in t:
        return True
    # Explicitly treat "file number" style headers as claim IDs
    if re.search(r"\bfile\s*(number|no\.|id)\b", t) or "file #" in t:
        return True
    has_claim_word = re.search(r"\b(claim|loss|occurrence|incident|reference|ref|file|case)\b", t)
    if not has_claim_word:
        return False
    has_id_hint = re.search(r"\b(number|no\.|id|identifier|ref|reference)\b", t) or "#" in t
    if has_id_hint:
        return True
    return False

def _line_has_claim_id_label(text: Optional[str]) -> bool:
    if text is None:
        return False
    t = str(text).lower()
    return bool(
        re.search(r"\bclaim\s*(number|no\.|id|ref|reference)\b", t) or "claim #" in t or "claimid" in t
        or re.search(r"\b(loss|occurrence|incident)\s*(number|no\.|id|ref|reference)\b", t) or "loss #" in t or "occurrence #" in t or "incident #" in t
        or re.search(r"\bfile\s*(number|no\.|id)\b", t) or "file #" in t
    )

def _extract_claim_id_tokens(value) -> set[str]:
    tokens = set()
    norm_full = _normalize_claim_id_value(value)
    if norm_full:
        tokens.add(norm_full)
    if value is None:
        return tokens
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if pd.isna(value):
            return tokens
        if float(value).is_integer():
            value = int(value)
        else:
            value = str(value)
    else:
        value = str(value)
    text = str(value)
    for token in re.findall(r"[A-Za-z0-9\-]+", text):
        tnorm = re.sub(r"[^A-Za-z0-9]", "", token).lower()
        if tnorm:
            tokens.add(tnorm)
    return tokens

def _collect_claim_id_candidates_from_chunk(chunk: dict) -> tuple[set[str], bool]:
    allowed: set[str] = set()
    has_claim_field = False
    content = chunk.get("content") or {}
    content_type = content.get("type")
    # Sheet-level CSV/Excel chunk: dict of row dicts without a type
    if content_type is None and isinstance(content, dict):
        row_entries = []
        for key, row in content.items():
            if not isinstance(row, dict):
                continue
            match = re.search(r"row\s+(\d+)", str(key), re.IGNORECASE)
            row_num = int(match.group(1)) if match else 10**9
            row_entries.append((row_num, row))
        row_entries.sort(key=lambda x: x[0])
        
        # First pass: treat row keys as true headers (CSV/Excel with proper headers)
        for _, row in row_entries:
            for header, value in row.items():
                if _is_claim_id_header(header) or _line_has_claim_id_label(header):
                    has_claim_field = True
                    allowed.update(_extract_claim_id_tokens(value))
                    
        if has_claim_field:
            return allowed, has_claim_field
            
        # Second pass: detect a header row in values (Excel sheets with header rows in data)
        header_row_idx = None
        claim_columns: set[str] = set()
        for idx, (_, row) in enumerate(row_entries):
            for col_key, cell_value in row.items():
                if _is_claim_id_header(cell_value) or _line_has_claim_id_label(cell_value):
                    claim_columns.add(col_key)
            if claim_columns:
                header_row_idx = idx
                break
        
        if header_row_idx is not None and claim_columns:
            has_claim_field = True
            for _, data_row in row_entries[header_row_idx + 1 :]:
                for col_key in claim_columns:
                    allowed.update(_extract_claim_id_tokens(data_row.get(col_key)))
            return allowed, has_claim_field
    if content_type == "table":
        for row in content.get("rows", []):
            for cell in row:
                header_text = cell.get("header") if isinstance(cell, dict) else None
                if _is_claim_id_header(header_text):
                    has_claim_field = True
                    allowed.update(_extract_claim_id_tokens(cell.get("value") if isinstance(cell, dict) else None))
    elif content_type == "key_values":
        for item in content.get("items", []):
            k_obj = item.get("key", {}) if isinstance(item, dict) else {}
            key_val = k_obj.get("value") if isinstance(k_obj, dict) else None
            if key_val and "claim" in str(key_val).lower() and "id" in str(key_val).lower():
                v_obj = item.get("value", {}) if isinstance(item, dict) else {}
                allowed.update(_extract_claim_id_tokens(v_obj.get("value") if isinstance(v_obj, dict) else None))
    elif content_type == "text_lines":
        for line in content.get("lines", []):
            text = line.get("value")
            if _line_has_claim_id_label(text):
                has_claim_field = True
                allowed.update(_extract_claim_id_tokens(text))
    elif content_type == "floating_text":
        for line in content.get("lines", []):
            if _line_has_claim_id_label(line):
                has_claim_field = True
                allowed.update(_extract_claim_id_tokens(line))
    return allowed, has_claim_field

def _chunk_label(chunk: dict) -> str:
    sheet = chunk.get("sheet_name")
    chunk_num = chunk.get("chunk_number")
    parts = []
    if sheet:
        parts.append(f"sheet '{sheet}'")
    if chunk_num is not None:
        parts.append(f"chunk #{chunk_num}")
    return ", ".join(parts) if parts else "chunk"

def _enforce_claim_id_from_chunk(records: list[dict], chunk: dict) -> list[dict]:
    allowed, has_claim_field = _collect_claim_id_candidates_from_chunk(chunk)
    # try gentle auto-correct for near-miss IDs (single-edit typos)
    # try gentle auto-correct for near-miss IDs (single-edit typos)
    allowed_list = sorted(allowed)
    if not has_claim_field:
        # Don't drop claim_id even if the chunk lacks a field explicitly labeled 'claim number'
        # The LLM may have correctly inferred the ID from elsewhere.
        return records
    dropped = []
    corrected = []
    for record in records:
        claim_id = record.get("claim_id")
        norm = _normalize_claim_id_value(claim_id)
        if norm and norm not in allowed:
            # try to auto-correct to the closest allowed ID if there's a clear single match
            candidates = difflib.get_close_matches(norm, allowed_list, n=1, cutoff=0.85)
            if candidates:
                record["claim_id"] = candidates[0]
                corrected.append((claim_id, candidates[0]))
            else:
                # Keep original parsed claim_id
                dropped.append(claim_id)
    if dropped:
        print(
            f"            [EXTRACTION] Kept unmatched claim_id values ({_chunk_label(chunk)}): "
            f"{sorted({_normalize_claim_id_value(d) or str(d).strip() for d in dropped})} | allowed={sorted(allowed)}"
        )
    if corrected:
        for original, fixed in corrected:
            print(
                f"            [EXTRACTION] Corrected claim_id typo ({_chunk_label(chunk)}): '{original}' -> '{fixed}'"
            )
    return records


def _safe_filename(text: str) -> str:
    return re.sub(r"[^A-Za-z0-9_-]+", "_", text).strip("_")


def _prompt_debug_config(default_dir: Optional[str]) -> tuple[bool, Optional[int], Optional[str]]:
    print_flag = os.getenv("PRINT_LLM_PROMPT", "").strip().lower() in {"1", "true", "yes", "y"}
    chunk_env = os.getenv("PROMPT_DUMP_CHUNK", "").strip()
    prompt_chunk = None
    if chunk_env:
        try:
            prompt_chunk = int(chunk_env)
        except ValueError:
            print(f"            [WARN] Invalid PROMPT_DUMP_CHUNK '{chunk_env}'. Using first chunk instead.")
    prompt_dir = os.getenv("PROMPT_DUMP_DIR", "").strip() or None
    if not prompt_dir and (print_flag or chunk_env):
        prompt_dir = default_dir
    return print_flag, prompt_chunk, prompt_dir


def _emit_prompt_sample(prompt_text: str,
                        company_folder: str,
                        file_name: str,
                        chunk_label: str,
                        prompt_dir: Optional[str],
                        print_flag: bool) -> None:
    if print_flag:
        print("\n" + " -" * 10 + " LLM Prompt Sample (start) " + " -" * 10)
        print(prompt_text)
        print(" -" * 10 + " LLM Prompt Sample (end) " + " -" * 10 + "\n")

    if not prompt_dir:
        return
    os.makedirs(prompt_dir, exist_ok=True)
    safe_company = _safe_filename(company_folder)
    safe_file = _safe_filename(file_name)
    safe_chunk = _safe_filename(chunk_label)
    prompt_dir_norm = os.path.normpath(prompt_dir)
    prompt_tail = os.path.basename(prompt_dir_norm)
    if prompt_tail.lower() == safe_company.lower():
        out_dir = os.path.join(prompt_dir, "prompt_samples")
    else:
        out_dir = os.path.join(prompt_dir, safe_company, "prompt_samples")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"{safe_file}_{safe_chunk}.txt")
    try:
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(prompt_text)
        print(f"            [INFO] Prompt sample saved to: {out_path}")
    except Exception as e:
        print(f"            [WARN] Failed to write prompt sample: {e}")


def _collect_claim_numbers_before_from_chunk(chunk: dict, claim_numbers_before: set) -> None:
    """Inspect a chunk and add any claim number values it contains to the tracking set."""
    content = chunk.get("content", {})
    if isinstance(content, dict) and "rows" in content:
        for row in content["rows"]:
            for cell in row:
                if isinstance(cell, dict) and cell.get("header", "").lower() in ["claim number", "claim_id"]:
                    val = cell.get("value")
                    if val is not None:
                        claim_numbers_before.add(str(val).strip())


async def _process_excel_chunk_async(chunk_index: int,
                                     chunk: dict,
                                     file: str,
                                     company_folder: str,
                                     prompt_samples: list,
                                     print_flag: bool,
                                     prompt_chunk: Optional[int],
                                     prompt_dir: Optional[str],
                                     EXCEL_CSV_PROMPT_BACKGROUND: str,
                                     EXTRACTION_PROMPT: str,
                                     VALID_EXTRACTION_JSON_FIELDS: list[str],
                                     claim_numbers_before: set,
                                     claim_numbers_after: set,
                                     outputs: list) -> tuple[int, int]:
    """Process a single Excel/CSV chunk asynchronously, returning token counts."""
    print(f"[TRACE] ENTER _process_excel_chunk_async for chunk {chunk.get('chunk_number')}", flush=True)
    _collect_claim_numbers_before_from_chunk(chunk, claim_numbers_before)

    sheet_name = chunk.get("sheet_name")
    chunk_number = chunk.get("chunk_number")

    llm_input_json = format_chunk_for_llm_json(chunk)

    background = EXCEL_CSV_PROMPT_BACKGROUND.format(
        file_name=f"{file} (excel sheet name: {sheet_name})" if sheet_name else file
    )

    prompt_instance = EXTRACTION_PROMPT.format(
        background=background,
        input=llm_input_json
    )

    if chunk_index < 5:
        prompt_samples.append({
            "chunk_number": chunk_number,
            "sheet_name": sheet_name,
            "prompt": prompt_instance
        })

    should_emit = False
    if print_flag or prompt_dir:
        if prompt_chunk is not None:
            if prompt_chunk == 0:
                should_emit = chunk_index == 0
            else:
                should_emit = (chunk_index + 1) == prompt_chunk
        else:
            should_emit = chunk_index < 5

    if should_emit:
        label = f"chunk_{chunk_number}" if chunk_number is not None else "chunk"
        if sheet_name:
            label = f"{label}_sheet_{sheet_name}"
        _emit_prompt_sample(prompt_instance, company_folder, file, label, prompt_dir, print_flag)

    llm_input_json = format_chunk_for_llm_json(chunk)

    # TOKEN GUARD
    estimated_tokens = len(llm_input_json) // 4
    if estimated_tokens > 8000:
        print(f"[TOKEN GUARD] Chunk too large ({estimated_tokens} tokens), splitting/truncating", flush=True)
        content = chunk.get("content")
        if isinstance(content, dict):
            keys = list(content.keys())
            ratio = 8000 / estimated_tokens
            keep = max(1, int(len(keys) * ratio * 0.9))
            chunk["content"] = {k: content[k] for k in keys[:keep]}
        elif isinstance(content, list):
            ratio = 8000 / estimated_tokens
            keep = max(1, int(len(content) * ratio * 0.9))
            chunk["content"] = content[:keep]
        elif isinstance(content, str):
            ratio = 8000 / estimated_tokens
            keep = max(1, int(len(content) * ratio * 0.9))
            chunk["content"] = content[:keep]
            
        llm_input_json = format_chunk_for_llm_json(chunk)
        if (len(llm_input_json) // 4) > 8000:
            llm_input_json = llm_input_json[:8000*4] + " ...[TRUNCATED]"

    print(f"[CHUNK DETAILS] Sheet: {sheet_name} | Chunk: {chunk_number} | Payload Length: {len(llm_input_json)} chars", flush=True)
    print(f"[LLM CALL START] Sheet: {sheet_name} | Chunk: {chunk_number}", flush=True)
    t0_llm = time.time()

    print(f"[TRACE] ENTER first LLM call for {sheet_name}", flush=True)
    loop = asyncio.get_event_loop()
    json_result, in_tok, out_tok = await loop.run_in_executor(
        None,
        lambda: _extract_json_with_retries(
            call_fn=lambda: gpt_call(
                prompt_instance,
                EXCEL_CSV_EXTRACTION_MODEL["model_name"],
                EXCEL_CSV_EXTRACTION_MODEL["api_version"]
            ),
            required_fields=VALID_EXTRACTION_JSON_FIELDS,
            max_attempts=5
        )
    )

    t1_llm = time.time()
    print(f"[TRACE] EXIT first LLM call for {sheet_name}", flush=True)
    print(f"[LLM CALL END] Sheet: {sheet_name} | Chunk: {chunk_number} | Time: {t1_llm - t0_llm:.2f} sec | in_tok: {in_tok} out_tok: {out_tok}", flush=True)

    if json_result is None:
        print(
            f"            ❌ Failed to get valid JSON from {file}"
            + (f" (sheet_name)" if sheet_name else "")
        )
        return in_tok, out_tok

    json_result = _enforce_claim_id_from_chunk(json_result, chunk)

    for rec in json_result:
        for key in ["claim_number", "claim_id"]:
            val = rec.get(key)
            if val is not None:
                claim_numbers_after.add(str(val).strip())

    _append_records(outputs, json_result, company_folder, file)

    print(f"[TRACE] EXIT _process_excel_chunk_async for chunk {chunk.get('chunk_number')}", flush=True)
    return in_tok, out_tok


async def _process_excel_chunks_parallel(chunks: list,
                                         file: str,
                                         company_folder: str,
                                         prompt_samples: list,
                                         print_flag: bool,
                                         prompt_chunk: Optional[int],
                                         prompt_dir: Optional[str],
                                         EXCEL_CSV_PROMPT_BACKGROUND: str,
                                         EXTRACTION_PROMPT: str,
                                         VALID_EXTRACTION_JSON_FIELDS: list[str],
                                         claim_numbers_before: set,
                                         claim_numbers_after: set,
                                         outputs: list,
                                         max_concurrent_tasks: int) -> tuple[int, int]:
    """Process all chunks for a file in parallel using an async semaphore to limit concurrency."""
    print("[PARALLEL PROCESSING] STARTED", flush=True)
    t_start_all = time.time()

    semaphore = asyncio.Semaphore(max_concurrent_tasks)

    async def worker(idx: int, c: dict):
        async with semaphore:
            return await _process_excel_chunk_async(
                chunk_index=idx,
                chunk=c,
                file=file,
                company_folder=company_folder,
                prompt_samples=prompt_samples,
                print_flag=print_flag,
                prompt_chunk=prompt_chunk,
                prompt_dir=prompt_dir,
                EXCEL_CSV_PROMPT_BACKGROUND=EXCEL_CSV_PROMPT_BACKGROUND,
                EXTRACTION_PROMPT=EXTRACTION_PROMPT,
                VALID_EXTRACTION_JSON_FIELDS=VALID_EXTRACTION_JSON_FIELDS,
                claim_numbers_before=claim_numbers_before,
                claim_numbers_after=claim_numbers_after,
                outputs=outputs
            )

    sheet_to_chunks = {}
    for c in chunks:
        s = c.get("sheet_name", "Unknown")
        if s not in sheet_to_chunks:
            sheet_to_chunks[s] = []
        sheet_to_chunks[s].append(c)

    file_input_tokens = 0
    file_output_tokens = 0

    for sheet_name, s_chunks in sheet_to_chunks.items():
        total_rows_in_sheet = sum(len(c.get("content", {})) if isinstance(c.get("content", {}), dict) else len(c.get("content", [])) for c in s_chunks)
        
        if FULL_EXTRACTION_MODE and total_rows_in_sheet > 100:
            print(f"[FULL MODE] Bypassing LLM for {sheet_name} ({total_rows_in_sheet} rows). Using direct structured mapping.", flush=True)
            # Do nothing, letting it pass through to the fallback logic
            pass
        elif DEMO_MODE and not DEMO_PARALLEL_LLM:
            print(f"[SHEET PROCESSING] START (Sequential) | Sheet: {sheet_name} | Total Chunks: {len(s_chunks)}", flush=True)
            t_sheet_start = time.time()
            for c in s_chunks:
                in_tok, out_tok = await worker(chunks.index(c), c)
                file_input_tokens += in_tok
                file_output_tokens += out_tok
                if out_tok > 0 and not FULL_EXTRACTION_MODE:
                    print("[DEMO MODE] Stopping early after first successful chunk.", flush=True)
                    break
            t_sheet_end = time.time()
            print(f"[SHEET PROCESSING] END | Sheet: {sheet_name} | Time: {t_sheet_end - t_sheet_start:.2f} sec", flush=True)
            if not FULL_EXTRACTION_MODE:
                break # Only one sheet in demo mode
        else:
            print(f"[SHEET PROCESSING] START | Sheet: {sheet_name} | Total Chunks: {len(s_chunks)}", flush=True)
            t_sheet_start = time.time()

            tasks = [asyncio.create_task(worker(chunks.index(c), c)) for c in s_chunks]

            for coro in asyncio.as_completed(tasks):
                in_tok, out_tok = await coro
                file_input_tokens += in_tok
                file_output_tokens += out_tok

            t_sheet_end = time.time()
            print(f"[SHEET PROCESSING] END | Sheet: {sheet_name} | Time: {t_sheet_end - t_sheet_start:.2f} sec", flush=True)

    t_end_all = time.time()
    print(f"[PARALLEL PROCESSING] COMPLETED | Total Time: {t_end_all - t_start_all:.2f} sec", flush=True)

    return file_input_tokens, file_output_tokens


def extract_loss_runs(output_data_dir,
                      company_folders,
                      pages_to_join_dict,
                      is_file_loss_run_dict,
                      EXCEL_CSV_PROMPT_BACKGROUND,
                      PDF_DOCX_PROMPT_BACKGROUND,
                      EXTRACTION_PROMPT,
                      VALID_EXTRACTION_JSON_FIELDS,
                      max_concurrent_tasks: int = 10):
    """
    Extract structured data from insurance loss run documents (EXCEL, CSV, PDF, DOCX)
    Requires images and OCR text of each PDF/DOCX Page
    Uses LLM for EXCEL/CSV and VLM for PDF/DOCX

    Parameters
    ----------
    output_data_dir : str
        Root directory containing per-company output subfolders.
    company_folders : list[str]
        Names of company subfolders to process under output_data_dir.
    pages_to_join_dict : dict[tuple[str, str], list[list[int]]]
        Mapping of (company_folder, pdf_folder_name) to groups of page numbers
        that should be joined and processed together for PDFs.
    is_file_loss_run_dict : dict[(str, str), dict]
        Output from detect_loss_runs; used to skip non-loss-run files.
    EXCEL_CSV_PROMPT_BACKGROUND : str
        Prompt template providing background for CSV/Excel-based extraction.
    PDF_DOCX_PROMPT_BACKGROUND : str
        Prompt template providing background for PDF/DOCX-based extraction.
    EXTRACTION_PROMPT : str
        Main extraction prompt template that accepts {background} and {input}.
    VALID_EXTRACTION_JSON_FIELDS : list[str]
        Required JSON keys that each extracted record must contain.
    max_concurrent_tasks : int, optional
        Maximum number of concurrent LLM calls when processing Excel/CSV chunks.

    Returns
    -------
    pandas.DataFrame
        DataFrame of extracted records with additional columns:
        'AccountName', 'file_path', and 'source_location'.
    """
    
    def build_claims_dataframe_from_raw_df(raw_df: pd.DataFrame, account_name: str, file_path: str, sheet_name: str) -> pd.DataFrame:
        fallback_df = raw_df.copy()
        
        if any(str(c).startswith("Unnamed:") for c in fallback_df.columns):
            best_row_idx = 0
            best_col_count = 0
            for idx in range(min(20, len(fallback_df))):
                row = fallback_df.iloc[idx]
                col_count = row.dropna().astype(str).str.strip().apply(lambda x: len(x) > 0).sum()
                if col_count > best_col_count:
                    best_col_count = col_count
                    best_row_idx = idx
            
            if best_col_count > 3:
                new_cols = fallback_df.iloc[best_row_idx].fillna('').astype(str).str.strip()
                fallback_df.columns = [c if c else f"Unnamed_{i}" for i, c in enumerate(new_cols)]
                fallback_df = fallback_df.iloc[best_row_idx + 1:].reset_index(drop=True)
                print(f"[DIRECT PANDAS] Header re-aligned to row {best_row_idx} for sheet {sheet_name}", flush=True)

        col_lower = {col: str(col).lower() for col in fallback_df.columns}
        rename_map = {}
        
        fallback_df['total_paid'] = 0.0
        fallback_df['total_incurred'] = 0.0
        fallback_df['total_reserve'] = 0.0
        
        reserve_keywords = ['reserve', 'future reserve', 'outstanding', 'case reserve', 'remaining reserve']
        reserve_cols_mapped = []
        lob_cols_mapped = []
        
        for col, lower in col_lower.items():
            if any(x in lower for x in ['claim id', 'claim number', 'file number', 'formatted file number', 'claim #', 'claim no', 'claim identifier']):
                rename_map[col] = 'claim_id'
            elif any(x in lower for x in ['claim status', 'status']):
                rename_map[col] = 'status'
            elif any(x in lower for x in ['date of loss', 'loss date', 'accident date']):
                rename_map[col] = 'loss_date'
            elif any(x in lower for x in ['date reported', 'reported date', 'date claim opened']):
                rename_map[col] = 'report_date'
            elif any(x in lower for x in ['loss description', 'event description', 'cause description', 'claim description']):
                rename_map[col] = 'claim_description'
            elif any(x in lower for x in ['line type', 'line code', 'coverage description', 'coverage subtype', 'risk class', 'operating department', 'cause of loss', 'nature of injury', 'business unit']):
                lob_cols_mapped.append(col)
                
            if any(x in lower for x in reserve_keywords):
                fallback_df['total_reserve'] += pd.to_numeric(fallback_df[col].astype(str).str.replace(r'[^\d.-]', '', regex=True), errors='coerce').fillna(0)
                reserve_cols_mapped.append(col)
                
        # --- Financial Overcounting Fix ---
        paid_cols = [c for c, l in col_lower.items() if 'paid' in l]
        incurred_cols = [c for c, l in col_lower.items() if 'incurred' in l]
        
        total_paid_col = next((c for c in paid_cols if 'total paid' in col_lower[c]), None)
        if not total_paid_col:
            total_paid_col = next((c for c in paid_cols if 'net paid' in col_lower[c]), None)
            
        summed_paid_series = pd.Series(0.0, index=fallback_df.index)
        for c in paid_cols:
            summed_paid_series += pd.to_numeric(fallback_df[c].astype(str).str.replace(r'[^\d.-]', '', regex=True), errors='coerce').fillna(0)
            
        if total_paid_col:
            source_paid_series = pd.to_numeric(fallback_df[total_paid_col].astype(str).str.replace(r'[^\d.-]', '', regex=True), errors='coerce').fillna(0)
            fallback_df['total_paid'] = source_paid_series
            
            source_total = source_paid_series.sum()
            calc_total = summed_paid_series.sum()
            print(f"[FINANCIAL AUDIT]\nSource Total Paid ({total_paid_col}): {source_total}\nCalculated Total Paid (sum of {len(paid_cols)} cols): {calc_total}\nDifference: {calc_total - source_total}\n", flush=True)
        else:
            fallback_df['total_paid'] = summed_paid_series
            print(f"[FINANCIAL AUDIT]\nSource Total Paid: N/A\nCalculated Total Paid: {summed_paid_series.sum()}\nDifference: N/A\n", flush=True)
            
        total_incurred_col = next((c for c in incurred_cols if 'total incurred' in col_lower[c] or 'gross incurred' in col_lower[c]), None)
        if total_incurred_col:
            fallback_df['total_incurred'] = pd.to_numeric(fallback_df[total_incurred_col].astype(str).str.replace(r'[^\d.-]', '', regex=True), errors='coerce').fillna(0)
        else:
            for c in incurred_cols:
                fallback_df['total_incurred'] += pd.to_numeric(fallback_df[c].astype(str).str.replace(r'[^\d.-]', '', regex=True), errors='coerce').fillna(0)
        # ----------------------------------
        
        fallback_df.rename(columns=rename_map, inplace=True)
        fallback_df = fallback_df.loc[:, ~fallback_df.columns.duplicated()].copy()
        
        if len(reserve_cols_mapped) == 0:
            fallback_df['total_reserve'] = (fallback_df['total_incurred'] - fallback_df['total_paid']).clip(lower=0)
            print("[DIRECT PANDAS] Reserve calculated from incurred - paid", flush=True)
            
        if 'status' in fallback_df.columns:
            def clean_status(s):
                if pd.isna(s): return 'Unknown'
                s_str = str(s).strip().lower()
                if s_str in ['i', 'incident']: return 'Incident'
                if s_str in ['c', 'closed']: return 'Closed'
                if s_str in ['o', 'open']: return 'Open'
                if s_str == 'reopen': return 'Reopen'
                if s_str == '': return 'Unknown'
                return s_str.capitalize()
            fallback_df['status'] = fallback_df['status'].apply(clean_status)
            print("[DIRECT PANDAS] Status mapping applied: I/C/O", flush=True)
        
        def infer_lob(row):
            vals = [sheet_name]
            for c in lob_cols_mapped:
                if c in row and pd.notna(row[c]):
                    vals.append(str(row[c]))
            text = " ".join(vals).lower()
            
            import re
            text_clean = re.sub(r'[\'’]', '', text)
            
            if 'gl' in text_clean.split() or 'general liability' in text_clean:
                return 'General Liability'
            if 'wc' in text_clean.split() or 'workers compensation' in text_clean:
                return 'Workers Compensation'
            if any(x in text_clean for x in ['auto', 'vehicle', 'trailer', 'truck']):
                return 'Auto'
            if any(x in text_clean for x in ['property', 'building', 'damage']):
                return 'Property'
            return 'Unknown'
            
        fallback_df['line_of_business'] = fallback_df.apply(infer_lob, axis=1)
        unknown_lob_count = (fallback_df['line_of_business'] == 'Unknown').sum()
        
        print(f"[DIRECT PANDAS] Extraction Mode: direct_pandas", flush=True)
        print(f"[DIRECT PANDAS] LOB columns mapped: {lob_cols_mapped}", flush=True)
        print(f"[DIRECT PANDAS] Reserve columns mapped: {reserve_cols_mapped}", flush=True)
        print(f"[DIRECT PANDAS] Unknown LOB rows: {unknown_lob_count}", flush=True)
        
        fallback_df['extractionMode'] = 'direct_pandas'
        fallback_df['AccountName'] = account_name
        fallback_df['file_path'] = file_path
        fallback_df['page_num_or_sheet_name'] = sheet_name
        return fallback_df

    # Store the structured outputs for all companies
    outputs = []
    # For logging claim numbers before and after extraction
    claim_numbers_before = set()
    claim_numbers_after = set()
    chunks = []

    default_prompt_dir = output_data_dir
    prompt_dir = default_prompt_dir

    for company_folder in company_folders:
        company_path = os.path.join(output_data_dir, company_folder)
        if not os.path.isdir(company_path):
            continue

        for subfolder in os.listdir(company_path):
            subfolder_path = os.path.join(company_path, subfolder)
            if not os.path.isdir(subfolder_path):
                continue

            # --- CSV / Excel processing using utils_excel_csv_to_json ---
            if subfolder.lower() in ["csvs", "excel_sheets"]:
                for root, dirs, files in os.walk(subfolder_path):
                    for file in files:
                        file_path = os.path.join(root, file)
                        file_lower = file.lower()
                        is_csv = file_lower.endswith(".csv")
                        is_excel = file_lower.endswith((".xls", ".xlsx", ".xlsm", ".xlsb"))
                        if not (is_csv or is_excel):
                            continue

                        det_info = is_file_loss_run_dict.get((company_folder, file))
                        if det_info and det_info.get("is_loss_run") is False:
                            continue

                        print(f"            Processing File: {file_path}")
                        start_time = time.time()

                        # Collect prompt inputs for the first few chunks so they can be inspected later
                        prompt_samples = []

                        print_flag, prompt_chunk, prompt_dir = _prompt_debug_config(default_prompt_dir)

                        # Track tokens for this file
                        file_input_tokens = 0
                        file_output_tokens = 0

                        try:
                            print(f"[TRACE] ENTER get_excel_csv_chunks_advanced for {file_path}", flush=True)
                            raw_chunks = get_excel_csv_chunks_advanced(file_path, hybrid_approach=True, max_tokens=2500, allow_raw_df=True)
                            print(f"[TRACE] EXIT get_excel_csv_chunks_advanced for {file_path}", flush=True)
                            
                            raw_df_chunks = [
                                c for c in raw_chunks
                                if isinstance(c, dict) and c.get("raw_df") is not None
                            ]

                            if len(raw_df_chunks) > 0:
                                print(f"[DIRECT PANDAS] Raw DF chunks found: {len(raw_df_chunks)}", flush=True)
                                
                                total_extracted = 0
                                for raw_df_chunk in raw_df_chunks:
                                    raw_df = raw_df_chunk["raw_df"]
                                    sheet_name = raw_df_chunk.get('sheet_name', 'direct_pandas')
                                    print(f"[DIRECT PANDAS] Processing sheet: {sheet_name} | rows={len(raw_df)}", flush=True)

                                    direct_df = build_claims_dataframe_from_raw_df(
                                        raw_df,
                                        account_name=company_folder,
                                        file_path=file,
                                        sheet_name=sheet_name
                                    )

                                    extracted_count = len(direct_df)
                                    print(f"[DIRECT PANDAS] Claims extracted from sheet {sheet_name}: {extracted_count}", flush=True)
                                    total_extracted += extracted_count
                                    
                                    outputs.extend(direct_df.to_dict(orient="records"))

                                print(f"[DIRECT PANDAS] Total direct pandas claims extracted: {total_extracted}", flush=True)
                                
                                end_time = time.time()
                                record_stage(
                                    company_folder, file, stage="extraction_excel_csv",
                                    time_seconds=(end_time - start_time), input_tokens=0, output_tokens=0, cost=0.0
                                )
                                continue
                            
                            file_chunks = []
                            for ch in raw_chunks:
                                sname = ch.get("sheet_name")
                                if isinstance(sname, str):
                                    sname_lower = sname.lower()
                                    if sname_lower.startswith("rollup"):
                                        continue
                                    if "comment" in sname_lower:
                                        continue
                                file_chunks.append(ch)
                                
                            if not file_chunks:
                                print(f"            [SKIP] No valid chunks available for file {file}", flush=True)
                                continue
                                
                            file_chunks.sort(key=lambda x: 0 if str(x.get("sheet_name", "")).lower() == "raw" else 1)

                            # Save the extracted chunks as JSON in the company folder
                            json_filename = f"{os.path.splitext(file)[0]}_chunks.json"
                            serializable_chunks = [{k: v for k, v in ch.items() if k != "raw_df"} for ch in file_chunks]
                            save_chunks_to_company_folder(serializable_chunks, company_folder, output_data_dir, filename=json_filename)
                        except Exception as e:
                            print(f"            ❌ Failed to build chunks for {file_path}: {e}", flush=True)
                            continue

                        print(f"[TRACE] ENTER _process_excel_chunks_parallel", flush=True)
                        # Process chunks concurrently with a configurable concurrency cap
                        file_input_tokens, file_output_tokens = asyncio.run(
                            _process_excel_chunks_parallel(
                                chunks=file_chunks,
                                file=file,
                                company_folder=company_folder,
                                prompt_samples=prompt_samples,
                                print_flag=print_flag,
                                prompt_chunk=prompt_chunk,
                                prompt_dir=prompt_dir,
                                EXCEL_CSV_PROMPT_BACKGROUND=EXCEL_CSV_PROMPT_BACKGROUND,
                                EXTRACTION_PROMPT=EXTRACTION_PROMPT,
                                VALID_EXTRACTION_JSON_FIELDS=VALID_EXTRACTION_JSON_FIELDS,
                                claim_numbers_before=claim_numbers_before,
                                claim_numbers_after=claim_numbers_after,
                                outputs=outputs,
                                max_concurrent_tasks=max_concurrent_tasks
                            )
                        )
                        print(f"[TRACE] EXIT _process_excel_chunks_parallel", flush=True)

                        # Persist captured prompt inputs alongside the extracted chunks for traceability
                        if prompt_samples:
                            prompt_filename = f"{os.path.splitext(file)[0]}_prompt_inputs.json"
                            try:
                                save_chunks_to_company_folder(prompt_samples, company_folder, output_data_dir, filename=prompt_filename)
                                print(f"            [INFO] Prompt inputs saved to: {prompt_filename}")
                            except Exception as e:
                                print(f"            [WARN] Failed to save prompt inputs for {file}: {e}")

                        end_time = time.time()
                        elapsed_seconds = end_time - start_time
                        elapsed_min = int(elapsed_seconds // 60)
                        elapsed_sec = int(elapsed_seconds % 60)
                        file_cost = models.compute_cost(
                            file_input_tokens,
                            file_output_tokens,
                            EXCEL_CSV_EXTRACTION_MODEL
                        )
                        print(f"            ✅ Complete")
                        print(f"            ⏱  Extraction Time: {elapsed_min} min {elapsed_sec} sec")
                        print(f"            💵  Extraction Cost: ${file_cost:.6f}")

                        record_stage(
                            company_folder,
                            file,
                            stage="extraction_excel_csv",
                            time_seconds=elapsed_seconds,
                            input_tokens=file_input_tokens,
                            output_tokens=file_output_tokens,
                            cost=file_cost,
                        )

            # --- PDF (& DOCX) Processing ---
            else:
                if subfolder.lower().endswith(".pdf"):
                    det_info = is_file_loss_run_dict.get((company_folder, subfolder))
                    if det_info and det_info.get("is_loss_run") is False:
                        continue

                    output_dir = subfolder_path
                    print(f"            Processing File: {subfolder_path}")
                    start_time = time.time()

                    # track tokens for this PDF
                    pdf_input_tokens = 0
                    pdf_output_tokens = 0

                    pages_to_join = pages_to_join_dict.get((company_folder, subfolder), [])

                    # Debug Logs requested by user
                    images_found = [f for f in os.listdir(subfolder_path) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
                    print(f"            [DEBUG] Image count generated: {len(images_found)}")
                    
                    json_path = os.path.join(subfolder_path, "page_response.json")
                    print(f"            [DEBUG] page_response.json save path expected: {json_path}")
                    
                    if not os.path.isfile(json_path):
                        print(f"            [DEBUG] File existence check: FAIL (page_response.json missing)")
                        print(f"            ❌ page_response.json not found in {subfolder_path}")
                        continue
                        
                    print(f"            [DEBUG] File existence check: PASS")

                    try:
                        with open(json_path, "r", encoding="utf-8") as f:
                            page_text_map = json.load(f)
                            print(f"            [DEBUG] OCR response received length: {len(page_text_map)} pages mapped")
                    except json.JSONDecodeError as e:
                        print(f"            ❌ Failed to load JSON in {json_path}: {e}")
                        continue

                    processed_pages = set()

                    if pages_to_join:
                        for group in pages_to_join:
                            if not (group and isinstance(group, list)):
                                continue

                            image_paths = []
                            input_json = {}

                            for page_num in group:
                                img_path = [
                                    f for f in os.listdir(output_dir)
                                    if f.lower().endswith((".jpg", ".jpeg", ".png")) and f"-{page_num}." in f
                                ]
                                if img_path:
                                    image_paths.append(os.path.join(output_dir, img_path[0]))

                                page_key = str(int(page_num))
                                if page_key in page_text_map and page_text_map[page_key]:
                                    input_json[page_key] = page_text_map[page_key]

                                processed_pages.add(int(page_num))

                            if not image_paths:
                                print(f"            ❌ No images found for joined pages {group} in {subfolder}")
                                continue

                            background = PDF_DOCX_PROMPT_BACKGROUND.format(file_name=subfolder)
                            prompt_instance = EXTRACTION_PROMPT.format(
                                background=background,
                                input=json.dumps(input_json)
                            )

                            fallback_claims = parse_pdf_text_fallback(input_json)
                            if fallback_claims:
                                print(f"            [PDF FALLBACK] Successfully extracted {len(fallback_claims)} claims deterministically. Skipping LLM.")
                                json_result = fallback_claims
                                in_tok = 0
                                out_tok = 0
                            else:
                                print(f"            [PDF FALLBACK] 0 claims extracted deterministically. Falling back to LLM extraction (max_attempts=1).")
                                json_result, in_tok, out_tok = _extract_json_with_retries(
                                    call_fn=lambda: gpt_vision_call(
                                        prompt_instance,
                                        image_paths,
                                        PDF_DOCX_EXTRACTION_MODEL['model_name'],
                                        PDF_DOCX_EXTRACTION_MODEL['api_version']
                                    ),
                                    required_fields=VALID_EXTRACTION_JSON_FIELDS,
                                    max_attempts=1
                                )
                                
                                if not json_result:
                                    print(f"            ❌ Failed to get valid JSON from {subfolder} (pages {group})")
                                    continue

                            pdf_input_tokens += in_tok
                            pdf_output_tokens += out_tok

                            _append_records(outputs, json_result, company_folder, subfolder)

                    end_time = time.time()
                    elapsed_seconds = end_time - start_time
                    elapsed_min = int(elapsed_seconds // 60)
                    elapsed_sec = int(elapsed_seconds % 60)
                    pdf_cost = models.compute_cost(
                        pdf_input_tokens,
                        pdf_output_tokens,
                        PDF_DOCX_EXTRACTION_MODEL
                    )
                    print(f"            ✅ Complete")
                    print(f"            ⏱  Extraction Time: {elapsed_min} min {elapsed_sec} sec")
                    print(f"            💵  Extraction Cost: ${pdf_cost:.6f}")

                    record_stage(
                        company_folder,
                        subfolder,  # pdf name
                        stage="extraction_pdf_docx",
                        time_seconds=elapsed_seconds,
                        input_tokens=pdf_input_tokens,
                        output_tokens=pdf_output_tokens,
                        cost=pdf_cost,
                    )


    def _normalize_for_diff(val):
        norm = _normalize_claim_id_value(val)
        if norm:
            return norm
        if val is None:
            return None
        return re.sub(r"[^A-Za-z0-9]+", "", str(val)).lower() or None


    norm_before = {_normalize_for_diff(v) for v in claim_numbers_before if _normalize_for_diff(v)}
    norm_after = {_normalize_for_diff(v) for v in claim_numbers_after if _normalize_for_diff(v)}
    missing_norm = norm_before - norm_after
    if missing_norm:
        raw_lookup = {}
        for raw in claim_numbers_before:
            n = _normalize_for_diff(raw)
            if n:
                raw_lookup.setdefault(n, set()).add(str(raw).strip())
        missing_raw = sorted({item for n in missing_norm for item in raw_lookup.get(n, {n})})
        print(f"[EXTRACTION] Dropped claim numbers during extraction: {missing_raw}")

    df = pd.DataFrame(outputs)
    # Remove placeholder rows (all required fields null/empty)
    required_cols = [c for c in CLAIM_LEVEL_VALID_JSON_FIELDS if c in df.columns]
    if required_cols:
        placeholder_mask = df[required_cols].isna().all(axis=1)
        if placeholder_mask.any():
            df = df[~placeholder_mask].reset_index(drop=True)

    if df.empty and len(chunks) > 0:
        print("[FALLBACK] LLM extraction failed/empty. Generating fallback from raw structured data.", flush=True)
        fallback_rows = []
        for c in chunks:
            content = c.get("content", {})
            if isinstance(content, list):
                fallback_rows.extend(content)
            elif isinstance(content, dict):
                for k, v in content.items():
                    if isinstance(v, dict):
                        fallback_rows.append(v)
                    elif isinstance(v, list):
                        fallback_rows.extend(v)
                        
        fallback_df = pd.DataFrame(fallback_rows)
        if not fallback_df.empty:
            col_lower = {col: str(col).lower() for col in fallback_df.columns}
            rename_map = {}
            
            fallback_df['total_paid'] = 0.0
            fallback_df['total_incurred'] = 0.0
            fallback_df['total_reserve'] = 0.0
            
            for col, lower in col_lower.items():
                if any(x in lower for x in ['claim id', 'claim number', 'file number']):
                    rename_map[col] = 'claim_number'
                elif any(x in lower for x in ['claim status', 'status']):
                    rename_map[col] = 'status'
                elif any(x in lower for x in ['date of loss', 'loss date']):
                    rename_map[col] = 'loss_date'
                elif any(x in lower for x in ['loss description', 'event description', 'cause description', 'claim description']):
                    rename_map[col] = 'claim_description'
                elif any(x in lower for x in ['line type', 'line code', 'coverage description', 'coverage subtype']):
                    rename_map[col] = 'line_of_business'
                    
                # Financial cumulative sums
                if 'paid' in lower:
                    fallback_df['total_paid'] += pd.to_numeric(fallback_df[col].astype(str).str.replace(r'[^\d.-]', '', regex=True), errors='coerce').fillna(0)
                if 'incurred' in lower:
                    fallback_df['total_incurred'] += pd.to_numeric(fallback_df[col].astype(str).str.replace(r'[^\d.-]', '', regex=True), errors='coerce').fillna(0)
                if 'reserve' in lower or 'future reserve' in lower:
                    fallback_df['total_reserve'] += pd.to_numeric(fallback_df[col].astype(str).str.replace(r'[^\d.-]', '', regex=True), errors='coerce').fillna(0)
            
            fallback_df.rename(columns=rename_map, inplace=True)
            fallback_df['extractionMode'] = 'fallback_no_llm'
            df = fallback_df
    elif df.empty:
        print("[SKIP] No chunks generated for this file", flush=True)

    return df



def extract_claims(output_data_dir, company_folders, pages_to_join_dict, is_file_loss_run_dict):
    """
    # Extract individual claims from loss runs using the respective prompt backgrounds, extraction prompts, and JSON fields
    """
    claims_df = extract_loss_runs(output_data_dir,
                                  company_folders,
                                  pages_to_join_dict,
                                  is_file_loss_run_dict,
                                  CLAIM_LEVEL_EXCEL_CSV_PROMPT_BACKGROUND,
                                  CLAIM_LEVEL_PDF_DOCX_PROMPT_BACKGROUND,
                                  CLAIM_LEVEL_EXTRACTION_PROMPT,
                                  CLAIM_LEVEL_VALID_JSON_FIELDS)
    return claims_df


def extract_policies_no_claims(output_data_dir, company_folders, pages_to_join_dict, is_file_loss_run_dict):
    """
    # Extract policies that had no claims from loss runs using the respective prompt backgrounds, extraction prompts, and JSON fields
    """
    no_claims_df = extract_loss_runs(output_data_dir,
                                     company_folders,
                                     pages_to_join_dict,
                                     is_file_loss_run_dict,
                                     NO_CLAIMS_EXCEL_CSV_PROMPT_BACKGROUND,
                                     NO_CLAIMS_PDF_DOCX_PROMPT_BACKGROUND,
                                     NO_CLAIMS_EXTRACTION_PROMPT,
                                     NO_CLAIMS_VALID_JSON_FIELDS)
    return no_claims_df

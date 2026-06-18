import os
import requests
import time
import random
import json
import base64
from mimetypes import guess_type
from dotenv import load_dotenv
import models

load_dotenv()

# Conditionally set CA certificate bundle for Liberty Mutual proxy if the file exists
cert_path = r'C:\Users\n1700803\OneDrive - Liberty Mutual\Documents\Groundspeed-Replacement_IU\cert_certificate\cacert.pem'
if os.path.exists(cert_path):
    os.environ['REQUESTS_CA_BUNDLE'] = cert_path

def exponential_backoff(base_delay=2, max_delay=60, factor=2, jitter=True):
    delay = base_delay
    while True:
        yield delay
        if jitter:
            delay = min(max_delay, delay * factor) * (0.5 + random.random() / 2)
        else:
            delay = min(max_delay, delay * factor)

def gpt_vision_call(
    prompt,
    folder_with_images_path,
    model_name,
    api_version,
    messages=None,
    temperature=0,
):
    from utils_gpt import groq_call
    print("[WARN] Using Groq text-only fallback for vision call. Ignoring images.")
    
    text_prompt = prompt
    if not text_prompt and messages:
        for m in messages:
            if m.get("role") == "user":
                content = m.get("content", "")
                if isinstance(content, str):
                    text_prompt = content
                elif isinstance(content, list):
                    for item in content:
                        if isinstance(item, dict) and item.get("type") == "text":
                            text_prompt += item.get("text", "")
                            
    output, input_tokens, output_tokens = groq_call(text_prompt, temperature=temperature)
    return output, input_tokens, output_tokens

"""
extract_report_llm.py

Extracts structured clinical/lab fields from a digital (text-based) PDF
lab report using Gemini, instead of field-specific regex. This is more
robust to real-world label variation (e.g. "CKD Hx:" vs "Chronic Kidney
Disease:") since the model understands semantic equivalence rather than
needing every phrasing hardcoded.

Falls back gracefully: if the API call fails, or returns malformed JSON,
or misses a field, this returns whatever it *could* extract plus a list
of missing fields — the frontend form stays fully editable, so a partial
or failed extraction never blocks the user, it just means more manual
typing for those fields.

Requires: pip install google-genai
Env var: GEMINI_API_KEY (get one free at https://aistudio.google.com)

Called from views.py's extract_report_view, itself reached from the
gateway's POST /api/predictor/extract-report (routes/prediction.js) —
the gateway does PDF magic-byte validation and forwards the raw file;
this module only ever sees already-extracted text (via pdfplumber, in
views.py), never the PDF bytes.
"""

import os
import json
import re

# pyrefly: ignore [missing-import]
from google import genai
from google.genai import types

try:
    from decouple import config as decouple_config
except ImportError:
    decouple_config = None

# Bounded comfortably under the gateway's djangoClient timeout (30s — see
# gateway/utils/djangoClient.js) so a slow/hanging Gemini call surfaces as a
# clean fallback (partial/empty extraction) here, rather than the gateway
# giving up first and masking what actually happened upstream.
GEMINI_TIMEOUT_SECONDS = 20

SPECIMEN_LEVELS = ["Blood", "Urine", "Wound", "Respiratory", "Catheter"]
ORGANISM_LIST = [
    "Escherichia coli", "Enterobacteria spp.", "Proteus mirabilis",
    "Klebsiella pneumoniae", "Citrobacter spp.", "Morganella morganii",
    "Serratia marcescens", "Pseudomonas aeruginosa",
    "Acinetobacter baumannii", "Unknown",
]

# All 31 extractable fields, matching predict.py's expected request keys.
FIELD_SCHEMA = {
    "age": "integer, patient age in years",
    "gender": "string, one of: Male, Female",
    "diabetes": "boolean",
    "hypertension": "boolean",
    "hospital_before": "boolean, prior hospitalization",
    "infection_freq": "number, infection frequency (past year)",
    "organism": f"string, one of: {', '.join(ORGANISM_LIST)}",
    "ward_type": "string, one of: ICU, General Ward",
    "previous_antibiotic_use": "boolean",
    "ckd_status": "boolean, chronic kidney disease",
    "liver_disease": "boolean",
    "cancer": "boolean",
    "immunocompromised_status": "boolean",
    "fever": "boolean",
    "cough": "boolean",
    "burning_urination": "boolean",
    "wound_infection": "boolean",
    "specimen_source": f"string, one of: {', '.join(SPECIMEN_LEVELS)}",
    "wbc": "number, white blood cell count",
    "neutrophils_pct": "number, neutrophils percentage",
    "lymphocytes_pct": "number, lymphocytes percentage",
    "crp": "number, C-reactive protein",
    "procalcitonin": "number",
    "creatinine": "number",
    "egfr": "number, estimated glomerular filtration rate",
    "temperature": "number, body temperature in Celsius",
    "heart_rate": "number, beats per minute",
    "respiratory_rate": "number, breaths per minute",
    "spo2": "number, oxygen saturation percentage",
    "weight_kg": "number, weight in kilograms",
    "height_cm": "number, height in centimeters",
}

PROMPT_TEMPLATE = """You are extracting structured clinical data from a lab/medical report.

Below is the raw text extracted from a PDF report. Extract the following fields.
Field descriptions:
{field_descriptions}

RULES:
- Return ONLY valid JSON, no markdown code fences, no explanation text.
- Use null for any field not present or not determinable from the text.
- Do not guess or infer a value that isn't stated or clearly implied in the text.
- Boolean fields: true/false/null only.
- For "gender", "ward_type", "specimen_source", "organism": only use one of the
  exact allowed values listed, or null if it doesn't clearly match one of them.

REPORT TEXT:
---
{report_text}
---

Return a single JSON object with exactly these keys: {field_names}
"""


# Builds the Gemini extraction prompt from FIELD_SCHEMA and the report text.
def build_prompt(report_text):
    field_descriptions = "\n".join(f"- {k}: {v}" for k, v in FIELD_SCHEMA.items())
    field_names = ", ".join(FIELD_SCHEMA.keys())
    return PROMPT_TEMPLATE.format(
        field_descriptions=field_descriptions,
        report_text=report_text,
        field_names=field_names,
    )


# Removes ```json fences Gemini sometimes wraps its response in.
def _strip_code_fences(text):
    """Gemini sometimes wraps JSON in ```json ... ``` despite instructions not to."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


# Entry point: calls Gemini to extract structured fields from report text.
def extract_report_fields_llm(report_text, api_key=None):
    """
    Returns (extracted_dict, missing_fields_list, error_or_None).

    On total failure (API error, unparseable response), returns
    ({}, list(FIELD_SCHEMA.keys()), error_message) so the caller can
    fall back to an empty form rather than crashing.
    """
    if api_key is None and decouple_config is not None:
        api_key = decouple_config("GEMINI_API_KEY", default=None)
    if api_key is None:
        api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return {}, list(FIELD_SCHEMA.keys()), "GEMINI_API_KEY not configured"

    try:
        client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=GEMINI_TIMEOUT_SECONDS * 1000),
        )
        prompt = build_prompt(report_text)

        response = client.models.generate_content(
            model="gemini-flash-latest",
            contents=prompt,
        )
        raw_text = _strip_code_fences(response.text)
        parsed = json.loads(raw_text)

    except Exception as e:
        return {}, list(FIELD_SCHEMA.keys()), f"Extraction failed: {e}"

    result = {}
    missing = []
    for field in FIELD_SCHEMA:
        value = parsed.get(field)
        result[field] = value
        if value is None:
            missing.append(field)

    return result, missing, None


if __name__ == "__main__":
    # Quick manual test — requires GEMINI_API_KEY in env and a report PDF.
    # pyrefly: ignore [missing-import]
    import pdfplumber
    import sys

    pdf_path = sys.argv[1] if len(sys.argv) > 1 else "mock_lab_report.pdf"
    with pdfplumber.open(pdf_path) as pdf:
        text = "\n".join(page.extract_text() or "" for page in pdf.pages)

    data, missing, error = extract_report_fields_llm(text)
    if error:
        print(f"ERROR: {error}")
    else:
        print("Extracted fields:")
        for k, v in data.items():
            print(f"  {k:<28} = {v}")
        print()
        if missing:
            print(f"NOT FOUND ({len(missing)}): {missing}")
        else:
            print("All target fields found.")
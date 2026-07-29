import joblib
import pandas as pd
import json
import os
import sys
from catboost import Pool

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTIFACTS_DIR = os.path.join(BASE_DIR, 'ml_artifacts')

if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
from constants import ORGANISM_LIST

with open(os.path.join(ARTIFACTS_DIR, 'feature_columns.json')) as f:
    FEATURE_COLUMNS = json.load(f)

with open(os.path.join(ARTIFACTS_DIR, 'antibiotic_label_maps.json')) as f:
    LABEL_MAPS = json.load(f)

with open(os.path.join(ARTIFACTS_DIR, 'feature_defaults.json')) as f:
    FEATURE_DEFAULTS = json.load(f)

ANTIBIOTIC_COLUMNS = list(LABEL_MAPS.keys())

SPECIMEN_LEVELS = ["Blood", "Urine", "Wound", "Respiratory", "Catheter"]

# Optional new clinical fields (all default to a conservative "absent"/"unknown"
# value when a request omits them — numeric labs/vitals fall back to the
# training-set median from feature_defaults.json rather than 0, so a missing
# reading doesn't read as a clinically extreme value).
# Maps request field -> (feature column, default value used when omitted).
# For 'ward_type' the default is the non-ICU (more common) category; for every
# Yes/No flag the default is False — absence of a reported symptom/comorbidity
# is treated as "not reported", not "confirmed absent", but False is the
# conservative choice that doesn't manufacture a positive finding.
NEW_BINARY_FIELDS = {
    'ward_type': ('Ward_Type', 'General Ward'),
    'previous_antibiotic_use': ('Previous_Antibiotic_Use', False),
    'ckd_status': ('CKD_Status', False),
    'liver_disease': ('Liver_Disease', False),
    'cancer': ('Cancer', False),
    'immunocompromised_status': ('Immunocompromised_Status', False),
    'fever': ('Fever', False),
    'cough': ('Cough', False),
    'burning_urination': ('Burning_Urination', False),
    'wound_infection': ('Wound_Infection', False),
}

NEW_NUMERIC_FIELDS = {
    'wbc': 'WBC',
    'neutrophils_pct': 'Neutrophils_pct',
    'lymphocytes_pct': 'Lymphocytes_pct',
    'crp': 'CRP',
    'procalcitonin': 'Procalcitonin',
    'creatinine': 'Creatinine',
    'egfr': 'eGFR',
    'temperature': 'Temperature',
    'heart_rate': 'Heart_Rate',
    'respiratory_rate': 'Respiratory_Rate',
    'spo2': 'SpO2',
    'weight_kg': 'Weight_kg',
    'bmi': 'BMI',
}

AWARE_MAP = {
    'AMX/AMP': 'Access', 'AMC': 'Access', 'CZ': 'Access', 'FOX': 'Watch',
    'CTX/CRO': 'Watch', 'IPM': 'Watch', 'GEN': 'Access', 'AN': 'Access',
    'Acide nalidixique': 'Watch', 'ofx': 'Watch', 'CIP': 'Watch', 'C': 'Access',
    'Co-trimoxazole': 'Access', 'Furanes': 'Access', 'colistine': 'Reserve'
}

# Load all 15 v3 models once, at import time (not per-request — much faster).
# v3 models are trained on the 47-column schema in feature_columns.json
# (original 19 features + 28 encoded from 24 synthetic clinical variables;
# Blood_Pressure_Systolic, Height_cm, Platelets, and Hemoglobin were dropped
# from v2's 28 after a SHAP review found near-zero real correlation with
# resistance outcomes relative to their model-complexity cost). The v2 and
# original 19-feature catboost_<antibiotic>.pkl files are left on disk for
# rollback/comparison but are no longer loaded for serving.
MODELS = {}
for antibiotic in ANTIBIOTIC_COLUMNS:
    safe_name = antibiotic.replace('/', '_').replace(' ', '_')
    filepath = os.path.join(ARTIFACTS_DIR, f'catboost_{safe_name}_v3.pkl')
    MODELS[antibiotic] = joblib.load(filepath)


def build_feature_row(patient_data):
    row = {
        'Age': patient_data['age'],
        'Gender': 1 if patient_data['gender'] == 'Male' else 0,
        'Diabetes': 1 if patient_data['diabetes'] else 0,
        'Hypertension': 1 if patient_data['hypertension'] else 0,
        'Hospital_before': 1 if patient_data['hospital_before'] else 0,
        'Infection_Freq': patient_data['infection_freq'],
        'Year': patient_data['year'],
        'Month': patient_data['month'],
        'Date_Missing': 0,
    }

    for organism in ORGANISM_LIST:
        col_name = f'Organism_{organism}'
        row[col_name] = 1 if patient_data['organism'] == organism else 0

    # --- 28 new synthetic clinical variables, all optional on the request ---
    ward_type_value = patient_data.get('ward_type') or NEW_BINARY_FIELDS['ward_type'][1]
    row['Ward_Type'] = 1 if ward_type_value == 'ICU' else 0

    for field, (col, default) in NEW_BINARY_FIELDS.items():
        if field == 'ward_type':
            continue
        value = patient_data.get(field)
        row[col] = 1 if (default if value is None else value) else 0

    specimen_value = patient_data.get('specimen_source')
    for level in SPECIMEN_LEVELS:
        row[f'Specimen_Source_{level}'] = 1 if specimen_value == level else 0

    for field, col in NEW_NUMERIC_FIELDS.items():
        value = patient_data.get(field)
        row[col] = FEATURE_DEFAULTS[col] if value is None else value

    ordered_row = [row[col] for col in FEATURE_COLUMNS]
    return pd.DataFrame([ordered_row], columns=FEATURE_COLUMNS)


def get_shap_explanation(antibiotic, X, predicted_class_index, top_n=5):
    """
    Uses CatBoost's native SHAP support (TreeSHAP under the hood) —
    no external shap library needed.
    """
    model = MODELS[antibiotic]
    pool = Pool(X)
    shap_values = model.get_feature_importance(data=pool, type='ShapValues')

    row = shap_values[0]

    # Multiclass models return shape (n_classes, n_features + 1);
    # binary/regression models return shape (n_features + 1,).
    # The last column in either case is the bias/expected-value term — drop it.
    if row.ndim == 2:
        class_shap = row[predicted_class_index][:-1]
    else:
        class_shap = row[:-1]

    feature_contributions = list(zip(FEATURE_COLUMNS, class_shap))
    feature_contributions.sort(key=lambda x: abs(x[1]), reverse=True)

    top_features = feature_contributions[:top_n]
    input_row = X.iloc[0]

    return [
        {
            "feature": name,
            "contribution": round(float(value), 4),
            "direction": "positive" if value > 0 else "negative",
            # The actual encoded input value for this feature — lets
            # downstream text (ai_insights.py) confirm a feature value is
            # really present for this patient before naming it, rather than
            # attributing presence just because it ranked high in |SHAP|.
            "value": float(input_row[name]),
        }
        for name, value in top_features
    ]


def predict_resistance(patient_data):
    X = build_feature_row(patient_data)

    result = []
    for antibiotic in ANTIBIOTIC_COLUMNS:
        model = MODELS[antibiotic]
        pred_encoded = model.predict(X)[0]

        if hasattr(pred_encoded, '__len__'):
            pred_encoded = pred_encoded[0]
        pred_encoded = int(pred_encoded)

        # Confidence = model's predicted probability for the winning class
        proba = model.predict_proba(X)[0]
        confidence = round(float(proba[pred_encoded]), 4)

        reverse_map = {v: k for k, v in LABEL_MAPS[antibiotic].items()}
        pred_label = reverse_map[pred_encoded]

        shap_explanation = get_shap_explanation(antibiotic, X, pred_encoded)

        result.append({
            'antibiotic': antibiotic,
            'result': pred_label,
            'awareCategory': AWARE_MAP.get(antibiotic, 'Access'),
            'confidence': confidence,
            'shapExplanation': shap_explanation,
        })

    return result
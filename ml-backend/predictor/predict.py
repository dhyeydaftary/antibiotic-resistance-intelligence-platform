import joblib
import pandas as pd
import json
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTIFACTS_DIR = os.path.join(BASE_DIR, 'ml_artifacts')

with open(os.path.join(ARTIFACTS_DIR, 'feature_columns.json')) as f:
    FEATURE_COLUMNS = json.load(f)

with open(os.path.join(ARTIFACTS_DIR, 'antibiotic_label_maps.json')) as f:
    LABEL_MAPS = json.load(f)

ANTIBIOTIC_COLUMNS = list(LABEL_MAPS.keys())

ORGANISM_LIST = [
    'Acinetobacter baumannii', 'Citrobacter spp.', 'Enterobacteria spp.',
    'Escherichia coli', 'Klebsiella pneumoniae', 'Morganella morganii',
    'Proteus mirabilis', 'Pseudomonas aeruginosa', 'Serratia marcescens', 'Unknown'
]

AWARE_MAP = {
    'AMX/AMP': 'Access', 'AMC': 'Access', 'CZ': 'Access', 'FOX': 'Watch',
    'CTX/CRO': 'Watch', 'IPM': 'Watch', 'GEN': 'Access', 'AN': 'Access',
    'Acide nalidixique': 'Access', 'ofx': 'Watch', 'CIP': 'Watch', 'C': 'Access',
    'Co-trimoxazole': 'Access', 'Furanes': 'Access', 'colistine': 'Reserve'
}

# Load all 15 models once, at import time (not per-request — much faster)
MODELS = {}
for antibiotic in ANTIBIOTIC_COLUMNS:
    safe_name = antibiotic.replace('/', '_').replace(' ', '_')
    filepath = os.path.join(ARTIFACTS_DIR, f'catboost_{safe_name}.pkl')
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

    ordered_row = [row[col] for col in FEATURE_COLUMNS]
    return pd.DataFrame([ordered_row], columns=FEATURE_COLUMNS)


def predict_resistance(patient_data):
    X = build_feature_row(patient_data)

    result = []
    for antibiotic in ANTIBIOTIC_COLUMNS:
        model = MODELS[antibiotic]
        pred_encoded = model.predict(X)[0]

        # pred_encoded may come back as array-like from CatBoost — normalize to plain int
        if hasattr(pred_encoded, '__len__'):
            pred_encoded = pred_encoded[0]
        pred_encoded = int(pred_encoded)

        reverse_map = {v: k for k, v in LABEL_MAPS[antibiotic].items()}
        pred_label = reverse_map[pred_encoded]

        result.append({
            'antibiotic': antibiotic,
            'result': pred_label,
            'awareCategory': AWARE_MAP.get(antibiotic, 'Access'),
        })

    return result
import pandas as pd
import os
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTIFACTS_DIR = os.path.join(BASE_DIR, 'ml_artifacts')
PREDICTOR_DIR = os.path.dirname(os.path.abspath(__file__))

# The dataset was augmented with new clinical columns (Ward_Type, Specimen_Source,
# comorbidities, vitals, labs). Prefer the augmented file; fall back to the original
# so this module keeps working even before the augmented CSV is copied into
# ml_artifacts alongside the rest of the pipeline's artifacts.
AUGMENTED_DATASET_PATH = os.path.join(PREDICTOR_DIR, 'cleaned_dataset_augmented.csv')
LEGACY_DATASET_PATH = os.path.join(ARTIFACTS_DIR, 'cleaned_dataset.csv')

# Yes/No flag columns present only in the augmented dataset.
COMORBIDITY_COLUMNS = {
    "Previous_Antibiotic_Use": "previousAntibioticUse",
    "CKD_Status": "ckd",
    "Liver_Disease": "liverDisease",
    "Cancer": "cancer",
    "Immunocompromised_Status": "immunocompromised",
}
SYMPTOM_COLUMNS = {
    "Fever": "fever",
    "Cough": "cough",
    "Burning_Urination": "burningUrination",
    "Wound_Infection": "woundInfection",
}
# Numeric vitals/labs present only in the augmented dataset.
NUMERIC_METRIC_COLUMNS = {
    "WBC": "wbc",
    "Neutrophils_pct": "neutrophilsPct",
    "Lymphocytes_pct": "lymphocytesPct",
    "CRP": "crp",
    "Procalcitonin": "procalcitonin",
    "Creatinine": "creatinine",
    "eGFR": "egfr",
    "Temperature": "temperature",
    "Heart_Rate": "heartRate",
    "Respiratory_Rate": "respiratoryRate",
    "SpO2": "spo2",
    "Weight_kg": "weightKg",
    "BMI": "bmi",
}

_df = None
_antibiotic_columns = None
_has_augmented_columns = None


def _load_data():
    global _df, _has_augmented_columns
    if _df is None:
        if os.path.exists(AUGMENTED_DATASET_PATH):
            _df = pd.read_csv(AUGMENTED_DATASET_PATH, parse_dates=['Collection_Date'])
            _has_augmented_columns = True
        else:
            _df = pd.read_csv(LEGACY_DATASET_PATH, parse_dates=['Collection_Date'])
            _has_augmented_columns = False
    return _df


def _load_antibiotic_columns():
    global _antibiotic_columns
    if _antibiotic_columns is None:
        with open(os.path.join(ARTIFACTS_DIR, 'antibiotic_columns.json')) as f:
            _antibiotic_columns = json.load(f)
    return _antibiotic_columns


def _value_counts_list(series, key_name):
    counts = series.dropna().value_counts()
    return [{key_name: str(val), "count": int(count)} for val, count in counts.items()]


def _yes_no_prevalence(df, columns_map):
    """For each Yes/No column present, return the % of rows marked 'Yes'."""
    result = []
    for source_col, out_key in columns_map.items():
        if source_col not in df.columns:
            continue
        col = df[source_col].dropna()
        if len(col) == 0:
            continue
        yes_count = int((col == 'Yes').sum())
        result.append({
            "field": out_key,
            "yesCount": yes_count,
            "total": int(len(col)),
            "prevalence": round(yes_count / len(col), 4),
        })
    return result


def _numeric_summary(df, columns_map):
    """For each numeric vitals/labs column present, return basic distribution stats."""
    result = []
    for source_col, out_key in columns_map.items():
        if source_col not in df.columns:
            continue
        col = df[source_col].dropna()
        if len(col) == 0:
            continue
        result.append({
            "field": out_key,
            "min": round(float(col.min()), 2),
            "mean": round(float(col.mean()), 2),
            "max": round(float(col.max()), 2),
            "sampleSize": int(len(col)),
        })
    return result


def get_dataset_stats():
    df = _load_data()
    antibiotic_columns = _load_antibiotic_columns()

    total_rows = len(df)
    total_columns = len(df.columns)
    antibiotic_targets = len(antibiotic_columns)

    date_min = df['Collection_Date'].min()
    date_max = df['Collection_Date'].max()
    date_range = {
        "start": date_min.strftime('%Y-%m-%d') if pd.notna(date_min) else None,
        "end": date_max.strftime('%Y-%m-%d') if pd.notna(date_max) else None,
    }

    organism_counts = df['Organism'].value_counts()
    organism_distribution = [
        {"organism": organism, "count": int(count)}
        for organism, count in organism_counts.items()
    ]

    stats = {
        "totalRows": total_rows,
        "totalColumns": total_columns,
        "antibioticTargets": antibiotic_targets,
        "dateRange": date_range,
        "organismDistribution": organism_distribution,
    }

    # Everything below is additive and only appears once the augmented dataset
    # is in use, so older frontend code paths relying on the shape above are
    # unaffected.
    if _has_augmented_columns:
        if 'Ward_Type' in df.columns:
            stats["wardTypeDistribution"] = _value_counts_list(df['Ward_Type'], "wardType")
        if 'Specimen_Source' in df.columns:
            stats["specimenSourceDistribution"] = _value_counts_list(df['Specimen_Source'], "specimenSource")

        comorbidity_prevalence = _yes_no_prevalence(df, COMORBIDITY_COLUMNS)
        if comorbidity_prevalence:
            stats["comorbidityPrevalence"] = comorbidity_prevalence

        symptom_prevalence = _yes_no_prevalence(df, SYMPTOM_COLUMNS)
        if symptom_prevalence:
            stats["symptomPrevalence"] = symptom_prevalence

        vitals_labs_summary = _numeric_summary(df, NUMERIC_METRIC_COLUMNS)
        if vitals_labs_summary:
            stats["vitalsLabsSummary"] = vitals_labs_summary

    return stats
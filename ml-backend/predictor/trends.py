# Backs GET /trends/ and GET /explain-trend/ (via trend_insights.py).
# Purely descriptive statistics over the historical dataset (month-over-
# month resistance rate for one antibiotic, optionally filtered by
# organism/ward) — no model inference here, unlike predict.py. Called
# from views.py's trends_view/explain_trend_view.
import pandas as pd
import os
import json
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTIFACTS_DIR = os.path.join(BASE_DIR, 'ml_artifacts')
PREDICTOR_DIR = os.path.dirname(os.path.abspath(__file__))

AUGMENTED_DATASET_PATH = os.path.join(PREDICTOR_DIR, 'cleaned_dataset_augmented.csv')
LEGACY_DATASET_PATH = os.path.join(ARTIFACTS_DIR, 'cleaned_dataset.csv')

if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
from constants import ORGANISM_LIST

_df = None
_antibiotic_columns = None
_has_ward_type = None


# Lazily loads and caches the (augmented if available) historical dataset.
def _load_data():
    global _df, _has_ward_type
    if _df is None:
        if os.path.exists(AUGMENTED_DATASET_PATH):
            _df = pd.read_csv(AUGMENTED_DATASET_PATH, parse_dates=['Collection_Date'])
        else:
            _df = pd.read_csv(LEGACY_DATASET_PATH, parse_dates=['Collection_Date'])
        _has_ward_type = 'Ward_Type' in _df.columns
    return _df


# Lazily loads and caches the list of antibiotic column names.
def _load_antibiotic_columns():
    global _antibiotic_columns
    if _antibiotic_columns is None:
        with open(os.path.join(ARTIFACTS_DIR, 'antibiotic_columns.json')) as f:
            _antibiotic_columns = json.load(f)
    return _antibiotic_columns


# Computes month-by-month resistance rate for one antibiotic, optionally
# filtered by organism/ward. Raises ValueError for unknown filter values.
def get_resistance_trend(antibiotic, organism=None, ward_type=None):
    df = _load_data()
    antibiotic_columns = _load_antibiotic_columns()

    if antibiotic not in antibiotic_columns:
        raise ValueError(f"Unknown antibiotic: {antibiotic}")

    if organism and organism != 'all' and organism not in ORGANISM_LIST:
        raise ValueError(f"Unknown organism: {organism}")

    if ward_type and ward_type != 'all' and not _has_ward_type:
        raise ValueError("ward_type filter is unavailable: dataset has no Ward_Type column")
    if ward_type and ward_type != 'all' and _has_ward_type and ward_type not in df['Ward_Type'].dropna().unique():
        raise ValueError(f"Unknown ward_type: {ward_type}")

    data = df.dropna(subset=[antibiotic, 'Collection_Date'])

    if organism and organism != 'all':
        data = data[data['Organism'] == organism]

    if ward_type and ward_type != 'all' and _has_ward_type:
        data = data[data['Ward_Type'] == ward_type]

    data = data.copy()
    data['period'] = data['Collection_Date'].dt.to_period('M').astype(str)

    grouped = data.groupby('period')[antibiotic].agg(
        resistanceRate=lambda col: (col == 'R').sum() / len(col) if len(col) > 0 else 0,
        sampleSize='count'
    )

    series = [
        {
            "period": period,
            "resistanceRate": round(float(row['resistanceRate']), 4),
            "sampleSize": int(row['sampleSize']),
        }
        for period, row in grouped.sort_index().iterrows()
    ]

    return series
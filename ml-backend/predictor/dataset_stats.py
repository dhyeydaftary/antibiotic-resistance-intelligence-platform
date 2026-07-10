import pandas as pd
import os
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTIFACTS_DIR = os.path.join(BASE_DIR, 'ml_artifacts')

_df = None
_antibiotic_columns = None


def _load_data():
    global _df
    if _df is None:
        _df = pd.read_csv(
            os.path.join(ARTIFACTS_DIR, 'cleaned_dataset.csv'),
            parse_dates=['Collection_Date']
        )
    return _df


def _load_antibiotic_columns():
    global _antibiotic_columns
    if _antibiotic_columns is None:
        with open(os.path.join(ARTIFACTS_DIR, 'antibiotic_columns.json')) as f:
            _antibiotic_columns = json.load(f)
    return _antibiotic_columns


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

    return {
        "totalRows": total_rows,
        "totalColumns": total_columns,
        "antibioticTargets": antibiotic_targets,
        "dateRange": date_range,
        "organismDistribution": organism_distribution,
    }
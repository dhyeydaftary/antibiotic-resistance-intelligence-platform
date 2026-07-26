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


ORGANISM_LIST = [
    'Acinetobacter baumannii', 'Citrobacter spp.', 'Enterobacteria spp.',
    'Escherichia coli', 'Klebsiella pneumoniae', 'Morganella morganii',
    'Proteus mirabilis', 'Pseudomonas aeruginosa', 'Serratia marcescens', 'Unknown'
]


def get_resistance_trend(antibiotic, organism=None):
    df = _load_data()
    antibiotic_columns = _load_antibiotic_columns()

    if antibiotic not in antibiotic_columns:
        raise ValueError(f"Unknown antibiotic: {antibiotic}")

    if organism and organism != 'all' and organism not in ORGANISM_LIST:
        raise ValueError(f"Unknown organism: {organism}")

    data = df.dropna(subset=[antibiotic, 'Collection_Date'])

    if organism and organism != 'all':
        data = data[data['Organism'] == organism]

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
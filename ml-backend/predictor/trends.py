import pandas as pd
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTIFACTS_DIR = os.path.join(BASE_DIR, 'ml_artifacts')

_df = None


def _load_data():
    global _df
    if _df is None:
        _df = pd.read_csv(
            os.path.join(ARTIFACTS_DIR, 'cleaned_dataset.csv'),
            parse_dates=['Collection_Date']
        )
    return _df


def get_resistance_trend(antibiotic, organism=None):
    df = _load_data()

    if antibiotic not in df.columns:
        raise ValueError(f"Unknown antibiotic: {antibiotic}")

    data = df.dropna(subset=[antibiotic, 'Collection_Date'])

    if organism and organism != 'all':
        data = data[data['Organism'] == organism]

    data = data.copy()
    data['period'] = data['Collection_Date'].dt.to_period('M').astype(str)

    grouped = data.groupby('period')[antibiotic].apply(
        lambda col: (col == 'R').sum() / len(col) if len(col) > 0 else 0
    )

    series = [
        {"period": period, "resistanceRate": round(float(rate), 4)}
        for period, rate in grouped.sort_index().items()
    ]

    return series
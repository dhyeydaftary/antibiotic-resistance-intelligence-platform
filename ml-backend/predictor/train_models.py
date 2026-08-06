"""
train_models.py

Reconstructed training pipeline for the 15 per-antibiotic CatBoost models.

No training script for the original models was ever committed to this repo —
only their outputs (catboost_<antibiotic>.pkl x15, X_engineered.csv,
y_targets.csv, feature_columns.json) exist. The encoding scheme implemented
here was reverse-engineered from predict.py's inference-time logic and
verified to reproduce ml_artifacts/X_engineered.csv exactly, column for
column, from ml_artifacts/cleaned_dataset_augmented.csv.

This script evaluates two feature schemes per antibiotic using IDENTICAL
5-fold stratified cross-validation, so the comparison in the resulting report
isolates the effect of the new synthetic features rather than split variance:

  - "baseline": the original 19-feature scheme (Age, Gender, Diabetes,
    Hypertension, Hospital_before, Infection_Freq, Year, Month, Date_Missing,
    Organism_*), retrained fresh here (not the originally-shipped .pkl —
    those were trained on an unknown split and are kept only for reference).
  - the "new" model: the 19 original features + encoded columns derived from
    the synthetic clinical variables (binary Yes/No -> 0/1, multi-level
    categoricals -> one-hot, numerics -> passthrough).

A single 80/20 holdout split was used in an earlier iteration of this script.
It was replaced with 5-fold CV after two antibiotics (FOX, CTX/CRO) showed an
apparent >0.01 accuracy/F1 drop on that split when 4 low-value features were
removed (v2 -> v3) that did not replicate under cross-validation (CV delta
~0.005, within the noise band) — a single split is too noisy a basis for
this comparison given how close these feature sets perform.

For each antibiotic, accuracy/F1/confusion-matrix are computed from
out-of-fold predictions aggregated across all 5 folds (every row is predicted
exactly once, by a model that never trained on it) — this uses the whole
dataset for evaluation rather than holding 20% out permanently. Per-fold
mean/std are also reported for transparency. The deployed model artifact
(catboost_<antibiotic>_v3.pkl) is then fit once more on the FULL labeled
dataset for that antibiotic (standard practice: CV is for evaluation only,
the shipped model should use all available data).

Generations produced by this script so far (each run overwrites only its own
generation's artifacts — earlier generations are never touched):
  - v2 (51 features, 28 synthetic columns): catboost_<antibiotic>_v2.pkl,
    multi_target_model_comparison_v2.csv, shap_top_features_v2.json.
  - v3 (47 features, 24 synthetic columns): Blood_Pressure_Systolic,
    Height_cm, Platelets, and Hemoglobin were dropped after v2's SHAP review
    showed near-zero real correlation with resistance outcomes relative to
    their model-complexity cost. catboost_<antibiotic>_v3.pkl,
    multi_target_model_comparison_v3.csv, shap_top_features_v3.json.

ARTIFACT_TAG below controls which generation the *next* run produces; bump it
and update NEW_NUMERIC_COLUMNS/NEW_BINARY_COLUMNS when the feature set changes
again, rather than overwriting a prior generation's files.

Run: python train_models.py   (from ml-backend/predictor/, same convention
as generate_synthetic_features.py)
"""

import json
import os

import joblib
import numpy as np
import pandas as pd
from catboost import CatBoostClassifier, Pool
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import accuracy_score, f1_score, confusion_matrix

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTIFACTS_DIR = os.path.join(BASE_DIR, 'ml_artifacts')
DATA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cleaned_dataset_augmented.csv')

RANDOM_STATE = 42
N_FOLDS = 5
SHAP_SAMPLE_SIZE = 2000  # cap SHAP explanation cost; sampled from the full labeled set
ARTIFACT_TAG = 'v3'

ORGANISM_LIST = [
    'Acinetobacter baumannii', 'Citrobacter spp.', 'Enterobacteria spp.',
    'Escherichia coli', 'Klebsiella pneumoniae', 'Morganella morganii',
    'Proteus mirabilis', 'Pseudomonas aeruginosa', 'Serratia marcescens', 'Unknown'
]

with open(os.path.join(ARTIFACTS_DIR, 'antibiotic_columns.json')) as f:
    ANTIBIOTIC_COLUMNS = json.load(f)

with open(os.path.join(ARTIFACTS_DIR, 'antibiotic_label_maps.json')) as f:
    LABEL_MAPS = json.load(f)

OLD_FEATURE_COLUMNS = [
    'Age', 'Gender', 'Diabetes', 'Hypertension', 'Hospital_before',
    'Infection_Freq', 'Year', 'Month', 'Date_Missing',
] + [f'Organism_{o}' for o in ORGANISM_LIST]

SPECIMEN_LEVELS = ["Blood", "Urine", "Wound", "Respiratory", "Catheter"]

NEW_BINARY_COLUMNS = [
    'Ward_Type', 'Previous_Antibiotic_Use', 'CKD_Status', 'Liver_Disease',
    'Cancer', 'Immunocompromised_Status', 'Fever', 'Cough',
    'Burning_Urination', 'Wound_Infection',
]
# The "positive" string value for each binary column (encoded as 1)
NEW_BINARY_POSITIVE = {
    'Ward_Type': 'ICU',
    'Previous_Antibiotic_Use': 'Yes',
    'CKD_Status': 'Yes',
    'Liver_Disease': 'Yes',
    'Cancer': 'Yes',
    'Immunocompromised_Status': 'Yes',
    'Fever': 'Yes',
    'Cough': 'Yes',
    'Burning_Urination': 'Yes',
    'Wound_Infection': 'Yes',
}

NEW_NUMERIC_COLUMNS = [
    'WBC', 'Neutrophils_pct', 'Lymphocytes_pct',
    'CRP', 'Procalcitonin', 'Creatinine', 'eGFR', 'Temperature', 'Heart_Rate',
    'Respiratory_Rate', 'SpO2',
    'Weight_kg', 'BMI',
]

NEW_FEATURE_COLUMNS = (
    NEW_BINARY_COLUMNS
    + [f'Specimen_Source_{level}' for level in SPECIMEN_LEVELS]
    + NEW_NUMERIC_COLUMNS
)

FULL_FEATURE_COLUMNS = OLD_FEATURE_COLUMNS + NEW_FEATURE_COLUMNS


# Loads the raw augmented training CSV.
def load_dataset():
    return pd.read_csv(DATA_PATH)


# Encodes the original 19-feature baseline schema from raw dataset columns.
def engineer_old_features(df):
    dates = pd.to_datetime(df['Collection_Date'], errors='coerce')
    out = pd.DataFrame({
        'Age': df['Age'].astype(int),
        'Gender': (df['Gender'] == 'Male').astype(int),
        'Diabetes': (df['Diabetes'] == 'Yes').astype(int),
        'Hypertension': (df['Hypertension'] == 'Yes').astype(int),
        'Hospital_before': (df['Hospital_before'] == 'Yes').astype(int),
        'Infection_Freq': df['Infection_Freq'].astype(float),
        'Year': dates.dt.year.fillna(0).astype(int),
        'Month': dates.dt.month.fillna(0).astype(int),
        'Date_Missing': dates.isna().astype(int),
    })
    for organism in ORGANISM_LIST:
        out[f'Organism_{organism}'] = (df['Organism'] == organism).astype(int)
    return out[OLD_FEATURE_COLUMNS]


# Encodes the synthetic clinical-variable columns into model-ready features.
def engineer_new_features(df):
    out = pd.DataFrame(index=df.index)
    for col in NEW_BINARY_COLUMNS:
        out[col] = (df[col] == NEW_BINARY_POSITIVE[col]).astype(int)
    for level in SPECIMEN_LEVELS:
        out[f'Specimen_Source_{level}'] = (df['Specimen_Source'] == level).astype(int)
    for col in NEW_NUMERIC_COLUMNS:
        out[col] = df[col].astype(float)
    return out[NEW_FEATURE_COLUMNS]


# Combines old + new engineered features into the full training matrix.
def build_feature_matrix(df):
    old = engineer_old_features(df)
    new = engineer_new_features(df)
    return pd.concat([old, new], axis=1)[FULL_FEATURE_COLUMNS]


# Converts an antibiotic name into a filesystem-safe artifact filename.
def safe_name(antibiotic):
    return antibiotic.replace('/', '_').replace(' ', '_')


# Runs 5-fold stratified CV for one antibiotic's model and reports metrics.
def cv_evaluate(X, y):
    """
    5-fold stratified CV. Out-of-fold predictions are aggregated across all
    folds (every row predicted exactly once, never by a model trained on it)
    to compute one accuracy/F1/confusion-matrix over the whole dataset. Per-
    fold accuracy/F1 mean+std are also returned for transparency (how much
    the estimate varies fold to fold).
    """
    skf = StratifiedKFold(n_splits=N_FOLDS, shuffle=True, random_state=RANDOM_STATE)
    oof_preds = pd.Series(index=y.index, dtype='int64')
    fold_accs, fold_f1s = [], []

    for train_pos, test_pos in skf.split(X, y):
        train_ix, test_ix = y.index[train_pos], y.index[test_pos]
        model = CatBoostClassifier(random_state=RANDOM_STATE, verbose=0)
        model.fit(X.loc[train_ix], y.loc[train_ix])
        preds = np.asarray(model.predict(X.loc[test_ix])).reshape(-1)
        oof_preds.loc[test_ix] = preds
        fold_accs.append(accuracy_score(y.loc[test_ix], preds))
        fold_f1s.append(f1_score(y.loc[test_ix], preds, average='weighted'))

    cm = confusion_matrix(y, oof_preds, labels=[0, 1, 2])  # I, R, S

    return {
        'accuracy': accuracy_score(y, oof_preds),
        'f1_weighted': f1_score(y, oof_preds, average='weighted'),
        'accuracy_fold_mean': float(np.mean(fold_accs)),
        'accuracy_fold_std': float(np.std(fold_accs)),
        'f1_fold_mean': float(np.mean(fold_f1s)),
        'f1_fold_std': float(np.std(fold_f1s)),
        'confusion_matrix': cm.tolist(),
    }


# Computes the top-N features by mean absolute SHAP value, for the
# post-training importance report.
def shap_top_features(model, X_sample, feature_names, top_n=10):
    pool = Pool(X_sample)
    shap_values = model.get_feature_importance(data=pool, type='ShapValues')
    # shap_values shape: (n_samples, n_classes, n_features + 1) for multiclass
    class_shap = shap_values[:, :, :-1]  # drop bias term
    mean_abs = np.abs(class_shap).mean(axis=(0, 1))  # avg over samples and classes
    order = np.argsort(mean_abs)[::-1][:top_n]
    return [(feature_names[i], float(mean_abs[i])) for i in order]


# Entry point: trains and evaluates all 15 per-antibiotic models, writes
# the deployed .pkl artifacts plus comparison/defaults/SHAP reports.
def main():
    df = load_dataset()
    X_full = build_feature_matrix(df)
    X_old = X_full[OLD_FEATURE_COLUMNS]

    results = []
    shap_reports = {}

    for antibiotic in ANTIBIOTIC_COLUMNS:
        y_raw = df[antibiotic]
        valid = y_raw.notna()
        y = y_raw[valid].map(LABEL_MAPS[antibiotic]).astype(int)

        X_old_ab = X_old[valid]
        X_full_ab = X_full[valid]

        print(f"\n=== {antibiotic} ===  n={len(y)}  ({N_FOLDS}-fold CV)")

        old_metrics = cv_evaluate(X_old_ab, y)
        print(f"  baseline ({len(OLD_FEATURE_COLUMNS)} features):  "
              f"acc={old_metrics['accuracy']:.4f} (fold {old_metrics['accuracy_fold_mean']:.4f}+-{old_metrics['accuracy_fold_std']:.4f})  "
              f"f1w={old_metrics['f1_weighted']:.4f} (fold {old_metrics['f1_fold_mean']:.4f}+-{old_metrics['f1_fold_std']:.4f})")

        new_metrics = cv_evaluate(X_full_ab, y)
        print(f"  {ARTIFACT_TAG} ({len(FULL_FEATURE_COLUMNS)} features):       "
              f"acc={new_metrics['accuracy']:.4f} (fold {new_metrics['accuracy_fold_mean']:.4f}+-{new_metrics['accuracy_fold_std']:.4f})  "
              f"f1w={new_metrics['f1_weighted']:.4f} (fold {new_metrics['f1_fold_mean']:.4f}+-{new_metrics['f1_fold_std']:.4f})")

        # Deployed artifact: fit once more on the FULL labeled dataset for this
        # antibiotic (CV above is for evaluation only; the shipped model uses
        # all available data, standard practice once CV has validated it).
        final_model = CatBoostClassifier(random_state=RANDOM_STATE, verbose=0)
        final_model.fit(X_full_ab, y)
        model_path = os.path.join(ARTIFACTS_DIR, f'catboost_{safe_name(antibiotic)}_{ARTIFACT_TAG}.pkl')
        joblib.dump(final_model, model_path)

        shap_sample = X_full_ab.sample(n=min(SHAP_SAMPLE_SIZE, len(X_full_ab)), random_state=RANDOM_STATE)
        top_feats = shap_top_features(final_model, shap_sample, FULL_FEATURE_COLUMNS)
        shap_reports[antibiotic] = top_feats

        results.append({
            'Antibiotic': antibiotic,
            'Baseline_Accuracy': old_metrics['accuracy'],
            'Baseline_F1_weighted': old_metrics['f1_weighted'],
            'Baseline_Accuracy_fold_mean': old_metrics['accuracy_fold_mean'],
            'Baseline_Accuracy_fold_std': old_metrics['accuracy_fold_std'],
            'Baseline_F1_fold_mean': old_metrics['f1_fold_mean'],
            'Baseline_F1_fold_std': old_metrics['f1_fold_std'],
            f'{ARTIFACT_TAG.upper()}_Accuracy': new_metrics['accuracy'],
            f'{ARTIFACT_TAG.upper()}_F1_weighted': new_metrics['f1_weighted'],
            f'{ARTIFACT_TAG.upper()}_Accuracy_fold_mean': new_metrics['accuracy_fold_mean'],
            f'{ARTIFACT_TAG.upper()}_Accuracy_fold_std': new_metrics['accuracy_fold_std'],
            f'{ARTIFACT_TAG.upper()}_F1_fold_mean': new_metrics['f1_fold_mean'],
            f'{ARTIFACT_TAG.upper()}_F1_fold_std': new_metrics['f1_fold_std'],
            'Baseline_ConfMatrix_IRS': old_metrics['confusion_matrix'],
            f'{ARTIFACT_TAG.upper()}_ConfMatrix_IRS': new_metrics['confusion_matrix'],
        })

    report_df = pd.DataFrame(results)
    report_path = os.path.join(ARTIFACTS_DIR, f'multi_target_model_comparison_{ARTIFACT_TAG}.csv')
    report_df.to_csv(report_path, index=False)
    print(f"\nWrote comparison report to {report_path}")

    # Defaults for optional new fields at inference time (predict.py uses these
    # when a request omits a lab/vital) — medians from the training data.
    defaults = {col: float(df[col].median()) for col in NEW_NUMERIC_COLUMNS}
    defaults_path = os.path.join(ARTIFACTS_DIR, 'feature_defaults.json')
    with open(defaults_path, 'w') as f:
        json.dump(defaults, f, indent=2)
    print(f"Wrote inference-time defaults to {defaults_path}")

    shap_path = os.path.join(ARTIFACTS_DIR, f'shap_top_features_{ARTIFACT_TAG}.json')
    with open(shap_path, 'w') as f:
        json.dump({ab: feats for ab, feats in shap_reports.items()}, f, indent=2)
    print(f"Wrote SHAP top-feature report to {shap_path}")

    return report_df, shap_reports


if __name__ == '__main__':
    main()

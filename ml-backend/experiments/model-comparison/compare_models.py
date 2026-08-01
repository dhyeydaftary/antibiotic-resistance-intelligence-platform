"""
compare_models.py

RETROACTIVE benchmark validating the already-shipped CatBoost-per-antibiotic
production model against 4 other model families, on the exact same
finalized feature matrix and targets production trains on.

This does NOT modify, import-side-effect, or overwrite anything under
ml-backend/ml_artifacts/ or ml-backend/predictor/. It reuses
ml-backend/predictor/train_models.py's own preprocessing functions
(load_dataset, build_feature_matrix) and constants (ANTIBIOTIC_COLUMNS,
LABEL_MAPS, RANDOM_STATE, N_FOLDS) by importing that module directly — the
feature matrix built here is byte-for-byte the same DataFrame production's
own training script builds, not a reimplementation.

No verified record exists of CatBoost being benchmarked against other model
families before it became the production choice (checked: git log --all
--grep across ml-backend/, and no other model-family artifacts anywhere in
ml_artifacts/ or git history). This script exists to supply that missing
comparison after the fact — it does not claim the comparison happened
before CatBoost shipped.

METHODOLOGY
-----------
Models: Logistic Regression, Decision Tree, Random Forest, XGBoost, CatBoost.
(No other model family was found anywhere in the repo's history or
artifacts to include alongside these five.)

Seed: RANDOM_STATE = 42, imported from train_models.py (the same seed
production's own cv_evaluate() uses), applied everywhere in this script —
StratifiedKFold splits, all 5 model constructors, and the inner tuning
splits.

Outer evaluation protocol: for each (antibiotic, model), a fresh
StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE) —
identical construction to train_models.py's cv_evaluate() — produces
out-of-fold (OOF) predictions and predicted probabilities across the WHOLE
labeled dataset for that antibiotic (every row predicted exactly once, by a
model that never trained on it). All reported metrics (accuracy,
macro-precision, macro-recall, macro-F1, macro one-vs-rest ROC-AUC) are
computed once from those aggregated OOF predictions/probabilities — the
same aggregation style production uses for its own accuracy/F1 numbers, so
this benchmark's numbers are directly comparable to what's already in
ml_artifacts/multi_target_model_comparison_v3.csv.

Macro averaging (not weighted/micro) is used for precision/recall/F1/ROC-AUC
specifically because the "Intermediate" (I) class is severely
under-represented for several antibiotics (documented in
docs/data/known-limitations.md) — macro averaging weights all 3 classes
equally, so a model that simply ignores the minority class can't hide that
behind a majority-class-dominated score the way weighted/micro averaging
would let it.

Hyperparameter tuning ("light", not exhaustive, same budget/method for
every model): for each (antibiotic, model), a single hyperparameter is
varied over exactly 4 candidate values (every model gets exactly 4
candidates — same budget). Each candidate is scored by macro-F1 from
out-of-fold predictions on a 3-fold StratifiedKFold INNER split of that
antibiotic's full dataset (a hand-rolled loop, not sklearn's GridSearchCV —
deliberate, to guarantee byte-identical tuning mechanics across all 5
model families rather than trusting each estimator's sklearn-wrapper
compatibility with GridSearchCV's clone() machinery, which is not
guaranteed equally robust across catboost/xgboost/sklearn on a brand-new
Python/toolchain combination). The winning value is then used, fixed, for
all 5 outer folds. This is a simplification of "proper" nested CV (tuning
happens once per antibiotic on the full dataset rather than freshly inside
every outer fold) — it keeps runtime tractable (15 antibiotics x 5 models x
(4 candidates x 3 inner folds + 5 outer folds) = 1,275 total model fits)
and, because the SAME simplification applies identically to all 5 models,
it does not advantage any one model family over another in the comparison.
Final chosen hyperparameters per (antibiotic, model) are recorded in the
results CSV and summarized in the report.

Training/inference time: wall-clock seconds for model.fit() and
model.predict() on each outer fold, averaged across the 5 outer folds.

Run: python compare_models.py   (from this directory; requires the
ml-backend-env virtualenv active, plus xgboost — see
requirements-experiment.txt in this directory for the one added dependency
beyond production's requirements.txt).
"""

import json
import os
import sys
import time
import warnings

import numpy as np
import pandas as pd

from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score,
)
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.exceptions import ConvergenceWarning

from xgboost import XGBClassifier
from catboost import CatBoostClassifier

# --- Reuse production's own preprocessing/constants by importing the module
# directly (no reimplementation of feature engineering). -------------------
THIS_DIR = os.path.dirname(os.path.abspath(__file__))
ML_BACKEND_DIR = os.path.dirname(os.path.dirname(THIS_DIR))
PREDICTOR_DIR = os.path.join(ML_BACKEND_DIR, 'predictor')
if PREDICTOR_DIR not in sys.path:
    sys.path.insert(0, PREDICTOR_DIR)

import train_models as prod  # noqa: E402  (ml-backend/predictor/train_models.py)

RESULTS_DIR = os.path.join(THIS_DIR, 'results')
PLOTS_DIR = os.path.join(RESULTS_DIR, 'plots')
RESULTS_CSV = os.path.join(RESULTS_DIR, 'model_comparison_results.csv')

RANDOM_STATE = prod.RANDOM_STATE      # 42 — identical seed to production
N_OUTER_FOLDS = prod.N_FOLDS          # 5 — identical outer-CV fold count
N_INNER_FOLDS = 3                     # inner CV used only for light tuning
CLASS_LABELS = [0, 1, 2]              # I, R, S — see antibiotic_label_maps.json

warnings.filterwarnings('ignore', category=ConvergenceWarning)


# ---------------------------------------------------------------------------
# Model factories + light-tuning grids.
# Every model gets exactly ONE hyperparameter varied over exactly 4
# candidate values — same tuning budget for all 5 model families.
# ---------------------------------------------------------------------------

def make_logreg(seed, **params):
    clf = LogisticRegression(max_iter=2000, random_state=seed, **params)
    return Pipeline([('scaler', StandardScaler()), ('clf', clf)])


def make_dtree(seed, **params):
    return DecisionTreeClassifier(random_state=seed, **params)


def make_rf(seed, **params):
    return RandomForestClassifier(random_state=seed, n_jobs=-1, **params)


def make_xgb(seed, **params):
    return XGBClassifier(
        random_state=seed, n_jobs=-1, tree_method='hist',
        eval_metric='mlogloss', max_depth=4, learning_rate=0.1,
        **params,
    )


def make_catboost(seed, **params):
    return CatBoostClassifier(random_state=seed, verbose=0, depth=6, thread_count=-1, **params)


MODEL_SPECS = {
    'LogisticRegression': {
        'factory': make_logreg,
        'param_name': 'C',
        'grid': [0.01, 0.1, 1.0, 10.0],
    },
    'DecisionTree': {
        'factory': make_dtree,
        'param_name': 'max_depth',
        'grid': [4, 8, 12, None],
    },
    'RandomForest': {
        'factory': make_rf,
        'param_name': 'n_estimators',
        'grid': [100, 200, 300, 400],
    },
    'XGBoost': {
        'factory': make_xgb,
        'param_name': 'n_estimators',
        'grid': [100, 200, 300, 400],
    },
    'CatBoost': {
        'factory': make_catboost,
        'param_name': 'iterations',
        'grid': [100, 200, 300, 400],
    },
}


def build_model(spec, param_value):
    return spec['factory'](RANDOM_STATE, **{spec['param_name']: param_value})


def aligned_proba(model, X, n_classes=3):
    """predict_proba columns follow model.classes_ order, which may omit a
    class never seen in that fold's training split. Scatter into a fixed
    (n_samples, n_classes) matrix indexed by the true label ids so
    downstream roc_auc_score always sees a consistent [I, R, S] column
    order regardless of what a given fold happened to train on."""
    proba = model.predict_proba(X)
    out = np.zeros((X.shape[0], n_classes))
    for j, cls in enumerate(model.classes_):
        out[:, int(cls)] = proba[:, j]
    return out


def light_tune(spec, X, y):
    """Pick the best of 4 candidate values for this model's one tuned
    hyperparameter, via 3-fold inner CV scored on aggregated OOF macro-F1.
    Same mechanics for every model family (see module docstring)."""
    inner_skf = StratifiedKFold(n_splits=N_INNER_FOLDS, shuffle=True, random_state=RANDOM_STATE)
    best_value, best_score = None, -np.inf

    for value in spec['grid']:
        oof_preds = pd.Series(index=y.index, dtype='int64')
        for train_pos, test_pos in inner_skf.split(X, y):
            train_ix, test_ix = y.index[train_pos], y.index[test_pos]
            model = build_model(spec, value)
            model.fit(X.loc[train_ix], y.loc[train_ix])
            oof_preds.loc[test_ix] = np.asarray(model.predict(X.loc[test_ix])).reshape(-1)
        score = f1_score(y, oof_preds, average='macro')
        if score > best_score:
            best_score, best_value = score, value

    return best_value


def outer_cv_evaluate(spec, best_value, X, y):
    """Identical outer-fold construction to train_models.py's cv_evaluate():
    StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE).
    Returns aggregated OOF metrics plus mean per-fold train/predict time."""
    skf = StratifiedKFold(n_splits=N_OUTER_FOLDS, shuffle=True, random_state=RANDOM_STATE)
    oof_preds = pd.Series(index=y.index, dtype='int64')
    oof_proba = np.zeros((len(y), len(CLASS_LABELS)))
    train_times, predict_times = [], []

    for train_pos, test_pos in skf.split(X, y):
        train_ix, test_ix = y.index[train_pos], y.index[test_pos]
        model = build_model(spec, best_value)

        t0 = time.perf_counter()
        model.fit(X.loc[train_ix], y.loc[train_ix])
        train_times.append(time.perf_counter() - t0)

        t0 = time.perf_counter()
        preds = np.asarray(model.predict(X.loc[test_ix])).reshape(-1)
        predict_times.append(time.perf_counter() - t0)

        pos = y.index.get_indexer(test_ix)
        oof_preds.loc[test_ix] = preds
        oof_proba[pos, :] = aligned_proba(model, X.loc[test_ix])

    y_arr = y.values
    preds_arr = oof_preds.values

    try:
        roc_auc = roc_auc_score(y_arr, oof_proba, multi_class='ovr', average='macro', labels=CLASS_LABELS)
    except ValueError as e:
        roc_auc = float('nan')
        print(f"    WARNING: ROC-AUC could not be computed ({e}) — recorded as NaN")

    return {
        'accuracy': accuracy_score(y_arr, preds_arr),
        'precision_macro': precision_score(y_arr, preds_arr, average='macro', labels=CLASS_LABELS, zero_division=0),
        'recall_macro': recall_score(y_arr, preds_arr, average='macro', labels=CLASS_LABELS, zero_division=0),
        'f1_macro': f1_score(y_arr, preds_arr, average='macro', labels=CLASS_LABELS, zero_division=0),
        'roc_auc_macro_ovr': roc_auc,
        'train_time_sec': float(np.mean(train_times)),
        'predict_time_sec': float(np.mean(predict_times)),
    }


def run_benchmark(antibiotics=None, models=None):
    df = prod.load_dataset()
    X_full = prod.build_feature_matrix(df)

    antibiotics = antibiotics or prod.ANTIBIOTIC_COLUMNS
    model_names = models or list(MODEL_SPECS.keys())

    rows = []
    errors = []
    t_start_all = time.perf_counter()

    for antibiotic in antibiotics:
        y_raw = df[antibiotic]
        valid = y_raw.notna()
        y = y_raw[valid].map(prod.LABEL_MAPS[antibiotic]).astype(int)
        X_ab = X_full[valid]

        print(f"\n=== {antibiotic} ===  n={len(y)}")
        class_counts = y.value_counts().sort_index().to_dict()
        print(f"  class distribution (I/R/S ids 0/1/2): {class_counts}")

        for model_name in model_names:
            spec = MODEL_SPECS[model_name]
            t0 = time.perf_counter()
            try:
                best_value = light_tune(spec, X_ab, y)
                metrics = outer_cv_evaluate(spec, best_value, X_ab, y)
                elapsed = time.perf_counter() - t0
                print(f"  {model_name:<20} {spec['param_name']}={best_value!r:<8}  "
                      f"acc={metrics['accuracy']:.4f}  f1_macro={metrics['f1_macro']:.4f}  "
                      f"roc_auc_macro={metrics['roc_auc_macro_ovr']:.4f}  "
                      f"(tuned+evaluated in {elapsed:.1f}s)")

                rows.append({
                    'Antibiotic': antibiotic,
                    'Model': model_name,
                    'N_Samples': len(y),
                    'Best_Hyperparam_Name': spec['param_name'],
                    'Best_Hyperparam_Value': best_value,
                    'Accuracy': metrics['accuracy'],
                    'Precision_Macro': metrics['precision_macro'],
                    'Recall_Macro': metrics['recall_macro'],
                    'F1_Macro': metrics['f1_macro'],
                    'ROC_AUC_Macro_OVR': metrics['roc_auc_macro_ovr'],
                    'Train_Time_Sec': metrics['train_time_sec'],
                    'Predict_Time_Sec': metrics['predict_time_sec'],
                })
            except Exception as e:
                elapsed = time.perf_counter() - t0
                print(f"  {model_name:<20} ERROR after {elapsed:.1f}s: {e}")
                errors.append({'antibiotic': antibiotic, 'model': model_name, 'error': str(e)})
                rows.append({
                    'Antibiotic': antibiotic,
                    'Model': model_name,
                    'N_Samples': len(y),
                    'Best_Hyperparam_Name': spec['param_name'],
                    'Best_Hyperparam_Value': None,
                    'Accuracy': None, 'Precision_Macro': None, 'Recall_Macro': None,
                    'F1_Macro': None, 'ROC_AUC_Macro_OVR': None,
                    'Train_Time_Sec': None, 'Predict_Time_Sec': None,
                })

    total_elapsed = time.perf_counter() - t_start_all

    results_df = pd.DataFrame(rows)
    os.makedirs(RESULTS_DIR, exist_ok=True)
    results_df.to_csv(RESULTS_CSV, index=False)
    print(f"\nWrote {len(results_df)} rows to {RESULTS_CSV}")

    if errors:
        errors_path = os.path.join(RESULTS_DIR, 'errors.json')
        with open(errors_path, 'w') as f:
            json.dump(errors, f, indent=2)
        print(f"{len(errors)} (antibiotic, model) pair(s) errored — see {errors_path}")
    else:
        print("No errors — all (antibiotic, model) pairs completed successfully.")

    print(f"\nTotal benchmark runtime: {total_elapsed:.1f}s ({total_elapsed / 60:.1f} min)")
    return results_df, errors, total_elapsed


if __name__ == '__main__':
    run_benchmark()

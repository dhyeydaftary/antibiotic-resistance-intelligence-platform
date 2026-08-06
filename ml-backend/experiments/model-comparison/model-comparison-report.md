# Model Comparison Report — CatBoost vs. 4 Alternative Model Families

## Objective

This is a **retroactive validation experiment**. AMR-Insight already ships
CatBoost as its production model — one independent CatBoost classifier per
antibiotic (15 total), defined in `ml-backend/predictor/train_models.py`.
No verified record of CatBoost being benchmarked against other model
families exists anywhere in this project's history: a search of
`git log --all` across `ml-backend/` for commit messages mentioning model
selection, comparison, or benchmarking, and a search of every
`ml-backend/ml_artifacts/` artifact for evidence of any other trained model
family, both turned up nothing. If a comparison happened before CatBoost
was chosen, it was not preserved in this repository.

This experiment does not claim that comparison happened historically. It
exists solely to supply, after the fact, a reproducible, evidence-based
answer to the question "does CatBoost actually outperform the obvious
alternatives on this project's real data and preprocessing?" — so that the
existing production choice can be formally documented and justified (or
reconsidered) going into an ADR, rather than resting on an unrecorded
rationale.

This experiment is fully isolated under `ml-backend/experiments/model-comparison/`.
It does not modify `train_models.py`, `predict.py`, or any other production
file, and it does not write to or overwrite anything under
`ml-backend/ml_artifacts/`.

## Dataset Used

The same dataset production trains on: the Kaggle-sourced AMR dataset,
augmented with synthetic clinical features (see
`docs/data/data-dictionary.md` for the full feature-level reference, and
`docs/data/synthetic-feature-methodology.md` for how the synthetic columns
were generated and validated against leakage).

- **10,710 rows**, loaded from `ml-backend/predictor/cleaned_dataset_augmented.csv`
  via `train_models.load_dataset()` — the exact same file and function
  production's own training script uses.
- **v3 47-column encoded feature schema** (19 original real columns + 24
  encoded synthetic columns, per `ml-backend/ml_artifacts/feature_columns.json`) —
  built via `train_models.build_feature_matrix()`, the exact same function
  production uses to go from raw CSV to model-ready features.
- **15 independent binary/multiclass targets**, one per antibiotic
  (`ml-backend/ml_artifacts/antibiotic_columns.json`), each a 3-class
  problem: Intermediate (I=0), Resistant (R=1), Susceptible (S=2), per
  `ml-backend/ml_artifacts/antibiotic_label_maps.json`. Row counts per
  antibiotic range from ~9,957 (most antibiotics; some rows have missing
  results for a given antibiotic and are excluded per-target, identical to
  production's own `valid = y_raw.notna()` filtering).
- The "Intermediate" (I) class is a severe minority across every
  antibiotic — as low as ~1.7%–2.3% of rows for several antibiotics (e.g.
  167/9,957 for GEN) — this is the documented class-imbalance limitation in
  `docs/data/known-limitations.md`, and it directly motivates the
  macro-averaging choice below.

## Preprocessing Pipeline Used

**Identical to production — not reimplemented.** This script imports
`ml-backend/predictor/train_models.py` directly (`import train_models as prod`)
and calls its own `load_dataset()` and `build_feature_matrix()` functions.
The feature matrix used for every model in this benchmark is the exact
same `pandas.DataFrame` object production's own training script would
build — same column set, same encoding (Yes/No → 0/1, multi-level
categoricals → one-hot, numerics → passthrough), same organism one-hot
columns, same date parsing. No preprocessing logic was rewritten or
duplicated for this experiment.

The only per-model deviation from a single shared feature matrix is that
**Logistic Regression alone** additionally standardizes features (zero
mean, unit variance) via a `scikit-learn` `Pipeline` immediately before
fitting. This is standard, necessary practice for a gradient-based linear
model on features with wildly different native scales (e.g. `CRP` ranges
1–300, one-hot flags are 0/1) — it is a per-algorithm modeling
requirement, not a change to the shared feature matrix itself, and the
other four models (which are all tree-based and scale-invariant) receive
the unscaled matrix unchanged. This is called out explicitly so it isn't
mistaken for "a different preprocessing path" for Logistic Regression.

## Evaluation Methodology

**Seed:** `RANDOM_STATE = 42`, imported directly from `train_models.py` —
the same seed production's own `cv_evaluate()` uses. This seed is applied
to every StratifiedKFold split (inner and outer) and every model
constructor in this script.

**Outer evaluation (comparable to production's own reported CV numbers):**
for each (antibiotic, model) pair, `StratifiedKFold(n_splits=5,
shuffle=True, random_state=42)` — construction identical to
`train_models.cv_evaluate()` — produces out-of-fold (OOF) predictions and
predicted probabilities across the *entire* labeled dataset for that
antibiotic (every row predicted exactly once, by a model that never
trained on it). All reported metrics are computed once from those
aggregated OOF predictions, the same aggregation style
`multi_target_model_comparison_v3.csv` uses for production's own
accuracy/F1 numbers — so this benchmark's numbers sit on the same footing
as what's already shipped.

**Why macro-averaged metrics:** precision, recall, F1, and ROC-AUC are all
computed with **macro** averaging (equal weight per class), not
weighted/micro averaging, specifically because the Intermediate class is
severely under-represented for several antibiotics (see Dataset section
above and `docs/data/known-limitations.md`). Weighted or micro averaging
would let a model that never predicts the minority class at all still
score well, because that class is a small fraction of total rows — macro
averaging keeps that failure mode visible instead of averaging it away.

**Hyperparameter tuning — "light," same budget/method for every model:**
for each (antibiotic, model), exactly **one** hyperparameter is varied over
exactly **4 candidate values** — every model family gets the same number
of candidates, no exceptions. Each candidate is scored by macro-F1 from a
hand-rolled 3-fold inner `StratifiedKFold` (not `sklearn.GridSearchCV`,
deliberately — to guarantee identical tuning mechanics across all 5 model
families rather than relying on each library's sklearn-wrapper
compatibility with `GridSearchCV`'s `clone()` machinery, which is not
equally battle-tested for catboost/xgboost on this stack: Python 3.14.2,
scikit-learn 1.9.0, catboost 1.2.10, xgboost 3.3.0). The winning value is
then fixed for all 5 outer folds.

This means tuning happens once per antibiotic on that antibiotic's full
dataset, not freshly inside every outer fold — a deliberate simplification
of "proper" nested CV, made to keep total runtime tractable (15 antibiotics
× 5 models × (4 candidates × 3 inner folds + 5 outer folds) = **1,275
total model fits**). Because this simplification is applied *identically*
to all 5 models, it does not advantage any one model family in the
comparison — if anything, it applies the same mild optimistic bias to
everyone equally.

**The goal of this tuning protocol is a fair comparison between model
families, not the best possible configuration for any single algorithm.**
None of the 5 models received anything resembling exhaustive tuning.

**Exact hyperparameter grids used (4 candidates each):**

| Model | Fixed parameters | Tuned parameter | Candidate values |
|---|---|---|---|
| Logistic Regression | `max_iter=2000`, features standardized | `C` | `[0.01, 0.1, 1.0, 10.0]` |
| Decision Tree | (none — sklearn defaults otherwise) | `max_depth` | `[4, 8, 12, None]` |
| Random Forest | `n_jobs=-1` (parallelism only, not a modeling choice) | `n_estimators` | `[100, 200, 300, 400]` |
| XGBoost | `max_depth=4`, `learning_rate=0.1`, `tree_method='hist'`, `eval_metric='mlogloss'` | `n_estimators` | `[100, 200, 300, 400]` |
| CatBoost | `depth=6`, `verbose=0` | `iterations` | `[100, 200, 300, 400]` |

All 5 models use `random_state=42`.

**Selected values across the 15 antibiotics** (i.e. what the light-tuning
step actually picked most often):

| Model | Value distribution across 15 antibiotics |
|---|---|
| Logistic Regression (`C`) | 0.01 → 10x, 0.1 → 5x |
| Decision Tree (`max_depth`) | None (unlimited) → 7x, 4 → 5x, 12 → 2x, 8 → 1x |
| Random Forest (`n_estimators`) | 100 → 7x, 400 → 6x, 300 → 1x, 200 → 1x |
| XGBoost (`n_estimators`) | 400 → 9x, 100 → 5x, 200 → 1x |
| CatBoost (`iterations`) | 400 → 5x, 100 → 5x, 200 → 3x, 300 → 2x |

**Training/inference time:** wall-clock seconds for `model.fit()` and
`model.predict()` on each of the 5 outer folds, averaged across those 5
folds, per (antibiotic, model).

## Full Comparison Table (Aggregated Across All 15 Antibiotics)

Mean ± standard deviation across the 15 antibiotics, for each of the 5
model families:

| Model | Accuracy | Precision (macro) | Recall (macro) | F1 (macro) | ROC-AUC (macro OVR) | Train time (s) | Predict time (s) |
|---|---|---|---|---|---|---|---|
| **Logistic Regression** | 0.7624 ± 0.0895 | **0.5418 ± 0.1565** | 0.3778 ± 0.0477 | 0.3645 ± 0.0616 | **0.5856 ± 0.0336** | **0.0732 ± 0.0222** | 0.0043 ± 0.0006 |
| **Decision Tree** | 0.6975 ± 0.0474 | 0.4081 ± 0.1105 | 0.3784 ± 0.0436 | **0.3764 ± 0.0441** | 0.5456 ± 0.0470 | 0.0969 ± 0.0531 | **0.0031 ± 0.0002** |
| **Random Forest** | 0.7610 ± 0.0910 | 0.4133 ± 0.1103 | 0.3727 ± 0.0450 | 0.3553 ± 0.0575 | 0.5781 ± 0.0388 | 1.7177 ± 1.0625 | 0.0659 ± 0.0371 |
| **XGBoost** | 0.7580 ± 0.0909 | 0.5039 ± 0.1262 | 0.3731 ± 0.0449 | 0.3585 ± 0.0562 | 0.5726 ± 0.0318 | 1.2410 ± 0.6047 | 0.0218 ± 0.0049 |
| **CatBoost (production)** | 0.7474 ± 0.0990 | 0.4179 ± 0.0968 | 0.3658 ± 0.0376 | 0.3511 ± 0.0470 | 0.5662 ± 0.0318 | 2.6925 ± 1.3851 | 0.0061 ± 0.0007 |

**Bold** marks the best mean value per column. Full per-(antibiotic ×
model) rows, including every individual metric, are in
`results/model_comparison_results.csv` (75 rows: 15 antibiotics × 5
models).

**Per-antibiotic "wins" (best value for that antibiotic, counted across
all 15 antibiotics):**

| Metric | Win counts by model |
|---|---|
| Accuracy | Logistic Regression: 12, Random Forest: 3, **CatBoost: 0** |
| Macro F1 | Decision Tree: 10, Logistic Regression: 5, **CatBoost: 0** |
| Macro ROC-AUC (OVR) | Logistic Regression: 10, Random Forest: 3, XGBoost: 2, **CatBoost: 0** |

Plots: `results/plots/accuracy.png`, `results/plots/f1_score.png`,
`results/plots/training_time.png` (mean ± std bar charts across all 15
antibiotics), and `results/plots/f1_macro_variance_boxplot.png`
(per-model macro-F1 distribution across the 15 antibiotics, showing
consistency rather than just average).

## Observations

**CatBoost — the current production model — did not win on accuracy,
macro-F1, or macro ROC-AUC for any of the 15 antibiotics in this
benchmark**, and had the lowest mean accuracy (0.7474) and lowest mean
macro-F1 (0.3511) of all 5 model families. It was also, by a wide margin,
the slowest to train: 2.69s mean per fold, vs. 0.073s for Logistic
Regression (~37x slower) and 0.097s for Decision Tree (~28x slower). This
is reported plainly because the task explicitly requires it, and because
it is the single most important finding for the ADR this report feeds
into: **the evidence produced here does not support CatBoost's continued
use on predictive-performance grounds**, at least under this light-tuning
protocol.

**Two clearly distinct antibiotic groups emerge, and model behavior
differs meaningfully between them:**
- A "majority-R" group (AMX/AMP, AMC, CZ, FOX, CTX/CRO, IPM) where R and S
  are both substantial classes and I is a small minority (~1.7–1.9%).
  Accuracy clusters tightly around 0.62–0.66 for all 5 models, and
  **CatBoost is the single worst model on both accuracy and macro-F1 for
  every antibiotic in this group** (e.g. AMX/AMP: CatBoost acc=0.6345,
  f1=0.4087 vs. Logistic Regression acc=0.6623, f1=0.4284).
- A "majority-S" group (GEN, AN, Acide nalidixique, ofx, CIP, C,
  Co-trimoxazole, Furanes, colistine) where S dominates (~78–85% of rows)
  and I is an even smaller minority (~1.7–2.3%). Accuracy is higher across
  the board (0.78–0.85) for every model except Decision Tree, because
  models that lean toward predicting the majority S class score well on
  raw accuracy in this regime.

**Decision Tree's F1-macro wins come with a real trade-off, not a free
win.** Decision Tree has the best mean macro-F1 (0.3764) and wins the
per-antibiotic macro-F1 comparison 10/15 times, but this is driven by an
unconstrained tree (`max_depth=None` was selected 7/15 times) that
predicts the minority Intermediate class more often than the other
models — at a real cost: Decision Tree has the *lowest* mean accuracy
(0.6975, ~6-9 points below every other model) and the *lowest* mean
precision-macro (0.4081, tied lowest with CatBoost). In the majority-S
group specifically, Decision Tree's accuracy drops as low as 0.6486 (GEN)
and 0.7152 (CIP) while every other model stays in the high 0.78–0.84
range — Decision Tree is trading a large amount of overall correctness for
a modest gain in minority-class sensitivity. Whether that trade-off is
clinically desirable (catching more Intermediate cases at the cost of more
false Intermediate/Resistant calls elsewhere) is a judgment call outside
the scope of this benchmark's numbers alone.

**Logistic Regression is the most consistently strong performer across
every metric measured**, despite receiving the same "light, not
exhaustive" 4-candidate tuning budget as every other model, and despite
being by far the cheapest to train. It has the best mean accuracy (tied
with Random Forest, both ~0.761), the best mean precision-macro (0.5418,
well ahead of every other model), the best mean ROC-AUC (0.5856), and the
second-best mean macro-F1 (0.3645, just behind Decision Tree's 0.3764) —
all at roughly 1/37th CatBoost's training cost.

**Random Forest and XGBoost land in the middle on every metric** — neither
clearly better nor clearly worse than Logistic Regression on accuracy or
ROC-AUC, both meaningfully more expensive to train (Random Forest 1.72s,
XGBoost 1.24s mean, vs. Logistic Regression's 0.073s), and both still
outperforming CatBoost on every aggregated metric in this table.

**No unfavorable result was omitted.** All 75 (antibiotic, model)
combinations completed without error (`results/errors.json` was not even
created, since `errors` was empty) — there is no missing or excluded data
underlying this table.

## Final Recommendation

Grounded strictly in the numbers this script produced — not in CatBoost's
existing production status — **the evidence here does not support
CatBoost as the strongest available choice.** Across all three predictive
metrics evaluated (accuracy, macro-F1, macro ROC-AUC) and across all 15
antibiotics, CatBoost never ranked first, and its mean performance trails
the field on every metric while its training cost is by far the highest.

**Logistic Regression is the model this benchmark's evidence best
supports** for production use: it ties for the best mean accuracy, has the
best mean precision-macro and ROC-AUC, is a close second on mean macro-F1,
and trains roughly 37x faster than CatBoost — a meaningful operational
advantage for a service that (per `train_models.py`) retrains and reloads
15 independent per-antibiotic models. It achieves this under the exact
same light-tuning budget applied to every other model, so this is not an
artifact of Logistic Regression receiving preferential treatment.

This recommendation comes with two honest caveats, stated explicitly
rather than glossed over:
1. **Absolute performance is modest for every model family evaluated**
   (mean accuracy 0.70–0.76, mean macro-F1 0.35–0.38) — no model tested
   here, including CatBoost, solves the Intermediate-class minority
   problem well. Switching model families would not, by itself, fix the
   class-imbalance limitation documented in `docs/data/known-limitations.md`.
2. **This was a light-tuning benchmark, not an exhaustive one**, by explicit
   design and instruction. It is possible a more thoroughly tuned CatBoost
   configuration could close some or all of the gap seen here — that
   question is out of scope for this experiment and would need its own
   follow-up study to answer rigorously before being used to justify
   *not* acting on this benchmark's findings.

Given those caveats, the recommendation for the ADR is: **treat this as
evidence that CatBoost's continued use should be actively reconsidered**,
with Logistic Regression as the best-supported alternative from this
evidence, while flagging that a properly tuned head-to-head (not just
light tuning) between Logistic Regression and CatBoost specifically would
be the natural next step before making that switch final.

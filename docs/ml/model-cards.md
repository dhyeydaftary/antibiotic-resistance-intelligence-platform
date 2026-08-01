---
title: Model Cards
category: ml
last_updated: 2026-08-01
owner: dhyeydaftary
review_frequency: on-model-retrain
---

# Model Cards

## Purpose

This is the complete, per-antibiotic performance reference for AMR-Insight's production models — the full data behind the range `known-limitations.md` illustrates with a partial table. All figures are pulled directly from `ml-backend/ml_artifacts/multi_target_model_comparison_v3.csv` and `shap_top_features_v3.json`, the actual training-pipeline output, not re-derived or estimated.

This document covers the 15 production CatBoost models only. For the retrospective comparison against other model families (Logistic Regression, Decision Tree, Random Forest, XGBoost), see [ADR-0003: Prediction Model Strategy](../architecture/adr/ADR-0003-prediction-model-strategy.md) and [`ml-backend/experiments/model-comparison/model-comparison-report.md`](../../ml-backend/experiments/model-comparison/model-comparison-report.md) — that's a different experiment (model family selection) from this document (per-antibiotic production performance), and its comparison plots live there, not duplicated here.

**Production model version: v3.** This is the same schema version documented in [`docs/data/synthetic-feature-methodology.md`](../data/synthetic-feature-methodology.md#feature-schema-version-history) — 45 encoded features, four synthetic columns pruned from v2.

## Per-Antibiotic Performance

| Antibiotic | AWaRe Tier | Accuracy | Weighted F1 | Intermediate recall | Top 3 predictive features |
|---|---|---:|---:|---:|---|
| CZ | Access | 0.6267 | 0.6111 | 0.0% | `Organism_Escherichia coli`, `Lymphocytes_pct`, `CRP` |
| AMC | Access | 0.6298 | 0.6107 | 0.0% | `Organism_Escherichia coli`, `Heart_Rate`, `SpO2` |
| FOX | Watch | 0.6354 | 0.6189 | 0.0% | `Organism_Escherichia coli`, `Procalcitonin`, `Heart_Rate` |
| AMX/AMP | Access | 0.6381 | 0.6206 | 0.0% | `Organism_Escherichia coli`, `Weight_kg`, `BMI` |
| CTX/CRO | Watch | 0.6376 | 0.6208 | 0.0% | `Organism_Escherichia coli`, `SpO2`, `Heart_Rate` |
| IPM | Watch | 0.6412 | 0.6251 | 0.0% | `Organism_Escherichia coli`, `Lymphocytes_pct`, `Heart_Rate` |
| GEN | Access | 0.7848 | 0.6982 | 0.0% | `WBC`, `SpO2`, `Age` |
| AN | Access | 0.7873 | 0.7027 | 1.7% | `WBC`, `SpO2`, `BMI` |
| Acide nalidixique | Watch | 0.8399 | 0.7691 | 0.0% | `Organism_Escherichia coli`, `CRP`, `SpO2` |
| CIP | Watch | 0.8348 | 0.7629 | 0.6% | `Organism_Escherichia coli`, `BMI`, `SpO2` |
| C | Access | 0.8412 | 0.7715 | 0.5% | `Organism_Escherichia coli`, `WBC`, `Procalcitonin` |
| Co-trimoxazole | Access | 0.8393 | 0.7685 | 0.0% | `Organism_Escherichia coli`, `Heart_Rate`, `Lymphocytes_pct` |
| ofx | Watch | 0.8428 | 0.7725 | 0.0% | `Organism_Escherichia coli`, `BMI`, `Heart_Rate` |
| colistine | Reserve | 0.8453 | 0.7766 | 0.0% | `Organism_Escherichia coli`, `Heart_Rate`, `SpO2` |
| Furanes | Access | 0.8481 | 0.7804 | 0.0% | `Organism_Escherichia coli`, `WBC`, `Procalcitonin` |

Table sorted by accuracy, ascending. AWaRe tier source: `ml-backend/predictor/predict.py`'s `AWARE_MAP`.

**AWaRe** = WHO Access, Watch and Reserve antibiotic classification.

### Quick Summary

| Summary | Value |
|---|---|
| Highest accuracy | Furanes (84.81%) |
| Lowest accuracy | CZ (62.67%) |
| Highest weighted F1 | Furanes (0.7804) |
| Lowest weighted F1 | AMC (0.6107) — note this is *not* CZ, despite CZ having the lower accuracy |
| Best Intermediate recall | AN (1.7%) |

## The Intermediate Class Is Not Being Learned — Not Just for GEN

`known-limitations.md` illustrates this with one example (GEN, ~1.7% Intermediate rows, near-zero correct predictions). The full table above shows this isn't specific to GEN — it's true across nearly the entire panel: **12 of 15 antibiotics have exactly 0% Intermediate-class recall**, computed directly from each model's confusion matrix. The three exceptions (AN at 1.7%, CIP at 0.6%, C at 0.5%) are only marginally better than zero, not meaningfully different in practice. Every production model, regardless of its overall accuracy, effectively never predicts "Intermediate" correctly. This is the single most important caveat for interpreting any individual prediction — see `known-limitations.md` for the full discussion of why (severe class rarity in the source data), and treat this table as the evidence behind that claim, not a restatement of it.

## Interpreting the Top Predictive Features

These are each antibiotic's top 3 features by mean absolute SHAP magnitude, from `shap_top_features_v3.json` — the same artifact `docs/data/synthetic-feature-methodology.md` uses to justify feature pruning. One pattern worth naming: `Organism_Escherichia coli` is the top feature for 12 of 15 antibiotics — unsurprising given *E. coli* is 6,083 of the dataset's 10,710 rows (see `known-limitations.md`), but worth knowing when interpreting SHAP explanations for a specific prediction: organism identity dominates most models' decisions more than any single clinical measurement does. SHAP explains what the model's prediction is attributable to, not clinical causation — a high-SHAP feature reflects statistical influence on this model's output, not a claim that the feature causes resistance.

## Related Documentation

- [`docs/data/known-limitations.md`](../data/known-limitations.md) — the class-imbalance and per-organism-representation context behind both findings above
- [`docs/data/data-dictionary.md`](../data/data-dictionary.md) — full definitions for every feature named in the table above
- [`docs/architecture/adr/ADR-0003-prediction-model-strategy.md`](../architecture/adr/ADR-0003-prediction-model-strategy.md) — the retrospective model-family comparison, a different question from this document's per-antibiotic production figures
- [`docs/architecture/adr/ADR-0004-explainability-strategy.md`](../architecture/adr/ADR-0004-explainability-strategy.md) — how the SHAP values behind the "top predictive features" column are computed
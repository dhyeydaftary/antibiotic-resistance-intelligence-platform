---
title: Data Dictionary
category: data
last_updated: 2026-08-01
owner: dhyeydaftary
review_frequency: on-schema-change
---

# Data Dictionary

## Purpose

This is the single, authoritative reference for every column in AMR-Insight's trained feature matrix and source dataset — exact type, value range, unit, and whether it's real (measured) or synthetic (generated). Every value here is pulled directly from the dataset itself or the generation code that produces it, not estimated. This document defines the current v3 schema only; feature engineering, preprocessing, synthetic generation logic, and model behavior are documented elsewhere and linked throughout. For *why* the synthetic columns are conditioned the way they are, see [`docs/data/synthetic-feature-methodology.md`](synthetic-feature-methodology.md) — this document is the *what*, that one is the *why*.

## Prediction Targets (15 Antibiotic Outcome Labels)

These are the prediction targets, not input features. Each is a column in the source dataset with three possible values.

| Column | Values | Meaning |
|---|---|---|
| `AMX/AMP`, `AMC`, `CZ`, `FOX`, `CTX/CRO`, `IPM`, `GEN`, `AN`, `Acide nalidixique`, `ofx`, `CIP`, `C`, `Co-trimoxazole`, `Furanes`, `colistine` | `R` / `S` / `I` | Resistant / Susceptible / Intermediate — the antibiotic susceptibility test result for that antibiotic |

## Core Patient and Clinical Fields (Real, 7)

Measured, real values from the source dataset — these are also the only fields any synthetic variable is ever conditioned on (see the methodology doc).

| Column | Type | Values / Range | Unit |
|---|---|---|---|
| `Age` | integer | 0–90 | years |
| `Gender` | categorical | `Male`, `Female` | — |
| `Diabetes` | categorical | `Yes`, `No` | — |
| `Hypertension` | categorical | `Yes`, `No` | — |
| `Hospital_before` | categorical | `Yes`, `No` | prior hospitalization flag |
| `Infection_Freq` | numeric | 0–3 | count of prior infections |
| `Organism` | categorical | 10 levels (see below) | — |

## Collection Date and Derived Temporal Features (4)

| Column | Type | Values / Range | Derivation |
|---|---|---|---|
| `Collection_Date` | date | 2020-01-05 to 2025-02-05 | Raw dataset field; not fed to the model directly |
| `Year` | integer | parsed from `Collection_Date` | `dates.dt.year`, `0` if unparseable |
| `Month` | integer | 1–12 | `dates.dt.month`, `0` if unparseable |
| `Date_Missing` | binary | `0` / `1` | `1` if `Collection_Date` failed to parse, else `0`. At prediction time, the user supplies `Year`/`Month` directly and `Date_Missing` is always `0` — this flag only has meaning for historical training rows with a genuinely missing date. |

## Organism One-Hot Encoding (10 columns)

`Organism` expands to 10 binary columns in the trained feature matrix, one per level. Exactly one is `1` per row; the rest are `0`. Row counts per organism are in [`docs/data/known-limitations.md`](known-limitations.md).

```
Organism_Acinetobacter baumannii
Organism_Citrobacter spp.
Organism_Enterobacteria spp.
Organism_Escherichia coli
Organism_Klebsiella pneumoniae
Organism_Morganella morganii
Organism_Proteus mirabilis
Organism_Pseudomonas aeruginosa
Organism_Serratia marcescens
Organism_Unknown
```

## Synthetic Clinical Variables (24)

All values below are synthetically generated — sampled distributions, not measurements. Ranges are the exact `clip()` bounds enforced in `ml-backend/predictor/generate_synthetic_features.py`; see the methodology doc for what each is conditioned on and why.

### Ward and Prior-Care Context

| Column | Type | Values / Range | Unit |
|---|---|---|---|
| `Ward_Type` | categorical | `ICU`, `General Ward` | — |
| `Specimen_Source` | categorical (one-hot, 5 columns) | `Blood`, `Urine`, `Wound`, `Respiratory`, `Catheter` | — |
| `Previous_Antibiotic_Use` | categorical | `Yes`, `No` | — |

### Comorbidities

| Column | Type | Values / Range | Unit |
|---|---|---|---|
| `CKD_Status` | categorical | `Yes`, `No` | chronic kidney disease flag |
| `Liver_Disease` | categorical | `Yes`, `No` | — |
| `Cancer` | categorical | `Yes`, `No` | — |
| `Immunocompromised_Status` | categorical | `Yes`, `No` | — |

### Labs

| Column | Type | Range | Unit |
|---|---|---|---|
| `WBC` | float | 2.0–30.0 | ×10⁹/L |
| `Neutrophils_pct` | float | 20–95 | % |
| `Lymphocytes_pct` | float | 5–50 | % |
| `CRP` | float | 1–300 | mg/L |
| `Procalcitonin` | float | 0.01–20 | ng/mL |
| `Creatinine` | float | 0.3–8.0 | mg/dL |
| `eGFR` | float | 5–130 | mL/min/1.73m² |

### Vitals

| Column | Type | Range | Unit |
|---|---|---|---|
| `Temperature` | float | 35.5–40.5 | °C |
| `Heart_Rate` | float (rounded) | 50–150 | bpm |
| `Respiratory_Rate` | float (rounded) | 10–35 | breaths/min |
| `SpO2` | float | 85–100 | % |

### Symptoms

| Column | Type | Values | Unit |
|---|---|---|---|
| `Fever` | categorical | `Yes`, `No` | — |
| `Cough` | categorical | `Yes`, `No` | — |
| `Burning_Urination` | categorical | `Yes`, `No` | — |
| `Wound_Infection` | categorical | `Yes`, `No` | — |

### Body Measurements

| Column | Type | Range | Unit |
|---|---|---|---|
| `Weight_kg` | float | 20–160 | kg |
| `BMI` | float | derived: `Weight_kg / (height_m)²` | kg/m² |

`Height_cm` is sampled internally to derive `BMI` but is never exposed as its own column — it was in the v2 schema and was pruned in v3 (see the methodology doc's Feature Pruning section).

## Current Feature Matrix (v3)

The trained feature matrix (v3, current) has **45 encoded columns**: 19 base real/derived fields (`Age`, `Gender`, `Diabetes`, `Hypertension`, `Hospital_before`, `Infection_Freq`, `Year`, `Month`, `Date_Missing`, plus the 10 `Organism_*` one-hot columns) + 26 synthetic-derived encoded columns (24 synthetic variables, with `Specimen_Source` expanding to 5 one-hot columns). Full version history (v1 → v2 → v3) and exact reasoning for the pruned features: [`docs/data/synthetic-feature-methodology.md`](synthetic-feature-methodology.md#feature-schema-version-history).

| Category | Count |
|---|---:|
| Real / derived | 19 |
| Synthetic encoded | 26 |
| **Total features** | **45** |

## Related Documentation

- [`docs/data/synthetic-feature-methodology.md`](synthetic-feature-methodology.md) — conditioning logic, leakage-prevention safeguard, and pruning rationale for every synthetic variable above
- [`docs/data/known-limitations.md`](known-limitations.md) — dataset-level constraints, including per-organism row counts and the Gram-negative-only panel
- [`docs/ml/model-cards.md`](../ml/model-cards.md) — how these features map to per-antibiotic model performance
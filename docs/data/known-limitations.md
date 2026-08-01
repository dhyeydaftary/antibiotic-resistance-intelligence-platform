---
title: Known Limitations
category: data
last_updated: 2026-07-31
owner: dhyeydaftary
review_frequency: on-dataset-or-model-change
---

# Known Limitations

## Purpose

AMR-Insight is a research and education tool, not a clinical decision-support system. This document states, precisely and without softening, what the platform's underlying data and models can and cannot support — so that anyone evaluating, extending, or citing this project understands its real boundaries rather than assuming clinical-grade rigor that isn't there. Where a limitation reflects a deliberate scope decision, that's stated explicitly; where it's a genuine gap rather than a choice, that's stated just as plainly.

## Dataset

The platform is trained on a single, static, publicly available dataset — [Kaggle: Multi-Resistance Antibiotic Susceptibility](https://www.kaggle.com/datasets/adilimadeddinehosni/multi-resistance-antibiotic-susceptibility) — not a live hospital feed, and not a dataset assembled or curated by this project.

| Fact | Value |
|---|---|
| Rows | 10,710 |
| Original columns | 23 |
| Date range | 2020-01-05 to 2025-02-05 |
| Antibiotic targets | 15 |
| Source | Single static Kaggle dataset |

**Organism panel is entirely Gram-negative.** All ten organism categories in the dataset are Gram-negative genera:

| Organism | Row count |
|---|---|
| *Escherichia coli* | 6,083 |
| Enterobacteria spp. | 997 |
| Unknown | 763 |
| *Proteus mirabilis* | 742 |
| *Klebsiella pneumoniae* | 702 |
| *Citrobacter* spp. | 481 |
| *Morganella morganii* | 305 |
| *Serratia marcescens* | 256 |
| *Pseudomonas aeruginosa* | 200 |
| *Acinetobacter baumannii* | 181 |

This is a property of the source dataset, not a filtering decision made by this project — no Gram-positive organisms were excluded; none were present to begin with. One concrete downstream consequence: a `Gram_Stain` feature was considered and deliberately not added to the synthetic feature set, because with a 100%-Gram-negative panel it would carry zero discriminative information (see [`docs/data/synthetic-feature-methodology.md`](synthetic-feature-methodology.md)). Predictions for Gram-positive organisms (e.g. *Staphylococcus aureus*, *Enterococcus* spp.) are out of scope for this model entirely — not degraded, simply not supported.

**Formal citation is not yet complete.** A `CITATION.cff` is planned but not yet written; this document and the dataset link above are the citation of record until then.

## Alternative Data Sources — Evaluated and Not Pursued

Broader dataset integration was considered during this project, including MIMIC-IV, and was not pursued due to access restrictions. Any future expansion beyond the current single-source dataset would require the same conceptual/statistical integration approach used here, rather than a row-level join — multi-source clinical datasets (MIMIC-IV, BV-BRC, NCBI, etc.) don't share patient-level keys the way a single hospital's LIS/EHR system does, so they can't be merged as if they were one dataset. This mirrors how real hospital systems integrate multiple data sources in practice. This is a deliberate, evaluated scope boundary, not an oversight — see [`docs/product/roadmap.md`](../product/roadmap.md) for how future dataset expansion is framed going forward.

## Synthetic Feature Scope

Of the 47 total columns in the augmented dataset used for training, **24 (roughly 51%) are synthetically generated, not measured from real patients or lab systems.** The 23 real columns include all 15 antibiotic outcome labels, the organism identity, and the core demographic/clinical conditioning fields (age, gender, diabetes, hypertension, prior hospitalization, infection frequency, collection date). The synthetic 24 are the *expanded* clinical detail layered on top: vitals, labs, symptoms, ward type, specimen source, comorbidity flags, and derived body measurements.

In practical terms: every prediction's target label and core clinical framing come from a real patient record, but roughly half of the surrounding clinical picture the model conditions on is model-generated rather than chart-derived. Full generation methodology, including the conditioning logic and the leakage-prevention safeguard, is documented in [`docs/data/synthetic-feature-methodology.md`](synthetic-feature-methodology.md) — this section states the *scope* of that synthesis, not the mechanism.

## Model Performance Variance

Per-antibiotic model accuracy is not uniform, and the spread is substantial — roughly 21 accuracy points between the weakest and strongest antibiotic-specific models:

| Antibiotic | Accuracy | F1 |
|---|---|---|
| CZ | 0.6267 | 0.6111 |
| AMC | 0.6298 | 0.6107 |
| AMX/AMP | 0.6381 | 0.6206 |
| CTX/CRO | 0.6376 | 0.6208 |
| FOX | 0.6354 | 0.6189 |
| IPM | 0.6412 | 0.6251 |
| ... | ... | ... |
| Acide nalidixique | 0.8399 | 0.7691 |
| colistine | 0.8453 | 0.7766 |
| ofx | 0.8428 | 0.7725 |
| Furanes | 0.8481 | 0.7804 |

Full per-antibiotic figures live in [`docs/ml/model-cards.md`](../ml/model-cards.md) once published; the table above illustrates the range, not the complete set. A prediction's confidence score should be read in the context of *which* antibiotic it's for — a 0.75 confidence on a CZ prediction and a 0.75 confidence on a Furanes prediction don't carry the same reliability, given how differently each model performs overall.

**Class imbalance affects the "Intermediate" category specifically.** Across most antibiotics, the Intermediate (I) class makes up a small fraction of the data — for example, roughly 1.7% of rows for GEN — and models correspondingly under-predict it, in some cases predicting it correctly close to never. This is a direct consequence of how rare that class is in the source dataset, not a defect specific to any one model. Any prediction of "Intermediate" should be treated as the least statistically supported of the three possible outcomes.

**No validation exists beyond the source dataset itself.** Model evaluation uses cross-validation within the Kaggle dataset — every row is predicted once by a fold that didn't train on it, which checks internal consistency but is not equivalent to validating against an independent, real-world, or held-out clinical dataset. No such external validation has been performed.

**LLM-based features (PDF report extraction, AI-generated insight text) carry no documented accuracy or reliability disclaimer beyond the design safeguards already in place** — the grounding-facts pattern that ties insight text to the model's own SHAP output (see [`docs/ai/prompt-design-and-grounding.md`](../ai/prompt-design-and-grounding.md)) reduces the risk of the LLM contradicting the model's numeric prediction, but extraction accuracy from arbitrary uploaded PDF formats has not been separately measured or bounded.

## Infrastructure and Scope Boundaries

The following are explicit, deliberate scope decisions for the current release, not gaps:

- **Single flat user type** — no role-based access control, no admin panel.
- **Authentication** — email/OTP verification and JWT sessions only; two-factor authentication beyond signup/reset OTP is deferred, not implemented.
- **Email delivery is sandbox-tier.** The gateway's transactional email sends from Resend's default sandbox sender address, which restricts delivery to the registered account's own email — this is a scoping decision appropriate for a project at this stage, not a production email configuration.
- **No production threat model yet** — a full security review is planned once production deployment itself is scoped.
- **Not open to external contributors** — this is currently a 3-person team project; no `LICENSE` has been finalized yet, so the repository isn't currently licensed for reuse.

The following are genuine current gaps, stated plainly rather than reframed as decisions:

- **No automated test suite exists in any of the three services.** The ML backend has a manual smoke-test script that runs two hardcoded scenarios and prints output for a human to review — it makes no assertions and produces no pass/fail signal. The gateway and frontend have no test files at all; the gateway's `npm test` script is the default placeholder Node generates, never replaced. The only real verification of model quality is the cross-validation baked into training itself, which validates the model, not the application code around it.
- **No rate limiting, structured logging, or error-monitoring tooling** exists in the gateway. This isn't stated anywhere in code as an intentional omission — it's simply not present yet, and would need to be addressed before any production deployment.

## A Named Technical Constraint

SHAP explanations are computed using CatBoost's native `get_feature_importance(type='ShapValues')` rather than the external `shap` Python library, because the external library has unresolved `numpy`/`numba`/`llvmlite` version conflicts in this project's Windows development environment. This is a real environment constraint that shaped an implementation choice, not a preference — worth noting for anyone trying to reproduce or extend this work who may not hit the same conflict on a different platform.

## Related Documentation

- [`docs/data/synthetic-feature-methodology.md`](synthetic-feature-methodology.md) — how the synthetic 51% of the dataset is generated, and the leakage-prevention safeguard
- [`docs/data/data-dictionary.md`](data-dictionary.md) — full feature-level reference
- [`docs/ml/model-cards.md`](../ml/model-cards.md) — complete per-antibiotic performance figures
- [`docs/product/vision.md`](../product/vision.md) — explicit product non-goals, including "not a clinical decision-support system"
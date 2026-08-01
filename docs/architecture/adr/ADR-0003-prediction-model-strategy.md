---
title: "ADR-0003: Prediction Model Strategy"
category: architecture
last_updated: 2026-07-31
owner: dhyeydaftary
review_frequency: on-model-benchmark-update
---

# ADR-0003: Prediction Model Strategy

## Status

Accepted — production unchanged.

This ADR documents the current production model and a retrospective validation benchmark run against it. The benchmark identified findings that warrant further investigation but do not, on their own, provide sufficient evidence to replace the current production model. A follow-up benchmark incorporating class weighting, broader hyperparameter tuning, and statistical significance testing is planned before any production model change is considered — see [When to Revisit](#when-to-revisit).

## Context

AMR-Insight predicts antibiotic resistance using 15 independent CatBoost classifiers, one per antibiotic, defined in `ml-backend/predictor/train_models.py`. CatBoost was already the production model family by the time this documentation effort began. No record of the original model-selection rationale — why CatBoost specifically, versus other model families — was preserved anywhere in this project's git history or code comments; a search of commit messages and all `ml-backend/ml_artifacts/` for evidence of any other trained model family found nothing.

Two properties of CatBoost, visible in the current implementation, plausibly motivated its original selection, though this can't be confirmed as the actual historical reasoning rather than a reasonable guess at it: it handles categorical features natively, relevant given the schema's substantial categorical content (organism, specimen source, ward type), and its native `get_feature_importance(type='ShapValues')` underlies the project's entire explainability feature (see [ADR-0004](ADR-0004-explainability-strategy.md)), avoiding the external `shap` library's dependency conflicts in this project's Windows development environment.

Because no original comparison survived, the project's claim to model-selection rigor rested on unverified assumption. A retrospective benchmark was run to close that gap — not to reconstruct history, but to supply, for the first time, reproducible evidence about whether CatBoost is actually competitive with the obvious alternatives on this project's real data and preprocessing pipeline.

## Retrospective Benchmark

A benchmark comparing CatBoost against four alternatives — Logistic Regression, Decision Tree, Random Forest, XGBoost — was run under `ml-backend/experiments/model-comparison/`, fully isolated from production code. It reused production's exact preprocessing pipeline and dataset, trained and evaluated all five model families independently for each of the 15 antibiotics, applied an equal, light hyperparameter-tuning budget (one hyperparameter, four candidate values per model) to every model, and reported macro-averaged accuracy, precision, recall, F1, and ROC-AUC — macro-averaged specifically because of the dataset's severe class imbalance in the Intermediate resistance category (see [`docs/data/known-limitations.md`](../../data/known-limitations.md)). Full methodology and results live in [`ml-backend/experiments/model-comparison/model-comparison-report.md`](../../../ml-backend/experiments/model-comparison/model-comparison-report.md).

### What the Benchmark Found

Under this protocol, CatBoost did not rank first on accuracy, macro-F1, or macro-ROC-AUC for any of the 15 antibiotics tested, and was substantially the slowest model family to train (roughly 37x slower than Logistic Regression). Logistic Regression was the most consistently strong performer across the measured metrics, at a fraction of CatBoost's training cost.

### Why This Finding Does Not, By Itself, Justify Replacing the Production Model

Three specific limitations in the benchmark's design mean this result is **evidence worth investigating further, not a settled verdict**:

1. **No class-weighting was applied to any model**, despite the Intermediate class being a severe minority (as low as ~1.7% of rows for some antibiotics). CatBoost specifically offers strong native imbalance handling (`auto_class_weights`) that went entirely untested — arguably the single largest unexplored lever, and one that disproportionately affects CatBoost's realistic potential relative to models with less-developed native imbalance handling.
2. **Equal candidate-count tuning is not equal proximity to each model's own ceiling.** Logistic Regression's single dominant hyperparameter (regularization strength) characterizes most of its performance; CatBoost, Random Forest, and XGBoost are higher-capacity models whose competitive performance typically depends on several interacting hyperparameters — CatBoost's `depth` was held fixed at 6 throughout, never tuned. The protocol was procedurally fair; it was not necessarily fair relative to each model's realistic ceiling.
3. **No statistical significance testing or confidence intervals were computed.** The consistent 15/15 pattern is suggestive on its own, but a formal paired test (e.g. Wilcoxon signed-rank across the 15 antibiotics) has not yet been run to confirm the gap exceeds normal run-to-run variation.

A benchmark with these limitations can reasonably motivate re-examining a production choice. It is not, on its own, sufficient grounds for an irreversible or costly change to a system already in a feature freeze ahead of a public presentation.

## Decision

**Production remains on CatBoost, unchanged, for the current release.** This rests on three reasons together, not any one alone:

1. The project is in a feature freeze ahead of a scheduled presentation. Switching the production model family would require retraining and re-validating 15 independent models and reassessing the explainability pipeline, which is scoped and tested specifically around CatBoost's native SHAP support ([ADR-0004](ADR-0004-explainability-strategy.md)) — a change of this scope during a freeze carries real risk with no corresponding benefit before the presentation.
2. The benchmark's finding, while real and reproducible, characterizes CatBoost's performance under an admittedly light, imbalance-naive tuning protocol — not CatBoost's realistic ceiling on this problem.
3. All five model families showed similarly modest performance on the Intermediate class (macro-F1 in the 0.35–0.38 range across the board). The benchmark's most robust finding is that model family alone does not resolve the project's underlying class-imbalance limitation, which reduces the urgency of a model-family switch relative to addressing that imbalance directly.

## Alternatives Considered

| Alternative | Why not adopted |
|---|---|
| Logistic Regression | Best-performing model family in this benchmark, but the finding rests on a light-tuning, no-class-weighting protocol with the limitations described above; switching production mid-freeze is a materially larger and riskier change than current evidence justifies |
| Decision Tree | Best mean macro-F1, but achieved via an unconstrained tree trading meaningfully lower accuracy for minority-class sensitivity — a real product trade-off, not just a metrics win |
| Random Forest / XGBoost | Landed in the middle on every metric; more expensive to train than Logistic Regression with no corresponding performance advantage in this benchmark |

## Consequences

- The project now has a reproducible, version-controlled benchmark (`ml-backend/experiments/model-comparison/`) that can be re-run and extended, rather than resting on unverified assumptions about model selection.
- This ADR records, plainly, that the original CatBoost selection rationale was not preserved in project history — future readers should not assume a rigorous comparison occurred before CatBoost became production; as far as this project's history shows, it did not.
- CatBoost's status as production model is now explicitly provisional pending the follow-up benchmark below, rather than implicitly permanent.

## When to Revisit

After the current presentation, via a follow-up benchmark addressing the three named limitations directly: class-weighted variants of all five models (using each model's native imbalance handling where available), a modestly wider tuning budget for CatBoost, Random Forest, and XGBoost (jointly tuning at least two interacting hyperparameters rather than one), and a paired significance test (e.g. Wilcoxon signed-rank across the 15 antibiotics) on the resulting macro-F1 and accuracy differences. If that follow-up confirms Logistic Regression's advantage under a fairer protocol, switching production models becomes a decision backed by rigorous evidence rather than a single light-tuning result.

**Separately, and not gating the decision above:** probability calibration (a calibration curve and Brier score per model) is worth evaluating as its own future work item. Medical-adjacent prediction is often judged on the quality of its probability estimates, not only classification accuracy — a model whose confidence scores are well-calibrated is more trustworthy to report a "0.75 confidence" than one that isn't, independent of which model family is ultimately chosen. This doesn't need to be part of the class-weighting/tuning follow-up above; it's an orthogonal question about probability quality that applies regardless of which model wins that comparison.

## Related Documentation

- [ADR-0001: Three-Service Architecture](ADR-0001-three-service-architecture.md) — the Django ML backend this model strategy operates within
- [ADR-0002: Synthetic Feature Generation & Leakage Prevention](ADR-0002-synthetic-feature-generation-and-leakage-prevention.md) — the feature schema this benchmark's preprocessing pipeline reused unchanged
- [`ml-backend/experiments/model-comparison/model-comparison-report.md`](../../../ml-backend/experiments/model-comparison/model-comparison-report.md) — full benchmark methodology and results
- [ADR-0004: Explainability Strategy](ADR-0004-explainability-strategy.md) — why CatBoost's native SHAP was adopted, a decision this ADR's outcome preserves
- [`docs/data/known-limitations.md`](../../data/known-limitations.md) — the class-imbalance limitation this benchmark's most robust finding reinforces
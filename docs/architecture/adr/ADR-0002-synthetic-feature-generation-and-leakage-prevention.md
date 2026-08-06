---
title: "ADR-0002: Synthetic Feature Generation & Leakage Prevention"
category: architecture
last_updated: 2026-07-31
owner: dhyeydaftary
review_frequency: on-schema-change
---

# ADR-0002: Synthetic Feature Generation & Leakage Prevention

## Status

Accepted.

## Context

AMR-Insight's source dataset — a Kaggle-published AMR dataset with 10,710 rows and 23 original columns — carries a limited clinical picture per patient: demographics, a handful of comorbidity flags, organism identity, and the 15 antibiotic outcome labels themselves. That's not enough clinical detail for the per-antibiotic CatBoost models ([ADR-0003](ADR-0003-prediction-model-strategy.md)) to learn from meaningfully. AMR-Insight addresses this by synthetically generating an additional set of clinical variables — vitals, labs, symptoms, comorbidities, ward context — sampled from conditional distributions grounded in clinical epidemiology, rather than pulled from real patient records.

Generating features that don't exist in the source data introduces a specific, serious risk: **target leakage** — a synthetic column that, even indirectly, encodes information derived from the antibiotic resistance labels the models are meant to predict. A model trained on such a feature would appear to perform well while actually just recovering the label it was implicitly given. This ADR records the decision to prevent that risk structurally, not just by intention, and the schema changes that followed from it.

## Decision

**Every synthetic clinical variable is conditioned only on pre-outcome real columns already present in the source dataset** — organism, age, gender, diabetes, hypertension, prior hospitalization, and infection frequency — and never on any of the 15 antibiotic outcome columns or anything derived from them. This is enforced by an automated check, not left to manual discipline: `validate_no_leakage()` computes the correlation between every synthetic column and every antibiotic outcome after generation, and the script exits with an error if any pair exceeds a defined threshold. Full mechanism detail, including the exact validation steps and a diagram of the check itself, lives in [`docs/data/synthetic-feature-methodology.md`](../../data/synthetic-feature-methodology.md#the-committed-safeguard) — this ADR records the decision and its rationale, not the implementation.

### Why This Decision Exists — What's Verified vs. What's Documented Retrospectively

An earlier, uncommitted version of the generation script computed a `Resistance_Count` variable — a per-row count of resistant results across the 15 antibiotic columns — and used it to condition several synthetic columns. That would have been target leakage by construction. This account is worth a precise caveat: `Resistance_Count` appears nowhere in this project's committed git history except inside the shipped script's own docstring, describing it retrospectively. The leaking draft was caught and discarded during local development, before ever being committed — this ADR treats it as the implementation's own documented account of a discarded design, not as an independently verifiable incident with a before/after diff to point to.

What **is** independently verifiable, in committed code, is the safeguard itself — `validate_no_leakage()`, which runs automatically and unconditionally on every generation, regardless of whether this specific history is accurate. The decision recorded by this ADR does not depend on the `Resistance_Count` account being precisely true; it depends on the conditioning principle and the automated check, both of which are real, current, and enforced.

## Alternatives Considered

| Alternative | Why not adopted |
|---|---|
| Condition synthetic features on outcome-derived signals (e.g. `Resistance_Count`) | This is the discarded draft described above — direct target leakage, ruled out on first principles once identified, not a genuine option ever seriously weighed against the shipped design |
| Trust manual review to catch leakage, without an automated check | Rejected in favor of `validate_no_leakage()`'s automatic, unconditional enforcement — manual review doesn't scale to every future regeneration of the dataset, and a script that can silently reintroduce leakage on a future change is a real risk this project chose not to accept |
| Use only the 23 real columns, without synthetic augmentation | Not evidenced as seriously considered in this project's history; would have left the models with too little clinical signal to be a meaningful demonstration of the prediction task |

## Consequences

- The feature schema has a real, documented version history (v1: 19 encoded columns → v2: 49, adding synthetic features → v3: 45, after four features were pruned following a SHAP review) — this evolution and its rationale live in `synthetic-feature-methodology.md`, not duplicated here.
- Any future addition to the synthetic feature set must pass the same `validate_no_leakage()` check — this ADR's decision is a standing constraint on future schema changes, not a one-time review.
- Because roughly half of the augmented dataset's columns are synthetic rather than measured, this shapes how confidently the resulting predictions should be read — see [`docs/data/known-limitations.md`](../../data/known-limitations.md) for how this is framed for end users, distinct from this ADR's architectural framing.
- This decision is specific to the current single-source dataset. If AMR-Insight ever integrates a second real data source, the conditioning-only-on-pre-outcome-fields principle would need to be re-verified against that new source's own column semantics, not assumed to still hold.

## Related Documentation

- [`docs/data/synthetic-feature-methodology.md`](../../data/synthetic-feature-methodology.md) — full conditioning logic, the leakage-validation mechanism and diagram, feature pruning rationale, and schema version history
- [ADR-0001: Three-Service Architecture](ADR-0001-three-service-architecture.md) — the Django ML backend this feature schema is built for
- [ADR-0003: Prediction Model Strategy](ADR-0003-prediction-model-strategy.md) — the models trained on this feature schema
- [`docs/data/known-limitations.md`](../../data/known-limitations.md) — how the real-vs-synthetic composition is framed for end users
- [ADR-0004: Explainability Strategy](ADR-0004-explainability-strategy.md) — SHAP attribution operates over this feature schema
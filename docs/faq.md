---
title: Frequently Asked Questions
category: product
last_updated: 2026-08-01
owner: dhyeydaftary
review_frequency: on-major-doc-change
---

# Frequently Asked Questions

## Purpose

Short, direct answers to questions this project has already generated and answered in full elsewhere — each answer here is a summary with a link to the authoritative detail, not a duplicate of it. If a question you have isn't here, it's likely answered somewhere in [`docs/README.md`](README.md)'s full documentation map.

## General

### Is this a clinical decision-support tool?

No. AMR-Insight is a research and education tool. It's trained on a single, static, publicly available dataset — not live hospital data — and has no independent clinical validation beyond cross-validation within that same dataset. See [`docs/data/known-limitations.md`](data/known-limitations.md) for the full, unsoftened account of what this platform can and can't support.

## Data & Dataset

### Why is some of the training data synthetic instead of real?

The source dataset's real clinical fields are limited. To give the models enough signal to learn from, additional clinical variables (vitals, labs, symptoms, comorbidities) are synthetically generated — sampled from distributions conditioned only on real, pre-outcome fields, never on the resistance labels themselves. Roughly 51% of the augmented dataset's columns are synthetic. Full methodology, the leakage-prevention safeguard, and exactly which columns are synthetic: [`docs/data/synthetic-feature-methodology.md`](data/synthetic-feature-methodology.md).

### Why wasn't a real hospital dataset like MIMIC-IV used?

It was evaluated and not pursued, due to access restrictions — not an oversight. See [`docs/data/known-limitations.md`](data/known-limitations.md#alternative-data-sources-evaluated-and-not-pursued) for what that evaluation found and why a multi-source approach wasn't feasible here anyway.

### How many antibiotics and organisms does this cover?

15 antibiotics, 10 organism categories, all Gram-negative — a property of the source dataset, not a filtering choice. Full breakdown with row counts: [`docs/data/known-limitations.md`](data/known-limitations.md) and [`docs/data/data-dictionary.md`](data/data-dictionary.md).

## Machine Learning

### Why CatBoost instead of a simpler or different model?

No record of an original model-selection comparison survived in this project's history, so a retrospective benchmark was run against four alternatives (Logistic Regression, Decision Tree, Random Forest, XGBoost). CatBoost didn't win outright under that benchmark's protocol — the full, honest account of that finding, its limitations, and why production stayed on CatBoost anyway is in [ADR-0003](architecture/adr/ADR-0003-prediction-model-strategy.md).

### Why can't the model reliably predict "Intermediate" resistance?

The Intermediate class is a severe minority in the source data (often under 2% of rows per antibiotic), and every production model — 12 of 15 antibiotics, precisely — has close to 0% recall on it. This is a data-scarcity problem, not a defect in any one model. Full per-antibiotic evidence: [`docs/ml/model-cards.md`](ml/model-cards.md#the-intermediate-class-is-not-being-learned-not-just-for-gen).

### Why doesn't the README show model accuracy numbers directly?

Those numbers change on every retrain — publishing a static table in the README risks it going stale and actively misleading a reader who trusts it. The full, current, per-antibiotic figures always live in [`docs/ml/model-cards.md`](ml/model-cards.md), one authoritative home instead of two copies that could drift apart.

### Does Gemini ever see the SHAP explainability data?

No — this is a deliberate design decision, not an accident. Gemini only ever receives aggregate outcome facts (counts, AWaRe tiers, confidence groupings); the actual SHAP-grounded explanation text is built separately, deterministically, in plain Python, so it structurally cannot contradict the model's own numeric attribution. Full mechanism: [ADR-0004](architecture/adr/ADR-0004-explainability-strategy.md).

### Why native CatBoost SHAP instead of the external `shap` library?

The external library has a known dependency conflict (numpy/numba/llvmlite) in this project's Windows development environment. CatBoost's own built-in SHAP support has been used since explainability was first introduced — the external library was never actually installed or attempted in this codebase. Details: [ADR-0004](architecture/adr/ADR-0004-explainability-strategy.md).

## Architecture

### Why does the frontend talk to a Node gateway instead of the Django ML backend directly?

It didn't, originally — the frontend called Django directly for the first two weeks of this project's history. The gateway was built specifically to add authentication and persistent prediction history, neither of which ever existed in Django, and prediction/trend calls were consolidated into it afterward. The full, evidenced migration timeline: [ADR-0001](architecture/adr/ADR-0001-three-service-architecture.md).

### Is there role-based access control or an admin panel?

No — single flat user type, by design, given the current scope and timeline. Two-factor authentication beyond signup/reset OTP is also deferred. See [`docs/data/known-limitations.md`](data/known-limitations.md#infrastructure-and-scope-boundaries).

## Project & Governance

### What license is this under?

[Apache License 2.0](../LICENSE). This governs reuse of the code; it doesn't mean the project is currently open to external contributions — see [`CONTRIBUTING.md`](../CONTRIBUTING.md) for the current contribution status.

### Can I contribute to this project?

Not yet — this is currently a 3-person team project. The real, currently-practiced workflow (branching, commits, ADR discipline) is documented in [`CONTRIBUTING.md`](../CONTRIBUTING.md) in case that changes.

### Is my data safe if I use this tool?

See [`SECURITY.md`](../SECURITY.md) for the project's actual, honestly-stated security posture — including two real fixes already shipped (NoSQL injection defense, error-message sanitization) and the gaps that are known but not yet addressed (no rate limiting, no production threat model).

## Related Documentation

- [`docs/README.md`](README.md) — the full documentation map, organized by who you are
- [`docs/data/known-limitations.md`](data/known-limitations.md) — the single most-referenced document behind these answers
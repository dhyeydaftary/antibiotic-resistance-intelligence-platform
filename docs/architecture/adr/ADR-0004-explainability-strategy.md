---
title: "ADR-0004: Explainability Strategy"
category: architecture
last_updated: 2026-07-31
owner: dhyeydaftary
review_frequency: on-model-strategy-change
---

# ADR-0004: Explainability Strategy

## Status

Accepted.

## Context

A prediction of "Resistant," "Susceptible," or "Intermediate" is far more useful, and more trustworthy, when it comes with a reason. AMR-Insight is a research and education tool, not a clinical decision-support system (see [`docs/data/known-limitations.md`](../../data/known-limitations.md)), but that framing makes explainability more important, not less — a user evaluating or teaching from this tool's output needs to see *why* a model reached a conclusion, not just the conclusion itself.

CatBoost is the project's production model family for all 15 per-antibiotic classifiers ([ADR-0003](ADR-0003-prediction-model-strategy.md)). This ADR documents the decision to use CatBoost's native SHAP support as the explainability mechanism, and — separately — how that per-prediction attribution is kept from being contradicted by the project's Gemini-generated natural-language insight text.

## Decision

### SHAP, via CatBoost's native support, not the external `shap` library

Every prediction's explanation is computed by `get_feature_importance(type='ShapValues')`, called in `ml-backend/predictor/predict.py`'s `get_shap_explanation()` and in `train_models.py` — CatBoost's own built-in TreeSHAP implementation. The external `shap` Python library is not used anywhere in this project.

Two honest gaps in the historical record, stated plainly rather than smoothed over:

- **No evidence exists that any alternative interpretability method — LIME, permutation importance, or otherwise — was ever evaluated, prototyped, or discussed.** An exhaustive search of git history and code found no trace of a comparison. This ADR does not claim "SHAP was chosen over LIME after evaluation," because that evaluation is not evidenced anywhere in this repository. SHAP is justified here on its own technical merits — theoretically grounded, locally accurate per-prediction attribution, and (via CatBoost's native support) available without extra tooling — not on a documented rejection of alternatives.
- **No evidence exists that the external `shap` library was ever actually installed, attempted, or removed from this project.** `requirements.txt` has never, at any point in its git history, listed `shap`. The numpy/numba/llvmlite dependency conflict cited in the root README as the reason for avoiding it is a real, known risk in this project's Windows development environment, but it reads as an anticipated concern that shaped the choice from the start, not as an incident that happened in this codebase and was then worked around. CatBoost's native SHAP support has been used since the commit that first introduced explainability (`36d8d82`).

### The Grounding-Facts Mechanism — Correcting a Simplification

The root README states that "SHAP outputs are used as grounding facts for Gemini-generated insight text, so the natural-language explanation can't disagree with the model's own numeric attribution." That's true in outcome, but the mechanism it implies — Gemini is shown SHAP values and instructed to stay consistent with them — is not what the code does, and this ADR records the actual, more defensible mechanism:

**Gemini is never shown SHAP data at all.** The prompt-facing input, built by `_build_grounding_facts()` in `ai_insights.py`, contains only aggregate outcome data — counts of resistant/susceptible/intermediate results, which antibiotics fall in which AWaRe tier, confidence-level groupings, historical case counts. No `shapExplanation` field, and no per-feature contribution value, is ever passed into the prompt. The prompt template further restricts Gemini explicitly: *"You must use ONLY the facts given below. Do not invent, estimate, or assume any antibiotic name, percentage, or statistic that is not explicitly present in these facts."* Because feature-level attribution is simply outside what Gemini is ever asked to produce, it cannot contradict a SHAP value it was never given the opportunity to reference.

**The actual SHAP-grounded narrative is a separate, fully deterministic code path**, not an LLM output at all: `_build_plain_explanation()` walks each antibiotic's `shapExplanation` list directly and builds template-generated text from it in plain Python. Because this text is constructed mechanically from the SHAP values themselves, rather than generated and then checked against them, it cannot diverge from what SHAP actually reported.

This path includes a real correctness safeguard worth documenting explicitly: `_is_named_category_present()` prevents a one-hot categorical feature (e.g. `Organism_Escherichia_coli`) from being misreported as "this patient has this organism" when the model's high SHAP magnitude actually reflects the opposite — the feature being informative *because* its value was 0, not 1. `predict.py` deliberately includes each feature's raw encoded value alongside its SHAP score specifically so this check can run.

**This mechanism is specific to prediction insights (`ai_insights.py`) — trend explanations (`trend_insights.py`) involve neither Gemini nor SHAP at all.** Every field `trend_insights.py` produces, including one named `aiForecast`, is built from plain Python/numpy (string templates, a `numpy.polyfit` linear regression, standard deviation checks). `aiForecast`'s own output explicitly labels itself "an AI-generated statistical projection, not a clinical or epidemiological forecast" — the name refers to a statistical projection presented as such, not to LLM involvement. No Gemini call exists anywhere in that file.

### Explainability Is a First-Class UI Feature, Not Just an API Field

SHAP output is surfaced in three independent, purpose-built places in the frontend, each suited to a different context:

- **Prediction Result page** — an expandable per-antibiotic section showing the top 5 SHAP features with a bar visualization; the primary, detailed explainability surface.
- **History page** — each antibiotic "chip" shows its single top SHAP-ranked feature in a compact hover popover, for at-a-glance scanning across many past predictions.
- **Report exports** — both the CSV export (a "Top Contributing Feature" column) and the PDF export (a dedicated "SHAP explainability — top contributing features" section) carry SHAP data into offline artifacts, not just the live UI.

## Alternatives Considered

| Alternative | Why not adopted |
|---|---|
| LIME / permutation importance | Never evaluated in this project's history — not rejected after comparison, simply never attempted. Not adopted, on the basis of SHAP's own theoretical soundness and CatBoost's native support, not a documented head-to-head. |
| External `shap` library | Functionally similar output to native CatBoost SHAP, but never actually installed or attempted in this codebase. Avoided based on a known, but not locally reproduced, Windows-environment dependency conflict (numpy/numba/llvmlite). |

## Consequences

- Explainability is currently coupled to CatBoost specifically, via its native SHAP support. [ADR-0003](ADR-0003-prediction-model-strategy.md) keeps CatBoost as the production model for the current release, but flags that decision as provisional pending a follow-up benchmark. **If a future decision changes the production model family, this ADR must be revisited** — not every alternative model family has equally convenient native SHAP support, and a model switch could reintroduce the external `shap` library question this ADR currently avoids entirely.
- The Gemini-insight and SHAP-narrative code paths are correctly decoupled: because Gemini never sees feature-level data, a future change to the LLM prompt, model, or provider cannot silently introduce a SHAP-contradicting claim — that class of bug is structurally prevented, not just tested against.
- [`docs/data/known-limitations.md`](../../data/known-limitations.md) already notes that LLM-based features (insight generation, report extraction) carry no separately measured accuracy or reliability disclaimer beyond this design safeguard — this ADR is the canonical explanation of what that safeguard actually is and how it works.

## Related Documentation

- [ADR-0001: Three-Service Architecture](ADR-0001-three-service-architecture.md) — the Django ML backend this explainability mechanism is implemented within
- [ADR-0003: Prediction Model Strategy](ADR-0003-prediction-model-strategy.md) — the production model choice this explainability mechanism currently depends on
- [ADR-0002: Synthetic Feature Generation & Leakage Prevention](ADR-0002-synthetic-feature-generation-and-leakage-prevention.md) — the feature schema this ADR's SHAP attribution operates over
- [`docs/data/known-limitations.md`](../../data/known-limitations.md) — LLM-feature reliability caveats this ADR's grounding mechanism directly addresses
- [`docs/data/synthetic-feature-methodology.md`](../../data/synthetic-feature-methodology.md) — the feature schema SHAP attribution operates over
- `docs/ai/prompt-design-and-grounding.md` (not yet written) — the intended home for a detailed sequence diagram of the decoupled Gemini/SHAP mechanism this ADR describes in prose; per this project's diagram plan, that implementation-level diagram belongs there, not duplicated in this ADR
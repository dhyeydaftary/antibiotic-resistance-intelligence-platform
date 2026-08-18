---
title: Documentation Map
category: navigation
last_updated: 2026-08-04
owner: dhyeydaftary
review_frequency: on-doc-set-change
---

# Documentation Map

## Purpose

This is a navigation index, not a content page — it doesn't explain anything itself; it routes you to whichever document already has the authoritative answer. This project follows a strict "one authoritative home per concept" rule: if two documents would otherwise say the same thing, one states it and the other links to it. If you notice two documents disagreeing with each other, that's a real bug in the docs, not an intentional alternate account — worth reporting.

Some rows below point to documents that don't exist yet. That's stated honestly rather than left as a link that 404s — this project's documentation is being built in phases, and not everything is written yet. Where something's missing, this page says what to read instead in the meantime.

## I am a...

| I am a... | Start here |
|---|---|
| Recruiter / casual visitor | Root [`README.md`](../README.md) only — you likely don't need to go further |
| Professor / academic reviewer | The root README's Problem Statement and Solution sections (a dedicated `docs/product/problem-statement.md` is planned but not yet written) → [`docs/data/known-limitations.md`](data/known-limitations.md) → [`docs/architecture/system-context.md`](architecture/system-context.md) |
| Developer (new contributor) | This page → the root README's Tech Stack and Installation sections (per-service `README.md` files for `gateway/` and `ml-backend/` are planned but not yet written; `frontend/README.md` currently exists but is unedited Vite boilerplate) → relevant [ADRs](architecture/adr/) |
| ML Engineer | [`docs/ml/model-cards.md`](ml/model-cards.md) → [`docs/data/data-dictionary.md`](data/data-dictionary.md) → [`docs/data/synthetic-feature-methodology.md`](data/synthetic-feature-methodology.md) (a dedicated `docs/ai/` category covering the Gemini integration specifically is planned but not yet written) |
| Researcher | [`docs/data/synthetic-feature-methodology.md`](data/synthetic-feature-methodology.md) → [`docs/data/known-limitations.md`](data/known-limitations.md) (a dedicated `docs/research/` category is planned but not yet written; this project's own known-limitations doc notes a formal `CITATION.cff` doesn't exist yet either — the dataset link and that document are the citation of record until then) |
| Future maintainer | [`docs/architecture/adr/`](architecture/adr/) — every ADR, in order, then [`docs/security/threat-model.md`](security/threat-model.md) for the complete security posture |

## Or, by what you're trying to do

If you have a more specific goal than a role above, these paths are more direct:

- **Understand the security work** → [`docs/security/threat-model.md`](security/threat-model.md), then [`SECURITY.md`](../SECURITY.md) for the shorter public-facing summary
- **Understand the architecture** → [`docs/architecture/system-context.md`](architecture/system-context.md) → [`docs/architecture/high-level-architecture.md`](architecture/high-level-architecture.md) → [`docs/architecture/request-lifecycle.md`](architecture/request-lifecycle.md), each one level more detailed than the last
- **Call the API** → [`docs/api/endpoint-reference.md`](api/endpoint-reference.md) (human-readable) or [`docs/api/openapi.yaml`](api/openapi.yaml) (machine-readable)
- **Run this locally** → [`docs/deployment/environment-variables.md`](deployment/environment-variables.md) and [`docs/deployment/command-reference.md`](deployment/command-reference.md)
- **Know what's decided vs. still open** → [`docs/data/known-limitations.md`](data/known-limitations.md), [`docs/security/threat-model.md`](security/threat-model.md)'s residual-gaps section, and [`docs/releases/version-history.md`](releases/version-history.md)
- **A quick, specific question** → [`docs/faq.md`](faq.md)

## Current Documentation Structure

The full `docs/` tree as it actually exists today — not an aspirational structure, just what's really here:

```
docs/
├── README.md                          # this page
├── api/
│   ├── endpoint-reference.md          # human-readable API walkthrough
│   └── openapi.yaml                   # machine-readable API contract
├── architecture/
│   ├── system-context.md              # AMR-Insight as a single box against the outside world
│   ├── high-level-architecture.md     # the three internal services, and the two trust boundaries between them
│   ├── request-lifecycle.md           # one real request (/predict), traced step by step
│   └── adr/                           # every architectural decision record
│       ├── ADR-0001-three-service-architecture.md
│       ├── ADR-0002-synthetic-feature-generation-and-leakage-prevention.md
│       ├── ADR-0003-prediction-model-strategy.md
│       ├── ADR-0004-explainability-strategy.md
│       ├── ADR-0005-firebase-auth-migration.md
│       ├── ADR-0006-session-and-token-security-architecture.md
│       └── ADR-0007-combined-deployment-topology.md
├── assets/
│   └── diagrams/                      # Mermaid source references + exported SVGs
├── data/
│   ├── data-dictionary.md             # every input field's type, range, and unit
│   ├── known-limitations.md           # deliberate scope decisions and genuine gaps, stated plainly
│   └── synthetic-feature-methodology.md
├── deployment/
│   ├── command-reference.md           # every command used across all three services
│   └── environment-variables.md       # every environment variable each service reads
├── ml/
│   └── model-cards.md                 # per-antibiotic model performance, one file, one row per antibiotic
├── releases/
│   └── version-history.md
├── security/
│   └── threat-model.md                # the complete, authoritative security account
├── diagram-plan.md                    # which documents have (or are planned to have) a diagram, and why
└── faq.md
```

**Categories planned but not yet built:** `docs/product/` (vision, problem statement, roadmap, and related product-scope documents), `docs/ai/` (the Gemini integration's design reasoning specifically, distinct from the ML model documentation above), `docs/backend/` (per-service implementation detail beyond what the architecture docs already cover), `docs/testing/`, and `docs/research/`. These are deliberately sequenced for later — writing them now would mean documenting things (external contributors, a published test strategy independent of the test suite that only recently started existing, research write-ups) that don't yet have enough real substance behind them to be worth a dedicated document.

## Related Documentation

- Root [`README.md`](../README.md) — the actual entry point for anyone landing on this repository for the first time
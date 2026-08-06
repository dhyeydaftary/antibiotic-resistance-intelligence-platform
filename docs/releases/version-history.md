---
title: Version History
category: releases
last_updated: 2026-08-01
owner: dhyeydaftary
review_frequency: on-release
---

# Version History

## Versioning Policy

AMR-Insight has two separate versioning concerns, tracked differently, and this document is the human-readable index into both:

**Model artifacts** are versioned directly in the filename (`catboost_<antibiotic>_v2.pkl`, `_v3.pkl`), kept side by side on disk so a prior version can be rolled back to. This is the versioning scheme that's actually in active use today — see [`docs/data/synthetic-feature-methodology.md`](../data/synthetic-feature-methodology.md#feature-schema-version-history) for the full schema history behind each version.

**Project releases** are documented here, in this file, as they happen. There is no formal semantic-versioning scheme (no git tags, no package version number) yet — this project is pre-1.0 in the strict software sense, and this document deliberately doesn't claim otherwise. What follows is a milestone record, not a tagged release history.

## v1.0 — Feature Freeze and Presentation Milestone

**Date:** July 27 – August 1, 2026

This marks the project's first real milestone: feature freeze reached July 27, demo delivered July 29, final presentation August 1. No git tag currently marks this point — if one is added later, this entry should be updated to reference it rather than left as a date-only record.

**What's included as of this milestone:**

- **P1 (ML backend):** 15 per-antibiotic CatBoost models (v3 schema), native CatBoost SHAP explainability, Gemini-based insight generation and PDF report extraction, PubMed research-context integration.
- **P2 (Gateway):** Full authentication (JWT, bcrypt, email/OTP verification), prediction history with advanced filtering, all 6 Django-proxied endpoints plus the MongoDB-backed `/history` route.
- **P3 (Frontend):** Full prediction workflow, history page, trends/dataset explorer, PDF export.
- **Documentation** (built substantially after this feature freeze, not before it): root README, dataset methodology and known-limitations, four ADRs, system context and prediction lifecycle diagrams, a diagram styling system, a full reference suite (data dictionary, model cards, environment variables, a validated OpenAPI spec), and the governance files this entry itself belongs to.

**Known limitations as of this milestone** are not restated here — see [`docs/data/known-limitations.md`](../data/known-limitations.md) for the complete, current account, since that document is kept up to date independently of this one and would drift if duplicated here.

## Related Documentation

- [`docs/data/synthetic-feature-methodology.md`](../data/synthetic-feature-methodology.md#feature-schema-version-history) — model artifact versioning (a separate scheme from this document)
- [`docs/data/known-limitations.md`](../data/known-limitations.md) — the current, authoritative account of what this platform can and can't do
- [`CONTRIBUTING.md`](../../CONTRIBUTING.md) — where this versioning policy is referenced from the contribution workflow
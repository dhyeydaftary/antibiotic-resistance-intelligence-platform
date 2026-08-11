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

**Project releases** are documented here, in this file, as they happen. As of `v1.0`, this project has a real git tag marking its first milestone — see below.

## v1.0 — Feature Freeze and Presentation Milestone

**Date:** July 27 – August 1, 2026

This marks the project's first real milestone: feature freeze reached July 27, demo delivered July 29, final presentation August 1. Tagged as [`v1.0`](https://github.com/dhyeydaftary/antibiotic-resistance-intelligence-platform/releases/tag/v1.0).

**What's included as of this milestone:**

- **P1 (ML backend):** 15 per-antibiotic CatBoost models (v3 schema), native CatBoost SHAP explainability, Gemini-based insight generation and PDF report extraction, PubMed research-context integration.
- **P2 (Gateway):** Full authentication (JWT, bcrypt, email/OTP verification), prediction history with advanced filtering, all 6 Django-proxied endpoints plus the MongoDB-backed `/history` route.
- **P3 (Frontend):** Full prediction workflow, history page, trends/dataset explorer, PDF export.
- **Documentation** (built substantially after this feature freeze, not before it): root README, dataset methodology and known-limitations, four ADRs, system context and prediction lifecycle diagrams, a diagram styling system, a full reference suite (data dictionary, model cards, environment variables, a validated OpenAPI spec), and the governance files this entry itself belongs to.

**Known limitations as of this milestone** are not restated here — see [`docs/data/known-limitations.md`](../data/known-limitations.md) for the complete, current account, since that document is kept up to date independently of this one and would drift if duplicated here.

## Post-v1.0 — Firebase Authentication Migration

**Date:** August 2026 (post-presentation)

Authentication migrated to a layered design: Firebase became this project's identity provider (password, Google, GitHub sign-in), while the Gateway's own `tokenVersion`-based session layer — the actual mechanism [ADR-0006](../architecture/adr/ADR-0006-session-and-token-security-architecture.md) describes — was deliberately retained downstream of it, not replaced. Full reasoning, alternatives considered, and the architecture boundary between the two systems: [ADR-0005](../architecture/adr/ADR-0005-firebase-auth-migration.md).

**What changed:**
- The custom OTP/Resend email-verification system was removed entirely — Firebase now owns email verification.
- 8 auth routes (`/signup`, `/login`, `/verify-otp`, `/resend-otp`, `/forgot-password`, `/verify-reset-otp`, `/reset-password`, plus the pre-existing `/logout-everywhere`) were replaced by 3 (`/session`, `/logout-everywhere`, `/me`) — a smaller surface, not a reduction in what's covered.
- The gateway test suite was rewritten alongside the routes it tests: 69 tests (63 passing; the remaining 6 are pre-existing, environmental failures unrelated to this migration, confirmed via an isolated clean-checkout comparison beforehand) — down from 98, because the tests it replaced covered mechanisms (OTP boundaries, a specific lockout-reset regression) that no longer exist in this app's code, not because coverage was cut.
- bcrypt is retained in the dependency tree with no active role in the login flow, earmarked for a specific future use (hashing API keys for a planned third-party integration) rather than removed outright — stated explicitly in ADR-0005 rather than left ambiguous.

## Related Documentation

- [`docs/data/synthetic-feature-methodology.md`](../data/synthetic-feature-methodology.md#feature-schema-version-history) — model artifact versioning (a separate scheme from this document)
- [`docs/data/known-limitations.md`](../data/known-limitations.md) — the current, authoritative account of what this platform can and can't do
- [`CONTRIBUTING.md`](../../CONTRIBUTING.md) — where this versioning policy is referenced from the contribution workflow
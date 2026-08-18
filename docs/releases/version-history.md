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

## Post-v1.0 — Production Deployment (v1.1.0)

**Date:** August 17, 2026

The application went live: frontend on Vercel, `gateway`/`ml-backend` on Render, MongoDB Atlas for the database — all on free tiers. Tagged as [`v1.1.0`](https://github.com/dhyeydaftary/antibiotic-resistance-intelligence-platform/releases/tag/v1.1.0).

**Real issues found and fixed while deploying, not before:**
- Two CSP gaps only surfaced once the frontend was actually served from a real domain instead of `localhost`: `frontend/vercel.json`'s `connect-src` shipped with a literal placeholder for the gateway's origin (fixed to the real deployed origin); and Google sign-in failed under the deployed CSP until `apis.google.com` was added to `script-src`, which no local dev session had ever exercised strictly enough to catch.
- A gunicorn concurrency bottleneck: Render's free tier silently defers to `WEB_CONCURRENCY=1`, so the Home page's ~15-request burst (one `/trends` call per antibiotic, fired concurrently) hit fast 502s from Render's own proxy rather than Django. Fixed by explicitly setting `--workers 1 --threads 8 --worker-class gthread`, chosen over additional worker processes after measuring both locally (1 worker + 8 threads: 224.9MiB; 2 workers: 479.1MiB, dangerously close to Render's 512MB free-tier cap).
- A dataset-cache race condition: `trends.py` and `dataset_stats.py`'s lazily-loaded CSV caches could be triggered by multiple concurrent request threads at once on a cold cache, causing intermittent first-load failures on the deployed site (always fine on retry, since the cache was warm by then). Fixed by eagerly warming both caches at startup, in the master process before gunicorn forks workers.
- **The most significant finding:** Render appears to route inter-service traffic between its own services over a private network by default that free-tier services can't receive on — confirmed via direct testing (a Render-generated 502 with `x-render-routing: no-deploy`, reproducible 100% of the time from `gateway` to `ml-backend`, while identical requests from any external source always succeeded). Investigated and documented in full, including the options considered and rejected (a paid Render tier, other free hosts, Vercel serverless for the gateway): [ADR-0007](../architecture/adr/ADR-0007-combined-deployment-topology.md). Resolved by merging `gateway` and `ml-backend` into a single Render service communicating over `127.0.0.1` — `gateway/` and `ml-backend/` themselves are unchanged.
- Google/GitHub sign-in was briefly switched from `signInWithPopup` to `signInWithRedirect` for mobile popup-lifecycle reliability, then reverted the same day: `signInWithRedirect`'s cross-origin continuation depends on `/__/firebase/init.json` being served at the Firebase project's `authDomain`, which only happens automatically on Firebase Hosting — this app is hosted on Vercel, so the endpoint 404s and the redirect hangs. Confirmed via reproduction and against Firebase's own redirect-best-practices documentation, which names exactly this hosting configuration as requiring `signInWithPopup()` instead. Full detail: `docs/security/threat-model.md`'s Known, accepted residual gaps section.

**Also as of this milestone:** the gateway test suite has grown to 113 tests (all passing); the Django suite remains at 239 (also all passing) — 352 total. A GitHub Actions workflow (`.github/workflows/docker-publish.yml`) now publishes the combined image to `ghcr.io/dhyeydaftary/amr-insight` whenever a release is published, built from the same `combined/Dockerfile` Render itself deploys.

## Related Documentation

- [`docs/data/synthetic-feature-methodology.md`](../data/synthetic-feature-methodology.md#feature-schema-version-history) — model artifact versioning (a separate scheme from this document)
- [`docs/data/known-limitations.md`](../data/known-limitations.md) — the current, authoritative account of what this platform can and can't do
- [`CONTRIBUTING.md`](../../CONTRIBUTING.md) — where this versioning policy is referenced from the contribution workflow
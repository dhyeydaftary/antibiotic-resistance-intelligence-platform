---
title: Environment Variables
category: deployment
last_updated: 2026-08-01
owner: dhyeydaftary
review_frequency: on-env-var-change
---

# Environment Variables

## Purpose

Every environment variable AMR-Insight's three services read, whether it's required or optional, its default (if any), and what breaks without it — verified directly against each service's `.env.example` and the actual code that reads each variable, not just the example files alone. Required/optional status reflects real code behavior: a variable with no fallback in code is marked required here, regardless of whether the `.env.example` file implies otherwise.

**Legend:**
- **Yes** → required for the service to function.
- **Effectively yes** → the service starts, but one or more production features are unavailable without it.
- **No** → optional.

## ML Backend (Django)

Source: `ml-backend/.env.example`

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `SECRET_KEY` | **Yes** | none — Django raises on startup without it | Django's cryptographic signing key |
| `GEMINI_API_KEY` | Effectively yes | none | Not required for Django to start, but both AI-insight generation and PDF report extraction return an explicit `"GEMINI_API_KEY not configured"` error without it — the app runs, but two real features don't work |
| `DEBUG` | No | `False` | Django debug mode; `.env.example` ships it as `False` — the safe default even for local dev (see the security rationale in `.env.example`'s own comment and [`docs/security/threat-model.md`](../security/threat-model.md)'s Sub-phase 7), not something meant to be flipped to `True` outside a specific local debugging need |
| `ALLOWED_HOSTS` | No | `''` (empty) | Comma-separated list of hosts Django will serve; `.env.example` ships `127.0.0.1,localhost` |
| `PUBMED_TOOL_NAME` | No | `'AMR-Insight'` | Identifies this app to NCBI's E-utilities API, per their usage policy |
| `PUBMED_CONTACT_EMAIL` | No | `''` (empty) | Contact email sent to NCBI with each request — NCBI recommends providing one, but the code runs without it |
| `PUBMED_API_KEY` | No | `''` (empty) | Raises NCBI's rate limit if provided; the Research Papers feature functions without it, just at a lower request rate |
| `INTERNAL_API_KEY` | Effectively yes | `''` (empty) | The shared secret `InternalApiKeyMiddleware` checks (via constant-time comparison) on every `/api/predictor/` request; if empty, the middleware rejects every request from the gateway regardless of what key it sends — the entire predictor API surface becomes unusable even though Django itself still starts |

## Gateway (Node/Express)

Source: `gateway/.env.example`

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `MONGO_URI` | **Yes** | none | MongoDB connection string; `mongoose.connect()` has no fallback |
| `JWT_SECRET` | **Yes** | none | Signs and verifies every JWT — auth is broken without it |
| `DJANGO_API_URL` | **Yes** | none | Base URL the gateway proxies all six ML-backed routes to; no fallback in `prediction.js`. Has two genuinely different valid values depending on deployment topology: a real, public `ml-backend` URL when gateway and ml-backend run as two separately-hosted services, or `http://127.0.0.1:8000/api/predictor` when they run together in the combined Render container — see [ADR-0007](../architecture/adr/ADR-0007-combined-deployment-topology.md) for why the combined topology exists and uses loopback here |
| `RESEND_API_KEY` | **Yes** (for email features) | none | Required for the welcome email sent on first sign-in to send at all. OTP delivery is no longer this app's concern — see [ADR-0005](../architecture/adr/ADR-0005-firebase-auth-migration.md) — Firebase owns that entirely now |
| `PORT` | No | `5000` | Port the Express server listens on |
| `INTERNAL_API_KEY` | Effectively yes | none | Sent as the `X-Internal-Api-Key` header on every Django-proxied call (`djangoClient.js`) — confirmed the gateway process itself starts fine without it, it just silently sends an `undefined` header, so every Django-proxied route breaks while auth routes keep working |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | No | `./firebase-service-account.json` (resolved against `process.cwd()`, not this file's own directory — see the code comment in `config/firebaseAdmin.js`) | Path to the Firebase Admin SDK service account key, used to verify Firebase ID tokens server-side (`/session`). This file is a real secret, same sensitivity as `JWT_SECRET` — never commit it (see `.gitignore`) |
| `CORS_ALLOWED_ORIGINS` | No | `''` (empty) | Comma-separated list of browser origins allowed to call this API (`cors()` middleware); empty means no browser origin is allowed through — `.env.example` ships `http://localhost:5173` |

## Frontend (React/Vite)

Per [ADR-0005](../architecture/adr/ADR-0005-firebase-auth-migration.md), the frontend now has real, mostly-required configuration — `frontend/.env.example` exists, matching this convention:

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `VITE_GATEWAY_URL` | No | `http://localhost:5000/api` | Overrides the gateway base URL — used for local network testing (e.g. accessing the dev server from another device on the same LAN), added in commit `6aab7bb` (see [ADR-0001](../architecture/adr/ADR-0001-three-service-architecture.md)'s Consequences section) |
| `VITE_FIREBASE_API_KEY` | **Yes** | none | Firebase project's public API key — identifies which Firebase project a request belongs to. Not a secret the way `JWT_SECRET` is; meant to ship inside the public frontend bundle (real access control lives in Firebase's own console rules and the Gateway's server-side token verification, not in hiding this value) |
| `VITE_FIREBASE_AUTH_DOMAIN` | **Yes** | none | The Firebase project's auth domain (e.g. `<project-id>.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | **Yes** | none | The Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | **Yes** | none | The Firebase project's storage bucket identifier |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | **Yes** | none | Firebase Cloud Messaging sender ID (part of the standard Firebase web config object, even though this app doesn't currently use FCM) |
| `VITE_FIREBASE_APP_ID` | **Yes** | none | The Firebase web app's unique ID |

## Setup

Copy each service's example file and fill in real values before running:

```bash
cd ml-backend && cp .env.example .env
cd ../gateway && cp .env.example .env
cd ../frontend && cp .env.example .env.local
```

**Security:** never commit populated `.env`/`.env.local` files, the Firebase service account key, or any real API keys to version control. Only `.env.example` files should be tracked in the repository.

Full step-by-step install instructions, including where to obtain each API key, are in the root [`README.md`](../../README.md#installation).

## Related Documentation

- Root [`README.md`](../../README.md#installation) — full installation walkthrough these variables plug into
- [`docs/architecture/adr/ADR-0001-three-service-architecture.md`](../architecture/adr/ADR-0001-three-service-architecture.md) — why `DJANGO_API_URL` and `VITE_GATEWAY_URL` exist as separate service-boundary configuration points
- [`docs/data/known-limitations.md`](../data/known-limitations.md) — the Resend sandbox-tier email limitation, relevant to `RESEND_API_KEY`
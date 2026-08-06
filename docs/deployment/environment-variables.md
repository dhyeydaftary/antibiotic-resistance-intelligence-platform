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
| `DEBUG` | No | `False` | Django debug mode; `.env.example` ships it as `True` for local development |
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
| `DJANGO_API_URL` | **Yes** | none | Base URL the gateway proxies all six ML-backed routes to; no fallback in `prediction.js` |
| `RESEND_API_KEY` | **Yes** (for email features) | none | Required for signup/reset OTP emails and welcome emails to send at all |
| `PORT` | No | `5000` | Port the Express server listens on |
| `INTERNAL_API_KEY` | Effectively yes | none | Sent as the `X-Internal-Api-Key` header on every Django-proxied call (`djangoClient.js`) — confirmed the gateway process itself starts fine without it, it just silently sends an `undefined` header, so every Django-proxied route breaks while auth routes keep working |
| `CORS_ALLOWED_ORIGINS` | No | `''` (empty) | Comma-separated list of browser origins allowed to call this API (`cors()` middleware); empty means no browser origin is allowed through — `.env.example` ships `http://localhost:5173` |

## Frontend (React/Vite)

The frontend has no `.env.example` file — it has exactly one optional environment variable, with a working default:

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `VITE_GATEWAY_URL` | No | `http://localhost:5000/api` | Overrides the gateway base URL — used for local network testing (e.g. accessing the dev server from another device on the same LAN), added in commit `6aab7bb` (see [ADR-0001](../architecture/adr/ADR-0001-three-service-architecture.md)'s Consequences section) |

## Setup

Copy each backend service's example file and fill in real values before running:

```bash
cd ml-backend && cp .env.example .env
cd ../gateway && cp .env.example .env
```

**Security:** never commit populated `.env` files or real API keys to version control. Only `.env.example` files should be tracked in the repository.

Full step-by-step install instructions, including where to obtain each API key, are in the root [`README.md`](../../README.md#installation).

## Related Documentation

- Root [`README.md`](../../README.md#installation) — full installation walkthrough these variables plug into
- [`docs/architecture/adr/ADR-0001-three-service-architecture.md`](../architecture/adr/ADR-0001-three-service-architecture.md) — why `DJANGO_API_URL` and `VITE_GATEWAY_URL` exist as separate service-boundary configuration points
- [`docs/data/known-limitations.md`](../data/known-limitations.md) — the Resend sandbox-tier email limitation, relevant to `RESEND_API_KEY`
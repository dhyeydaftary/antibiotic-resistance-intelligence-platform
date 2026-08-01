---
title: API Endpoint Reference
category: api
last_updated: 2026-08-01
owner: dhyeydaftary
review_frequency: on-endpoint-change
---

# API Endpoint Reference

## Purpose

The gateway is AMR-Insight's single client-facing API surface (see [ADR-0001](../architecture/adr/ADR-0001-three-service-architecture.md)) — 14 total routes across two base paths, all under `http://localhost:5000/api` in local development. The machine-readable contract is [`docs/api/openapi.yaml`](openapi.yaml); this document is the human-readable walkthrough, with one real request/response example rather than restating the full schema in prose.

Seven `/auth` routes require no token (that's the point — they're how a token is obtained); all seven `/predictor` routes require a valid JWT.

### Typical API Flow

```
New user:   signup → verify-otp → predict → history
Returning:  login → predict → history
```

## Authentication (`/api/auth`, 7 routes)

| Route | Method | Purpose |
|---|---|---|
| `/signup` | POST | Create an unverified account, email a verification OTP |
| `/login` | POST | Authenticate; returns `403 NOT_VERIFIED` if the account hasn't completed OTP verification yet |
| `/verify-otp` | POST | Verify the signup OTP; on success, marks the account verified **and returns a JWT** — auto-login, no separate `/login` call needed after verification |
| `/resend-otp` | POST | Regenerate and resend the signup OTP |
| `/forgot-password` | POST | Generate and email a password-reset code |
| `/verify-reset-otp` | POST | Check a reset code without consuming it — a read-only step for the UI's step 2→3 transition; the code is re-validated again in `/reset-password` regardless |
| `/reset-password` | POST | Re-validate the reset code and update the password |

Typical flow: `signup → verify-otp → authenticated requests` for new users, or `login → authenticated requests` for returning users.

Every JWT-protected route returns the same shape on an auth failure — verified directly against `gateway/middleware/verifyToken.js`:

```json
{ "success": false, "data": null, "error": { "code": "AUTH_ERROR", "message": "No token provided", "field": null } }
```

or, for an expired/invalid token, the same shape with `"message": "Invalid or expired token"`.

## Prediction and Data (`/api/predictor`, 7 routes)

| Route | Method | Proxied to Django? | Purpose |
|---|---|---|---|
| `/predict` | POST | Yes | Run all 15 antibiotic models, save the result to history |
| `/extract-report` | POST | Yes | Upload a PDF (`multipart/form-data`, field name `report`); Gemini extracts structured fields |
| `/trends` | GET | Yes | Resistance trend data |
| `/dataset-stats` | GET | Yes | Aggregate dataset statistics |
| `/explain-trend` | GET | Yes | Deterministic trend explanation (no Gemini — see [ADR-0004](../architecture/adr/ADR-0004-explainability-strategy.md)) |
| `/research-papers` | GET | Yes | PubMed research context |
| `/history` | GET | **No** | Queries MongoDB directly — the one predictor route that doesn't touch Django |

**`/history`'s filters are real and combine into one query**, verified against `gateway/routes/prediction.js`: `result`, `antibiotic`, and `confidenceMin`/`confidenceMax` all merge into a single MongoDB `$elemMatch` on the `predictions` array (because they all describe a condition on *one* antibiotic entry within a record, not the record as a whole), `organism` and date range filter separately, and `search` does a case-insensitive match against organism or antibiotic name.

### One Real Example — `POST /predictor/predict`

**Request:**

```json
{
  "age": 54,
  "gender": "Female",
  "diabetes": true,
  "hypertension": false,
  "hospital_before": true,
  "infection_freq": 1,
  "year": 2026,
  "month": 7,
  "organism": "Escherichia coli",
  "specimen_source": "Urine",
  "ward_type": "General Ward"
}
```

**Response** (truncated to one antibiotic of 15):

```json
{
  "success": true,
  "data": {
    "predictions": [
      {
        "antibiotic": "CIP",
        "result": "Resistant",
        "awareCategory": "Watch",
        "confidence": 0.8123,
        "shapExplanation": [
          { "feature": "Previous_Antibiotic_Use", "contribution": 0.412, "direction": "positive", "value": 1 }
        ]
      }
    ],
    "aiInsights": "...",
    "modelVersion": "v3"
  },
  "error": null
}
```

Full field-level input schema: [`docs/data/data-dictionary.md`](../data/data-dictionary.md).

## Error Envelope

Every response — success or failure — follows the same three-key shape: `success` (boolean), `data` (the payload, or `null` on failure), `error` (`null` on success, or `{ code, message, field }` on failure). This is consistent across all 14 routes, not just `/predict` — verified by reading every route in both `auth.js` and `prediction.js`.

## Related Documentation

- [`docs/api/openapi.yaml`](openapi.yaml) — the full machine-readable contract for all 14 routes
- [`docs/architecture/adr/ADR-0001-three-service-architecture.md`](../architecture/adr/ADR-0001-three-service-architecture.md) — why the gateway is the single client-facing surface
- [`docs/architecture/request-lifecycle.md`](../architecture/request-lifecycle.md) — the full internal sequence behind `/predict` specifically
- [`docs/data/data-dictionary.md`](../data/data-dictionary.md) — every input field's type, range, and unit
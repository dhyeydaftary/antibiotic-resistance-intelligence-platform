---
title: API Endpoint Reference
category: api
last_updated: 2026-08-04
owner: dhyeydaftary
review_frequency: on-endpoint-change
---

# API Endpoint Reference

## Purpose

The gateway is AMR-Insight's single client-facing API surface (see [ADR-0001](../architecture/adr/ADR-0001-three-service-architecture.md)) — **15** total routes across two base paths, all under `http://localhost:5000/api` in local development. The machine-readable contract is [`docs/api/openapi.yaml`](openapi.yaml); this document is the human-readable walkthrough, with one real request/response example rather than restating the full schema in prose.

Seven of the eight `/auth` routes require no token (that's the point — they're how a token is obtained); the eighth (`/logout-everywhere`) does require one, since it revokes the very session making the call. All seven `/predictor` routes require a valid JWT.

Every route on both base paths sits behind [`helmet`](../security/threat-model.md) (security headers), an origin allow-list (CORS), and a per-endpoint rate limit — see the tables below for the specific limit each route carries.

### Typical API Flow

```
Every user: Firebase auth (password/Google/GitHub, frontend-side) → session → authenticated requests
```

## Authentication (`/api/auth`, 3 routes)

Per [ADR-0005](../architecture/adr/ADR-0005-firebase-auth-migration.md), Firebase is this app's identity provider — the frontend authenticates directly against Firebase (password, Google, or GitHub), then exchanges the resulting Firebase ID token for the Gateway's own session token here. There's no separate signup/login distinction at this API level; Firebase's find-or-create semantics mean the same `/session` call works for a brand-new account or a returning one.

| Route | Method | Auth required | Rate limit | Purpose |
|---|---|---|---|---|
| `/session` | POST | No | 20 / 15 min, per IP | Verify a Firebase ID token server-side and exchange it for a Gateway session JWT. Finds-or-creates the MongoDB `User` record, keyed by Firebase UID |
| `/logout-everywhere` | POST | **Yes** | None currently | Bump `tokenVersion`, invalidating every token issued to the account — including the one used to make this call. Requires a valid token, not just an email, so it can't be used to lock another account out. Writes a `LOGOUT_EVERYWHERE` audit event ([`docs/security/threat-model.md`](../security/threat-model.md)) |
| `/me` | GET | **Yes** | None currently | Session-validity check — confirms a stored Gateway token still resolves to a real, current user. Called once at app mount, not on every navigation |

**`/session` rejects with two distinct error codes worth knowing apart:** `AUTH_ERROR` (401) means the Firebase ID token itself failed verification — expired, malformed, or not genuinely signed by Firebase for this project. `EMAIL_NOT_VERIFIED` (401) means the token verified fine, but Firebase itself hasn't confirmed that email yet (only reachable via the password-signup path — Google/GitHub sign-ins arrive pre-verified). The frontend treats these differently: only the second offers a "resend verification email" action.

Every JWT-protected route returns the same shape on an auth failure — verified directly against `gateway/middleware/verifyToken.js`:

```json
{ "success": false, "data": null, "error": { "code": "AUTH_ERROR", "message": "No token provided", "field": null } }
```

or, for an expired, invalid, or **revoked** (`tokenVersion` mismatch — e.g. after `/logout-everywhere`) token, the same shape with `"message": "Invalid or expired token"`.

## Prediction and Data (`/api/predictor`, 7 routes)

| Route | Method | Proxied to Django? | Rate limit | Purpose |
|---|---|---|---|---|
| `/predict` | POST | Yes | 10 / 15 min, per user | Run all 15 antibiotic models, save the result to history |
| `/extract-report` | POST | Yes | 10 / 15 min, per user | Upload a PDF (`multipart/form-data`, field name `report`); Gemini extracts structured fields |
| `/trends` | GET | Yes | 300 / 15 min, per user | Resistance trend data |
| `/dataset-stats` | GET | Yes | 300 / 15 min, per user | Aggregate dataset statistics |
| `/explain-trend` | GET | Yes | 300 / 15 min, per user | Deterministic trend explanation (no Gemini — see [ADR-0004](../architecture/adr/ADR-0004-explainability-strategy.md)) |
| `/research-papers` | GET | Yes | 10 / 15 min, per user | PubMed research context |
| `/history` | GET | **No** | 300 / 15 min, per user | Queries MongoDB directly — the one predictor route that doesn't touch Django |

Every rate limit on this base path is keyed **per authenticated user, not per IP** — deliberately, since these routes already sit behind `verifyToken`, so keying by the real account is more meaningful than keying by network address (which would either group unrelated users behind the same NAT together, or let one account dodge the limit by rotating IPs). `/predict`, `/extract-report`, and `/research-papers` share the tighter budget (`expensiveLimiter`) since each triggers a real external cost — a Gemini call, or a PubMed API call subject to its own rate limits. `/trends`, `/dataset-stats`, `/explain-trend`, and `/history` share the much looser `readLimiter` budget (`300`, not a smaller round number — deliberately, since a single normal user session can legitimately fire dozens of requests to these routes; see [`docs/security/threat-model.md`](../security/threat-model.md) for the real incident that led to that number).

**`/predict` also validates its request body server-side**, independently of anything the frontend already checked, against the same field contract Django's own serializer enforces — an invalid or malformed payload is rejected before any call to Django happens at all, and only the validated, whitelisted fields (never the raw request body) ever reach Django or get persisted to history.

**Every predictor route's error handling forwards a Django failure to the client only if it matches this API's own known-safe `{success, data, error}` envelope shape.** Anything else falls back to a generic `500 INTERNAL_ERROR` instead — full reasoning in [`docs/security/threat-model.md`](../security/threat-model.md)'s Data Protection section. A request to Django that takes longer than 30 seconds returns `504 UPSTREAM_TIMEOUT` rather than hanging.

**`/history`'s filters are real and combine into one query**, verified against `gateway/routes/prediction.js`: `result`, `antibiotic`, and `confidenceMin`/`confidenceMax` all merge into a single MongoDB `$elemMatch` on the `predictions` array (because they all describe a condition on *one* antibiotic entry within a record, not the record as a whole), `organism` and date range filter separately, and `search` does a case-insensitive match against organism or antibiotic name. Every filter value is checked for the correct type before use, and unusable values are silently dropped rather than causing an error — consistent with this route treating a missing filter as "don't filter on this."

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

Every response — success or failure — follows the same three-key shape: `success` (boolean), `data` (the payload, or `null` on failure), `error` (`null` on success, or `{ code, message, field }` on failure). This is consistent across all 15 routes, not just `/predict` — verified by reading every route in both `auth.js` and `prediction.js`. `RATE_LIMITED` (429) and `UPSTREAM_TIMEOUT` (504) join the existing `AUTH_ERROR`/`VALIDATION_ERROR`/`NOT_FOUND`/`INTERNAL_ERROR` codes as of the API Security hardening pass.

## Related Documentation

- [`docs/api/openapi.yaml`](openapi.yaml) — the full machine-readable contract for all 15 routes
- [`docs/architecture/adr/ADR-0001-three-service-architecture.md`](../architecture/adr/ADR-0001-three-service-architecture.md) — why the gateway is the single client-facing surface
- [`docs/architecture/adr/ADR-0006-session-and-token-security-architecture.md`](../architecture/adr/ADR-0006-session-and-token-security-architecture.md) — the `tokenVersion` mechanism behind `/session` and `/logout-everywhere`
- [`docs/architecture/request-lifecycle.md`](../architecture/request-lifecycle.md) — the full internal sequence behind `/predict` specifically
- [`docs/data/data-dictionary.md`](../data/data-dictionary.md) — every input field's type, range, and unit
- [`docs/security/threat-model.md`](../security/threat-model.md) — the reasoning behind every rate limit, validation gate, and error-handling decision referenced above
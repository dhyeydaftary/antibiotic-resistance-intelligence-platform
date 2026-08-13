---
title: "Security Threat Model"
category: security
last_updated: 2026-08-04
owner: dhyeydaftary
review_frequency: on-security-change
---

# Security Threat Model

## Purpose

This document is the authoritative record of AMR-Insight's security posture: what was reviewed, what was found, what was fixed, and — just as importantly — what was deliberately left alone and why. It replaces the placeholder note that used to sit in the root [`README.md`](../../README.md#security) ("a full threat model, once production deployment is scoped, lives here") — deployment isn't scoped yet, but the security work itself is now substantially complete, and this document reflects that.

The project went through thirteen sequential hardening sub-phases plus two emergency hotfixes, each following the same disciplined pattern: a repository-aware audit first (verified against actual code, not assumed), findings presented and explicitly approved before any change, implementation of only the approved items, and real verification afterward — usually by directly reproducing the vulnerable behavior before the fix and confirming it closed after. That evidence-first discipline is reflected in how each section below is written: verified issues are stated as verified, judgment calls are stated as judgment calls, and residual gaps are stated plainly rather than glossed over.

## Scope and framing

AMR-Insight is explicitly a **research and education platform**, not a clinical system handling real patient data — see [`docs/data/known-limitations.md`](../data/known-limitations.md). This shaped the threat model in a real way: the goal throughout was to build genuinely sound security practice (the kind that would hold up in a real deployment), not to over-engineer defenses proportional to a threat model this project doesn't actually have (e.g. nation-state attackers, real PHI exfiltration). Where a finding's severity depended on that framing, this document says so.

**Architecture recap** (full detail: [ADR-0001](../architecture/adr/ADR-0001-three-service-architecture.md)): three services — a React/Vite frontend, a Node/Express gateway, and a Django ML backend — plus MongoDB (via the gateway) and two external APIs (Google Gemini, PubMed). The gateway is the sole authenticated entry point; the frontend never calls Django directly; Django trusts the gateway via a shared internal API key, not by network topology alone.

## Sub-phase 1 — Authentication

> **Status: historical.** This sub-phase's findings applied to the custom password/OTP system originally built for this project. As of [ADR-0005](../architecture/adr/ADR-0005-firebase-auth-migration.md), password and OTP verification are Firebase's responsibility — the fixes below no longer describe this app's current authentication mechanism, but are preserved as a genuine record of the security review this project's own auth system went through before that migration. See ADR-0005 for what replaced it and why.

**Scope:** signup, login, OTP verification, password reset, password hashing, OTP generation.

**Verified issues found and fixed:**
- Server-side password policy was missing — the frontend enforced an 8-character/mixed-case/number/special-character rule, but the backend accepted any non-empty string, meaning the policy was trivially bypassable via a direct API call. Fixed by porting the identical rule set server-side (`gateway/utils/passwordPolicy.js`).
- OTP codes were generated with `Math.random()`, not a cryptographically secure random source. Fixed with `crypto.randomInt()`.
- No per-account limit on OTP verification attempts — an attacker with unlimited tries could eventually brute-force a 6-digit code within its validity window. Fixed with a 5-attempt cap (`otpAttempts`/`resetAttempts` on `User`), after which the code is invalidated outright rather than merely blocked, forcing a fresh code via resend.
- No rate limiting existed on any of the seven auth endpoints. Fixed with `express-rate-limit`, tiered by risk (10/15min for login and OTP verification, 3/hour and 5/hour for the endpoints that trigger outbound email).

**Confirmed already solid, no change needed:** passwords and OTPs were already bcrypt-hashed at rest; `/login` already returned a generic error for both nonexistent accounts and wrong passwords (no enumeration on that specific endpoint, at the time).

## Sub-phase 2 — Session & Token Security

> **Note:** the mechanism described below is retained, unmodified, per [ADR-0005](../architecture/adr/ADR-0005-firebase-auth-migration.md) and [ADR-0006](../architecture/adr/ADR-0006-session-and-token-security-architecture.md) — this sub-phase's findings and fix are still fully current. What changed is the *entry point*: the Gateway now issues this same `tokenVersion`-carrying JWT after verifying a Firebase-issued identity, rather than directly after password/OTP verification.

**Scope:** JWT lifetime, revocation, refresh tokens.

**Verified issue found and fixed:** there was no way to invalidate a JWT before its natural expiry. A stolen token, or a token that should have been killed by a password reset, remained valid for its full lifetime regardless.

**Fix:** a `tokenVersion` counter on `User`, embedded in every issued JWT and checked against the current stored value on every authenticated request (`verifyToken.js`). Bumping the counter — on password reset, or via a new `POST /logout-everywhere` endpoint — instantly invalidates every previously issued token for that account, including the one that triggered the bump. JWT lifetime was also made to depend on the login "remember me" flag (24h if unchecked, 7d if checked) rather than a flat 7 days regardless.

**Deliberate non-goal, documented not deferred:** refresh tokens were considered and explicitly rejected as unnecessary complexity for this project's scale — `tokenVersion`-based revocation solves the actual problem (kill a session on demand) without the added surface area of a refresh-token flow (a separate endpoint, rotation logic, its own revocation story). This decision is now formally recorded in [ADR-0006](../architecture/adr/ADR-0006-session-and-token-security-architecture.md), not just a code comment.

## Sub-phase 3 — Authorization

**Scope:** the trust boundary between the gateway and the Django ML backend; object-level authorization within the gateway's own data.

**Verified issue found and fixed — the most significant finding of this sub-phase:** the Django ML backend had **zero authentication of its own**. Every endpoint (`predict`, `trends`, `dataset-stats`, `explain-trend`, `research-papers`, `extract-report`) relied entirely on `CORS_ALLOWED_ORIGINS` for protection — which stops a browser from making a cross-origin call, but does nothing against a direct `curl`/script request. Anyone with network access to the Django host could call any ML endpoint directly, fully bypassing the gateway's entire authentication and rate-limiting funnel.

**Fix:** `InternalApiKeyMiddleware` (`ml-backend/amr_project/middleware.py`) — a shared secret (`INTERNAL_API_KEY`) that the gateway sends on every request to Django via `X-Internal-Api-Key`, checked with a constant-time comparison (`hmac.compare_digest`) before any view logic runs. Implemented as Django middleware (not a per-view DRF permission class) specifically so it's the earliest possible interception point and applies uniformly regardless of how future views are built.

**Secondary finding, fixed in the same pass:** the Django project still had `django.contrib.admin`, `django.contrib.auth`, and `django.contrib.sessions` installed — unused scaffold from the initial `django-admin startproject`, verified via direct repository search (zero references to `request.user`/`request.session` anywhere in `predictor/`). Removed cleanly, including the live `/admin/` login page that had no real purpose.

**Confirmed already solid:** `/history`'s object-level authorization was already correctly enforced — every query is hardcoded to `{ userId: req.userId }` from the verified JWT, never from client-supplied input.

## Sub-phase 4 — Input Validation

**Scope:** server-side validation of every user-controllable input across both services.

**Verified issues found and fixed:**
- `/predict` performed zero independent validation before forwarding to Django and persisting to MongoDB — the raw request body was stored regardless of what Django's own serializer accepted, meaning arbitrary extra fields or malformed data could accumulate in `PredictionHistory` indefinitely. Fixed with a gateway-side validator (`predictionValidation.js`) mirroring Django's `PredictionRequestSerializer` field-for-field; the validated, whitelisted shape — not the raw body — is what gets forwarded and stored.
- `/history`'s query filters had a real, demonstrable **NoSQL query-operator injection** vector: none of the filter parameters were type-checked as strings before being placed directly into the MongoDB query object, and Express's query parser can turn a repeated key (`?organism=x&organism=y`) into an array rather than a string. Verified directly — a crafted request produced a query object with an array value reaching `.find()` unchecked. Fixed by explicitly requiring every filter value to be a string before use; non-string values are silently dropped, consistent with the route's existing "missing filter = no filter" design. Blast radius was contained even before the fix, since `userId` is always pinned from the JWT, never from user input — but the underlying primitive was real.
- The same route's free-text `search` parameter was passed directly into `new RegExp(search, 'i')`, unescaped — a ReDoS vector. Verified: an unescaped catastrophic-backtracking pattern hung the process for 10+ seconds before the fix; after escaping regex metacharacters and capping the input length, the same pattern resolved in effectively 0ms.

## Sub-phase 5 — API Security

**Scope:** rate limiting on the ML-backed routes, CORS configuration, remaining account-enumeration gaps, request timeouts.

**Verified issues found and fixed:**
- All 7 routes in `prediction.js` had `verifyToken` but no rate limiting at all — unlike every auth route. Fixed with per-user (not per-IP) tiered limits, tighter on the routes that trigger real external cost (Gemini, PubMed).
- `cors()` had no origin restriction — any website could make cross-origin calls and read the response. Combined with the account-enumeration gap below, this meant a malicious webpage, loaded by anyone, could silently probe account existence in the background using any visitor's browser. Fixed with an explicit origin allow-list (`CORS_ALLOWED_ORIGINS`).
- Five auth endpoints (`/verify-otp`, `/resend-otp`, `/forgot-password`, `/verify-reset-otp`, `/reset-password`) still returned a distinguishable response for a nonexistent account versus a real one. Fixed in two layers: the response **body** was made identical (a nonexistent account for a code-requiring route collapses into the same "incorrect code" shape a real account's wrong code produces, rather than a distinct "not found" message), and — caught during a later verification pass, not the original fix — the response **timing** was also closed, since a nonexistent account previously skipped `bcrypt.compare()` entirely, making it measurably faster (~80x) than a real wrong-code attempt. Fixed with a dummy-hash comparison for the nonexistent-account path, verified to bring both conditions within ~1–7% of each other (ordinary system jitter, no longer a usable timing oracle). *(Historical as of [ADR-0005](../architecture/adr/ADR-0005-firebase-auth-migration.md) — these five routes no longer exist; Firebase now owns this enumeration surface entirely.)*
- `djangoClient` (the gateway's HTTP client to Django) had no timeout — a hang anywhere downstream could leave the gateway waiting indefinitely. Fixed with a 30-second timeout and a specific `504 UPSTREAM_TIMEOUT` response.

**Residual gap, since resolved:** `/resend-otp`'s response for an *already-verified* real account (`ALREADY_VERIFIED`) used to differ from the generic success shape used for a nonexistent account. This gap no longer applies — the route itself was removed as part of the [Firebase migration (ADR-0005)](../architecture/adr/ADR-0005-firebase-auth-migration.md), not patched in place.

## Sub-phase 6 — Transport Security

**Scope:** proxy-awareness, HSTS.

**Findings and fixes, both scoped for "not deployed yet":**
- `trust proxy` was unset on the gateway — behind any real reverse proxy, this either collapses every user into one shared rate-limit bucket (if unset) or makes IP-based limiting spoofable (if set to `true` rather than a specific hop count). Set to `1` (single-hop assumption), explicitly documented as needing revisiting once a real hosting platform is chosen.
- No HSTS header anywhere. Added (initially as a one-line manual middleware, later folded into `helmet` once the HTTP Security Headers sub-phase justified the dependency) — inert over plain HTTP by design, takes effect once the app is actually served over HTTPS.
- Django's equivalent (`SECURE_PROXY_SSL_HEADER`) added for the same reason, lower real-world priority since `InternalApiKeyMiddleware`, not `request.is_secure()`, is the actual access-control boundary there.

## Sub-phase 7 — Data Protection

**Scope:** secret management, error-response handling, environment variable hygiene.

**Verified issue found and fixed — the most consequential finding of this sub-phase:** the gateway blindly forwarded Django's raw error response to the client on any failure (`res.status(err.response.status).json(err.response.data)`), with no check on what that response actually contained. Combined with `DEBUG=True` being the illustrative default in `ml-backend/.env.example`, this created a realistic path to leaking `SECRET_KEY` and other settings: an unhandled Django exception with `DEBUG=True` returns Django's full debug page (traceback, local variables, often settings values), and this code would have forwarded all of it verbatim to whichever user triggered it. Fixed by only forwarding responses matching the app's own known-safe `{success, data, error}` envelope shape — anything else falls back to a generic error, with a safe (non-raw) log written server-side instead.

**Related, smaller fixes in the same pass:**
- `console.error(logLabel, err)` on a Django connectivity failure risked leaking the internal service API key into server logs, since axios error objects can include the full outgoing request config (including headers). Fixed to log a reduced, safe subset only.
- `.env.example`'s `SECRET_KEY` placeholder was inconsistent with how `JWT_SECRET`/`INTERNAL_API_KEY` signal "generate a real random value" — fixed to match, with the actual working command to generate one.
- `.env.example`'s `DEBUG` illustrative default flipped from `True` to `False`.

## Sub-phase 8 — Brute Force Protection

> **Status: historical.** The specific mechanism described below (`loginAttempts`/`loginLockedUntil` on the `User` model) no longer exists in this app's code — it was removed as part of the [Firebase migration (ADR-0005)](../architecture/adr/ADR-0005-firebase-auth-migration.md), since Firebase now owns brute-force/lockout protection for password authentication directly. Preserved here as a genuine record of the original finding and fix.

**Scope:** account-level login lockout (distinct from the IP-based rate limiting already in place).

**Verified issue found and fixed:** `/login` had no per-account failed-password-attempt tracking at all, only the shared IP-based limiter — meaning a distributed credential-stuffing attack (many IPs, one target account) would never trip it. Fixed with a 5-attempt, 15-minute account lockout (`loginAttempts`/`loginLockedUntil`), designed to be indistinguishable in its HTTP response from a normal wrong-password or nonexistent-account response — closing the account-enumeration angle here too, not just re-solving lockout in isolation.

**A real bug caught and fixed before shipping, not after:** the initial implementation reset `loginAttempts` to `0` in memory on a successful login, but only persisted that reset inside a branch that only runs on a user's very first login ever — meaning for any normal returning user, a successful login never actually cleared the counter in the database. Caught during manual review, fixed by saving the reset unconditionally.

**Deliberate non-fix:** progressive/exponential login delays were considered and explicitly not added as a third mechanism — the combination of IP-based rate limiting and this new account lockout already covers what OWASP treats as alternative, not cumulative, mitigations.

## Sub-phase 9 — Logging & Monitoring

**Scope:** persistent audit trail, structured logging, request logging.

**Verified issue found and fixed:** there was no persistent, queryable record of any security-relevant event — logins, failed logins, lockouts, password resets — anywhere. `loginAttempts` is a counter for lockout logic, not an audit trail; it resets, has no timestamps, records no IP. Fixed with a new `SecurityEvent` collection (write-only, no exposed read endpoint — this project has no admin panel by design), recording events with email, `userId` (null where none exists, e.g. a failed attempt against a nonexistent account), IP, and a timestamp — deliberately never any password, hash, token, or code.

> **Event set updated by the Firebase migration ([ADR-0005](../architecture/adr/ADR-0005-firebase-auth-migration.md)):** originally `LOGIN_SUCCESS`, `LOGIN_FAILURE`, `LOGIN_LOCKOUT`, `SIGNUP`, `EMAIL_VERIFIED`, `PASSWORD_RESET`, and `LOGOUT_EVERYWHERE`. The current event set is `SESSION_SUCCESS`, `SESSION_FAILURE`, and `LOGOUT_EVERYWHERE` — a smaller set, reflecting that Firebase's own token-exchange model collapses what used to be several distinct auth events (signup, login, email verification) into one `/session` route, and password reset/lockout events no longer apply at all (Firebase's own responsibility now). The underlying design goal — a real, persistent, queryable audit trail — is unchanged.

**A real gap caught during manual review, not the original implementation:** the very first pass only logged `LOGIN_LOCKOUT` for the attempt that *triggers* a lockout, silently missing repeat attempts against an *already-locked* account — arguably the single strongest "an attack may still be in progress" signal this audit trail exists to capture. Closed in the same review before committing.

**Also added:** a small, dependency-free structured logging wrapper (`utils/logger.js`) replacing every raw `console.error`/`console.log` call, and lightweight HTTP request logging (method/path/status/duration — never the request body, to avoid ever logging a plaintext password on a failed login).

**Relevance beyond internal ops:** this audit trail was built with India's DPDP Rules, 2025 in mind — Rule 6(1)(c)/(e) call for "visibility into personal data through logs" and retention of "at least one year" for exactly this kind of detection/investigation purpose. `SecurityEvent` records are retained indefinitely (a floor is satisfied by never deleting; this needs no active retention-enforcement code to comply with a *minimum*). This is not a substitute for actual legal review before any public release — noted here as design intent, not a compliance guarantee.

## Sub-phase 10 — File Upload Security

**Scope:** the `/extract-report` PDF upload path.

**Verified issue found and fixed:** the client-supplied filename (`req.file.originalname`) was forwarded unsanitized as the multipart filename sent to Django. The two most severe versions of this class of bug didn't actually apply — both the gateway (`multer.memoryStorage()`) and Django (`io.BytesIO`) process uploads entirely in memory, so the filename is never used to construct a filesystem path, and it's never echoed back or rendered anywhere in the frontend. What remained was a narrower, still-worth-closing concern: an arbitrary attacker-controlled string flowing into a structured HTTP field, with safety resting entirely on a third-party library's (`form-data`) current encoding behavior. Fixed by generating a fresh, random filename (`crypto.randomUUID() + '.pdf'`) server-side and never forwarding anything from the client. Verified directly against the real outgoing multipart body with a deliberately malicious filename (path traversal plus a CRLF header-injection attempt) — confirmed absent from what actually gets sent.

**MIME type and file content (magic-byte) validation** were already added during Input Validation; this sub-phase's contribution was specifically the filename.

## Sub-phase 11 — HTTP Security Headers

**Scope:** CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.

**Fix:** `helmet`, adopted deliberately at this point rather than earlier — the Transport Security sub-phase had explicitly chosen a one-line manual HSTS header over pulling in `helmet` for a single header; once the ask grew to five headers, that calculus flipped and `helmet` became the better tool, consolidating the existing manual HSTS into it in the same pass. Configured with a maximally restrictive CSP (`default-src 'none'; frame-ancestors 'none'`) appropriate for a pure JSON API with no HTML/JS of its own — deliberately not `helmet`'s own defaults, which assume a self-hosted web app. `Permissions-Policy` was added via a small manual addition, since `helmet` 8.x doesn't implement it at all (the underlying spec is still evolving upstream).

**Frontend headers** — since no server in this repository serves the frontend's built output (it's deployed as a static site on Vercel), a `frontend/vercel.json` file was added as a deployment-ready artifact (Vercel's native headers convention — Vercel does not read a `_headers` file at all, unlike Netlify/Cloudflare Pages, which was this project's first, since-replaced approach) rather than application code — including a real, verified CSP accounting for the app's actual external dependency (Google Fonts, both `fonts.googleapis.com` and `fonts.gstatic.com`). It has a literal placeholder for the real gateway origin, which must be filled in before this takes effect at deploy time.

## Sub-phase 12 — Dependency Security

**Scope:** a real vulnerability scan across `package-lock.json` (both Node projects) and `requirements.txt`.

**The most serious individual finding across the entire hardening pass:** `pdfminer.six` (a transitive dependency of `pdfplumber`, used to parse every uploaded PDF) had a confirmed **remote code execution** vulnerability — `CMapDB._load_data()` deserializes CMap files via `pickle.loads()`, and a malicious PDF can itself specify an arbitrary path and filename for the CMap it wants loaded, meaning a crafted PDF alone is a complete, self-contained RCE delivery mechanism, directly reachable through the live `/extract-report` feature. `pdfplumber==0.11.7` (the pinned version) hard-pinned the vulnerable `pdfminer.six` version with an exact `==` constraint, so the fix required upgrading `pdfplumber` itself (to `0.11.10`, which requires a patched `pdfminer.six`), not just the transitive package alone — confirmed via a dependency-resolution conflict that the two couldn't otherwise coexist. Verified: `pip-audit` clean after the fix, and the actual PDF-extraction feature functionally re-tested against this repo's own real sample PDF, both immediately after the fix and again after a full clean environment reinstall.

**Also fixed:** Django `6.0.6` → `6.0.7` (3 officially low-severity CVEs — investigated each specific code path and confirmed none were actually reachable in this app's configuration, but taken anyway as a zero-risk patch bump); 8 of 10 frontend `npm audit` findings, all traced to `shadcn` (a CLI tool, never bundled into the production build) or `eslint` (dev-only); the gateway's one finding (`brace-expansion`, via `nodemon`, dev-only).

**Deliberately not force-fixed:** a `react-router` advisory (`GHSA-qwww-vcr4-c8h2`), confirmed via the maintainer's own advisory note to only apply to the unstable RSC APIs — which this app, a plain client-side SPA, never uses (verified directly against every `react-router-dom` import in the codebase). The suggested automated fix would have *downgraded* `react-router-dom` from `7.18.1` to `7.11.0` to dodge an inapplicable advisory — declined; the real long-term fix is a deliberate v8 migration, tracked separately, not forced reactively here.

## Sub-phase 13 — Security Testing

**Scope:** formalizing the ad hoc, throwaway verification used throughout every prior sub-phase into a real, persisted, re-runnable test suite.

Prior to this sub-phase, every piece of verification described above — the enumeration checks, the timing measurements, the injection reproduction, the RCE confirmation — was real, but lived in scripts written once, run once, and deleted. Nothing would have caught a future regression automatically.

**Result at the time of this hardening pass:** 98 automated tests (84 gateway, via Node's built-in `node:test`; 14 Django, via `manage.py test`), covering authentication flows end-to-end (including exact attempt-count boundaries, OTP expiry boundaries, and the persisted-lockout-reset bug described in Sub-phase 8), authorization (`verifyToken` against malformed/expired/cross-signed/revoked tokens, object-level authorization on `/history`), and the full set of "sneaky" regressions from earlier sub-phases (NoSQL injection, ReDoS, file-upload validation, safe error-forwarding, security headers including on error responses, CORS, exact rate-limit boundaries) — plus a dedicated regression test for the read-route rate-limit miscalibration described below, sized against the real, measured request volume that broke it.

> **Updated by the Firebase migration ([ADR-0005](../architecture/adr/ADR-0005-firebase-auth-migration.md)):** the gateway suite now stands at 69 tests (63 passing; the remaining 6 are pre-existing, environmental failures unrelated to authentication, confirmed via an isolated clean-checkout comparison before the migration began). The count is smaller than 98 not because coverage was cut, but because the tests it replaced — OTP generation/expiry boundaries, the specific lockout-reset regression, five now-removed enumeration-protected routes — tested mechanisms that no longer exist in this app's code at all; testing them would mean testing dead code. New coverage was added for the routes that do exist now (`/session`'s Firebase-token verification, new-vs-existing-account handling, the distinct `EMAIL_NOT_VERIFIED` code) — see `gateway/tests/auth.test.js` and `security-events.test.js`.

**No suspected application-code defects were found during this pass.** Every anomaly encountered while writing tests was traced to a mistake in the test code itself (a false-positive secret-leak check caused by a test-only placeholder value, a `busboy`/`multer` boundary-lookahead quirk, a cross-test mock-contamination bug via a singleton `axios` instance) — each debugged and fixed before being reported, not worked around.

**Coverage, measured after the fact:** gateway 75.09% overall, with every file under `middleware/` and `models/` — the actual security-enforcement surface — at 100%. ml-backend's `predictor/` app at ~34%, which undercounts what matters: that number averages in ML training/inference/report-generation code (`predict.py`, `train_models.py`, `ai_insights.py`) that was never in scope for this sub-phase (needs `catboost`/real models, or calls real external APIs). Expanding coverage of those modules is tracked as post-presentation work.

## Two emergency hotfixes (outside the numbered sub-phases)

**Django full outage, caught immediately after the Authorization sub-phase merged.** Removing `django.contrib.auth` (a legitimate, correct fix — see Sub-phase 3) broke DRF's own default `UNAUTHENTICATED_USER`/`DEFAULT_AUTHENTICATION_CLASSES` settings, which still depended on that app being installed — every `@api_view` endpoint crashed with a 500 the moment it touched `request.user`. Root-caused with a full traceback trace (down to `Model class ... Permission doesn't declare an explicit app_label`), fixed with an explicit `REST_FRAMEWORK` setting removing DRF's dependency on `django.contrib.auth` entirely — not just patching the one observed crash site, since a second, less obvious trigger (`BasicAuthentication`, if any request ever carried an `Authorization: Basic` header) existed via the same root cause. This regression now has dedicated test coverage (Sub-phase 13, `test_settings.py`) specifically so it can't silently reoccur.

**Rate-limit miscalibration, caught from live browser console errors.** The read-tier rate limiter added in Sub-phase 5 (`max: 30`/15min, shared across `/trends`/`/dataset-stats`/`/explain-trend`/`/history`) was calibrated as if one page view cost one request — it didn't account for the frontend's own design, where both the Home and Trends pages independently loop over all 15 antibiotics via `Promise.all` to build comparison views. A single normal session could legitimately exceed the budget before even reaching History or Explore, with zero abuse involved — exactly what was observed: Trends, History, and Explore all failing to load during ordinary navigation. Fixed by raising the limit to `300`, sized against the actual measured cost of realistic usage (confirmed via a simulated 70-request session succeeding with zero rate-limiting, while the limiter still genuinely blocks at a much higher volume) rather than picked arbitrarily.

## Known, accepted residual gaps

Stated plainly, not hidden in a changelog:

- ~~`/resend-otp`'s `ALREADY_VERIFIED` response remains distinguishable from the generic success shape~~ — moot as of the [Firebase migration (ADR-0005)](../architecture/adr/ADR-0005-firebase-auth-migration.md); this route no longer exists.
- ~~Whether `CSRF_COOKIE_SECURE` is actually moot has not been confirmed~~ — confirmed moot, with evidence: DRF's `APIView.as_view()` unconditionally wraps every view in `csrf_exempt` (verified directly against the installed `djangorestframework` source), and this app's `DEFAULT_AUTHENTICATION_CLASSES: []` means no `SessionAuthentication` is ever active to reintroduce a CSRF check on top of that exemption. `InternalApiKeyMiddleware` is the real trust boundary here, not cookies.
- A `react-router` v8 migration is deferred (Sub-phase 12) — the current advisory doesn't apply to this app's usage, but the dependency itself is behind.
- Several settings are deliberately placeholder/deploy-time-only until a real hosting platform is chosen: the gateway's `trust proxy` value (currently `1`, a single-hop assumption), the frontend's `vercel.json` CSP `connect-src` (a literal placeholder for the real gateway origin), and HSTS `preload` (deliberately excluded — committing to browser preload lists is hard to reverse and ties the commitment to a specific domain that doesn't exist yet).
- **`Cross-Origin-Opener-Policy` on the frontend, and the CSP additions Firebase Auth needs, are real but only locally verified.** `frontend/vercel.json` now sets `Cross-Origin-Opener-Policy: same-origin-allow-popups` (`same-origin` blocks Firebase's `signInWithPopup` from detecting when the popup closes — a documented Firebase issue, not specific to this app) and adds `identitytoolkit.googleapis.com`/`securetoken.googleapis.com` to `connect-src` (Firebase Auth's REST backend, required for any provider, not just Google/GitHub, to work at all under a restrictive CSP). Both are grounded in Firebase's own documented behavior, and the COOP value is confirmed working in local dev (`vite.config.js`'s dev-server headers, which mirror this). What's **not yet verified**: whether the Google/GitHub popup flow needs additional `frame-src`/`connect-src` entries for their own domains once actually deployed behind this CSP — popups aren't always governed by the opener page's CSP the same way `fetch` calls are, so this may already be sufficient, but it hasn't been tested against a real production CSP-enforcing host yet. Verify the actual popup flow once a host is chosen, before assuming this is complete.
- Scaling and infrastructure (Redis, load balancing, real load testing) were explicitly discussed and deferred — this project's current in-memory-per-process design (rate limiting, Django's dataset cache) is adequate at current scale but would need real infrastructure work before handling significant concurrent, multi-process traffic. Not started, deliberately, until there's a concrete reason to expect that load.
- DPDP Act compliance is an ongoing posture, not a completed checkbox — the audit trail (Sub-phase 9) was built with its retention requirement in mind, but a real compliance review with an actual lawyer hasn't happened and shouldn't be treated as implied by anything in this document.

## Related documentation

- [ADR-0006: Session & Token Security Architecture](../architecture/adr/ADR-0006-session-and-token-security-architecture.md) — the formal record of the `tokenVersion`/refresh-tokens-as-non-goal decision from Sub-phase 2
- [`docs/architecture/request-lifecycle.md`](../architecture/request-lifecycle.md) — the `/predict` request traced end-to-end, including the security controls added during this pass
- [`docs/deployment/environment-variables.md`](../deployment/environment-variables.md) — every environment variable this project reads, including the security-relevant ones added during hardening (`INTERNAL_API_KEY`, `CORS_ALLOWED_ORIGINS`)
- [`docs/api/endpoint-reference.md`](../api/endpoint-reference.md) — per-endpoint detail, including rate limits and the `/logout-everywhere` endpoint added during Sub-phase 2
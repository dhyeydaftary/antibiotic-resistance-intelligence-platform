# Security Policy

## Reporting a Vulnerability

This is currently a 3-person academic team project, not a production system with a formal disclosure program. If you find a security issue, contact the project owner directly — see the [root README's Contact section](README.md#contact) for the current primary contact; [`.github/CODEOWNERS`](.github/CODEOWNERS) remains the authoritative reference for per-area ownership. There is no bug bounty and no formal SLA on response time at this project's current stage; a genuine vulnerability report will still be taken seriously and addressed.

Please avoid publicly disclosing a vulnerability before the project team has had a reasonable opportunity to investigate and address it.

## What's Actually In Scope

Given this project's real security posture, documented honestly rather than idealized:

- **Application-layer issues** in the gateway (Node/Express) and ML backend (Django) — authentication bypass, injection vectors, data exposure across users — are in scope and worth reporting.
- **Infrastructure/deployment security** is still not fully applicable — there is no production deployment yet. Several settings are deliberately placeholder/deploy-time-only until a real hosting platform is chosen (the gateway's `trust proxy` value, HSTS `preload`, the frontend's CSP `connect-src`) — see [`docs/security/threat-model.md`](docs/security/threat-model.md) for exactly which ones and why. The frontend's `Cross-Origin-Opener-Policy` and the Firebase-required CSP additions are already in place and locally verified, but not yet tested against a real production host — see the same section for what specifically still needs confirming once one is chosen. Reporting these as findings isn't necessary; they're already known, tracked, and explained.

## Current Security Posture — Verified, Not Assumed

This section states what's actually true about this codebase's security today, cross-checked against [`docs/security/threat-model.md`](docs/security/threat-model.md) and real commit history — not a generic security-policy template.

This project completed a full, deliberate security hardening pass — thirteen sequential sub-phases plus two emergency hotfixes, each following the same discipline: a repository-aware audit first, findings verified against actual code (not assumed), explicit approval before any change, and real verification afterward, usually by reproducing the vulnerable behavior before the fix and confirming it closed after. The complete, detailed account — organized sub-phase by sub-phase, with what was found, what was fixed, and what was deliberately left alone and why — lives in [`docs/security/threat-model.md`](docs/security/threat-model.md). This file is a summary; that one is the authoritative source.

**Authentication:** Firebase-backed sessions (password, Google, GitHub sign-in), with the Gateway issuing its own downstream session JWT and retaining server-side revocation via a `tokenVersion` mechanism — see [ADR-0005](docs/architecture/adr/ADR-0005-firebase-auth-migration.md) for the full layered design and [ADR-0006](docs/architecture/adr/ADR-0006-session-and-token-security-architecture.md) for why that mechanism itself is unchanged, not superseded. Password policy, email verification, and login lockout are now Firebase's own responsibility. Single flat user type by design — no RBAC, no admin panel, two-factor authentication beyond Firebase's own account security is deferred, not implemented. These remain documented, deliberate scope decisions, not oversights.

**The most serious individual finding across the entire hardening pass: a confirmed remote-code-execution vulnerability** in a PDF-processing dependency (`pdfminer.six`, pulled in transitively via `pdfplumber`), directly reachable through the live PDF report upload feature. Found via a real dependency vulnerability scan, not incidentally — fixed by upgrading the dependency chain, verified via a clean re-scan and a full functional re-test of the feature it protects. Full detail in [`docs/security/threat-model.md`](docs/security/threat-model.md)'s Dependency Security section.

**Rate limiting, structured logging, and dependency-vulnerability scanning all now exist**, contrary to what earlier versions of this document said:

- Every route on both the auth and prediction API surfaces sits behind a per-endpoint rate limit (tiered by cost and risk — tighter on routes that trigger real external cost, like Gemini or PubMed calls).
- A persistent, timestamped `SecurityEvent` audit trail records every session exchange (success and failure) and logout-everywhere event — not just console output, a real MongoDB collection, write-only, never storing anything sensitive.
- `pip-audit` and `npm audit` are both integrated as part of this project's regular workflow (see [`docs/deployment/command-reference.md`](docs/deployment/command-reference.md)), and the current dependency set is confirmed clean as of the most recent scan.

**A real, automated, re-runnable test suite exists** — 69 tests across the gateway (Node's built-in test runner, 63 currently passing — the remaining 6 are pre-existing, environmental failures unrelated to authentication) and Django (its own built-in test framework), covering authentication flows, authorization, and the specific regression-prone findings from every hardening sub-phase, so a future change that accidentally reintroduces a previously-fixed issue gets caught automatically rather than relying on anyone remembering to re-verify by hand. The gateway count dropped from an earlier 98 following the [Firebase migration (ADR-0005)](docs/architecture/adr/ADR-0005-firebase-auth-migration.md) — not a coverage cut, but the removal of tests for mechanisms (OTP boundaries, a specific lockout-reset regression) that no longer exist in this app's code.

**Known, documented gaps** (not hidden, not claimed as fixed — see [`docs/security/threat-model.md`](docs/security/threat-model.md)'s "Known, accepted residual gaps" section for the complete list with reasoning):

- ~~A narrow account-enumeration edge case on one endpoint (`/resend-otp`'s response for an already-verified account)~~ — moot as of the [Firebase migration (ADR-0005)](docs/architecture/adr/ADR-0005-firebase-auth-migration.md); this endpoint no longer exists.
- A `react-router` dependency advisory that's confirmed not to apply to this app's actual usage, but the underlying dependency itself is still behind a major version.
- Several deploy-time-only settings that can't be finalized until a real hosting platform is chosen.
- Scaling/infrastructure work (Redis, load balancing, real load testing) is explicitly deferred — this project's current design is adequate at its current scale, but hasn't been built out for significant concurrent, multi-process traffic, and there's no plan to do so until there's a concrete reason to expect that load.

## Dependencies

`pip-audit` (Python) and `npm audit` (both Node projects) are used to scan for known vulnerabilities. This is currently a manual step run as part of the regular development workflow, not yet wired into an automated CI pipeline — a CI/CD pipeline that runs both automatically on every change is tracked as planned work, not yet built.

## Related Documentation

- [`docs/security/threat-model.md`](docs/security/threat-model.md) — the authoritative, complete account of this project's security posture: every hardening sub-phase, every finding, every fix, and every known residual gap
- [`docs/data/known-limitations.md`](docs/data/known-limitations.md) — this project's scope decisions and genuine gaps outside the security domain specifically
- [`docs/architecture/adr/`](docs/architecture/adr/) — architectural decisions that touch security-relevant tradeoffs, including [ADR-0006](docs/architecture/adr/ADR-0006-session-and-token-security-architecture.md) on session/token revocation
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — general contribution workflow
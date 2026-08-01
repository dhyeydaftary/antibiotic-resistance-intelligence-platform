# Security Policy

## Reporting a Vulnerability

This is currently a 3-person academic team project, not a production system with a formal disclosure program. If you find a security issue, contact the project owner directly — see the [root README's Contact section](README.md#contact) for the current primary contact; [`.github/CODEOWNERS`](.github/CODEOWNERS) remains the authoritative reference for per-area ownership. There is no bug bounty and no formal SLA on response time at this project's current stage; a genuine vulnerability report will still be taken seriously and addressed.

Please avoid publicly disclosing a vulnerability before the project team has had a reasonable opportunity to investigate and address it.

## What's Actually In Scope

Given this project's real security posture, documented honestly rather than idealized:

- **Application-layer issues** in the gateway (Node/Express) and ML backend (Django) — authentication bypass, injection vectors, data exposure across users — are in scope and worth reporting.
- **Infrastructure/deployment security** is explicitly **not yet in scope** — there is no production deployment yet, and [`docs/data/known-limitations.md`](docs/data/known-limitations.md) already documents that a full threat model is planned only once production deployment itself is scoped. Reporting "no rate limiting" or "no production hardening" isn't necessary; it's already a known, tracked gap, not a surprise.

## Current Security Posture — Verified, Not Assumed

This section states what's actually true about this codebase's security today, cross-checked against [`docs/data/known-limitations.md`](docs/data/known-limitations.md) and real commit history — not a generic security-policy template.

**Authentication:** JWT-based sessions, bcrypt-hashed passwords, email/OTP verification for signup and password reset. Single flat user type by design — no RBAC, no admin panel, two-factor authentication beyond signup/reset OTP is deferred, not implemented. These are documented, deliberate scope decisions for the current release, not oversights.

**Two real security fixes already shipped**, verifiable in git history (commit `acf3d20`, *"sanitize error messages and validate auth input types"*):
- **NoSQL injection defense** — every auth route now explicitly checks `typeof email === 'string'` (and similarly for `name`, `password`, `code`) before using the value in a MongoDB query. Without this, a client could pass a JSON object (e.g. `{"$ne": null}`) instead of a string for `email`, potentially altering query semantics — a classic NoSQL injection vector. This is closed, not theoretical.
- **Error message sanitization** — `catch` blocks across `auth.js`, `prediction.js`, and Django's `views.py` no longer return raw `err.message` to the client; they return a fixed, generic message and log the real error server-side instead. Raw exception messages can leak internal implementation details (stack traces, library names, field structure) to anyone who can trigger an error.

**Known, documented gaps** (not hidden, not claimed as fixed):
- No rate limiting, structured logging, or error-monitoring tooling in the gateway.
- No automated test suite in any of the three services — see `known-limitations.md` for exactly what does and doesn't exist.
- Email delivery is sandbox-tier (Resend's default sender restricts delivery to the account holder's own address) — a scoping decision appropriate for this project's current stage, not a production configuration.

## Dependencies

No automated dependency-vulnerability scanning (e.g. Dependabot, `npm audit` in CI) is currently configured. This is a real gap, consistent with the "no CI/CD documentation yet" state of the project — not a claim that dependencies are actively monitored.

## Related Documentation

- [`docs/data/known-limitations.md`](docs/data/known-limitations.md) — the authoritative, verified account of this project's scope decisions and genuine gaps, security and otherwise
- [`docs/architecture/adr/`](docs/architecture/adr/) — architectural decisions that touch security-relevant tradeoffs (e.g. [ADR-0001](docs/architecture/adr/ADR-0001-three-service-architecture.md) on why auth lives in the gateway, not Django)
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — general contribution workflow
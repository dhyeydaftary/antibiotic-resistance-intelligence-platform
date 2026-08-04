---
title: "ADR-0006: Session & Token Security Architecture"
category: architecture
last_updated: 2026-08-04
owner: dhyeydaftary
review_frequency: on-auth-architecture-change
---

# ADR-0006: Session & Token Security Architecture

## Status

Accepted.

## Context

AMR-Insight authenticates users with a JWT issued at login, sent by the frontend on every subsequent request via the `Authorization` header. Before the Session & Token Security sub-phase of the security hardening pass, that JWT had no way to be invalidated before its own expiry — a stolen token, or a token that should have died the moment its owner reset their password, remained fully valid for the rest of its natural lifetime regardless of anything that happened to the account in the meantime. This ADR records the decision made to close that gap, and — just as importantly — the decision made *not* to solve it with a refresh-token architecture, since that alternative was seriously considered, not dismissed by default.

## Decision

**A `tokenVersion` counter on `User`, embedded in every issued JWT and checked against the current stored value on every authenticated request**, rather than a refresh-token flow.

Mechanically: `tokenVersion` starts at `0` for every account. Every JWT carries the value that was current at the moment it was signed. `verifyToken.js` — the middleware every protected route passes through — looks the user up and rejects the request if the token's `tokenVersion` doesn't match the account's current value, even if the JWT's signature and expiry are both otherwise perfectly valid. Bumping the counter is a single database write with no other side effects, and it instantly invalidates *every* token issued before that point — there's no need to track individual tokens, maintain a blacklist, or know which devices or sessions exist.

The table below covers what's actually implemented today — see [Consequences](#consequences) for events that were designed for but aren't built yet.

| Event | `tokenVersion` incremented? |
|---|---|
| Login (correct credentials) | No — a login doesn't invalidate other sessions, it just issues a new token under the current version |
| Password reset (`/reset-password`) | Yes |
| Logout everywhere (`POST /logout-everywhere`) | Yes — including invalidating the very token used to make this call |

**JWT lifetime is also tied to the login-time "remember me" choice** — 24 hours if unchecked, 7 days if checked — rather than a flat duration regardless of that signal, since the flag already existed in the UI but wasn't actually affecting how long the resulting token stayed valid.

## Alternatives Considered

**Refresh tokens — seriously considered, explicitly rejected.** A conventional refresh-token architecture (short-lived access token, longer-lived refresh token, a dedicated refresh endpoint, rotation on use) is the more commonly reached-for solution to this exact problem, and it was evaluated on its merits, not dismissed for being unfamiliar. It was rejected for this project specifically because:

- It solves session *longevity with reduced exposure window* more than it solves *revocation on demand* — and revocation on demand (kill this session right now, because of a password reset or an explicit logout-everywhere) was the actual problem this project needed to solve.
- A refresh token needs its own revocation story to be secure at all (otherwise a stolen refresh token is just as permanent a problem as a stolen access token, one layer removed) — which in practice means implementing something functionally equivalent to `tokenVersion` anyway, just for a second token type, plus the added surface area of a new endpoint, rotation logic, and reuse-detection to guard against a stolen refresh token being used after the legitimate client has already rotated past it.
- Given this project's actual scale and threat model (a research/education platform, not a system defending against sophisticated, sustained token-theft campaigns), that additional complexity wasn't buying proportionate security value over the simpler mechanism.

**A blacklist of revoked tokens (or their JWT IDs).** Considered and rejected in favor of `tokenVersion` specifically because a blacklist's storage grows with every revocation event and needs its own cleanup mechanism (a TTL index matching token expiry) to avoid growing unboundedly — `tokenVersion` stores exactly one integer per user, with no separate collection and no cleanup job, and every event this project actually needs to handle ("kill everything for this user," never "kill this one specific token and leave the others") maps naturally onto a single counter rather than per-token tracking.

**Leaving `verifyToken` as a stateless, pure-cryptographic check (no database lookup at all).** This was the state before this decision — the fastest possible check, but with no revocation capability whatsoever. Rejected because the actual gap (a password reset not killing existing sessions) was a real, user-facing security concern, not a theoretical one, and the cost of adding one database lookup per authenticated request was judged acceptable at this project's scale.

## Consequences

- `verifyToken` is no longer a pure, stateless cryptographic check — it now does one database read per authenticated request (a lookup by the JWT's own `userId` claim, an operation that's already indexed). This is a deliberate trade-off, not an oversight: revocation capability was judged worth the cost at this project's current scale.
- Every JWT now carries `tokenVersion` as an additional claim, alongside `userId`. No other data is embedded in the token — deliberately, so a leaked/decoded JWT (JWTs are base64-encoded, not encrypted) reveals nothing sensitive beyond an internal user ID and a version counter.
- `POST /logout-everywhere` exists as a real, usable endpoint (verified during the Security Testing sub-phase — a token used to call it is itself correctly invalidated as a result of the call) but has no frontend UI wired up to it yet — a deliberate scope boundary, not an oversight; building the button is a product decision, not a security-hardening one.
- The `tokenVersion` mechanism was deliberately designed as a general-purpose "invalidate every session for this user" primitive, not something narrowly wired only to the two events currently implemented. Password change (while already logged in), email change, and any future administrator-initiated account action are all designed to follow the exact same one-line pattern (increment the counter, save) — none of these three features exist in the codebase yet, so none of them currently bump `tokenVersion`, but the mechanism is ready for them without needing its own redesign whenever they're built.
- Refresh tokens remain a documented non-goal, not a "maybe later" — if this project's scale or threat model changes meaningfully (e.g. moving toward handling real, sensitive clinical data rather than research/education use), this decision should be explicitly revisited rather than assumed to still hold.

## Related Documentation

- [`docs/security/threat-model.md`](../../security/threat-model.md) — Sub-phase 2 (Session & Token Security) in the full security hardening account, including how this decision fits alongside the account-lockout and audit-logging work built later in the same overall pass
- [`docs/architecture/adr/ADR-0001-three-service-architecture.md`](ADR-0001-three-service-architecture.md) — the gateway's role as the sole authenticated entry point, which is what `verifyToken`/`tokenVersion` actually protect
- [`docs/architecture/request-lifecycle.md`](../request-lifecycle.md) — `tokenVersion` shown in context as step 2 of a real, traced request
- [`docs/api/endpoint-reference.md`](../../api/endpoint-reference.md) — `POST /logout-everywhere`'s request/response shape
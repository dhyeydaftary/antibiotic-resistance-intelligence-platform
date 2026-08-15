# ADR-0005: Migrate Authentication to Firebase

## Status
Accepted

## Context

AMR-Insight's authentication has, through this project's history, been a custom-built system: bcrypt password hashing, JWT sessions with [`tokenVersion`-based revocation (ADR-0006)](./ADR-0006-session-and-token-security-architecture.md), Resend-delivered OTP email verification, and — most recently — a hand-built Direct Google OAuth integration (`google-auth-library`, server-side ID token verification) with a custom mandatory password-setup flow for new Google-created accounts.

That custom system went through a genuine, disciplined 13-phase security hardening pass, is covered by a meaningful share of the project's 98 automated tests, and every non-trivial decision inside it (`tokenVersion` over refresh tokens, the enumeration-safe response shapes, the purpose-scoped setup token for Google onboarding) is independently justified and demonstrable. This is real, audited engineering work, not boilerplate, and this document does not claim otherwise.

The decision has been made to migrate to [Firebase Authentication](https://firebase.google.com/docs/auth) — but as a **layered addition**, not a wholesale replacement. Firebase becomes this project's identity provider; the Gateway's own JWT/`tokenVersion` session layer is retained and sits downstream of it. This project is not at its final milestone — more features are expected, and an external faculty reviewer specifically noted that a healthcare-adjacent domain warrants particular care and precision in how security is handled. Retaining and building on demonstrated, defensible security engineering — rather than discarding it for a vendor default — is treated as directly relevant to that standard, not merely a preference to keep existing work.

## Decision drivers

- **Reducing project-owned, security-sensitive infrastructure for credential handling specifically.** Password verification, Google token exchange, and OTP delivery are currently implemented and maintained inside this project. Migrating that specific layer to Firebase shifts its ongoing maintenance to managed infrastructure.
- **Simplifying provider integration.** The Direct Google OAuth work required a hand-built token-verification path. Firebase treats additional providers largely as configuration rather than new integration work.
- **Reducing ongoing maintenance burden** for the credential-handling layer specifically, while keeping the application-level session/authorization layer — the part with the most project-specific reasoning behind it — under this project's own control.
- **Preserving demonstrated security engineering work where it has an active, real role**, rather than discarding it for uniformity. This is a deliberate departure from a simpler "full replacement" migration, made in light of this project's healthcare-adjacent domain and its planned continued growth.

## Alternatives considered

- **Keep the custom system as-is.** Rejected — the decision was made to introduce Firebase as the identity provider regardless (see Decision drivers), while preserving what the custom system does well.
- **Full replacement** — Firebase as both identity provider and session mechanism, retiring JWT/`tokenVersion`/bcrypt entirely (the originally accepted version of this ADR). Reconsidered and rejected: it would have discarded a working, tested, project-specific session/revocation design (ADR-0006) for no functional gain, and reduced this project's own demonstrable security-engineering surface in a domain where that surface has been identified as valuable.
- **Direct Google OAuth alongside the custom system** (implemented, then reverted in favor of this migration). Solved the specific problem of frictionless Google sign-in without touching the rest of the auth system. Real, tested, working — reverted specifically to adopt Firebase as identity provider instead, not because it failed.
- **Firebase alongside the custom system with no integration between them** (dual, unconnected auth). Rejected as added complexity for no real benefit.

## Decision

Adopt [Firebase Authentication](https://firebase.google.com/docs/auth) as AMR-Insight's **identity provider**, for password and Google authentication specifically. Retain the Gateway's own **JWT/`tokenVersion` session layer**, now issued downstream of a verified Firebase identity rather than as the sole mechanism. Remove the custom OTP/Resend email-verification system, since Firebase's own email verification covers that role. Retain bcrypt in the dependency tree without an active current role in the login flow (see Architecture boundary), available for a specific future use identified below.

## Architecture boundary

Firebase becomes AMR-Insight's **authentication authority** — it verifies *who someone is* (password or Google). The Gateway remains the **application's session and authorization authority** — once Firebase has verified an identity, the Gateway issues and manages its own session token for every actual API call, exactly as it does today. MongoDB remains the application's authoritative data store for user/profile/domain data. This is a genuine two-layer design, not a thin wrapper around Firebase: a request to any protected endpoint is authorized by the Gateway's own JWT, never a raw Firebase token.

**Login flow, concretely:** Firebase client SDK authenticates the user (password or Google) → frontend sends the resulting Firebase ID token to the Gateway **once**, at login → Gateway [verifies it via the Firebase Admin SDK](https://firebase.google.com/docs/auth/admin/verify-id-tokens) → Gateway finds-or-creates the MongoDB `User` record, associated by Firebase UID → Gateway issues its **own** JWT, carrying `tokenVersion` → the frontend uses this Gateway-issued JWT, not the Firebase token, for every subsequent request.

| Concern | Before this ADR | After this ADR |
|---|---|---|
| Password verification | bcrypt, in this project's MongoDB `User` model | Owned by Firebase |
| Google authentication | Hand-built, `google-auth-library`, server-verified in the Gateway | Owned by Firebase (configured provider) |
| OTP/email authentication | Custom, Resend-delivered | Removed — Firebase's own email verification |
| Session/API authorization token | Custom JWT, issued and verified by the Gateway | **Retained** — Gateway-issued JWT, downstream of a verified Firebase identity |
| Token revocation | Custom `tokenVersion` counter (ADR-0006) | **Retained** — same mechanism, now applied to the Gateway's downstream session token |
| bcrypt | Password hashing | No active role in login; retained for a specific future use (see below) |
| Application user/profile data | MongoDB `User` model | Remains in MongoDB, associated with the Firebase UID |
| Application authorization | Enforced in the Gateway against the custom `User` model | Enforced in the Gateway against its own JWT, as today |
| User administration | Custom | Firebase console for identity records; application-specific administration, if built, remains this project's own |

### User model migration

The MongoDB `User` record shifts from owning password-verification fields (password hash) to associating with the Firebase-issued identity (the Firebase UID). It continues to own everything the Gateway's own session layer needs — `tokenVersion` and any application-specific profile, role, and domain data. This ADR does not prescribe the exact resulting schema; that is an implementation detail to be worked out during migration, not an architectural commitment made here.

### Google-to-password flow

The custom, hand-built onboarding flow — a purpose-scoped, short-lived JWT issued after Google sign-in, exchanged for a full session once a password was set — is replaced by Firebase's native [account-linking](https://firebase.google.com/docs/auth/web/account-linking) (`linkWithCredential`) at the identity layer. Once Firebase has confirmed the linked identity, the Gateway's own downstream session issuance (JWT/`tokenVersion`) proceeds exactly as it does for any other login.

### bcrypt's retained, currently-inactive role

bcrypt has no active job in the login flow after this migration — Firebase verifies passwords directly. It is retained rather than removed because a concrete future use has been identified: hashing API keys for a planned third-party integration feature (see the project's future-features roadmap), the same well-understood pattern currently used for passwords, applied to a different secret. Until that feature exists, bcrypt is a retained dependency with a defined future purpose, not an actively used security control — stated plainly here so it is never implied to be doing something it is not.

## Consequences

**What is gained:**
- Firebase's managed authentication infrastructure for password and Google verification, with additional providers available largely as configuration
- Firebase's native [account-linking](https://firebase.google.com/docs/auth/web/account-linking) (`linkWithCredential`) backing the "set a password after Google sign-in" flow, replacing the hand-built purpose-scoped token mechanism at the identity-verification layer
- A managed console for identity records, without building one

**What is retained, deliberately, against the originally accepted version of this ADR:**
- The Gateway's own JWT/`tokenVersion` session and revocation system, with ADR-0006's reasoning still fully applicable to it
- A real, demonstrable, project-owned application-authorization layer, distinct from Firebase's identity layer

**What is given up, explicitly:**
- The custom OTP/Resend email-verification system in its entirety — no repurposing, fully removed
- The Direct Google OAuth token-verification implementation (`google-auth-library`) and the identity-verification portion of its onboarding flow — both real and tested, superseded by Firebase at the identity layer specifically

**Testing consequences:**
- Tests covering removed mechanisms (OTP generation/delivery/verification, the `google-auth-library` token-verification path, the purpose-scoped setup-token flow) become obsolete and should be removed or replaced, not left in place against code that no longer exists.
- Tests covering the Gateway's JWT issuance and `tokenVersion` revocation remain relevant and should be adapted to the new entry point (Firebase-verified identity in, Gateway session out) rather than discarded.
- New coverage is required for: Firebase ID token verification in the Gateway, handling of expired or invalid Firebase tokens, the find-or-create/association step against the Firebase UID, and confirming the Gateway's downstream session issuance behaves identically regardless of which Firebase-supported method authenticated the user.
- This migration does not reduce the need for authentication testing at either layer.

**Real, concrete migration scope:**
- Gateway: `routes/auth.js` restructured (Firebase token verification replaces password/Google/OTP handling; JWT/`tokenVersion` issuance logic retained), `User` model's password/OTP fields removed in favor of a Firebase UID association, `verifyToken` middleware largely unchanged (still verifies the Gateway's own JWT), `SecurityEvent` logging updated for the new event set
- Frontend: `AuthContext`, `LoginPage`, `SignupPage`, all API calls in `authApi.js`, the Firebase client SDK integration
- Documentation: this ADR, `docs/security/threat-model.md`'s authentication section, `docs/architecture/high-level-architecture.md`, `SECURITY.md`, `docs/api/endpoint-reference.md`

## Related
- [ADR-0001](./ADR-0001-three-service-architecture.md) (three-service architecture) — unaffected; Firebase becomes the identity provider, MongoDB remains the application's authoritative data store for everything else
- [ADR-0006](./ADR-0006-session-and-token-security-architecture.md) (session/token security, `tokenVersion`) — **not superseded.** Its reasoning and decision are retained and now apply to the Gateway's downstream session layer specifically, issued after a Firebase-verified identity rather than after direct password/OTP verification. ADR-0006 itself is not modified.
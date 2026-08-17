---
title: "ADR-0007: Combined Deployment Topology for Gateway and ML Backend"
category: architecture
last_updated: 2026-08-17
owner: dhyeydaftary
review_frequency: on-deployment-topology-change
---

# ADR-0007: Combined Deployment Topology for Gateway and ML Backend

## Status

Accepted.

## Context

[ADR-0001](ADR-0001-three-service-architecture.md) establishes AMR-Insight as three independent services — frontend, gateway, ML backend — and that remains true at the code level; this ADR does not revisit it. What it does address is a problem specific to *hosting* that architecture: the actual production deployment needed `gateway` and `ml-backend` to run as two separately-addressable services on Render, communicating over the network the way they do locally via `docker-compose`.

That didn't work. Render appears to route inter-service traffic between its own services over a private network by default that free-tier services can't receive on. This wasn't assumed from a single failure — it was investigated directly:

- Identical requests to `ml-backend`'s public URL succeeded consistently when sent from an external source (a local machine, via `curl`).
- The same requests, sent from `gateway` to `ml-backend` over Render's internal routing, failed 100% of the time with a Render-generated 502 carrying the response header `x-render-routing: no-deploy` — a signal from Render's own edge, not an application-level error from Django.
- A temporary diagnostic route was added to `gateway` (`debug: temporary diagnostic route`) specifically to compare a direct-from-gateway call against the already-confirmed-working external call under identical conditions, then removed immediately after the comparison confirmed the pattern (`Revert "debug: temporary diagnostic route"`).
- The failure was reproducible on every attempt, across both a cold and an already-warm `ml-backend` instance, ruling out cold-start latency as the cause.

The conclusion: this is Render's free-tier network topology, not a bug in either service.

## Options Considered

| Option | Why not adopted |
|---|---|
| Upgrade `ml-backend` to a paid Render tier | Would resolve the routing restriction directly, but is a recurring cost outside this project's free-tier budget. |
| Move `ml-backend` to a different free platform (e.g. PythonAnywhere) | Investigated and rejected: PythonAnywhere's free tier blocks the outbound API calls this app needs (Gemini, PubMed) and imposes compiled-package/CPU constraints incompatible with CatBoost's workload. |
| Move `ml-backend` to a different free platform (e.g. Railway) | Investigated and rejected: Railway's "free" tier is a 30-day trial, not a durable free tier — it would eventually require the same paid-upgrade decision as staying on Render. |
| Move `gateway` to Vercel serverless functions | Investigated and rejected: Vercel's free-tier function timeout (10 seconds) would collide with Render's own documented free-tier cold-start delay (50+ seconds) on `ml-backend` — a gateway function would routinely time out waiting on a cold Django instance before it finished booting. |
| Merge `gateway` and `ml-backend` into one Render service | **Adopted.** Eliminates the network call between the two services entirely, so Render's inter-service routing restriction never applies. No paid tier, no platform migration, no timeout mismatch. |

## Decision

Deploy `gateway` and `ml-backend` together as a single Render Web Service, built from a new `combined/Dockerfile` that runs both processes — gunicorn serving Django, and node serving Express — under `supervisord` in one container. The two processes communicate over `127.0.0.1` instead of a Render-routed network call. Gunicorn binds to `127.0.0.1:8000` (loopback-only, never reachable from outside the container); node remains the only process bound to a publicly reachable interface.

`gateway/` and `ml-backend/` themselves are unchanged by this decision — same source code, same standalone `Dockerfile` in each directory, same local `docker-compose` workflow with the services running independently. Only the production deployment topology differs from what those two standalone Dockerfiles would produce if deployed as-is; nothing about how the two services are built, tested, or run locally changed.

## Consequences

- `ml-backend`'s Django process is no longer independently network-reachable at all in production — it only ever receives requests from `gateway` over loopback inside the same container. This is a genuine security improvement over the two-separate-services picture ADR-0001 describes: `INTERNAL_API_KEY` (the service-to-service trust boundary between gateway and Django) becomes defense-in-depth rather than the sole barrier protecting `ml-backend` from being called directly.
- The two services can no longer be scaled or restarted independently in production — they live and die together as one container, one deploy, one process supervisor. Locally, via `docker-compose`, they remain fully independent.
- `ml-backend`'s `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS` environment variables are now effectively inert in production: nothing external ever addresses `ml-backend` directly, so the host/origin checks those variables configure have no traffic to act on. They're left in place rather than removed, since they still apply to local, non-combined runs.
- This is a deployment-topology decision, not an architectural reversal. ADR-0001's three-service split — and the reasoning behind it — still describes the codebase accurately. A reader relying on ADR-0001 alone would reasonably expect two separately-addressable backend services in production; this ADR exists so that gap between code-level architecture and deployed topology is documented rather than discovered by surprise.

## Related Documentation

- [ADR-0001: Three-Service Architecture](ADR-0001-three-service-architecture.md) — the code-level architecture this ADR's decision sits on top of, not a replacement for
- Root [`README.md`](../../../README.md#system-architecture) — carries a short pointer to this ADR alongside the System Architecture section, for a reader who only reads the README

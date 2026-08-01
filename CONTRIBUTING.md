# Contributing to AMR-Insight

This document describes the real, currently-practiced workflow for this project — not an aspirational process. Everything here is already in use; this file exists so it's written down rather than living only in the team's shared habit.

## Team and Ownership

Current per-area ownership is authoritative in [`.github/CODEOWNERS`](.github/CODEOWNERS), not restated here — that file is the single source of truth for who owns what, so it doesn't drift out of sync with a second copy. See the root [`README.md`](README.md#team) for role context.

**Doc-ownership succession:** if the team's composition changes (e.g. after graduation), ownership of `docs/` and root-level documentation should be explicitly reassigned in `CODEOWNERS` rather than left pointing at someone no longer active on the project — this is exactly the kind of thing that silently breaks in real projects if nobody states it as a rule.

## Branching

Work happens on a topic branch off `dev` — never directly on `dev` or `main`. Two prefixes, chosen by what the branch actually contains:

- `feature/description` — code changes (e.g. `feature/history-page-filters`)
- `docs/description` — documentation-only changes (e.g. `docs/foundation-suite`, `docs/reference-suite`)

Related documentation files that land together as one unit can share a single branch and a single review pass, with individual commits per file — this repo's own `docs/` build followed that pattern rather than one branch per file.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/) style — `type(scope): summary`. For example:

```
docs: add synthetic feature methodology
fix(gateway): close NoSQL injection vector in history filters
```

Common types: `feat`, `fix`, `docs`, `refactor`, `chore`.

## Pull Requests and Merging

PRs target `dev`. `dev` merges to `main` only at real milestones (a feature freeze, a tagged release) — never as routine flow. There is currently no formal PR template or required-reviewer process beyond the owning area's CODEOWNERS entry; a PR is reviewed by whoever owns the area it touches.

After a topic branch has been successfully merged into `dev`, delete it unless it is still required for ongoing work.

## Decisions

Anything non-trivial and hard to reverse gets an [Architecture Decision Record](docs/architecture/adr/) — sequential, zero-padded, `ADR-NNNN-kebab-title.md`, and never renumbered or reused even if a later ADR supersedes it. The acting owner of the relevant area approves. This project's own ADRs (`ADR-0001` through `ADR-0004`) are the reference examples for what "non-trivial and hard to reverse" means in practice, and for the evidence standard every ADR is expected to meet — see [`docs/architecture/adr/`](docs/architecture/adr/).

## Versioning

Two separate versioning concerns exist in this project, tracked differently:

- **Model artifacts** — versioned directly in the filename (`catboost_<antibiotic>_v2.pkl`, `_v3.pkl`), kept side by side on disk for rollback and comparison. See [`docs/data/synthetic-feature-methodology.md`](docs/data/synthetic-feature-methodology.md) for the schema history behind these versions.
- **Releases** — tracked in [`docs/releases/version-history.md`](docs/releases/version-history.md); not yet a formal semantic-versioning scheme at this project's current stage.

## Documentation Standards

If you're contributing documentation rather than code, the standards this project already holds itself to are worth matching:

- Every factual claim should be verifiable against actual code, data, or git history — not inferred or assumed. Where something can't be verified, say so explicitly rather than presenting a guess as fact.
- Forward-links to not-yet-written documents are fine; broken links to files that don't exist and were never planned to are not — check before committing.
- One authoritative home per concept — if two documents would otherwise say the same thing, one should state it and the other should link to it, not duplicate it.
- Diagrams follow [`docs/diagram-plan.md`](docs/diagram-plan.md)'s existing recommendations and [`docs/assets/diagrams/README.md`](docs/assets/diagrams/README.md)'s styling system — check both before adding a new one.

## Not Yet Open to External Contributors

This is currently a 3-person team project, not accepting outside contributions. This document exists to keep the team's own workflow consistent and written down, and to be ready if that changes later — not because external PRs are expected soon.

Team members working on the project should begin with the setup instructions in the root [`README.md`](README.md#installation) before creating a feature or documentation branch.

## Related Documentation

- [`.github/CODEOWNERS`](.github/CODEOWNERS) — authoritative per-area ownership
- [`docs/architecture/adr/`](docs/architecture/adr/) — the project's own ADRs, both as decisions and as examples of the evidence standard
- [`docs/diagram-plan.md`](docs/diagram-plan.md) and [`docs/assets/diagrams/README.md`](docs/assets/diagrams/README.md) — diagram conventions
- Root [`README.md`](README.md#development-workflow) — the same workflow, summarized for a first-time reader
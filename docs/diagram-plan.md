---
title: Diagram Plan
category: architecture
last_updated: 2026-07-31
owner: dhyeydaftary
review_frequency: on-doc-set-change
---

# Diagram Plan

## 1. Executive Summary

This is a planning document only — no diagrams are generated here. It audits every documentation file in AMR-Insight's planned and existing documentation set (per the Documentation Master Blueprint, the internal planning document this project's structure was built from — not itself part of this repository) and recommends, file by file, whether it needs a Claude-generated conceptual diagram, a Mermaid technical diagram, both, or neither.

Of roughly 40 files audited: **3 already have the diagrams they need** (root README, ADR-0001), **~18 genuinely benefit from a new diagram**, and **~19 are correctly diagram-free** — reference tables, lists, and prose that a diagram would only decorate, not clarify. That split is deliberate: this plan follows the standing rule that a diagram must earn its place, not fill space.

## 2. Diagram Philosophy

Two diagram types serve two different jobs, and neither substitutes for the other:

- **Claude (presentation-quality) diagrams** explain a *concept* — architecture at a glance, a before/after comparison, why something exists, how pieces relate. A reader should grasp the idea in seconds, not study it.
- **Mermaid diagrams** explain an *implementation* — a request lifecycle, a sequence of calls, a decision flowchart, a data pipeline. They're maintained alongside the code they describe, and precision matters more than visual polish.

**A single concept gets one authoritative diagram**, in whichever format fits it, not two competing versions. Where both a concept and its implementation are worth documenting, they go in *different documents* — a decision record gets the Claude diagram (or none), and the implementation doc it points to gets the Mermaid diagram. This plan corrects two places earlier in this project where that separation blurred (noted inline below) rather than let a diagram get duplicated across an ADR and its implementation doc.

**No diagram is recommended solely because a file is long.** Glossaries, reference tables, changelogs, and limitation lists stay text — a diagram would misrepresent flat, lookup-oriented content as a system with relationships to trace.

---

## 3. File-by-File Recommendations

### Root Documentation

#### File

```
README.md
```

##### Recommendation

Both (Mermaid already present; one Claude diagram recommended as an addition)

##### Reason

The current-state Mermaid architecture diagram is correct and stays. What's missing is a fast, conceptual answer to "what does this tool actually do" — the Prediction Workflow section is currently prose-only, and a first-time visitor (recruiter, professor) shouldn't have to read a paragraph to picture the core loop.

##### Suggested Diagram (Claude)

- **Title:** Prediction workflow at a glance
- **Type:** Conceptual flow / big-picture
- **Shows:** Patient/clinical input → 15 parallel per-antibiotic predictions → explainable output (result + confidence + AWaRe tier), as one clean visual, no implementation detail
- **Why it helps:** Turns the Prediction Workflow section's prose into something scannable in under five seconds, without duplicating the technical sequence diagram planned for `request-lifecycle.md`

---

#### File

```
docs/README.md
```

##### Recommendation

None

##### Reason

This is a role-based navigation index (the reader-type table). Its entire job is routing readers to the right document quickly; a diagram would add a visual step between the reader and the table that already does this well.

---

#### File

```
docs/faq.md
```

##### Recommendation

None

##### Reason

Question-and-answer content is inherently textual. Nothing here describes a process or relationship a diagram would clarify.

---

### Product Documentation

#### File

```
docs/product/vision.md
```

##### Recommendation

None

##### Reason

The core content — mission and explicit non-goals ("not a clinical decision-support system") — is a single sharp distinction best made in one direct sentence. A diagram would inflate a one-line boundary into something that looks like it needs unpacking.

---

#### File

```
docs/product/problem-statement.md
```

##### Recommendation

Claude Diagram

##### Reason

This document exists to make a reader feel the clinical problem before explaining the solution — a classic "big-picture understanding" job, not an implementation detail.

##### Suggested Diagram (Claude)

- **Title:** Why empirical antibiotic choice is hard
- **Type:** Conceptual / before-context storytelling
- **Shows:** The timing gap — infection presents → clinician must choose an antibiotic now → culture results return days later — with AMR-Insight positioned at the decision point
- **Why it helps:** Makes the problem statement felt, not just read, in the first few seconds of the document

---

#### File

```
docs/product/personas.md
```

##### Recommendation

None

##### Reason

Personas are best served by a table or short cards (role, goals, pain points) — a relationship diagram would imply connections between personas that don't exist.

---

#### File

```
docs/product/user-stories.md
```

##### Recommendation

None

##### Reason

"As a [user], I want [goal]" statements are irreducibly textual; there's no structure here a diagram would clarify.

---

#### File

```
docs/product/functional-requirements.md
```

##### Recommendation

None

##### Reason

Requirements are a checklist, not a process — a table (requirement, priority, status) serves lookup better than any diagram would.

---

#### File

```
docs/product/non-functional-requirements.md
```

##### Recommendation

None

##### Reason

Same reasoning as functional requirements — a table of constraints (performance, security posture, availability) isn't a diagram candidate.

---

#### File

```
docs/product/feature-specs.md
```

##### Recommendation

None

##### Reason

Individual feature flows that genuinely need a diagram (PDF extraction, prediction lifecycle) already have a more appropriate home in `docs/ai/` and `docs/architecture/`. Diagramming them again here would duplicate content this plan is explicitly trying to avoid duplicating.

---

#### File

```
docs/product/roadmap.md
```

##### Recommendation

Claude Diagram

##### Reason

A roadmap is fundamentally about relative timing and sequence, which a timeline visual communicates faster than a table of dates — this is the one product document where "big-picture understanding" genuinely applies.

##### Suggested Diagram (Claude)

- **Title:** Project roadmap at a glance
- **Type:** Timeline
- **Shows:** Major milestones in sequence (not implementation order labels — see the project's own rule against phase tags in documentation)
- **Why it helps:** A reader can see what's done, in progress, and ahead without parsing a table

---

#### File

```
docs/product/success-metrics.md
```

##### Recommendation

None

##### Reason

Metric/target/current-value content is a table by nature — a diagram adds a layer between the reader and the numbers they came to check.

---

### Architecture Documentation

#### File

```
docs/architecture/system-context.md
```

##### Recommendation

Claude Diagram

##### Reason

This document's entire purpose (a C4-style Context view — AMR-Insight as one box against the external world: users, Gemini, PubMed, Kaggle data) is conceptual by definition. Implementation-level detail belongs one level down, in `high-level-architecture.md` — putting Mermaid here would blur that boundary.

##### Suggested Diagram (Claude)

- **Title:** AMR-Insight in context
- **Type:** Before/after — external relationships
- **Shows:** AMR-Insight as a single box, with users, Gemini, PubMed, and the Kaggle dataset as external actors/systems around it — no internal service detail
- **Why it helps:** Establishes scope before any document dives into the three-service internals

---

#### File

```
docs/architecture/high-level-architecture.md
```

##### Recommendation

Mermaid Diagram

##### Reason

This is the container-level detail `system-context.md` deliberately omits — the three services and how they relate. It must not simply repeat the README's diagram (already flagged as a duplication risk in ADR-0001); it should go one level more detailed, since that's this document's actual job.

##### Suggested Diagram (Mermaid)

- **Type:** Flowchart / component diagram
- **Represents:** The three services with their internal responsibilities named explicitly (e.g. the gateway's six proxied routes listed individually, not grouped as "ML-backed endpoints" the way the README's diagram abbreviates them)
- **Complexity:** Medium — more nodes than the README's diagram, still single-screen
- **Placement:** Early in the document, before any prose walkthrough

---

#### File

```
docs/architecture/low-level/ (per-service detail files, not yet named)
```

##### Recommendation

Mermaid Diagram (default for any file created here)

##### Reason

By definition, anything living under `low-level/` is implementation detail — Mermaid's territory, not Claude's. No specific files exist yet to plan individually.

---

#### File

```
docs/architecture/adr/ADR-0001-three-service-architecture.md
```

##### Recommendation

Both — already complete

##### Reason

Has a Claude before/after evolution diagram and a Mermaid current-state diagram (explicitly flagged as synced with the README's copy, not independently maintained). No further work needed.

---

#### File

```
docs/architecture/adr/ADR-0002-synthetic-feature-generation-and-leakage-prevention.md (not yet written)
```

##### Recommendation

Claude Diagram

##### Reason

The decision this ADR records — conditioning synthetic features only on pre-outcome fields, after an earlier draft leaked via a resistance-derived variable — is a before/after decision story, exactly Claude's category. The detailed technical safeguard (`validate_no_leakage()`) already has a better home: see the `synthetic-feature-methodology.md` entry below, where the Mermaid version of that flow is recommended instead, to avoid the same duplication risk this plan flags elsewhere.

##### Suggested Diagram (Claude)

- **Title:** The leakage the redesign prevents
- **Type:** Before/after comparison
- **Shows:** The discarded draft (a `Resistance_Count` variable derived from the labels, feeding into several synthetic columns) beside the shipped design (synthetic columns conditioned only on pre-outcome fields)
- **Why it helps:** Makes an abstract "target leakage" concept visually obvious — a reader sees the forbidden loop, not just reads about it

---

#### File

```
docs/architecture/adr/ADR-0003-prediction-model-strategy.md
```

##### Recommendation

None (new diagram) — but embed existing assets

##### Reason

The core evidence is a benchmark comparison, and the actual comparison plots already exist as generated images (`ml-backend/experiments/model-comparison/results/plots/*.png`). Commissioning a new diagram to re-represent data that's already been charted would be redundant; the existing plots should be embedded or linked instead.

---

#### File

```
docs/architecture/adr/ADR-0004-explainability-strategy.md
```

##### Recommendation

None (new diagram) — moved

##### Reason

This ADR's key mechanism — Gemini never receiving SHAP data, with the SHAP narrative built by a separate deterministic path — is genuinely a strong Mermaid candidate. But putting it here would duplicate what belongs in `docs/ai/prompt-design-and-grounding.md`, the implementation doc this ADR already points to. Keeping this ADR diagram-free preserves the "one authoritative home" rule; see that file's entry below for where the diagram actually belongs.

---

#### File

```
docs/architecture/request-lifecycle.md (not yet written)
```

##### Recommendation

Mermaid Diagram

##### Reason

This document's entire purpose is a precise request/response trace — the canonical Mermaid sequence-diagram use case, and one the README's Prediction Workflow section (recommended for a Claude diagram above) deliberately stays conceptual to avoid pre-empting.

##### Suggested Diagram (Mermaid)

- **Type:** Sequence diagram
- **Represents:** Frontend → gateway (auth check) → Django (15 model calls, SHAP) → Gemini (insight generation) → response assembly → gateway (history save) → frontend
- **Complexity:** Medium-high — this is the most detailed sequence in the system
- **Placement:** As the document's primary content, near the top

---

### Backend Documentation

#### File

```
docs/backend/gateway/ (auth flow documentation, not yet named)
```

##### Recommendation

Mermaid Diagram

##### Reason

Signup/OTP/verify/JWT is a genuinely non-trivial multi-step sequence (per the gateway's real routes: signup, verify-otp, resend-otp, login, forgot-password, verify-reset-otp, reset-password) that's easy to describe wrong in prose and easy to get exactly right in a sequence diagram.

##### Suggested Diagram (Mermaid)

- **Type:** Sequence diagram
- **Represents:** Signup → OTP email (via Resend) → verification → JWT issuance, and the parallel forgot-password/reset flow
- **Complexity:** Medium
- **Placement:** Primary content of whichever doc covers gateway auth

---

#### File

```
docs/backend/ml-backend/ai-insights-pipeline.md (not yet written; scope narrowed to endpoint mechanics per ADR-0004)
```

##### Recommendation

Mermaid Diagram

##### Reason

This is exactly the endpoint-mechanics detail ADR-0004 deliberately excludes from itself. It's a real, precise flow (request → per-antibiotic SHAP computation → grounding-facts construction → Gemini call → response merge) that belongs here, not in the ADR.

##### Suggested Diagram (Mermaid)

- **Type:** Flowchart
- **Represents:** `/predict` request → 15 model inferences → SHAP extraction per antibiotic → aggregate grounding facts built → Gemini call → merged response
- **Complexity:** Medium
- **Placement:** After the endpoint's request/response schema, before any code walkthrough

---

#### File

```
docs/backend/ml-backend/pdf-extraction-pipeline.md (not yet written)
```

##### Recommendation

Mermaid Diagram

##### Reason

This flow has a real branch point (extraction succeeds vs. fails) that prose tends to describe ambiguously and a flowchart makes unambiguous.

##### Suggested Diagram (Mermaid)

- **Type:** Flowchart
- **Represents:** PDF upload → Gemini extraction call → success (fields populate the input form) vs. failure (user notified, manual entry required) branches
- **Complexity:** Low-medium
- **Placement:** Primary content of the document

---

### Frontend Documentation

#### File

```
docs/frontend/design-system.md
```

##### Recommendation

None

##### Reason

Design tokens, type scale, and component guidelines are reference material best shown as actual color swatches, type samples, and component screenshots — not flowchart-style diagrams. This is a real visual need, just not the kind this plan's diagram taxonomy covers.

---

### AI / LLM Documentation

#### File

```
docs/ai/llm-integration-overview.md (not yet written)
```

##### Recommendation

Claude Diagram

##### Reason

A reader landing here needs the scope in seconds: two features use Gemini (insight generation, report extraction), for different reasons, with different inputs. That's a relationship-mapping job, not an implementation detail.

##### Suggested Diagram (Claude)

- **Title:** Where Gemini is used
- **Type:** Relationship map
- **Shows:** Two independent features (prediction insights, PDF extraction) both calling Gemini, each with a one-line note on what it's used for — deliberately not showing the grounding-facts mechanism, which belongs in the next document
- **Why it helps:** Prevents a reader from assuming there's one unified "AI layer" when there are actually two distinct, separately-scoped integrations

---

#### File

```
docs/ai/prompt-design-and-grounding.md (not yet written)
```

##### Recommendation

Mermaid Diagram

##### Reason

This is the correct, single home for the decoupled-paths mechanism ADR-0004 documents at the decision level but deliberately doesn't diagram. Showing the two structurally separate paths (SHAP → deterministic text; aggregate facts → Gemini → summary) is precisely what prevents a reader from assuming Gemini ever sees feature-level data.

##### Suggested Diagram (Mermaid)

- **Type:** Flowchart (two parallel, non-intersecting paths)
- **Represents:** Path A: SHAP values → `_build_plain_explanation()` (deterministic) → feature-level narrative. Path B: aggregate outcome counts → `_build_grounding_facts()` → Gemini prompt → high-level summary. The diagram's visual point is that these paths never cross.
- **Complexity:** Medium
- **Placement:** Immediately after the document's explanation of why the two are decoupled

---

#### File

```
docs/ai/guardrails-and-limitations.md (not yet written)
```

##### Recommendation

Mermaid Diagram

##### Reason

The fallback-on-failure design (what happens when a Gemini call fails) is a real decision tree, not just a stated policy — worth making precise rather than describing in prose that could drift from what the code actually does.

##### Suggested Diagram (Mermaid)

- **Type:** Decision tree / flowchart
- **Represents:** Gemini call attempted → success path vs. failure/timeout path → rule-based fallback text generation
- **Complexity:** Low-medium
- **Placement:** Alongside the fallback-behavior explanation

---

#### File

```
docs/ai/future-ai-roadmap.md (not yet written)
```

##### Recommendation

None

##### Reason

Speculative, not-yet-built ideas shouldn't be diagrammed with the same visual authority as shipped architecture — a list is honest about what this content actually is: unbuilt possibilities, not a plan with committed shape.

---

### API Documentation

#### File

```
docs/api/openapi.yaml + endpoint reference (not yet written)
```

##### Recommendation

None

##### Reason

This is exactly the kind of content the project's own standard already prescribes a table for (method, path, auth requirement) plus the one-real-example rule already established for API docs. A diagram would add a layer between the reader and the exact information they came for. Revisit only if the API surface grows complex enough that endpoint *relationships* (not just individual routes) become worth showing.

---

### Data Documentation

#### File

```
docs/data/synthetic-feature-methodology.md
```

##### Recommendation

Both — two additions to an existing file

##### Reason

This document already contains the material for two distinct diagrams that would each genuinely help: the conditioning-relationships table is dense and hard to skim, and the leakage-prevention safeguard (currently prose) is a precise, implementation-level check that belongs here rather than in ADR-0002, per this plan's anti-duplication reasoning above.

##### Suggested Diagram (Claude)

- **Title:** What conditions what
- **Type:** Relationship map
- **Shows:** Real fields (organism, age, infection frequency, etc.) as sources, synthetic variable groups (labs, vitals, symptoms, comorbidities) as targets, with lines showing which real fields condition which synthetic groups
- **Why it helps:** The current table requires reading 10 rows to build this mental map; a diagram gives it in one glance

##### Suggested Diagram (Mermaid)

- **Type:** Flowchart
- **Represents:** `validate_no_leakage()` — generate synthetic column → encode numerically → correlate against all 15 antibiotic columns → threshold check (`|corr| > 0.15`) → pass (continue) or fail (`SystemExit`)
- **Complexity:** Low
- **Placement:** Directly under the Leakage Discovery and Fix section

---

#### File

```
docs/data/known-limitations.md
```

##### Recommendation

None

##### Reason

This is precisely the file type the project's own standard names as a default no-diagram case. Its content is a series of independent, honestly-stated facts and gaps — a diagram would imply relationships between limitations that don't exist and aren't the point.

---

#### File

```
docs/data/data-dictionary.md (not yet written)
```

##### Recommendation

None

##### Reason

A 47-feature reference table is a lookup document by design. A diagram covering 47 nodes would be unreadable and would violate the diagram-scale guidance this project follows; the table format is strictly better here.

---

### ML Documentation

#### File

```
docs/ml/model-cards.md (not yet written)
```

##### Recommendation

None (new diagram) — embed existing assets

##### Reason

Same reasoning as ADR-0003: the per-antibiotic comparison plots already exist as generated files from the benchmark experiment. This document should embed or link those rather than commission new visuals for the same data.

---

#### File

```
docs/ml/training-pipeline.md (not yet written)
```

##### Recommendation

Mermaid Diagram

##### Reason

Training 15 independent models from a shared feature matrix, with versioned artifacts (v1/v2/v3) kept side by side, is a real pipeline with distinct stages — exactly what a flowchart is for, and something prose alone tends to describe non-linearly.

##### Suggested Diagram (Mermaid)

- **Type:** Flowchart / processing pipeline
- **Represents:** Raw dataset → synthetic feature generation → feature matrix build → per-antibiotic CatBoost training loop (×15) → SHAP top-feature extraction → versioned artifact output
- **Complexity:** Medium
- **Placement:** Early in the document, as the primary visual anchor

---

### Deployment Documentation

#### File

```
docs/deployment/environment-variables.md (not yet written)
```

##### Recommendation

None

##### Reason

A variable-name/description/required-or-optional table is reference material; a diagram adds nothing a table doesn't already do better.

---

#### File

```
docs/deployment/production-deployment.md (not yet written)
```

##### Recommendation

Mermaid Diagram — deferred, content-dependent

##### Reason

A deployment topology diagram is a strong candidate in principle (hosting boundaries, where each service runs), but no real infrastructure decisions have been made yet. Diagramming a deployment that doesn't exist would misrepresent planning as fact — this recommendation should be revisited once real hosting choices exist, not acted on now.

---

#### File

```
docs/deployment/observability.md (reserved stub)
```

##### Recommendation

None — stub, no content yet

##### Reason

This file intentionally reserves a slot without content. Diagramming an empty stub isn't meaningful; revisit when it has real monitoring/logging content to represent.

---

### Security Documentation

#### File

```
docs/security/threat-model.md (not yet written)
```

##### Recommendation

Mermaid Diagram

##### Reason

A threat model's core value is showing trust boundaries precisely — where a request crosses from untrusted (browser) to trusted (gateway, then Django), and where each boundary is enforced. This is squarely a data-flow-diagram job, and one of the few document types where getting the diagram *exactly* right matters more than almost anywhere else in this project.

##### Suggested Diagram (Mermaid)

- **Type:** Data flow diagram with trust boundaries marked
- **Represents:** Browser (untrusted) → gateway (JWT boundary) → MongoDB / Django (internal trust zone) → Gemini/PubMed (external, credentialed)
- **Complexity:** Medium
- **Placement:** Early in the document, before any specific-threat prose

---

### Testing Documentation

#### File

```
docs/testing/testing-strategy.md (not yet written)
```

##### Recommendation

None — for now

##### Reason

A real, automated test suite now exists — 98 tests (84 gateway via `node:test`, 14 Django via `manage.py test`), added during the Security Testing sub-phase of the hardening pass (see [`docs/security/threat-model.md`](../security/threat-model.md)) — so the original reasoning for staying diagram-free here no longer holds. This entry should be revisited: a real CI/test-flow diagram may now be worth adding, following this plan's own diagram-selection process rather than being decided inline here.

---

### Research Documentation

#### File

```
docs/research/ (write-ups, not yet named)
```

##### Recommendation

None (general default)

##### Reason

Research write-ups are argumentative/citational prose by nature. Any individual future paper might warrant its own diagram, but there's no general case for one here.

---

### Releases Documentation

#### File

```
docs/releases/CHANGELOG.md
```

##### Recommendation

None

##### Reason

Explicitly named in this project's own diagram standard as a default no-diagram file type. A changelog is a chronological list; a diagram would add nothing.

---

#### File

```
docs/releases/milestones.md
```

##### Recommendation

Claude Diagram (optional, low priority)

##### Reason

Similar reasoning to `roadmap.md` — milestones are a timeline. Lower priority than the roadmap itself since it's a record of the past rather than a forward-looking planning aid a reader actively needs to parse quickly.

##### Suggested Diagram (Claude)

- **Title:** Milestones reached
- **Type:** Timeline
- **Shows:** Key dated milestones (feature freeze, demo, presentation) in sequence
- **Why it helps:** Marginal — mainly useful for a reader skimming project history quickly rather than reading `version-history.md` prose

---

#### File

```
docs/releases/version-history.md
```

##### Recommendation

None

##### Reason

Version-to-version change descriptions are list content; no relationship or process here needs visual representation.

---

#### File

```
docs/releases/migrations/*.md
```

##### Recommendation

None (default)

##### Reason

Migration notes are typically before/after code or config diffs, which are better shown as actual diffs than diagrams. Revisit only if a specific migration involves an actual architectural shift worth its own before/after diagram.

---

### Governance Files

#### File

```
CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md (not yet written)
```

##### Recommendation

None

##### Reason

Standard governance boilerplate — branching convention, vulnerability reporting process, conduct expectations. None of this content has a structure a diagram would clarify.

---

## 4. Estimated Number of Claude Diagrams

**7 new, 1 already complete, 1 optional/low-priority** — 9 total if the optional one is included.

| Document | Status |
|---|---|
| ADR-0001 (evolution diagram) | Already complete |
| README.md (prediction workflow) | New — recommended |
| `docs/product/problem-statement.md` | New — recommended |
| `docs/product/roadmap.md` | New — recommended |
| `docs/architecture/system-context.md` | New — recommended |
| `docs/architecture/adr/ADR-0002` | New — recommended |
| `docs/ai/llm-integration-overview.md` | New — recommended |
| `docs/data/synthetic-feature-methodology.md` | New — recommended |
| `docs/releases/milestones.md` | New — optional, low priority |

## 5. Estimated Number of Mermaid Diagrams

**10 new, 2 already complete.**

| Document | Status |
|---|---|
| README.md (system architecture) | Already complete |
| ADR-0001 (current architecture) | Already complete |
| `docs/architecture/high-level-architecture.md` | New — recommended |
| `docs/architecture/request-lifecycle.md` | New — recommended |
| `docs/backend/gateway/` (auth flow) | New — recommended |
| `docs/backend/ml-backend/ai-insights-pipeline.md` | New — recommended |
| `docs/backend/ml-backend/pdf-extraction-pipeline.md` | New — recommended |
| `docs/ai/prompt-design-and-grounding.md` | New — recommended |
| `docs/ai/guardrails-and-limitations.md` | New — recommended |
| `docs/data/synthetic-feature-methodology.md` | New — recommended (leakage flowchart) |
| `docs/ml/training-pipeline.md` | New — recommended |
| `docs/security/threat-model.md` | New — recommended |
| `docs/deployment/production-deployment.md` | New — recommended, deferred until real infra exists |

## 6. Priority Order

**High** — architecturally central, or the special-attention categories named in this task:
- `docs/architecture/request-lifecycle.md` (Mermaid)
- `docs/architecture/high-level-architecture.md` (Mermaid)
- `docs/architecture/system-context.md` (Claude)
- `docs/ai/prompt-design-and-grounding.md` (Mermaid) — closes the gap this plan found in ADR-0004
- `docs/security/threat-model.md` (Mermaid)
- `docs/data/synthetic-feature-methodology.md` additions (Both) — strengthens an already-shipped, presentation-relevant document

**Medium** — genuinely useful, not currently blocking understanding of anything already written:
- README.md prediction-workflow addition (Claude)
- `docs/architecture/adr/ADR-0002` (Claude)
- `docs/ai/llm-integration-overview.md` (Claude)
- `docs/ai/guardrails-and-limitations.md` (Mermaid)
- `docs/backend/ml-backend/ai-insights-pipeline.md` (Mermaid)
- `docs/backend/ml-backend/pdf-extraction-pipeline.md` (Mermaid)
- `docs/backend/gateway/` auth flow (Mermaid)
- `docs/ml/training-pipeline.md` (Mermaid)
- `docs/product/problem-statement.md` (Claude)

**Low** — real but not urgent, or explicitly deferred pending content that doesn't exist yet:
- `docs/product/roadmap.md` (Claude)
- `docs/releases/milestones.md` (Claude, optional)
- `docs/deployment/production-deployment.md` (Mermaid, deferred until real infra decisions exist)

## 7. Final Recommendations

1. **Fix the two duplication risks this audit found before adding anything new.** ADR-0004 and ADR-0002 should each stay diagram-free at the decision level; their natural Mermaid diagrams belong in `docs/ai/prompt-design-and-grounding.md` and `docs/data/synthetic-feature-methodology.md` respectively. Building the diagram in the wrong location first would mean moving it later.
2. **Start with the High-priority Mermaid diagrams tied to documents that don't exist yet** (`request-lifecycle.md`, `high-level-architecture.md`) — these are the two most-referenced forward links across the documents already written (README, ADR-0001, known-limitations.md all point to them), so filling them closes multiple dangling references at once.
3. **Do not build the two ADR-0003/model-cards "diagrams"** — embed the existing benchmark plots instead. Generating new visuals for data that's already been charted would be redundant work this plan explicitly recommends against.
4. **Treat `production-deployment.md`'s diagram, and `testing-strategy.md`'s diagram-free status, as decisions to revisit, not decisions made.** Both are correct only because the underlying content (real infra, a real test suite) doesn't exist yet — this plan should be re-checked against those two documents specifically once that changes.
5. **The 19 "None" recommendations are not gaps** — they're the plan working as intended. Re-litigating them individually later would undo the point of doing this audit once, carefully, now.
<div align="center">

# AMR-Insight

### AI-Powered Antibiotic Resistance Intelligence Platform

A research and education tool that predicts antibiotic resistance across 15 antibiotics from patient and lab data, using gradient-boosted models, native SHAP explainability, and WHO AWaRe classification.

[![Documentation Status](https://img.shields.io/badge/docs-in%20progress-yellow)](docs/README.md)
[![Tests](https://img.shields.io/badge/tests-98%20passing-brightgreen)](docs/security/threat-model.md)
[![Python](https://img.shields.io/badge/python-3.11%2B-blue)](ml-backend/requirements.txt)
[![Django](https://img.shields.io/badge/Django-6.0-092E20?logo=django&logoColor=white)](ml-backend/requirements.txt)
[![CatBoost](https://img.shields.io/badge/CatBoost-1.2-FFCC00)](ml-backend/requirements.txt)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](frontend/package.json)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](frontend/package.json)
[![Node](https://img.shields.io/badge/Node%2FExpress-5-339933?logo=node.js&logoColor=white)](gateway/package.json)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)](gateway/package.json)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

</div>

---

> **This is a research and education tool.** Predictions are trained on a Kaggle-sourced dataset and are **not** a clinical decision-support system. See [Known Limitations](docs/data/known-limitations.md) for what this project explicitly does not claim to be. A dedicated non-goals document is planned but not yet written.

## Project at a Glance

Numbers that don't change on retrain — anything that does (per-antibiotic accuracy/F1) is deliberately withheld here for the same reason the [Model Performance](#model-performance) section withholds it: a stale number would actively mislead.

| | |
|---|---|
| **Antibiotics predicted per request** | 15, in a single response |
| **Services** | 3 — React frontend, Node/Express gateway, Django ML backend |
| **Training dataset** | 10,710 rows, 23 source columns |
| **Automated tests** | 98 (84 gateway, 14 Django) |
| **Security hardening** | 13 sequential sub-phases + 2 emergency hotfixes, independently audited and verified at each step |
| **Confirmed vulnerabilities fixed** | Including one remote-code-execution issue in a PDF-processing dependency |
| **Explainability** | Native SHAP, per-prediction, per-feature — no external `shap` dependency |

## Table of Contents

- [Problem Statement](#problem-statement)
- [Solution](#solution)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Folder Structure](#folder-structure)
- [Screenshots / Demo](#screenshots--demo)
- [Installation](#installation)
- [Prediction Workflow](#prediction-workflow)
- [ML Pipeline](#ml-pipeline)
- [Dataset](#dataset)
- [Model Performance](#model-performance)
- [Explainable AI](#explainable-ai)
- [API](#api)
- [Security](#security)
- [Development Workflow](#development-workflow)
- [📚 Documentation](#-documentation)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Team](#team)
- [License](#license)
- [Acknowledgements](#acknowledgements)
- [Continue Exploring](#continue-exploring)

---

## Problem Statement

Antibiotic resistance (AMR) is a growing global health problem, and clinicians frequently need to choose an empirical antibiotic before culture and sensitivity results are available — a process that today relies heavily on local prescribing habits and general guidelines rather than patient-specific data. AMR-Insight explores whether patient demographics, clinical presentation, and organism identification can support that decision with a data-driven, explainable prediction — as a research and teaching artifact, not a replacement for microbiology testing or clinical judgment.

## Solution

AMR-Insight takes structured patient/clinical inputs (or an uploaded lab report, auto-parsed via an LLM extraction step) and returns a **Resistant / Susceptible / Intermediate** prediction for each of 15 antibiotics, each with a confidence score, a WHO AWaRe classification (Access/Watch/Reserve), and a native SHAP-based explanation of which clinical factors drove that specific prediction. Results are grounded against the model's own numeric outputs before being turned into natural-language insight text, specifically to prevent an LLM-generated summary from ever disagreeing with the model's actual R/S/I call.

## Features

| Feature | Description |
|---|---|
| Multi-antibiotic prediction | One request returns R/S/I predictions for all 15 antibiotics in a single response |
| Confidence scoring | Per-prediction confidence via each model's predicted class probability |
| Explainable AI | Per-prediction SHAP attribution, native to CatBoost (no external `shap` dependency) |
| WHO AWaRe classification | Every antibiotic tagged Access / Watch / Reserve |
| Lab report extraction | On the Prediction Input page, upload a PDF lab report; an LLM (Gemini)-assisted extraction step parses it and auto-fills the input fields for review |
| Trend exploration | Resistance trends across organisms/antibiotics, with LLM-generated explanatory insight |
| Prediction history | Authenticated users can filter and revisit past predictions (result, antibiotic, confidence, organism, date, free-text search) |
| PDF report export | Download a formatted PDF from either the Prediction Result page or the History page (client-side, via jsPDF) |
| Authentication | Email/OTP verification, JWT-based sessions with server-side revocation, bcrypt password hashing |

**Explicitly out of scope for this release:** role-based access control and admin panels (single flat user type by design), two-factor authentication beyond signup/reset OTP. A dedicated non-goals document is planned for `docs/product/vision.md` but not yet written; see [Known Limitations](docs/data/known-limitations.md) in the meantime.

## Tech Stack

| Layer | Technology |
|---|---|
| ML Backend (P1) | Django + Django REST Framework, CatBoost (×15 models), native SHAP, Google Gemini (insight generation + report extraction), PubMed API (research context) |
| Gateway (P2) | Node.js, Express, MongoDB (Mongoose), JWT, bcrypt, Resend (transactional email) |
| Frontend (P3) | React 19, Vite, Tailwind CSS, Framer Motion, Recharts, Chart.js, jsPDF |
| Data | Kaggle AMR dataset (10,710 rows, 23 source columns), synthetic clinical feature augmentation, WHO AWaRe reference mapping |

## System Architecture

**In plain terms:** three independent services, each with one job — a frontend that never talks to the ML backend directly, a gateway that owns every security-sensitive decision, and an ML backend that owns prediction logic and nothing else. The full reasoning behind this specific split, rather than a simpler single-service alternative, is in [ADR-0001](docs/architecture/adr/ADR-0001-three-service-architecture.md).

A React SPA talks to a Node/Express gateway, which owns authentication and prediction history, sends transactional email via Resend, and proxies several ML-backed endpoints to a Django backend that loads all 15 CatBoost models at startup and calls Gemini for insight generation and report extraction. There are two distinct PDF flows, in opposite directions: a user can *export* a prediction as a PDF client-side (via jsPDF) from either the Prediction Result page or the History page — the gateway is not involved — and a user can separately *upload* an existing lab report PDF on the Prediction Input page, which the gateway proxies to Django/Gemini for field extraction.

<div align="center">
<br/>

```mermaid
flowchart TD
    User(("User")) --> FE["React / Vite Frontend"]
    FE ==>|"JWT-authenticated REST"| GW["Node / Express Gateway"]
    GW -->|"auth, history"| DB[("MongoDB")]
    GW -->|"transactional email"| Resend["Resend"]
    GW ==>|"ML-backed endpoints (internal API key)"| ML["Django ML Backend"]
    ML -->|"15x CatBoost + SHAP"| Models[("ml_artifacts/*.pkl")]
    ML -->|"insight generation, report extraction"| Gemini["Google Gemini"]
    ML -->|"research context"| PubMed["PubMed API"]
```

<br/>
</div>

The gateway proxies six endpoints to the Django backend: `/predict`, `/trends`, `/extract-report`, `/dataset-stats`, `/explain-trend`, and `/research-papers` — the diagram groups these under one edge for readability rather than listing all six.

A full low-level breakdown lives in [`docs/architecture/system-context.md`](docs/architecture/system-context.md) and [`docs/architecture/high-level-architecture.md`](docs/architecture/high-level-architecture.md).

## Folder Structure

```
amr-insight/
├── ml-backend/              # Django + DRF — prediction, SHAP, ML pipeline
│   ├── amr_project/         # settings, routing, service-to-service auth middleware
│   ├── predictor/           # views, serializers, CatBoost inference, Gemini insights, tests
│   └── ml_artifacts/        # trained model files, feature schemas
├── gateway/                 # Node/Express — auth, rate limiting, history, proxying to Django
│   ├── routes/               # auth.js, prediction.js
│   ├── middleware/           # token verification, rate limiters
│   ├── models/               # User, PredictionHistory, SecurityEvent (MongoDB)
│   ├── utils/                # validation, logging, email, internal Django client
│   └── tests/                # 84 automated tests
├── frontend/                 # React/Vite — UI
│   ├── src/pages/             # one file per route
│   ├── src/components/        # organized by page/feature area
│   └── src/api/                # one file per backend integration
├── docs/                     # full documentation set — see docs/README.md
└── .github/                  # CODEOWNERS
```

Full, literal tree, including every `docs/` subcategory, lives in [`docs/README.md`](docs/README.md).

## Screenshots / Demo

<div align="center">

<img src="docs/assets/screenshots/landing-hero.png" width="800" alt="AMR-Insight landing page hero"/>

*The landing page — problem framing, live dataset stats, and the visual entry point into a prediction.*

<br/><br/>

<table>
<tr>
<td width="50%">
<img src="docs/assets/screenshots/signup-password-policy.png" width="100%" alt="Signup form with live password policy checklist"/>
<p align="center"><em>Signup — server-enforced password policy validated live, not just on submit.</em></p>
</td>
<td width="50%">
<img src="docs/assets/screenshots/prediction-input-autofilled.png" width="100%" alt="Prediction input form, fields auto-filled from an uploaded PDF"/>
<p align="center"><em>Prediction input, after PDF lab report extraction — every field auto-filled and editable, with a live preview of what's actually sent to the model.</em></p>
</td>
</tr>
<tr>
<td width="50%">
<img src="docs/assets/screenshots/prediction-result-shap-expanded.png" width="100%" alt="Prediction result with SHAP explanation expanded"/>
<p align="center"><em>A prediction result — 15 antibiotics scored at once, with the SHAP explanation expanded for one resistant call.</em></p>
</td>
<td width="50%">
<img src="docs/assets/screenshots/history-filtered.png" width="100%" alt="Prediction history with quick insights and filters"/>
<p align="center"><em>Prediction history — filterable by result/antibiotic/organism/date, with quick aggregate insights above the timeline.</em></p>
</td>
</tr>
<tr>
<td width="50%">
<img src="docs/assets/screenshots/trends-populated.png" width="100%" alt="Resistance trends compared across organisms"/>
<p align="center"><em>Resistance trends for one antibiotic, compared across the top organisms in the dataset over time.</em></p>
</td>
<td width="50%">
<img src="docs/assets/screenshots/dataset-explorer-expanded.png" width="100%" alt="Dataset explorer showing organism distribution"/>
<p align="center"><em>Dataset Explorer — a real two-level breakdown of every organism in the training data.</em></p>
</td>
</tr>
</table>

</div>

---

## Installation

**Prerequisites:** Python 3.11+, Node.js 18+, MongoDB running locally (or a connection string), a Gemini API key, a PubMed API key (optional but recommended), a Resend API key.

### 1. ML Backend (Django)

```bash
cd ml-backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # fill in SECRET_KEY, GEMINI_API_KEY, PUBMED_API_KEY
python manage.py migrate
python manage.py runserver   # http://localhost:8000
```

### 2. Gateway (Node/Express)

```bash
cd gateway
npm install
cp .env.example .env   # fill in MONGO_URI, JWT_SECRET, RESEND_API_KEY
npm run dev   # http://localhost:5000
```

### 3. Frontend (React/Vite)

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173 (Vite default)
```

Full per-service setup detail (env var reference, migration notes) lives in each service's own README and [`docs/deployment/environment-variables.md`](docs/deployment/environment-variables.md).

## Prediction Workflow

A user submits patient/clinical fields (or uploads a lab report for extraction) → the gateway attaches auth context and forwards the request to the ML backend → all 15 CatBoost models score the input in one pass → SHAP explanations and Gemini-generated insight text are attached → the gateway persists the result to prediction history and returns it to the frontend. Full sequence diagram: [`docs/architecture/request-lifecycle.md`](docs/architecture/request-lifecycle.md)

Zooming out from that one request to the whole product — a user's actual path through the app isn't a single line. Login leads to several independent destinations, not a fixed sequence:

<div align="center">
<br/>

```mermaid
flowchart TD
    L["Landing"] --> S["Signup"]
    S --> V["Email Verification"]
    V --> Login["Login"]
    Login --> H["Home"]

    H --> P["Prediction Input"]
    P --> SH["SHAP + AI Insights"]
    SH --> HI["Saved to History"]

    H --> Hist["History"]
    H --> T["Trends"]
    T --> R["Research"]
    H --> E["Dataset Explorer"]
    H --> A["About"]

    HI -.-> Hist
```

<br/>
</div>

## ML Pipeline

**In plain terms:** 15 separate models, one per antibiotic, each trained specifically for that antibiotic's resistance pattern rather than one model trying to predict all 15 at once.

15 per-antibiotic CatBoost classifiers, trained on a 47-column feature schema (19 original + 28 engineered from synthetic clinical variables), with model versions kept side-by-side on disk (`_v2`, `_v3`) for rollback and comparison. Full training methodology, the feature-leakage fix, and pruning rationale: [`docs/data/synthetic-feature-methodology.md`](docs/data/synthetic-feature-methodology.md). A dedicated training-pipeline document is planned for `docs/ml/training-pipeline.md` but not yet written.

## Dataset

Source: a Kaggle-published AMR dataset — 10,710 rows, 23 original columns, covering 15 antibiotic targets across a Gram-negative organism panel, spanning 2020–2025. A portion of clinical features are synthetically generated and clearly labeled as such. Full feature-level reference: [`docs/data/data-dictionary.md`](docs/data/data-dictionary.md). Known dataset constraints (Gram-negative-only panel, MIMIC-IV access evaluated and not pursued): [`docs/data/known-limitations.md`](docs/data/known-limitations.md)

## Model Performance

Per-antibiotic accuracy/F1 figures will be published as a compact summary table here once the current model version is finalized and benchmarked, with the full per-antibiotic comparison in [`docs/ml/model-cards.md`](docs/ml/model-cards.md). Deliberately not filled in yet: these numbers change on every retrain, and a stale table here would actively mislead a reader who trusts it. This is the same reason the [Project at a Glance](#project-at-a-glance) panel above lists only figures that don't change on retrain.

## Explainable AI

Every prediction includes a SHAP-based, per-feature contribution breakdown, computed deterministically via CatBoost's native `get_feature_importance(type='ShapValues')` rather than the external `shap` library (which carries a known dependency conflict in this project's Windows environment). Separately, Gemini generates a high-level summary and recommended next steps from a grounded set of prediction outcomes — result counts, AWaRe tiers, confidence levels. Gemini never receives SHAP values or the `shapExplanation` data itself. This is a deliberate separation, not an oversight: explainability and AI-generated insight are two independent outputs, so the natural-language summary can't contradict the feature-level explanation, because it's never in a position to reference it in the first place. Full design rationale: [ADR-0004: Explainability Strategy](docs/architecture/adr/ADR-0004-explainability-strategy.md)

---

## API

All endpoints are served through the gateway at `/api/predictor` and `/api/auth`, JWT-protected except signup/login/OTP flows. Example — `POST /api/predictor/predict`:

**Request**

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

**Response** (truncated to one antibiotic of 15)

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
    "aiInsights": "..."
  }
}
```

Full endpoint reference (all 7 `predictor` routes — 6 proxied to Django, plus `/history` querying MongoDB directly — all 8 `auth` routes, and the shared error-code catalog): [`docs/api/endpoint-reference.md`](docs/api/endpoint-reference.md), with the machine-readable contract at [`docs/api/openapi.yaml`](docs/api/openapi.yaml)

---

## Security

**In plain terms:** this project went through a deliberate, 13-phase security review — not a single end-of-project pass — covering authentication, session revocation, injection protection, rate limiting, dependency vulnerabilities (including a confirmed remote-code-execution fix), and more, each phase audited before implementation and independently verified after.

JWT-based sessions with bcrypt-hashed passwords and server-side revocation via a `tokenVersion` counter (invalidated on password reset or `POST /logout-everywhere`); signup, password-reset, and login flows are protected by email OTP verification, a separate per-account lockout on repeated failed logins, and per-endpoint rate limiting.

<div align="center">
<br/>

```mermaid
flowchart LR
    R["Incoming Request"] --> RL["Rate Limiting<br/>per-user, tiered by risk"]
    RL --> AU["Authentication<br/>JWT + tokenVersion revocation"]
    AU --> VA["Validation<br/>server-side, mirrors Django's contract"]
    VA --> TB["Service Trust Boundary<br/>internal API key, gateway to Django"]
    TB --> AP["Application Logic"]
```

<br/>
</div>

Single flat user type — no RBAC or admin panel by design, given the current scope and timeline. Two-factor authentication beyond OTP is deferred, not implemented. Full detail, including every known residual gap, stated plainly rather than hidden: [`docs/security/threat-model.md`](docs/security/threat-model.md) and [`SECURITY.md`](SECURITY.md).

---

## Development Workflow

**Branching:** work happens on a topic branch off `dev`, never directly on `dev` or `main`. Two prefixes, chosen by what the branch actually contains:
- `feature/description` — code changes (e.g. `feature/history-page-filters`)
- `docs/description` — documentation-only changes (e.g. `docs/foundation-suite`)

**Commits:** [Conventional Commits](https://www.conventionalcommits.org/) style — `type(scope): summary`, e.g. `docs: add synthetic feature methodology` or `fix(gateway): close NoSQL injection vector in history filters`. Common types: `feat`, `fix`, `docs`, `refactor`, `chore`.

**Merging:** PRs target `dev`; `dev` merges to `main` only at real milestones (feature freeze, a tagged release), never as routine flow.

**Decisions:** anything non-trivial and hard to reverse gets an [ADR](docs/architecture/adr/) — sequential, zero-padded, `ADR-NNNN-kebab-title.md`, and never renumbered or reused even if a later ADR supersedes it. The acting owner of the relevant area (see [Team](#team)) approves.

**Documentation-specific convention:** related documentation files that land together as one unit (e.g. an entire roadmap phase) can share a single branch and a single review pass, with individual commits per file — this repo's own `docs/` build followed that pattern rather than one branch per file.

Full contribution process (issue templates, review expectations, doc-ownership succession) lives in [`CONTRIBUTING.md`](CONTRIBUTING.md) — the above is a summary of the real, currently-practiced workflow, not a future aspiration.

## 📚 Documentation

| I am a... | Start here |
|---|---|
| Recruiter / casual visitor | This README only — you likely don't need to go further |
| Professor / academic reviewer | This README's [Problem Statement](#problem-statement)/[Solution](#solution) sections → [`docs/data/known-limitations.md`](docs/data/known-limitations.md) → [`docs/architecture/system-context.md`](docs/architecture/system-context.md) |
| Developer (new contributor) | [`docs/README.md`](docs/README.md) → this README's [Tech Stack](#tech-stack)/[Installation](#installation) sections → relevant [ADRs](docs/architecture/adr/) (per-service READMEs planned, not yet written) |
| ML Engineer | [`docs/ml/model-cards.md`](docs/ml/model-cards.md) → [`docs/data/data-dictionary.md`](docs/data/data-dictionary.md) → [`docs/data/synthetic-feature-methodology.md`](docs/data/synthetic-feature-methodology.md) (`docs/ai/` planned, not yet written) |
| Researcher | [`docs/data/synthetic-feature-methodology.md`](docs/data/synthetic-feature-methodology.md) → [`docs/data/known-limitations.md`](docs/data/known-limitations.md) (`docs/research/` and `CITATION.cff` planned, not yet written) |
| Future maintainer | [`docs/architecture/adr/`](docs/architecture/adr/) (all of them, in order), then [`docs/security/threat-model.md`](docs/security/threat-model.md) |

Full documentation map, including everything above plus honest notes on what's still planned: [`docs/README.md`](docs/README.md).

---

## Roadmap

**Completed:** feature freeze, demo, and initial presentation milestone; a full security hardening pass (thirteen sequential sub-phases plus two emergency hotfixes — see [Security](#security)); documentation synchronized to reflect that work.

**Current:** finalizing remaining documentation and presentation-readiness items.

**Future:** a Firebase Authentication migration decision (postponed, not cancelled, pending post-presentation review); scaling and infrastructure work, once real deployment traffic is expected; a dedicated `docs/product/` category with a full roadmap document, planned but not yet written.

A full project roadmap, once `docs/product/roadmap.md` exists, will be linked here instead of this summary.

## Contributing

Not yet open to external contributors — this is currently a 3-person academic team project. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the full branching/PR process in more detail.

## Team

| Name | Owns | GitHub | LinkedIn |
|---|---|---|---|
| Dhyey | P1 · P2 — ML backend and Gateway; led Security Hardening (13 phases) | [@dhyeydaftary](https://github.com/dhyeydaftary) | [in/dhyey-daftary](https://www.linkedin.com/in/dhyey-daftary/) |
| Urva | P3 — Frontend; built the core product pages | [@urvashah05](https://github.com/urvashah05) | [in/urva-shah](https://www.linkedin.com/in/urva-shah-2b289a30b/) |
| Ansh | P3 — Frontend styling; contributed to Security Hardening (6 gateway sub-phases) | [@anshpatel0910](https://github.com/anshpatel0910) | [in/anshpatel091006](https://www.linkedin.com/in/anshpatel091006/) |

## License

Licensed under the [Apache License, Version 2.0](LICENSE).

## Acknowledgements

- Dataset: Kaggle-published AMR dataset (source-specific citation to be added — see `CITATION.cff`)
- WHO AWaRe antibiotic classification framework
- CatBoost, Django REST Framework, React, and the broader open-source ecosystem this project builds on

---

## Continue Exploring

- **Architecture** → [System Context](docs/architecture/system-context.md) → [High-Level Architecture](docs/architecture/high-level-architecture.md) → [Request Lifecycle](docs/architecture/request-lifecycle.md)
- **Security** → [Threat Model](docs/security/threat-model.md) → [SECURITY.md](SECURITY.md)
- **API** → [Endpoint Reference](docs/api/endpoint-reference.md) → [OpenAPI Spec](docs/api/openapi.yaml)
- **Every architectural decision** → [ADRs](docs/architecture/adr/)
- **Everything else** → [Documentation Map](docs/README.md)

AMR-Insight is a research and education tool — built to explore what an evidence-based, explainable prediction can add to a decision clinicians already have to make under uncertainty, not to replace the microbiology testing or clinical judgment behind it.
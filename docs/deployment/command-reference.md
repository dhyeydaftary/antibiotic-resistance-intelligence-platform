# AMR-Insight — Command Reference

A running reference of the commands used across this project's three services, what each one does, and when to reach for it. Update this alongside the presentation-readiness checklist as new commands come up.

---

## Gateway (Node/Express) — run from `gateway/`

| Command | What it does | When to use it |
|---|---|---|
| `npm install` | Installs everything in `dependencies` and `devDependencies` from `package.json`. | After pulling changes that touch `package.json`/`package-lock.json`, or on first setup. |
| `npm run dev` | Starts the gateway with `nodemon` (auto-restarts on file changes). | Local development. |
| `npm test` | Runs the full test suite (`node --test`, auto-discovers everything under `tests/`). | Before committing, or any time you want a fast pass/fail check with no coverage overhead. |
| `npm run coverage` | Runs the full test suite *and* prints a per-file coverage table (`c8`). Also writes a browsable `coverage/` folder (open `coverage/index.html` to click into any file line-by-line). | When you want to know not just "did tests pass" but "how much of the code did they actually exercise." Slower than `npm test`, so not needed on every run. |
| `npm audit` | Scans `package-lock.json` for known vulnerabilities in installed dependencies. | Periodically, or whenever `npm install` reports vulnerabilities. |
| `npm audit fix` | Safely upgrades vulnerable dependencies within their existing semver ranges — never touches `package.json` itself, never a breaking change. | After `npm audit` reports something fixable this way. |
| `npm audit fix --force` | Upgrades past semver ranges if needed, including breaking changes. | **Use with caution** — read what it actually plans to install first; it can sometimes *downgrade* a package to dodge an advisory that doesn't even apply to how you use it (this happened with `react-router` during Dependency Security — don't run this blindly). |
| `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | Generates a random 64-character hex string. | Generating a value for `JWT_SECRET` or `INTERNAL_API_KEY` in `.env` — anywhere you need a long random secret. |

---

## ml-backend (Django) — run from `ml-backend/`, with `ml-backend-env` activated

| Command | What it does | When to use it |
|---|---|---|
| `pip install -r requirements.txt` | Installs the app's actual runtime dependencies (Django, CatBoost, pandas, etc.). | First setup, or after `requirements.txt` changes. |
| `pip install -r requirements-dev.txt` | Installs dev-only tooling (`pip-audit`, `coverage`) — never needed in a real deployment. | First setup, or after `requirements-dev.txt` changes. |
| `python manage.py runserver` | Starts the Django dev server. | Local development. |
| `python manage.py check` | Django's basic system check — catches misconfigurations (bad settings, broken app registry, etc.). | After changing `settings.py` or `INSTALLED_APPS`; quick sanity check before running anything else. |
| `python manage.py check --deploy` | A stricter check specifically for production-readiness (weak `SECRET_KEY`, `DEBUG=True`, missing HSTS settings, etc.). | Before any real deployment — not needed for routine local dev. |
| `python manage.py test predictor` | Runs the full Django test suite. | Before committing, or any time you want a fast pass/fail check. |
| `.\coverage.ps1` | Runs the test suite with coverage measurement, then prints the per-file report (equivalent to the gateway's `npm run coverage`). | Same as the gateway's coverage command — when you want to know how much code the tests actually exercise. |
| `pip-audit` | Scans your currently *installed* environment for known vulnerabilities (no `-r` flag — checks what's actually installed, not just what a file says to install). | Periodically, especially after installing new packages. |
| `pip-audit -r requirements.txt` | Scans the *pinned versions in the file* for vulnerabilities — doesn't require them to be installed. | Checking whether your pinned versions are safe before actually installing them, or auditing the file as a source of truth independent of your local environment. |
| `pip show <package-name>` | Prints details (including the exact installed version) for one package. | Confirming exactly what version of something is installed — e.g. before writing an exact pin in `requirements.txt` or `requirements-dev.txt`. |
| `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` | Generates a real, random Django `SECRET_KEY`. | Setting `SECRET_KEY` in your real (git-ignored) `ml-backend/.env` — never use the placeholder from `.env.example` as-is. |

---

## Frontend (Vite/React) — run from `frontend/`

| Command | What it does | When to use it |
|---|---|---|
| `npm install` | Installs dependencies from `package.json`. | First setup, or after `package.json`/`package-lock.json` changes. |
| `npm run dev` | Starts the Vite dev server with hot reload. | Local development. |
| `npm run build` | Produces the real production build (`dist/`) — what actually gets deployed. | Before deploying, or to confirm the app builds cleanly at all. **Currently failing** — see the presentation-readiness checklist. |
| `npm run lint` | Runs ESLint across the codebase. | Before committing, or periodically to catch style/correctness issues. |
| `npm audit` / `npm audit fix` | Same as the gateway's versions — vulnerability scan and safe-fix. | Same guidance as above. |

---

## Combined deployment image (`combined/`) — run from the repo root

Per [ADR-0007](../architecture/adr/ADR-0007-combined-deployment-topology.md), the real production deployment runs `gateway` and `ml-backend` together in one container, built from `combined/Dockerfile`. `gateway/` and `ml-backend/`'s own standalone Dockerfiles are untouched by this — these commands are for exercising the *combined* image specifically, locally, before it goes anywhere near Render.

| Command | What it does | When to use it |
|---|---|---|
| `docker compose build combined` | Builds the combined image from `combined/Dockerfile`, using the repo root as build context (not `./gateway` or `./ml-backend` individually — see the root `.dockerignore`). | After changing `combined/Dockerfile`, `combined/supervisord.conf`, or either service's source, when you want to verify the combined image specifically (not just the standalone `gateway`/`ml-backend` services). |
| `docker compose up combined` | Starts the combined container alongside `mongo` (its only `depends_on`). Exposes the container's port 5000 (node/gateway, the only public listener) on host port `5050` — deliberately different from the standalone gateway service's `5000`, so both can run side by side without a port clash. | Reproducing the production topology locally — verifying gateway and Django actually talk to each other over `127.0.0.1` inside the container, rather than trusting that in the abstract. |
| `docker compose logs -f combined` | Follows the combined container's logs — `supervisord` routes both gunicorn's and node's stdout/stderr into one stream, prefixed by process name. | Confirming both processes actually started, or diagnosing which of the two processes a failure came from. |

**Render (production hosting):** Render builds and deploys this same `combined/Dockerfile` directly from the repository — there's no separate Render-specific build step or config to run locally; what's verified with the commands above is exactly what Render runs. See [ADR-0007](../architecture/adr/ADR-0007-combined-deployment-topology.md) for why this topology exists.

**GHCR image publish (`.github/workflows/docker-publish.yml`)** — not a command you run locally, but worth knowing about: publishing a GitHub Release (or editing one) triggers a workflow that builds `combined/Dockerfile` with the exact same build definition Render uses, and pushes it to `ghcr.io/dhyeydaftary/amr-insight`, tagged with the release's version (e.g. `v1.1.0`) and `latest`. A manual `workflow_dispatch` trigger also exists, for re-running the publish without cutting a new release. Uses the automatically-provided `GITHUB_TOKEN` — no separate registry credentials to manage.

```bash
# Pull the published image directly, without building anything locally
docker pull ghcr.io/dhyeydaftary/amr-insight:latest
```

---

## Git workflow (the convention used throughout this project)

Every sub-phase/feature follows the same pattern:

```powershell
git checkout dev
git pull
git checkout -b feature/<descriptive-name>
```

```powershell
git add <files>
git commit -m "<subject>" -m "<body — the body's opening quote must be on the
same line as the second -m, so a multi-line body can safely follow>"
```

```powershell
git push -u origin feature/<descriptive-name>
```

Then: open a PR into `dev` on GitHub, review/approve it yourself (CODEOWNERS requires this), and merge.

**Note:** the two-`-m` commit format above is specifically PowerShell-safe — a body written as a separate `-m` argument on its own line (without the quote starting on the same line as `-m`) gets misinterpreted by PowerShell and either fails or silently drops the body.

---

## A note on file-specific commands

Some commands above only make sense once a specific file exists (`coverage.ps1`, `requirements-dev.txt`) — if you're setting this project up fresh on a new machine, install dependencies first (`npm install` / `pip install -r requirements.txt` and `requirements-dev.txt`) before any of the test/coverage/audit commands will work.
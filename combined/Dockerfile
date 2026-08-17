# Base matches ml-backend's existing working Dockerfile (python:3.12-slim,
# not alpine) — several runtime deps (catboost, numpy, pandas, scipy,
# matplotlib, pillow) ship manylinux wheels that install cleanly on
# Debian-based slim without a compiler toolchain. Also the reason this merge
# is possible on one base at all: NodeSource's Node.js install script
# targets Debian/Ubuntu, not Alpine (gateway/Dockerfile's own base).
FROM python:3.12-slim

WORKDIR /app

# Node.js 22.x (matches gateway/Dockerfile's node:22-alpine base and
# .github/workflows/ci.yml's gateway job) via NodeSource, plus supervisor to
# run gunicorn and node as two supervised processes in this one container.
# NodeSource's currently-documented method (verified against
# nodesource/distributions' own install docs rather than assumed): download
# the setup script and run it — it configures the apt repo and GPG key
# itself — then apt-get install nodejs.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates gnupg supervisor \
    && curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource_setup.sh \
    && bash /tmp/nodesource_setup.sh \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /tmp/nodesource_setup.sh /var/lib/apt/lists/*

# --- ml-backend (Django, served by gunicorn) ---
# Runtime dependencies only (requirements-dev.txt — pip-audit, coverage — is
# dev/CI tooling, not needed in the served image). Copied and installed
# before the rest of the source so this layer is cached across code-only
# changes — same structure as ml-backend/Dockerfile.
COPY ml-backend/requirements.txt /app/ml-backend/requirements.txt
RUN pip install --no-cache-dir -r /app/ml-backend/requirements.txt
COPY ml-backend/ /app/ml-backend/

# --- gateway (Express, the only process bound to a public interface) ---
# package.json + package-lock.json copied alongside each other so `npm ci`
# (not `npm install`) can do a reproducible, lockfile-exact install, and so
# this layer stays cached across code-only changes — same structure as
# gateway/Dockerfile. firebase-service-account.json and .env are kept out of
# this COPY by the repo-root .dockerignore (this build's context is the repo
# root, not ./gateway, so gateway/.dockerignore itself doesn't apply here —
# see the repo-root .dockerignore's comment) — both are supplied at runtime
# instead, same as the standalone gateway service.
COPY gateway/package.json gateway/package-lock.json /app/gateway/
WORKDIR /app/gateway
RUN npm ci --omit=dev
WORKDIR /app
COPY gateway/ /app/gateway/

# Defines [program:gunicorn]/[program:node] — gunicorn bound to
# 127.0.0.1:8000 (loopback only, never reachable from outside this
# container), node the only process bound to a public interface
# (gateway/index.js's own `app.listen(PORT)`, PORT defaulting to 5000).
COPY combined/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Matches gateway/Dockerfile's own EXPOSE (gateway/index.js: `process.env.PORT
# || 5000`) — documents the default for anyone reading this file; actual
# runtime port still follows whatever PORT is set to. Deliberately no EXPOSE
# 8000: gunicorn binds loopback-only, so publishing that port would be
# misleading (nothing outside the container could ever reach it anyway).
EXPOSE 5000

CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

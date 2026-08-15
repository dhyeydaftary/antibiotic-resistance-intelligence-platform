# Python base matches the version CI tests against (.github/workflows/ci.yml's
# ml-backend job: python-version '3.12') — slim, not alpine, since several
# runtime deps here (catboost, numpy, pandas, scipy, matplotlib, pillow) ship
# manylinux wheels that install cleanly on Debian-based slim without needing
# a compiler toolchain, matching how CI installs them (plain `pip install`,
# no apt-get step).
FROM python:3.12-slim

WORKDIR /app

# Runtime dependencies only (requirements-dev.txt — pip-audit, coverage — is
# dev/CI tooling, not needed in the served image). Copied and installed
# before the rest of the source so this layer is cached across code-only
# changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# gunicorn (added to requirements.txt) serves amr_project.wsgi:application —
# the same WSGI callable amr_project/wsgi.py exposes, confirmed directly
# rather than assumed. SECRET_KEY/ALLOWED_HOSTS/INTERNAL_API_KEY/etc. are
# read from the environment at runtime via python-decouple (amr_project/
# settings.py) — supplied by docker-compose's env_file, not baked in here.
EXPOSE 8000

CMD ["gunicorn", "amr_project.wsgi:application", "--bind", "0.0.0.0:8000", "--preload", "--timeout", "120"]

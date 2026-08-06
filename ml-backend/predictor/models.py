from django.db import models

# Deliberately empty: this app persists nothing via the Django ORM.
# Predictions are stateless (recomputed per request from ml_artifacts/
# *.pkl + cleaned_dataset.csv, never stored here); prediction HISTORY is
# owned by the gateway's own Mongo model, gateway/models/
# PredictionHistory.js. SQLite (settings.py DATABASES) sits unused as a
# result — no migrations of consequence, nothing to inspect here.

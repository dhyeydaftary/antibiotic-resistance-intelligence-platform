# Runs the Django test suite with coverage measurement, scoped to the
# actual app code (predictor/), then prints the per-file report with
# missing line numbers. Equivalent to gateway's `npm run coverage`.
coverage run --source=predictor manage.py test predictor
coverage report -m
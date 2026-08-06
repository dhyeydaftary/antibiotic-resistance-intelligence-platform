# Project-level URL root. Everything Django serves lives under
# /api/predictor/ (delegated to predictor/urls.py) — matches the prefix
# InternalApiKeyMiddleware (amr_project/middleware.py) checks against.
from django.urls import path, include

urlpatterns = [
    path('api/predictor/', include('predictor.urls')),
]

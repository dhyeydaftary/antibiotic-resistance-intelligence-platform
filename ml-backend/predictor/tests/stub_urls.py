"""
Test-only URLconf used by test_middleware.py and test_settings.py, swapped
in via override_settings(ROOT_URLCONF=...) so InternalApiKeyMiddleware and
DRF's authentication machinery can each be exercised in isolation against
lightweight stub views, without touching the real predictor/urls.py or
requiring the ML dependencies the real views pull in.
"""

from django.http import JsonResponse
from django.urls import path
from rest_framework.decorators import api_view
from rest_framework.response import Response


# Minimal stub view that returns 200 without touching request.user.
def stub_view(request):
    return JsonResponse({'ok': True})


# Stub DRF view that forces request.user resolution, reproducing the
# django.contrib.auth crash path with minimal code.
@api_view(['GET'])
def drf_stub_view(request):
    # Accessing request.user is exactly the interaction that previously
    # crashed every request in this service (see amr_project/settings.py's
    # REST_FRAMEWORK comment): DRF's APIView.initial() calls
    # perform_authentication(request), which forces request.user to
    # resolve via DEFAULT_AUTHENTICATION_CLASSES/UNAUTHENTICATED_USER —
    # both of which transitively depended on django.contrib.auth before
    # that setting was added. Every real @api_view view in this project
    # (predictor/views.py) goes through the same perform_authentication()
    # step regardless of whether its body references request.user, so this
    # stub reproduces the exact crash path with a minimal view.
    return Response({'ok': True, 'user_repr': str(request.user)})


urlpatterns = [
    path('api/predictor/stub/', stub_view),
    path('api/predictor/drf-stub/', drf_stub_view),
]

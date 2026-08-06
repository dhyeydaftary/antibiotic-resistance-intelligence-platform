# Registered in settings.py's MIDDLEWARE list, runs on every request
# before it reaches any view in predictor/views.py. This is the gateway-
# Django trust boundary: pairs with gateway/utils/djangoClient.js, which
# sets X-Internal-Api-Key on every outgoing call — INTERNAL_API_KEY must
# match on both sides (env var on each service).
import hmac

from django.conf import settings
from django.http import JsonResponse


# Paths that don't require the internal API key. Empty for now — a future
# health-check/liveness endpoint (for a load balancer or container
# orchestrator) should be added here rather than requiring the shared
# secret, since infrastructure probes generally can't send custom headers
# and a minimal health check leaks nothing sensitive by being public.
EXEMPT_PATHS = set()


# Django middleware gating every /api/predictor/ request behind a shared
# internal API key.
class InternalApiKeyMiddleware:
    """
    Rejects any request to this service that doesn't carry the shared
    internal API key. This service is only meant to be called by the
    Node/Express gateway — CORS_ALLOWED_ORIGINS restricts browser-based
    cross-origin calls, but that's a browser-enforced protection and does
    nothing against a direct curl/Postman/script request. This middleware
    is the actual enforcement boundary.
    """

    # Stores Django's next-handler callable, per the middleware protocol.
    def __init__(self, get_response):
        self.get_response = get_response

    # Checks the request's internal API key before passing it through.
    def __call__(self, request):
        if not request.path.startswith('/api/predictor/') or request.path in EXEMPT_PATHS:
            return self.get_response(request)

        provided = request.headers.get('X-Internal-Api-Key', '')
        expected = settings.INTERNAL_API_KEY

        if not expected or not provided or not hmac.compare_digest(provided, expected):
            return JsonResponse(
                {
                    'success': False,
                    'data': None,
                    'error': {
                        'code': 'SERVICE_AUTH_ERROR',
                        'message': 'Missing or invalid internal API key',
                        'field': None,
                    },
                },
                status=401,
            )

        return self.get_response(request)

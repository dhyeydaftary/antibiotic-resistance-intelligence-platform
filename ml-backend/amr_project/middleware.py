import hmac

from django.conf import settings
from django.http import JsonResponse


# Paths that don't require the internal API key. Empty for now — a future
# health-check/liveness endpoint (for a load balancer or container
# orchestrator) should be added here rather than requiring the shared
# secret, since infrastructure probes generally can't send custom headers
# and a minimal health check leaks nothing sensitive by being public.
EXEMPT_PATHS = set()


class InternalApiKeyMiddleware:
    """
    Rejects any request to this service that doesn't carry the shared
    internal API key. This service is only meant to be called by the
    Node/Express gateway — CORS_ALLOWED_ORIGINS restricts browser-based
    cross-origin calls, but that's a browser-enforced protection and does
    nothing against a direct curl/Postman/script request. This middleware
    is the actual enforcement boundary.
    """

    def __init__(self, get_response):
        self.get_response = get_response

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

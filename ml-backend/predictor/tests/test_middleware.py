"""
Tests for amr_project.middleware.InternalApiKeyMiddleware — the actual
access-control boundary in front of every /api/predictor/ route (see
ml-backend/amr_project/middleware.py). Uses a stub URLconf (stub_urls.py)
swapped in via override_settings, the same technique used when this
middleware was first verified, so this doesn't need the real predictor
views (and therefore doesn't need catboost installed) to test the
middleware in isolation.
"""

import hmac
from unittest.mock import patch

from django.conf import settings
from django.test import TestCase, override_settings


# Tests the core accept/reject behavior of InternalApiKeyMiddleware.
@override_settings(ROOT_URLCONF='predictor.tests.stub_urls')
class InternalApiKeyMiddlewareTests(TestCase):
    def test_request_with_no_key_is_rejected(self):
        response = self.client.get('/api/predictor/stub/')

        self.assertEqual(response.status_code, 401)
        body = response.json()
        self.assertEqual(body['success'], False)
        self.assertEqual(body['error']['code'], 'SERVICE_AUTH_ERROR')

    def test_request_with_wrong_key_is_rejected(self):
        response = self.client.get(
            '/api/predictor/stub/',
            HTTP_X_INTERNAL_API_KEY='definitely-the-wrong-key',
        )

        self.assertEqual(response.status_code, 401)
        body = response.json()
        self.assertEqual(body['success'], False)
        self.assertEqual(body['error']['code'], 'SERVICE_AUTH_ERROR')

    def test_request_with_correct_key_is_not_rejected(self):
        response = self.client.get(
            '/api/predictor/stub/',
            HTTP_X_INTERNAL_API_KEY=settings.INTERNAL_API_KEY,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'ok': True})

    def test_path_outside_predictor_prefix_is_not_gated_by_the_key(self):
        # EXEMPT_PATHS aside, the middleware only inspects paths starting
        # with /api/predictor/ at all (amr_project/middleware.py) — a
        # request to anything else must pass through untouched, whether or
        # not a matching route exists (a 404 from Django's own routing is
        # fine here; a 401 from this middleware would not be).
        response = self.client.get('/not-a-predictor-path/')

        self.assertNotEqual(response.status_code, 401)


# Tests edge cases of the key comparison itself (empty, prefix, timing-safety).
@override_settings(ROOT_URLCONF='predictor.tests.stub_urls')
class InternalApiKeyMiddlewareEdgeCaseTests(TestCase):
    def test_empty_string_key_header_is_rejected(self):
        response = self.client.get(
            '/api/predictor/stub/',
            HTTP_X_INTERNAL_API_KEY='',
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()['error']['code'], 'SERVICE_AUTH_ERROR')

    def test_a_correct_prefix_of_the_key_is_rejected(self):
        # Confirms the comparison isn't doing a loose/prefix/startswith
        # match — dropping just the last character of an otherwise-correct
        # key must still fail.
        real_key = settings.INTERNAL_API_KEY
        self.assertTrue(len(real_key) > 1, 'INTERNAL_API_KEY must be set in the test environment for this test to be meaningful')
        prefix = real_key[:-1]

        response = self.client.get(
            '/api/predictor/stub/',
            HTTP_X_INTERNAL_API_KEY=prefix,
        )

        self.assertEqual(response.status_code, 401)

    def test_comparison_uses_hmac_compare_digest_not_equality(self):
        # Reads amr_project/middleware.py's actual comparison call
        # (hmac.compare_digest) and confirms it is genuinely what executes
        # for a successful match, not just present unused in the source —
        # wraps the real implementation so behavior is unchanged.
        with patch('amr_project.middleware.hmac.compare_digest', wraps=hmac.compare_digest) as mock_compare:
            response = self.client.get(
                '/api/predictor/stub/',
                HTTP_X_INTERNAL_API_KEY=settings.INTERNAL_API_KEY,
            )

        self.assertEqual(response.status_code, 200)
        mock_compare.assert_called_once_with(settings.INTERNAL_API_KEY, settings.INTERNAL_API_KEY)

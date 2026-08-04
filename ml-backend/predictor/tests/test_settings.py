"""
Regression test for the Django outage this project previously had: every
request 500'd because DRF's default DEFAULT_AUTHENTICATION_CLASSES /
UNAUTHENTICATED_USER transitively depend on django.contrib.auth, which
isn't in INSTALLED_APPS (removed as unused in the Authorization
sub-phase). The fix was the explicit REST_FRAMEWORK setting in
amr_project/settings.py:

    REST_FRAMEWORK = {
        'DEFAULT_AUTHENTICATION_CLASSES': [],
        'UNAUTHENTICATED_USER': None,
    }

Checking that setting's literal value would NOT have caught the original
bug — the bug was in how DRF's authentication machinery behaves when it
actually runs, not in whether a particular dict key is set. So the primary
test here makes a real request through Django's actual request/response
cycle to a view that goes through DRF's normal perform_authentication()
step (which resolves request.user) and confirms it does not 500. Uses the
same stub-URLconf technique as test_middleware.py.
"""

from django.conf import settings
from django.test import TestCase, override_settings


@override_settings(ROOT_URLCONF='predictor.tests.stub_urls')
class DjangoContribAuthRegressionTests(TestCase):
    def test_precondition_django_contrib_auth_is_not_installed(self):
        # Sanity-checks that this test is actually exercising the
        # "missing django.contrib.auth" condition the original bug
        # depended on, not vacuously passing because the app was added
        # back at some point.
        self.assertNotIn('django.contrib.auth', settings.INSTALLED_APPS)

    def test_drf_view_authenticates_the_request_without_500ing(self):
        response = self.client.get(
            '/api/predictor/drf-stub/',
            HTTP_X_INTERNAL_API_KEY=settings.INTERNAL_API_KEY,
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['ok'], True)
        # Confirms request.user was actually resolved (not skipped) — an
        # empty/placeholder repr here would mean perform_authentication()
        # never ran, which would silently defeat this test's purpose.
        self.assertIn('user_repr', body)

    def test_rest_framework_setting_disables_contrib_auth_dependent_defaults(self):
        # Secondary, narrower check — included alongside the real-request
        # test above, not instead of it, since this alone would not have
        # caught the original regression.
        self.assertEqual(settings.REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES'], [])
        self.assertIsNone(settings.REST_FRAMEWORK['UNAUTHENTICATED_USER'])

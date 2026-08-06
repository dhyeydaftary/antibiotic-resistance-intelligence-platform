"""
Tests for predictor.views.research_papers_view and its organism allow-list
check (predictor/pubmed_client.py's get_research_papers). The real
predictor/urls.py routing is used here (not a stub), since this exercises
the view itself, not the middleware in isolation — every request still
needs the internal API key header to get past InternalApiKeyMiddleware.
No real PubMed network call is ever made: the organism-rejection case
never reaches the network (pubmed_client validates the organism before
building a query or calling PubMed), and the valid-organism case mocks
predictor.views.get_research_papers directly.
"""

from unittest.mock import patch

from django.conf import settings
from django.test import TestCase


# Tests research_papers_view's organism allow-list validation.
class ResearchPapersViewTests(TestCase):
    # Issues an authenticated GET against the research-papers endpoint.
    def _get(self, params):
        return self.client.get(
            '/api/predictor/research-papers/',
            params,
            HTTP_X_INTERNAL_API_KEY=settings.INTERNAL_API_KEY,
        )

    def test_organism_not_in_allow_list_returns_400_validation_error(self):
        response = self._get({'antibiotic': 'CIP', 'organism': 'NotARealOrganism'})

        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertEqual(body['success'], False)
        self.assertEqual(body['error']['code'], 'VALIDATION_ERROR')
        self.assertEqual(body['error']['field'], 'organism')

    @patch('predictor.views.get_research_papers')
    def test_valid_organism_is_not_rejected_by_the_allow_list_check(self, mock_get_research_papers):
        mock_get_research_papers.return_value = []

        response = self._get({'antibiotic': 'CIP', 'organism': 'Escherichia coli'})

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['success'], True)
        self.assertEqual(body['data']['papers'], [])
        mock_get_research_papers.assert_called_once_with('CIP', 'Escherichia coli')

    @patch('predictor.views.get_research_papers')
    def test_missing_antibiotic_returns_400_before_touching_pubmed(self, mock_get_research_papers):
        response = self._get({'organism': 'Escherichia coli'})

        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertEqual(body['error']['code'], 'VALIDATION_ERROR')
        self.assertEqual(body['error']['field'], 'antibiotic')
        mock_get_research_papers.assert_not_called()

    def test_organism_with_different_casing_than_the_allow_list_is_rejected(self):
        # predictor/pubmed_client.py's get_research_papers() checks
        # `organism not in ORGANISM_LIST` — a plain Python `in` on a list
        # of exact strings, case-sensitive. 'Escherichia coli' is
        # allow-listed; a lowercased variant is not the same string, so
        # this must be rejected exactly like any other unknown organism,
        # not silently normalized/accepted.
        response = self._get({'antibiotic': 'CIP', 'organism': 'escherichia coli'})

        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertEqual(body['error']['code'], 'VALIDATION_ERROR')
        self.assertEqual(body['error']['field'], 'organism')

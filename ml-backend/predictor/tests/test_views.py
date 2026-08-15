"""
Tests for the predictor.views function-based views. The real
predictor/urls.py routing is used here (not a stub), since this exercises
the views themselves, not the middleware in isolation — every request
still needs the internal API key header to get past
InternalApiKeyMiddleware.

ResearchPapersViewTests below predates the rest of this file and covers
predictor.views.research_papers_view and its organism allow-list check
(predictor/pubmed_client.py's get_research_papers) in detail -- no real
PubMed network call is ever made there: the organism-rejection case never
reaches the network (pubmed_client validates the organism before building
a query or calling PubMed), the valid-organism case mocks
predictor.views.get_research_papers directly, and the differently-cased-
organism case mocks pubmed_client._esearch (returns no PMIDs, so _efetch
short-circuits before any network call) -- this one deliberately leaves
get_research_papers itself unmocked, since it's the actual normalization
logic under test.

Everything below that targets the *other* views (trends_view,
explain_trend_view, dataset_stats_view, predict_view, extract_report_view)
-- as of the coverage run that prompted this file's expansion, those were
essentially 0% covered (see predictor/views.py; predictor/test_predict.py
exercises predict_resistance() directly, never through predict_view/the
HTTP layer). Each dedicated module call (get_resistance_trend,
generate_trend_insights, get_dataset_stats, predict_resistance,
generate_ai_insights, extract_report_fields_llm, pdfplumber.open) is
mocked at its predictor.views.* import site -- these views are
deliberately thin wrappers (see views.py's module docstring), so what's
actually under test here is the wrapping: parameter validation, response
envelope shape, and try/except -> status code mapping, not the mocked-out
modules' own logic (each has its own dedicated test coverage elsewhere).
"""

import json
from unittest.mock import MagicMock, patch

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
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

    def test_organism_with_different_casing_than_the_allow_list_is_normalized_and_accepted(self):
        # predictor/pubmed_client.py's get_research_papers() explicitly
        # matches organism case-insensitively against ORGANISM_LIST, then
        # normalizes to the canonical casing -- documented, deliberate
        # behavior (avoids two differently-cased requests for the same
        # organism silently creating two separate cache entries), not a
        # gap. A lowercased variant of an allow-listed organism must
        # succeed, not be rejected like a genuinely unknown one.
        with patch('predictor.pubmed_client._esearch', return_value=[]) as mock_esearch:
            response = self._get({'antibiotic': 'CIP', 'organism': 'escherichia coli'})

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['success'], True)
        self.assertEqual(body['data']['papers'], [])
        # Confirms normalization actually happened, not just that the
        # request wasn't rejected -- the query built from a normalized
        # organism differs from one built from the raw lowercase input.
        mock_esearch.assert_called_once()
        query_used = mock_esearch.call_args[0][0]
        self.assertIn('Escherichia coli', query_used)

    @patch('predictor.views.get_research_papers')
    def test_an_unexpected_non_valueerror_exception_is_caught_and_returns_a_generic_500(self, mock_get_research_papers):
        mock_get_research_papers.side_effect = Exception('PubMed is unreachable')

        response = self._get({'antibiotic': 'CIP', 'organism': 'Escherichia coli'})

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {
            'success': False,
            'data': None,
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': 'Something went wrong while fetching research papers.',
                'field': None,
            },
        })


# Tests trends_view: 'antibiotic' required, ValueError -> 400 with the
# right field attribution, any other exception -> 500, success -> 200.
class TrendsViewTests(TestCase):
    def _get(self, params):
        return self.client.get(
            '/api/predictor/trends/',
            params,
            HTTP_X_INTERNAL_API_KEY=settings.INTERNAL_API_KEY,
        )

    @patch('predictor.views.get_resistance_trend')
    def test_missing_antibiotic_returns_400_before_touching_get_resistance_trend(self, mock_get_trend):
        response = self._get({'organism': 'Escherichia coli'})

        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertEqual(body['success'], False)
        self.assertEqual(body['error']['code'], 'VALIDATION_ERROR')
        self.assertEqual(body['error']['field'], 'antibiotic')
        mock_get_trend.assert_not_called()

    @patch('predictor.views.get_resistance_trend')
    def test_valueerror_mentioning_ward_type_is_attributed_to_the_ward_type_field(self, mock_get_trend):
        mock_get_trend.side_effect = ValueError("Invalid ward_type 'ICU-East'")

        response = self._get({'antibiotic': 'CIP', 'ward_type': 'ICU-East'})

        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertEqual(body['error']['code'], 'VALIDATION_ERROR')
        self.assertEqual(body['error']['field'], 'ward_type')

    @patch('predictor.views.get_resistance_trend')
    def test_valueerror_mentioning_organism_is_attributed_to_the_organism_field(self, mock_get_trend):
        mock_get_trend.side_effect = ValueError('Unknown organism')

        response = self._get({'antibiotic': 'CIP', 'organism': 'NotReal'})

        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertEqual(body['error']['code'], 'VALIDATION_ERROR')
        self.assertEqual(body['error']['field'], 'organism')

    @patch('predictor.views.get_resistance_trend')
    def test_valueerror_mentioning_neither_falls_back_to_the_antibiotic_field(self, mock_get_trend):
        mock_get_trend.side_effect = ValueError('Unknown antibiotic code')

        response = self._get({'antibiotic': 'NOTREAL'})

        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertEqual(body['error']['code'], 'VALIDATION_ERROR')
        self.assertEqual(body['error']['field'], 'antibiotic')

    @patch('predictor.views.get_resistance_trend')
    def test_an_unexpected_exception_is_caught_and_returns_a_generic_500(self, mock_get_trend):
        mock_get_trend.side_effect = Exception('dataset file missing')

        response = self._get({'antibiotic': 'CIP'})

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {
            'success': False,
            'data': None,
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': 'Something went wrong while fetching trend data.',
                'field': None,
            },
        })

    @patch('predictor.views.get_resistance_trend')
    def test_a_valid_request_returns_the_series_wrapped_in_the_success_envelope(self, mock_get_trend):
        series = [{'period': '2024-01', 'resistantRate': 0.2, 'recordsConsidered': 10}]
        mock_get_trend.return_value = series

        response = self._get({'antibiotic': 'CIP', 'organism': 'Escherichia coli', 'ward_type': 'ICU'})

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['success'], True)
        self.assertEqual(body['data']['antibiotic'], 'CIP')
        self.assertEqual(body['data']['organism'], 'Escherichia coli')
        self.assertEqual(body['data']['series'], series)
        mock_get_trend.assert_called_once_with('CIP', 'Escherichia coli', 'ICU')

    @patch('predictor.views.get_resistance_trend')
    def test_organism_and_ward_type_default_to_all_when_omitted(self, mock_get_trend):
        mock_get_trend.return_value = []

        response = self._get({'antibiotic': 'CIP'})

        self.assertEqual(response.status_code, 200)
        mock_get_trend.assert_called_once_with('CIP', 'all', 'all')


# Tests explain_trend_view: 'antibiotic' required, ValueError -> 400 with
# the right field attribution, any other exception -> 500, success -> 200.
class ExplainTrendViewTests(TestCase):
    def _get(self, params):
        return self.client.get(
            '/api/predictor/explain-trend/',
            params,
            HTTP_X_INTERNAL_API_KEY=settings.INTERNAL_API_KEY,
        )

    @patch('predictor.views.get_resistance_trend')
    def test_missing_antibiotic_returns_400_before_touching_get_resistance_trend(self, mock_get_trend):
        response = self._get({'organism': 'Escherichia coli'})

        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertEqual(body['error']['code'], 'VALIDATION_ERROR')
        self.assertEqual(body['error']['field'], 'antibiotic')
        mock_get_trend.assert_not_called()

    @patch('predictor.views.get_resistance_trend')
    def test_valueerror_mentioning_organism_is_attributed_to_the_organism_field(self, mock_get_trend):
        mock_get_trend.side_effect = ValueError('Unknown organism')

        response = self._get({'antibiotic': 'CIP', 'organism': 'NotReal'})

        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertEqual(body['error']['code'], 'VALIDATION_ERROR')
        self.assertEqual(body['error']['field'], 'organism')

    @patch('predictor.views.get_resistance_trend')
    def test_valueerror_not_mentioning_organism_falls_back_to_the_antibiotic_field(self, mock_get_trend):
        mock_get_trend.side_effect = ValueError('Unknown antibiotic code')

        response = self._get({'antibiotic': 'NOTREAL'})

        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertEqual(body['error']['code'], 'VALIDATION_ERROR')
        self.assertEqual(body['error']['field'], 'antibiotic')

    @patch('predictor.views.generate_trend_insights')
    @patch('predictor.views.get_resistance_trend')
    def test_an_unexpected_exception_from_either_call_is_caught_and_returns_a_generic_500(self, mock_get_trend, mock_insights):
        mock_get_trend.return_value = [{'period': '2024-01', 'resistantRate': 0.2, 'recordsConsidered': 10}]
        mock_insights.side_effect = Exception('LLM/summary generation blew up')

        response = self._get({'antibiotic': 'CIP'})

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {
            'success': False,
            'data': None,
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': 'Something went wrong while generating the trend explanation.',
                'field': None,
            },
        })

    @patch('predictor.views.generate_trend_insights')
    @patch('predictor.views.get_resistance_trend')
    def test_a_valid_request_returns_the_insights_wrapped_in_the_success_envelope(self, mock_get_trend, mock_insights):
        series = [{'period': '2024-01', 'resistantRate': 0.2, 'recordsConsidered': 10}]
        insights = {'summary': 'Resistance is rising.'}
        mock_get_trend.return_value = series
        mock_insights.return_value = insights

        response = self._get({'antibiotic': 'CIP', 'organism': 'Escherichia coli'})

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['success'], True)
        self.assertEqual(body['data']['antibiotic'], 'CIP')
        self.assertEqual(body['data']['organism'], 'Escherichia coli')
        self.assertEqual(body['data']['insights'], insights)
        mock_get_trend.assert_called_once_with('CIP', 'Escherichia coli')
        mock_insights.assert_called_once_with('CIP', 'Escherichia coli', series)


# Tests dataset_stats_view: no params required, any exception -> 500, success -> 200.
class DatasetStatsViewTests(TestCase):
    def _get(self):
        return self.client.get(
            '/api/predictor/dataset-stats/',
            HTTP_X_INTERNAL_API_KEY=settings.INTERNAL_API_KEY,
        )

    @patch('predictor.views.get_dataset_stats')
    def test_an_unexpected_exception_is_caught_and_returns_a_generic_500(self, mock_get_stats):
        mock_get_stats.side_effect = Exception('dataset CSV missing on disk')

        response = self._get()

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {
            'success': False,
            'data': None,
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': 'Something went wrong while fetching dataset statistics.',
                'field': None,
            },
        })

    @patch('predictor.views.get_dataset_stats')
    def test_a_successful_call_returns_the_stats_wrapped_in_the_success_envelope(self, mock_get_stats):
        stats = {'totalRows': 1000, 'totalColumns': 42}
        mock_get_stats.return_value = stats

        response = self._get()

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['success'], True)
        self.assertEqual(body['data'], stats)
        self.assertIsNone(body['error'])


# Tests predict_view: serializer validation -> 400, any exception from
# predict_resistance/generate_ai_insights -> 500, success -> 200. No real
# CatBoost inference or Gemini call is ever made -- both are mocked at
# their predictor.views.* import site (predict.py/ai_insights.py have
# their own dedicated coverage; predict_view's own job -- validate,
# delegate, wrap -- is what's under test here).
class PredictViewTests(TestCase):
    VALID_PAYLOAD = {
        'age': 45,
        'gender': 'Male',
        'diabetes': False,
        'hypertension': False,
        'hospital_before': False,
        'infection_freq': 1.0,
        'year': 2024,
        'month': 6,
        'organism': 'Escherichia coli',
    }

    def _post(self, payload):
        return self.client.post(
            '/api/predictor/predict/',
            data=json.dumps(payload),
            content_type='application/json',
            HTTP_X_INTERNAL_API_KEY=settings.INTERNAL_API_KEY,
        )

    @patch('predictor.views.predict_resistance')
    def test_invalid_payload_is_rejected_with_400_before_touching_predict_resistance(self, mock_predict):
        response = self._post({})

        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertEqual(body['success'], False)
        self.assertEqual(body['error']['code'], 'VALIDATION_ERROR')
        # serializer.errors is forwarded as `field` -- every required field
        # is missing from an empty payload, so each should be called out.
        self.assertIn('age', body['error']['field'])
        self.assertIn('organism', body['error']['field'])
        mock_predict.assert_not_called()

    @patch('predictor.views.generate_ai_insights')
    @patch('predictor.views.predict_resistance')
    def test_an_unexpected_exception_from_either_call_is_caught_and_returns_a_generic_500(self, mock_predict, mock_insights):
        mock_predict.side_effect = Exception('model artifact failed to load')

        response = self._post(self.VALID_PAYLOAD)

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {
            'success': False,
            'data': None,
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': 'Something went wrong while generating the prediction.',
                'field': None,
            },
        })
        mock_insights.assert_not_called()

    @patch('predictor.views.generate_ai_insights')
    @patch('predictor.views.predict_resistance')
    def test_a_valid_payload_returns_predictions_and_insights_wrapped_in_the_success_envelope(self, mock_predict, mock_insights):
        predictions = [{'antibiotic': 'CIP', 'result': 'S', 'confidence': 0.9, 'awareCategory': 'Watch', 'shapExplanation': []}]
        ai_insights = {'summary': 'Likely susceptible to first-line therapy.'}
        mock_predict.return_value = predictions
        mock_insights.return_value = ai_insights

        response = self._post(self.VALID_PAYLOAD)

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['success'], True)
        self.assertEqual(body['data']['predictions'], predictions)
        self.assertEqual(body['data']['aiInsights'], ai_insights)
        self.assertEqual(body['data']['modelVersion'], 'v3')
        mock_insights.assert_called_once()


# Tests extract_report_view: file-presence/type validation -> 400,
# unreadable PDF -> 400 EXTRACTION_ERROR, no extractable text -> 400
# EXTRACTION_ERROR, unexpected extraction exception -> 500, a resolved
# llm_error -> 200 with extractionAvailable: False (a *degraded* success,
# by design -- see views.py's module docstring), and a real success ->
# 200 with extractionAvailable: True. pdfplumber.open is mocked at its
# predictor.views.* import site throughout, so no real PDF is ever parsed
# -- only extract_report_view's own branching is under test here.
class ExtractReportViewTests(TestCase):
    def _post(self, file_obj=None):
        data = {}
        if file_obj is not None:
            data['report'] = file_obj
        return self.client.post(
            '/api/predictor/extract-report/',
            data,
            HTTP_X_INTERNAL_API_KEY=settings.INTERNAL_API_KEY,
        )

    @staticmethod
    def _mock_pdf_context(page_texts):
        # pdfplumber.open(...) is used as `with pdfplumber.open(...) as pdf:`
        # -- the mock must support the context-manager protocol and expose
        # a `.pages` iterable of objects with an `.extract_text()` method.
        mock_pdf = MagicMock()
        mock_pdf.__enter__.return_value = mock_pdf
        mock_pdf.pages = []
        for text in page_texts:
            page = MagicMock()
            page.extract_text.return_value = text
            mock_pdf.pages.append(page)
        return mock_pdf

    def test_no_file_uploaded_returns_400_validation_error(self):
        response = self._post(file_obj=None)

        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertEqual(body['success'], False)
        self.assertEqual(body['error']['code'], 'VALIDATION_ERROR')
        self.assertEqual(body['error']['field'], 'report')

    def test_a_non_pdf_filename_is_rejected_with_400_validation_error(self):
        text_file = SimpleUploadedFile('notes.txt', b'just some text', content_type='text/plain')

        response = self._post(text_file)

        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertEqual(body['error']['code'], 'VALIDATION_ERROR')
        self.assertEqual(body['error']['field'], 'report')

    @patch('predictor.views.pdfplumber.open')
    def test_a_pdf_that_pdfplumber_cannot_open_returns_400_extraction_error(self, mock_pdfplumber_open):
        mock_pdfplumber_open.side_effect = Exception('corrupted or password-protected PDF')
        pdf_file = SimpleUploadedFile('report.pdf', b'not really a pdf', content_type='application/pdf')

        response = self._post(pdf_file)

        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertEqual(body['success'], False)
        self.assertEqual(body['error']['code'], 'EXTRACTION_ERROR')
        self.assertEqual(body['error']['field'], 'report')
        self.assertIn('read', body['error']['message'].lower())

    @patch('predictor.views.pdfplumber.open')
    def test_a_pdf_with_no_extractable_text_returns_400_extraction_error(self, mock_pdfplumber_open):
        # e.g. a scanned image with no text layer -- extract_text() returns
        # None/empty for every page.
        mock_pdfplumber_open.return_value = self._mock_pdf_context([None, ''])
        pdf_file = SimpleUploadedFile('report.pdf', b'%PDF-1.4 scanned image only', content_type='application/pdf')

        response = self._post(pdf_file)

        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertEqual(body['error']['code'], 'EXTRACTION_ERROR')
        self.assertEqual(body['error']['field'], 'report')
        self.assertIn('scanned image', body['error']['message'])

    @patch('predictor.views.extract_report_fields_llm')
    @patch('predictor.views.pdfplumber.open')
    def test_an_unexpected_exception_from_extract_report_fields_llm_is_caught_and_returns_a_generic_500(self, mock_pdfplumber_open, mock_extract):
        mock_pdfplumber_open.return_value = self._mock_pdf_context(['Patient age 68, organism Klebsiella pneumoniae'])
        mock_extract.side_effect = Exception('Gemini client raised unexpectedly')
        pdf_file = SimpleUploadedFile('report.pdf', b'%PDF-1.4 fake body', content_type='application/pdf')

        response = self._post(pdf_file)

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {
            'success': False,
            'data': None,
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': 'Something went wrong while extracting report data.',
                'field': None,
            },
        })

    @patch('predictor.views.extract_report_fields_llm')
    @patch('predictor.views.pdfplumber.open')
    def test_a_resolved_llm_error_degrades_to_a_200_success_with_extraction_unavailable(self, mock_pdfplumber_open, mock_extract):
        # By design (see views.py's module docstring): a failure INSIDE the
        # extraction pipeline itself (bad API key, Gemini down, malformed
        # response) must not hard-fail the request -- the frontend falls
        # back to manual entry instead.
        mock_pdfplumber_open.return_value = self._mock_pdf_context(['Patient age 68, organism Klebsiella pneumoniae'])
        mock_extract.return_value = ({'age': 68}, ['age'], 'Gemini returned a malformed response')
        pdf_file = SimpleUploadedFile('report.pdf', b'%PDF-1.4 fake body', content_type='application/pdf')

        response = self._post(pdf_file)

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['success'], True)
        self.assertIsNone(body['error'])
        self.assertEqual(body['data']['extracted'], {})
        self.assertEqual(body['data']['missing'], ['age'])
        self.assertEqual(body['data']['extractionAvailable'], False)

    @patch('predictor.views.extract_report_fields_llm')
    @patch('predictor.views.pdfplumber.open')
    def test_a_successful_extraction_returns_200_with_extraction_available(self, mock_pdfplumber_open, mock_extract):
        mock_pdfplumber_open.return_value = self._mock_pdf_context(['Patient age 68, organism Klebsiella pneumoniae'])
        extracted = {'age': 68, 'organism': 'Klebsiella pneumoniae'}
        mock_extract.return_value = (extracted, ['gender'], None)
        pdf_file = SimpleUploadedFile('report.pdf', b'%PDF-1.4 fake body', content_type='application/pdf')

        response = self._post(pdf_file)

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['success'], True)
        self.assertIsNone(body['error'])
        self.assertEqual(body['data']['extracted'], extracted)
        self.assertEqual(body['data']['missing'], ['gender'])
        self.assertEqual(body['data']['extractionAvailable'], True)
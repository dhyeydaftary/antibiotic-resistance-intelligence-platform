"""
Tests for predictor.extract_report_llm -- LLM-based field extraction from
PDF report text (called from views.py's extract_report_view).

No real Gemini call is ever made here: google.genai.Client is mocked at its
predictor.extract_report_llm.* import site, following the established
convention in test_ai_insights.py. The module-level decouple_config usage
is also mocked where needed so tests can control whether an API key is
treated as configured or not.

Plain unittest.TestCase throughout (no Django client or DB needed).
"""

import json
from unittest import TestCase
from unittest.mock import MagicMock, patch

from predictor.extract_report_llm import (
    FIELD_SCHEMA,
    _strip_code_fences,
    build_prompt,
    extract_report_fields_llm,
)


# ---------------------------------------------------------------------------
# build_prompt
# ---------------------------------------------------------------------------

class BuildPromptTests(TestCase):
    def test_includes_all_field_names_in_the_prompt(self):
        prompt = build_prompt("Patient: John, Age: 45")
        for field in FIELD_SCHEMA:
            self.assertIn(field, prompt)

    def test_includes_the_report_text_verbatim(self):
        report = "Temperature: 38.5, WBC: 12.3"
        prompt = build_prompt(report)
        self.assertIn(report, prompt)

    def test_includes_field_descriptions(self):
        prompt = build_prompt("anything")
        # 'age' maps to "integer, patient age in years"
        self.assertIn("integer, patient age in years", prompt)

    def test_lists_allowed_organism_values_in_the_prompt(self):
        prompt = build_prompt("anything")
        self.assertIn("Escherichia coli", prompt)

    def test_prompt_instructs_to_return_only_valid_json(self):
        prompt = build_prompt("anything")
        self.assertIn("Return ONLY valid JSON", prompt)


# ---------------------------------------------------------------------------
# _strip_code_fences
# ---------------------------------------------------------------------------

class StripCodeFencesTests(TestCase):
    def test_strips_json_code_fence(self):
        text = '```json\n{"age": 45}\n```'
        self.assertEqual(_strip_code_fences(text), '{"age": 45}')

    def test_strips_bare_code_fence_without_json_tag(self):
        text = '```\n{"age": 45}\n```'
        self.assertEqual(_strip_code_fences(text), '{"age": 45}')

    def test_leaves_plain_json_unchanged_aside_from_whitespace(self):
        text = '  {"age": 45}  '
        self.assertEqual(_strip_code_fences(text), '{"age": 45}')

    def test_handles_empty_string(self):
        self.assertEqual(_strip_code_fences(''), '')


# ---------------------------------------------------------------------------
# extract_report_fields_llm
# ---------------------------------------------------------------------------

def _make_mock_client(raw_response_text):
    """Returns a mock genai.Client whose models.generate_content() returns
    a response object with .text = raw_response_text."""
    mock_response = MagicMock()
    mock_response.text = raw_response_text
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response
    return mock_client


class ExtractReportFieldsLlmTests(TestCase):
    # ---- API-key-absent path ----

    def test_returns_empty_dict_all_fields_missing_and_error_when_no_api_key(self):
        with patch.dict('os.environ', {}, clear=True), \
             patch('predictor.extract_report_llm.decouple_config', None):
            result, missing, error = extract_report_fields_llm("some report text", api_key=None)

        self.assertEqual(result, {})
        self.assertEqual(missing, list(FIELD_SCHEMA.keys()))
        self.assertIsNotNone(error)
        self.assertIn('GEMINI_API_KEY', error)

    def test_uses_api_key_from_environment_when_none_passed(self):
        """If GEMINI_API_KEY env var is set, extract_report_fields_llm should
        not return the 'not configured' error."""
        # We'll make the fake Gemini client return valid JSON with all nulls.
        fake_json = json.dumps({k: None for k in FIELD_SCHEMA})
        mock_client = _make_mock_client(fake_json)

        with patch.dict('os.environ', {'GEMINI_API_KEY': 'test-key-env'}), \
             patch('predictor.extract_report_llm.decouple_config', None), \
             patch('predictor.extract_report_llm.genai.Client', return_value=mock_client):
            result, missing, error = extract_report_fields_llm("some report", api_key=None)

        self.assertIsNone(error)

    def test_uses_decouple_config_to_read_api_key_when_env_var_absent(self):
        """If decouple_config is available, the key should be read from it."""
        fake_json = json.dumps({k: None for k in FIELD_SCHEMA})
        mock_client = _make_mock_client(fake_json)
        mock_decouple = MagicMock(return_value='decouple-key')

        with patch.dict('os.environ', {}, clear=True), \
             patch('predictor.extract_report_llm.decouple_config', mock_decouple), \
             patch('predictor.extract_report_llm.genai.Client', return_value=mock_client):
            result, missing, error = extract_report_fields_llm("some report", api_key=None)

        mock_decouple.assert_called_once_with('GEMINI_API_KEY', default=None)
        self.assertIsNone(error)

    # ---- successful extraction ----

    def test_successful_extraction_returns_dict_empty_missing_list_and_none_error(self):
        payload = {k: None for k in FIELD_SCHEMA}
        payload.update({'age': 45, 'gender': 'Male', 'fever': True})
        fake_json = json.dumps(payload)
        mock_client = _make_mock_client(fake_json)

        with patch('predictor.extract_report_llm.genai.Client', return_value=mock_client):
            result, missing, error = extract_report_fields_llm("some report text", api_key='key')

        self.assertIsNone(error)
        self.assertEqual(result['age'], 45)
        self.assertEqual(result['gender'], 'Male')
        self.assertTrue(result['fever'])
        # null fields are still included in result with None value
        self.assertIsNone(result['wbc'])

    def test_none_fields_are_added_to_missing_list(self):
        payload = {k: None for k in FIELD_SCHEMA}
        payload['age'] = 30  # only age is present
        fake_json = json.dumps(payload)
        mock_client = _make_mock_client(fake_json)

        with patch('predictor.extract_report_llm.genai.Client', return_value=mock_client):
            _, missing, _ = extract_report_fields_llm("report", api_key='key')

        # Every field except 'age' should be in missing
        self.assertNotIn('age', missing)
        self.assertIn('gender', missing)
        self.assertEqual(len(missing), len(FIELD_SCHEMA) - 1)

    def test_all_fields_present_produces_empty_missing_list(self):
        payload = {k: 1 for k in FIELD_SCHEMA}  # all non-None
        fake_json = json.dumps(payload)
        mock_client = _make_mock_client(fake_json)

        with patch('predictor.extract_report_llm.genai.Client', return_value=mock_client):
            _, missing, error = extract_report_fields_llm("report", api_key='key')

        self.assertEqual(missing, [])
        self.assertIsNone(error)

    # ---- JSON-fence stripping ----

    def test_strips_code_fence_from_gemini_response_before_parsing(self):
        payload = {k: None for k in FIELD_SCHEMA}
        payload['age'] = 55
        fenced_json = f"```json\n{json.dumps(payload)}\n```"
        mock_client = _make_mock_client(fenced_json)

        with patch('predictor.extract_report_llm.genai.Client', return_value=mock_client):
            result, _, error = extract_report_fields_llm("report", api_key='key')

        self.assertIsNone(error)
        self.assertEqual(result['age'], 55)

    # ---- exception / fallback path ----

    def test_api_exception_returns_empty_dict_all_missing_fields_and_error_message(self):
        mock_client = MagicMock()
        mock_client.models.generate_content.side_effect = RuntimeError("Network timeout")

        with patch('predictor.extract_report_llm.genai.Client', return_value=mock_client):
            result, missing, error = extract_report_fields_llm("report", api_key='key')

        self.assertEqual(result, {})
        self.assertEqual(missing, list(FIELD_SCHEMA.keys()))
        self.assertIsNotNone(error)
        self.assertIn('Extraction failed', error)
        self.assertIn('Network timeout', error)

    def test_malformed_json_response_returns_empty_dict_all_missing_and_error(self):
        mock_client = _make_mock_client("not valid json {{{")

        with patch('predictor.extract_report_llm.genai.Client', return_value=mock_client):
            result, missing, error = extract_report_fields_llm("report", api_key='key')

        self.assertEqual(result, {})
        self.assertEqual(missing, list(FIELD_SCHEMA.keys()))
        self.assertIsNotNone(error)
        self.assertIn('Extraction failed', error)

    def test_explicit_api_key_argument_bypasses_env_and_decouple_lookup(self):
        """An explicit api_key= should be used directly, not overwritten by env
        or decouple."""
        fake_json = json.dumps({k: None for k in FIELD_SCHEMA})
        mock_client = _make_mock_client(fake_json)
        mock_decouple = MagicMock()

        with patch.dict('os.environ', {}, clear=True), \
             patch('predictor.extract_report_llm.decouple_config', mock_decouple), \
             patch('predictor.extract_report_llm.genai.Client', return_value=mock_client):
            _, _, error = extract_report_fields_llm("report", api_key='explicit-key')

        # decouple_config should NOT have been called -- api_key was explicit
        mock_decouple.assert_not_called()
        self.assertIsNone(error)

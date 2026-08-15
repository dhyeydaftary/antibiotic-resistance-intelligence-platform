"""
Tests for predictor.ai_insights -- see that module's own header comment
first (two-tier generation strategy: deterministic template numbers are
always computed first, then generate_ai_insights() best-effort tries to
replace the summary/next-steps text with a Gemini-authored version,
falling back transparently to the template on any failure).

No real Gemini call is ever made here: google.genai.Client is mocked at
its predictor.ai_insights.* import site throughout. Similarly,
get_similar_historical_cases' real CSV read (predictor.ai_insights.
_load_data / _load_antibiotic_columns) is mocked with a small in-memory
DataFrame rather than hitting ml_artifacts/cleaned_dataset.csv, both to
keep these tests fast and to make the "which rows match" logic exactly
controllable. _load_data/_load_antibiotic_columns' own lazy-load/caching
bodies are intentionally NOT separately tested here -- out of scope per
this expansion's brief (Gemini formatting/error-handling/fallback logic
is the priority, not the CSV-caching wrapper).

These are plain unittest.TestCase (not django.test.TestCase, unlike
test_views.py/test_middleware.py) since nothing here touches Django's
test client or a database -- every target is a plain Python function.
Mocking still follows this package's established unittest.mock.patch
convention throughout.
"""

import json
from unittest import TestCase
from unittest.mock import patch

import pandas as pd

from predictor.ai_insights import (
    _build_confidence_text,
    _build_grounding_facts,
    _build_plain_explanation,
    _build_summary,
    _generate_llm_summary_and_next_steps,
    _humanize_feature,
    _is_named_category_present,
    _join_names,
    _pct,
    _strip_code_fences,
    generate_ai_insights,
    get_similar_historical_cases,
)


# Builds a minimal prediction dict matching predict.py's real output shape.
def make_prediction(antibiotic, result, confidence, aware_category='Access', shap=None):
    return {
        'antibiotic': antibiotic,
        'result': result,
        'confidence': confidence,
        'awareCategory': aware_category,
        'shapExplanation': shap if shap is not None else [],
    }


def shap_feature(feature, contribution, value):
    return {'feature': feature, 'contribution': contribution, 'direction': 'positive' if contribution > 0 else 'negative', 'value': value}


class PctTests(TestCase):
    def test_rounds_a_fraction_of_total_to_a_whole_percentage(self):
        self.assertEqual(_pct(3, 10), 30)

    def test_returns_zero_for_a_zero_total_instead_of_dividing_by_zero(self):
        self.assertEqual(_pct(0, 0), 0)


class JoinNamesTests(TestCase):
    def test_a_single_name_is_returned_as_is(self):
        self.assertEqual(_join_names(['CIP']), 'CIP')

    def test_two_names_are_joined_with_and(self):
        self.assertEqual(_join_names(['CIP', 'GEN']), 'CIP and GEN')

    def test_three_or_more_names_use_oxford_comma_style(self):
        self.assertEqual(_join_names(['CIP', 'GEN', 'AN']), 'CIP, GEN, and AN')

    def test_accepts_a_generator_not_just_a_list(self):
        self.assertEqual(_join_names(a for a in ['CIP', 'GEN']), 'CIP and GEN')


class IsNamedCategoryPresentTests(TestCase):
    def test_organism_dummy_is_present_only_when_value_is_1(self):
        self.assertTrue(_is_named_category_present('Organism_Escherichia coli', 1))
        self.assertFalse(_is_named_category_present('Organism_Escherichia coli', 0))

    def test_specimen_source_dummy_is_present_only_when_value_is_1(self):
        self.assertTrue(_is_named_category_present('Specimen_Source_Blood', 1))
        self.assertFalse(_is_named_category_present('Specimen_Source_Blood', 0))

    def test_a_non_dummy_feature_is_always_treated_as_present(self):
        self.assertTrue(_is_named_category_present('WBC', 0))
        self.assertTrue(_is_named_category_present('WBC', None))


class HumanizeFeatureTests(TestCase):
    def test_a_mapped_feature_returns_its_readable_phrase(self):
        self.assertEqual(_humanize_feature('WBC'), 'white blood cell count')

    def test_an_unmapped_organism_dummy_is_humanized_by_prefix_stripping(self):
        self.assertEqual(_humanize_feature('Organism_Escherichia coli'), 'the organism (Escherichia coli)')

    def test_an_unmapped_specimen_source_dummy_is_humanized_by_prefix_stripping(self):
        self.assertEqual(_humanize_feature('Specimen_Source_Blood'), 'the specimen source (Blood)')

    def test_a_completely_unknown_feature_name_is_returned_unchanged(self):
        self.assertEqual(_humanize_feature('Some_Future_Feature'), 'Some_Future_Feature')


class StripCodeFencesTests(TestCase):
    def test_strips_a_json_code_fence(self):
        text = '```json\n{"a": 1}\n```'
        self.assertEqual(_strip_code_fences(text), '{"a": 1}')

    def test_strips_a_bare_code_fence_without_the_json_language_tag(self):
        text = '```\n{"a": 1}\n```'
        self.assertEqual(_strip_code_fences(text), '{"a": 1}')

    def test_leaves_unfenced_text_unchanged_aside_from_surrounding_whitespace(self):
        self.assertEqual(_strip_code_fences('  {"a": 1}  '), '{"a": 1}')


# Tests _build_summary's five opening-line branches (no resistance / all
# resistant / heavy resistance / light resistance / mixed), plus its two
# mutually-exclusive tail notes (Reserve-tier callout, else Watch-tier).
class BuildSummaryTests(TestCase):
    def test_no_resistance_at_all(self):
        summary = _build_summary([], [{'x': 1}] * 5, [], 5, [], [])
        self.assertEqual(
            summary,
            "All 5 antibiotics evaluated show predicted susceptibility or an intermediate "
            "response — no resistance was flagged for this profile."
        )

    def test_every_antibiotic_resistant(self):
        resistant = [{'antibiotic': 'CIP'}, {'antibiotic': 'GEN'}, {'antibiotic': 'AN'}]
        summary = _build_summary(resistant, [], [], 3, [], [])
        self.assertEqual(
            summary,
            "Every antibiotic in the panel — all 3 — is predicted resistant for this profile, "
            "a result worth flagging prominently."
        )

    def test_heavy_resistance_at_or_above_60_percent(self):
        resistant = [{'antibiotic': f'AB{i}'} for i in range(7)]
        susceptible = [{'antibiotic': f'S{i}'} for i in range(3)]
        summary = _build_summary(resistant, susceptible, [], 10, [], [])
        self.assertEqual(
            summary,
            "Resistance dominates this panel: 7 of 10 antibiotics (70%) are predicted resistant, "
            "against 3 susceptible (30%)."
        )

    def test_light_resistance_at_or_below_20_percent(self):
        resistant = [{'antibiotic': f'AB{i}'} for i in range(2)]
        susceptible = [{'antibiotic': f'S{i}'} for i in range(8)]
        summary = _build_summary(resistant, susceptible, [], 10, [], [])
        self.assertEqual(
            summary,
            "Most of the panel remains viable — 8 of 10 antibiotics (80%) are predicted "
            "susceptible, with resistance limited to 2 (20%)."
        )

    def test_mixed_results_between_the_two_thresholds(self):
        resistant = [{'antibiotic': f'AB{i}'} for i in range(4)]
        susceptible = [{'antibiotic': f'S{i}'} for i in range(5)]
        intermediate = [{'antibiotic': f'I{i}'} for i in range(1)]
        summary = _build_summary(resistant, susceptible, intermediate, 10, [], [])
        self.assertEqual(
            summary,
            "The panel is mixed: 4 of 10 antibiotics (40%) are predicted resistant, 5 (50%) "
            "susceptible, and 1 intermediate."
        )

    def test_reserve_tier_resistance_is_called_out_with_singular_grammar_for_one(self):
        resistant = [{'antibiotic': 'COL'}]
        summary = _build_summary(resistant, [], [], 1, [{'antibiotic': 'COL'}], [])
        self.assertTrue(summary.endswith(
            "Of particular note, COL — a Reserve-tier antibiotic, normally held back for "
            "infections resistant to multiple drugs — is among the resistant predictions."
        ))

    def test_reserve_tier_resistance_uses_plural_grammar_for_more_than_one(self):
        resistant = [{'antibiotic': 'COL'}, {'antibiotic': 'PMB'}]
        summary = _build_summary(resistant, [], [], 2, [{'antibiotic': 'COL'}, {'antibiotic': 'PMB'}], [])
        self.assertTrue(summary.endswith(
            "Of particular note, COL and PMB — a Reserve-tier antibiotics, normally held back "
            "for infections resistant to multiple drugs — are among the resistant predictions."
        ))

    def test_watch_tier_note_only_appears_when_no_reserve_tier_resistance(self):
        resistant = [{'antibiotic': 'CIP'}]
        summary = _build_summary(resistant, [], [], 1, [], [{'antibiotic': 'CIP'}])
        self.assertTrue(summary.endswith(
            "This includes CIP, classified under the WHO AWaRe Watch tier."
        ))

    def test_reserve_tier_note_takes_priority_over_watch_tier_note(self):
        resistant = [{'antibiotic': 'COL'}, {'antibiotic': 'CIP'}]
        summary = _build_summary(
            resistant, [], [], 2,
            [{'antibiotic': 'COL'}],
            [{'antibiotic': 'CIP'}],
        )
        self.assertIn('Reserve-tier', summary)
        self.assertNotIn('WHO AWaRe Watch tier', summary)


# Tests _build_confidence_text's low/high confidence branches.
class BuildConfidenceTextTests(TestCase):
    def test_no_low_confidence_predictions(self):
        predictions = [{'confidence': 0.9}, {'confidence': 0.9}]
        text = _build_confidence_text(predictions, [], [])
        self.assertEqual(text, "Model confidence is consistently strong across the panel, averaging 90%.")

    def test_exactly_one_low_confidence_prediction(self):
        predictions = [{'confidence': 0.9}, {'confidence': 0.5}]
        low = [{'antibiotic': 'CIP', 'confidence': 0.5}]
        text = _build_confidence_text(predictions, low, [])
        self.assertEqual(
            text,
            "Confidence averages 70% across the panel, though the CIP prediction sits at just "
            "50% and should be treated as directional rather than definitive."
        )

    def test_multiple_low_confidence_predictions_name_the_least_certain(self):
        predictions = [{'confidence': 0.9}, {'confidence': 0.5}, {'confidence': 0.4}]
        low = [{'antibiotic': 'CIP', 'confidence': 0.5}, {'antibiotic': 'GEN', 'confidence': 0.4}]
        text = _build_confidence_text(predictions, low, [])
        self.assertEqual(
            text,
            "Confidence averages 60% overall, but CIP and GEN fall below the 60% threshold — "
            "GEN is the least certain at 40%."
        )

    def test_high_confidence_suffix_uses_singular_grammar_for_one(self):
        predictions = [{'confidence': 0.9}, {'confidence': 0.9}]
        high = [{'antibiotic': 'CIP', 'confidence': 0.9}]
        text = _build_confidence_text(predictions, [], high)
        self.assertEqual(
            text,
            "Model confidence is consistently strong across the panel, averaging 90%. "
            "CIP is the most confidently predicted, each above 85%."
        )

    def test_high_confidence_suffix_uses_plural_grammar_for_two_to_four(self):
        predictions = [{'confidence': 0.9}, {'confidence': 0.9}]
        high = [{'antibiotic': 'CIP', 'confidence': 0.9}, {'antibiotic': 'GEN', 'confidence': 0.88}]
        text = _build_confidence_text(predictions, [], high)
        self.assertEqual(
            text,
            "Model confidence is consistently strong across the panel, averaging 90%. "
            "CIP and GEN are the most confidently predicted, each above 85%."
        )

    def test_high_confidence_suffix_switches_to_a_count_above_four(self):
        predictions = [{'confidence': 0.9}, {'confidence': 0.9}]
        high = [{'antibiotic': f'AB{i}', 'confidence': 0.9} for i in range(5)]
        text = _build_confidence_text(predictions, [], high)
        self.assertEqual(
            text,
            "Model confidence is consistently strong across the panel, averaging 90%. "
            "5 predictions exceed 85% confidence."
        )


# Tests _build_plain_explanation's driver-detection and coverage-wording branches.
class BuildPlainExplanationTests(TestCase):
    def test_no_resistant_predictions(self):
        text = _build_plain_explanation([], 5)
        self.assertEqual(
            text,
            "No resistance was predicted across the panel for this patient profile, so no single "
            "clinical factor stands out as a driver of concern."
        )

    def test_falls_back_when_no_feature_is_actually_attributable_to_the_patient(self):
        # Every resistant prediction's top SHAP feature is a one-hot dummy
        # whose value is 0 for this patient -- _is_named_category_present
        # vetoes naming it, so no driver can be chosen at all.
        resistant = [
            make_prediction('CIP', 'R', 0.7, shap=[shap_feature('Organism_Klebsiella pneumoniae', 0.5, 0)]),
            make_prediction('GEN', 'R', 0.7, shap=[shap_feature('Specimen_Source_Blood', 0.3, 0)]),
        ]
        text = _build_plain_explanation(resistant, 5)
        self.assertEqual(
            text,
            "2 of 5 antibiotics are predicted resistant, based on the patient profile and organism provided."
        )

    def test_a_driver_shared_by_every_resistant_prediction(self):
        resistant = [
            make_prediction('CIP', 'R', 0.7, shap=[shap_feature('WBC', 0.5, 15)]),
            make_prediction('GEN', 'R', 0.7, shap=[shap_feature('WBC', 0.6, 15)]),
        ]
        text = _build_plain_explanation(resistant, 2)
        self.assertEqual(
            text,
            "White blood cell count is the strongest recurring signal behind the resistant "
            "predictions, showing up as the top contributing factor for every resistant prediction."
        )

    def test_a_driver_shared_by_at_least_half_but_not_all_resistant_predictions(self):
        resistant = [
            make_prediction('CIP', 'R', 0.7, shap=[shap_feature('WBC', 0.5, 15)]),
            make_prediction('GEN', 'R', 0.7, shap=[shap_feature('WBC', 0.5, 15)]),
            make_prediction('IPM', 'R', 0.7, shap=[shap_feature('CRP', 0.3, 100)]),
            make_prediction('AN', 'R', 0.7, shap=[shap_feature('CRP', 0.3, 100)]),
        ]
        text = _build_plain_explanation(resistant, 4)
        self.assertEqual(
            text,
            "White blood cell count is the strongest recurring signal behind the resistant "
            "predictions, showing up as the top contributing factor for most of the resistant "
            "predictions (CIP and GEN)."
        )

    def test_a_driver_shared_by_fewer_than_half_of_resistant_predictions(self):
        resistant = [
            make_prediction('CIP', 'R', 0.7, shap=[shap_feature('WBC', 0.9, 15)]),
            make_prediction('GEN', 'R', 0.7, shap=[shap_feature('CRP', 0.3, 100)]),
            make_prediction('IPM', 'R', 0.7, shap=[shap_feature('Creatinine', 0.3, 2)]),
            make_prediction('AN', 'R', 0.7, shap=[shap_feature('Temperature', 0.3, 39)]),
            make_prediction('COL', 'R', 0.7, shap=[shap_feature('Heart_Rate', 0.3, 110)]),
        ]
        text = _build_plain_explanation(resistant, 5)
        self.assertEqual(
            text,
            "White blood cell count is the strongest recurring signal behind the resistant "
            "predictions, showing up as the top contributing factor for several resistant "
            "predictions, including CIP."
        )

    def test_skips_a_vetoed_leading_feature_and_uses_the_next_attributable_one(self):
        # CIP's top SHAP feature is a dummy that isn't actually present for
        # this patient (value 0) -- the function should walk past it to the
        # next feature in that prediction's own ranked list, not just bail.
        resistant = [
            make_prediction('CIP', 'R', 0.7, shap=[
                shap_feature('Organism_Klebsiella pneumoniae', 0.6, 0),
                shap_feature('WBC', 0.5, 15),
            ]),
        ]
        text = _build_plain_explanation(resistant, 1)
        self.assertIn('White blood cell count', text)


class BuildGroundingFactsTests(TestCase):
    def test_assembles_the_expected_plain_facts_dict(self):
        resistant = [make_prediction('CIP', 'R', 0.7)]
        susceptible = [make_prediction('GEN', 'S', 0.9)]
        intermediate = [make_prediction('AN', 'I', 0.75)]
        reserve_resistant = [make_prediction('COL', 'R', 0.6, 'Reserve')]
        watch_resistant = [make_prediction('CIP', 'R', 0.7, 'Watch')]
        access_resistant = []
        low_confidence = [make_prediction('CIP', 'R', 0.512345)]
        high_confidence = [make_prediction('GEN', 'S', 0.9)]
        historical_cases = {'sampleSize': 7, 'matchCriteria': 'x', 'resistanceBreakdown': []}

        facts = _build_grounding_facts(
            resistant, susceptible, intermediate, 3,
            reserve_resistant, watch_resistant, access_resistant,
            low_confidence, high_confidence, historical_cases, 'High',
        )

        self.assertEqual(facts, {
            'total_antibiotics': 3,
            'resistant_count': 1,
            'susceptible_count': 1,
            'intermediate_count': 1,
            'resistant_antibiotics': ['CIP'],
            'susceptible_antibiotics': ['GEN'],
            'reserve_tier_resistant': ['COL'],
            'watch_tier_resistant': ['CIP'],
            'access_tier_resistant': [],
            'low_confidence_antibiotics': [{'antibiotic': 'CIP', 'confidence': 0.51}],
            'high_confidence_antibiotics': ['GEN'],
            'risk_level': 'High',
            'similar_historical_case_count': 7,
        })


# Tests _generate_llm_summary_and_next_steps -- the only part of this
# module that actually talks to Gemini. genai.Client is mocked throughout;
# no real network call is ever made.
class GenerateLlmSummaryAndNextStepsTests(TestCase):
    def _facts(self):
        return {'total_antibiotics': 1}

    @patch('predictor.ai_insights.os.environ.get', return_value=None)
    @patch('predictor.ai_insights.decouple_config', return_value=None)
    def test_missing_api_key_returns_a_config_error_without_calling_gemini(self, mock_decouple, mock_environ_get):
        with patch('predictor.ai_insights.genai.Client') as mock_client_cls:
            summary, next_steps, error = _generate_llm_summary_and_next_steps(self._facts())

        self.assertIsNone(summary)
        self.assertIsNone(next_steps)
        self.assertEqual(error, 'GEMINI_API_KEY not configured')
        mock_client_cls.assert_not_called()

    @patch('predictor.ai_insights.decouple_config', return_value='fake-api-key')
    def test_an_exception_constructing_or_calling_the_client_is_caught_and_reported(self, mock_decouple):
        with patch('predictor.ai_insights.genai.Client', side_effect=Exception('connection refused')):
            summary, next_steps, error = _generate_llm_summary_and_next_steps(self._facts())

        self.assertIsNone(summary)
        self.assertIsNone(next_steps)
        self.assertEqual(error, 'Gemini insight generation failed: connection refused')

    @patch('predictor.ai_insights.decouple_config', return_value='fake-api-key')
    def test_a_non_json_response_is_caught_and_reported(self, mock_decouple):
        with patch('predictor.ai_insights.genai.Client') as mock_client_cls:
            mock_client_cls.return_value.models.generate_content.return_value.text = 'not json at all'
            summary, next_steps, error = _generate_llm_summary_and_next_steps(self._facts())

        self.assertIsNone(summary)
        self.assertIsNone(next_steps)
        self.assertIn('Gemini insight generation failed', error)

    @patch('predictor.ai_insights.decouple_config', return_value='fake-api-key')
    def test_a_response_missing_summary_is_reported_as_missing_fields(self, mock_decouple):
        with patch('predictor.ai_insights.genai.Client') as mock_client_cls:
            mock_client_cls.return_value.models.generate_content.return_value.text = json.dumps({
                'recommendedNextSteps': ['a', 'b'],
            })
            summary, next_steps, error = _generate_llm_summary_and_next_steps(self._facts())

        self.assertIsNone(summary)
        self.assertIsNone(next_steps)
        self.assertEqual(error, 'Gemini response missing expected fields')

    @patch('predictor.ai_insights.decouple_config', return_value='fake-api-key')
    def test_a_response_with_an_empty_next_steps_list_is_reported_as_missing_fields(self, mock_decouple):
        with patch('predictor.ai_insights.genai.Client') as mock_client_cls:
            mock_client_cls.return_value.models.generate_content.return_value.text = json.dumps({
                'summary': 'A summary.',
                'recommendedNextSteps': [],
            })
            summary, next_steps, error = _generate_llm_summary_and_next_steps(self._facts())

        self.assertIsNone(summary)
        self.assertIsNone(next_steps)
        self.assertEqual(error, 'Gemini response missing expected fields')

    @patch('predictor.ai_insights.decouple_config', return_value='fake-api-key')
    def test_a_response_with_next_steps_not_a_list_is_reported_as_missing_fields(self, mock_decouple):
        with patch('predictor.ai_insights.genai.Client') as mock_client_cls:
            mock_client_cls.return_value.models.generate_content.return_value.text = json.dumps({
                'summary': 'A summary.',
                'recommendedNextSteps': 'just a string, not a list',
            })
            summary, next_steps, error = _generate_llm_summary_and_next_steps(self._facts())

        self.assertIsNone(summary)
        self.assertIsNone(next_steps)
        self.assertEqual(error, 'Gemini response missing expected fields')

    @patch('predictor.ai_insights.decouple_config', return_value='fake-api-key')
    def test_a_well_formed_response_wrapped_in_code_fences_is_parsed_successfully(self, mock_decouple):
        payload = {'summary': 'A concise summary.', 'recommendedNextSteps': ['Step one.', 'Step two.']}
        with patch('predictor.ai_insights.genai.Client') as mock_client_cls:
            mock_client_cls.return_value.models.generate_content.return_value.text = (
                '```json\n' + json.dumps(payload) + '\n```'
            )
            summary, next_steps, error = _generate_llm_summary_and_next_steps(self._facts())

        self.assertEqual(summary, 'A concise summary.')
        self.assertEqual(next_steps, ['Step one.', 'Step two.'])
        self.assertIsNone(error)

    @patch('predictor.ai_insights.decouple_config', return_value='fake-api-key')
    def test_a_well_formed_response_without_code_fences_is_parsed_successfully(self, mock_decouple):
        payload = {'summary': 'A concise summary.', 'recommendedNextSteps': ['Step one.', 'Step two.']}
        with patch('predictor.ai_insights.genai.Client') as mock_client_cls:
            mock_client_cls.return_value.models.generate_content.return_value.text = json.dumps(payload)
            summary, next_steps, error = _generate_llm_summary_and_next_steps(self._facts())

        self.assertEqual(summary, 'A concise summary.')
        self.assertEqual(next_steps, ['Step one.', 'Step two.'])
        self.assertIsNone(error)
        mock_client_cls.return_value.models.generate_content.assert_called_once()
        call_kwargs = mock_client_cls.return_value.models.generate_content.call_args.kwargs
        self.assertEqual(call_kwargs['model'], 'gemini-flash-latest')


# Tests get_similar_historical_cases against a small, fully-controlled
# in-memory DataFrame -- the real ml_artifacts/cleaned_dataset.csv is
# never read.
class GetSimilarHistoricalCasesTests(TestCase):
    @patch('predictor.ai_insights._load_antibiotic_columns')
    @patch('predictor.ai_insights._load_data')
    def test_no_matching_patients_returns_a_zero_sample_size_with_empty_breakdown(self, mock_load_data, mock_load_columns):
        mock_load_data.return_value = pd.DataFrame({
            'Organism': ['Klebsiella pneumoniae'],
            'Age': [40],
            'CIP': ['R'],
        })
        mock_load_columns.return_value = ['CIP']

        result = get_similar_historical_cases('Escherichia coli', 30)

        self.assertEqual(result['sampleSize'], 0)
        self.assertEqual(result['matchCriteria'], 'Escherichia coli, age 25-35')
        self.assertEqual(result['resistanceBreakdown'], [])

    @patch('predictor.ai_insights._load_antibiotic_columns')
    @patch('predictor.ai_insights._load_data')
    def test_matching_patients_produce_a_rate_sorted_breakdown_ignoring_missing_values(self, mock_load_data, mock_load_columns):
        mock_load_data.return_value = pd.DataFrame({
            'Organism': ['Escherichia coli'] * 4,
            'Age': [30, 32, 28, 31],
            'CIP': ['R', 'R', 'S', None],
            'GEN': ['S', 'S', 'S', 'S'],
        })
        mock_load_columns.return_value = ['CIP', 'GEN']

        result = get_similar_historical_cases('Escherichia coli', 30)

        self.assertEqual(result['sampleSize'], 4)
        self.assertEqual(result['matchCriteria'], 'Escherichia coli, age 25-35')
        breakdown = result['resistanceBreakdown']
        self.assertEqual(breakdown[0]['antibiotic'], 'CIP')
        self.assertEqual(breakdown[0]['resistantRate'], round(2 / 3, 4))
        self.assertEqual(breakdown[0]['recordsConsidered'], 3)  # the None is dropped, not counted
        self.assertEqual(breakdown[1]['antibiotic'], 'GEN')
        self.assertEqual(breakdown[1]['resistantRate'], 0.0)
        self.assertEqual(breakdown[1]['recordsConsidered'], 4)

    @patch('predictor.ai_insights._load_antibiotic_columns')
    @patch('predictor.ai_insights._load_data')
    def test_patients_outside_the_age_band_or_a_different_organism_are_excluded(self, mock_load_data, mock_load_columns):
        mock_load_data.return_value = pd.DataFrame({
            'Organism': ['Escherichia coli', 'Escherichia coli', 'Klebsiella pneumoniae'],
            'Age': [30, 50, 30],  # 50 is outside the ±5 band around 30
            'CIP': ['R', 'R', 'R'],
        })
        mock_load_columns.return_value = ['CIP']

        result = get_similar_historical_cases('Escherichia coli', 30)

        self.assertEqual(result['sampleSize'], 1)

    @patch('predictor.ai_insights._load_antibiotic_columns')
    @patch('predictor.ai_insights._load_data')
    def test_an_antibiotic_column_that_is_entirely_missing_for_the_matched_subset_is_skipped(self, mock_load_data, mock_load_columns):
        # CIP was simply never recorded for any matching patient (not even
        # tested) -- it must be left out of the breakdown entirely, not
        # reported as a 0% or NaN resistance rate.
        mock_load_data.return_value = pd.DataFrame({
            'Organism': ['Escherichia coli'],
            'Age': [30],
            'CIP': [None],
            'GEN': ['R'],
        })
        mock_load_columns.return_value = ['CIP', 'GEN']

        result = get_similar_historical_cases('Escherichia coli', 30)

        antibiotics_reported = [row['antibiotic'] for row in result['resistanceBreakdown']]
        self.assertNotIn('CIP', antibiotics_reported)
        self.assertIn('GEN', antibiotics_reported)


# Integration-level tests for generate_ai_insights() -- the entry point
# called from views.py. _generate_llm_summary_and_next_steps and
# get_similar_historical_cases are mocked at their predictor.ai_insights.*
# import site (each already has its own dedicated coverage above), so
# what's under test here is generate_ai_insights' own orchestration: risk
# -level branching, and the Gemini-success-vs-template-fallback switch.
class GenerateAiInsightsTests(TestCase):
    PATIENT_DATA = {'organism': 'Escherichia coli', 'age': 45}
    EMPTY_HISTORY = {'sampleSize': 0, 'matchCriteria': 'x', 'resistanceBreakdown': []}

    @patch('predictor.ai_insights.get_similar_historical_cases')
    @patch('predictor.ai_insights._generate_llm_summary_and_next_steps')
    def test_uses_the_gemini_summary_and_next_steps_when_available(self, mock_llm, mock_history):
        mock_llm.return_value = ('LLM-authored summary.', ['LLM step one.', 'LLM step two.'], None)
        mock_history.return_value = self.EMPTY_HISTORY
        predictions = [make_prediction('CIP', 'S', 0.9)]

        result = generate_ai_insights(self.PATIENT_DATA, predictions)

        self.assertEqual(result['summary'], 'LLM-authored summary.')
        self.assertEqual(result['recommendedNextSteps'], ['LLM step one.', 'LLM step two.'])

    @patch('predictor.ai_insights.get_similar_historical_cases')
    @patch('predictor.ai_insights._generate_llm_summary_and_next_steps')
    def test_falls_back_to_the_template_when_gemini_is_unavailable(self, mock_llm, mock_history):
        mock_llm.return_value = (None, None, 'GEMINI_API_KEY not configured')
        mock_history.return_value = {'sampleSize': 5, 'matchCriteria': 'x', 'resistanceBreakdown': []}
        predictions = [
            make_prediction('COL', 'R', 0.5, 'Reserve'),
            make_prediction('GEN', 'S', 0.9, 'Access'),
        ]

        result = generate_ai_insights(self.PATIENT_DATA, predictions)

        self.assertNotEqual(result['summary'], None)
        next_steps = result['recommendedNextSteps']
        self.assertEqual(
            next_steps[0],
            "Confirm findings with laboratory-based antibiotic susceptibility testing before any treatment decision."
        )
        self.assertTrue(any('Review the SHAP explainability breakdown for COL' in s for s in next_steps))
        self.assertTrue(any('Consult infectious disease guidance' in s for s in next_steps))
        self.assertTrue(any('as directional only' in s for s in next_steps))  # COL's confidence (0.5) is low
        self.assertTrue(any('5 similar historical cases' in s for s in next_steps))

    @patch('predictor.ai_insights.get_similar_historical_cases')
    @patch('predictor.ai_insights._generate_llm_summary_and_next_steps')
    def test_template_next_steps_use_the_generic_shap_step_when_nothing_is_resistant(self, mock_llm, mock_history):
        mock_llm.return_value = (None, None, 'GEMINI_API_KEY not configured')
        mock_history.return_value = self.EMPTY_HISTORY
        predictions = [make_prediction('GEN', 'S', 0.9, 'Access')]

        result = generate_ai_insights(self.PATIENT_DATA, predictions)

        next_steps = result['recommendedNextSteps']
        self.assertIn(
            "Review the SHAP explainability breakdown for each antibiotic to understand contributing factors.",
            next_steps,
        )
        self.assertFalse(any('Consult infectious disease guidance' in s for s in next_steps))

    @patch('predictor.ai_insights.get_similar_historical_cases')
    @patch('predictor.ai_insights._generate_llm_summary_and_next_steps')
    def test_template_next_steps_recommend_consulting_guidance_for_three_or_more_watch_tier_resistant(self, mock_llm, mock_history):
        mock_llm.return_value = (None, None, 'GEMINI_API_KEY not configured')
        mock_history.return_value = self.EMPTY_HISTORY
        predictions = [make_prediction(f'AB{i}', 'R', 0.9, 'Watch') for i in range(3)]

        result = generate_ai_insights(self.PATIENT_DATA, predictions)

        self.assertTrue(any(
            'Consider consulting infectious disease guidance given the limited predicted treatment options.' in s
            for s in result['recommendedNextSteps']
        ))

    @patch('predictor.ai_insights.get_similar_historical_cases')
    @patch('predictor.ai_insights._generate_llm_summary_and_next_steps')
    def test_risk_level_is_high_when_a_reserve_tier_antibiotic_is_resistant(self, mock_llm, mock_history):
        mock_llm.return_value = (None, None, 'err')
        mock_history.return_value = self.EMPTY_HISTORY
        predictions = [
            make_prediction('COL', 'R', 0.7, 'Reserve'),
            make_prediction('GEN', 'S', 0.9, 'Access'),
        ]

        result = generate_ai_insights(self.PATIENT_DATA, predictions)

        self.assertEqual(result['riskAssessment']['level'], 'High')
        self.assertIn('COL', result['riskAssessment']['text'])
        self.assertIn('Reserve-tier', result['riskAssessment']['text'])

    @patch('predictor.ai_insights.get_similar_historical_cases')
    @patch('predictor.ai_insights._generate_llm_summary_and_next_steps')
    def test_risk_level_high_text_uses_plural_grammar_for_more_than_one_reserve_tier_antibiotic(self, mock_llm, mock_history):
        mock_llm.return_value = (None, None, 'err')
        mock_history.return_value = self.EMPTY_HISTORY
        predictions = [
            make_prediction('COL', 'R', 0.7, 'Reserve'),
            make_prediction('PMB', 'R', 0.7, 'Reserve'),
        ]

        result = generate_ai_insights(self.PATIENT_DATA, predictions)

        self.assertEqual(result['riskAssessment']['level'], 'High')
        self.assertIn('these antibiotics are typically held back', result['riskAssessment']['text'])

    @patch('predictor.ai_insights.get_similar_historical_cases')
    @patch('predictor.ai_insights._generate_llm_summary_and_next_steps')
    def test_risk_level_is_moderate_high_with_three_or_more_watch_tier_resistant_and_no_reserve(self, mock_llm, mock_history):
        mock_llm.return_value = (None, None, 'err')
        mock_history.return_value = self.EMPTY_HISTORY
        predictions = [make_prediction(f'AB{i}', 'R', 0.9, 'Watch') for i in range(3)]

        result = generate_ai_insights(self.PATIENT_DATA, predictions)

        self.assertEqual(result['riskAssessment']['level'], 'Moderate-High')

    @patch('predictor.ai_insights.get_similar_historical_cases')
    @patch('predictor.ai_insights._generate_llm_summary_and_next_steps')
    def test_risk_level_is_moderate_with_some_resistance_below_the_high_bars(self, mock_llm, mock_history):
        mock_llm.return_value = (None, None, 'err')
        mock_history.return_value = self.EMPTY_HISTORY
        predictions = [
            make_prediction('AMX', 'R', 0.7, 'Access'),
            make_prediction('GEN', 'S', 0.9, 'Access'),
        ]

        result = generate_ai_insights(self.PATIENT_DATA, predictions)

        self.assertEqual(result['riskAssessment']['level'], 'Moderate')

    @patch('predictor.ai_insights.get_similar_historical_cases')
    @patch('predictor.ai_insights._generate_llm_summary_and_next_steps')
    def test_risk_level_is_low_when_nothing_is_resistant(self, mock_llm, mock_history):
        mock_llm.return_value = (None, None, 'err')
        mock_history.return_value = self.EMPTY_HISTORY
        predictions = [make_prediction('GEN', 'S', 0.9, 'Access')]

        result = generate_ai_insights(self.PATIENT_DATA, predictions)

        self.assertEqual(result['riskAssessment']['level'], 'Low')

    @patch('predictor.ai_insights.get_similar_historical_cases')
    @patch('predictor.ai_insights._generate_llm_summary_and_next_steps')
    def test_response_shape_and_historical_case_passthrough(self, mock_llm, mock_history):
        mock_llm.return_value = ('S.', ['step'], None)
        historical = {'sampleSize': 2, 'matchCriteria': 'Escherichia coli, age 40-50', 'resistanceBreakdown': []}
        mock_history.return_value = historical
        predictions = [make_prediction('GEN', 'S', 0.9, 'Access')]

        result = generate_ai_insights(self.PATIENT_DATA, predictions)

        self.assertEqual(set(result.keys()), {
            'summary', 'confidenceInterpretation', 'plainEnglishExplanation',
            'riskAssessment', 'similarHistoricalCases', 'recommendedNextSteps', 'disclaimer',
        })
        self.assertEqual(set(result['riskAssessment'].keys()), {'level', 'text'})
        self.assertIs(result['similarHistoricalCases'], historical)
        self.assertTrue(result['disclaimer'].startswith(
            "This tool is intended for research and educational purposes only."
        ))
        mock_history.assert_called_once_with('Escherichia coli', 45)

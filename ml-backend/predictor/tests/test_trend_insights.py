"""
Tests for predictor.trend_insights -- backs GET /explain-trend/. Unlike
ai_insights.py, this module makes no external/LLM call at all (see its
own module docstring: "All deterministic/statistical") -- every function
here is a plain, pure computation over an already-fetched resistance-rate
series, so nothing needs mocking. These are plain unittest.TestCase (no
Django test client/DB involved), matching the approach already used in
test_ai_insights.py for this package's other pure-logic modules.
"""

from unittest import TestCase

from predictor.trend_insights import (
    _build_clinical_relevance,
    _build_forecast,
    _build_key_observations,
    _build_possible_causes,
    _build_summary,
    _direction_word,
    _pct,
    _period_to_month_index,
    generate_trend_insights,
)


# Builds a minimal series point matching trends.py's real output shape.
def point(period, rate, sample_size=20):
    return {'period': period, 'resistanceRate': rate, 'sampleSize': sample_size}


class PctTests(TestCase):
    def test_rounds_a_0_to_1_rate_to_a_whole_percentage(self):
        self.assertEqual(_pct(0.256), 26)


class DirectionWordTests(TestCase):
    def test_a_delta_above_the_positive_threshold_is_rising(self):
        self.assertEqual(_direction_word(0.03), 'rising')

    def test_a_delta_below_the_negative_threshold_is_declining(self):
        self.assertEqual(_direction_word(-0.03), 'declining')

    def test_a_delta_within_the_threshold_is_roughly_stable(self):
        self.assertEqual(_direction_word(0.0), 'roughly stable')

    def test_the_threshold_boundary_itself_is_not_yet_rising_or_declining(self):
        self.assertEqual(_direction_word(0.02), 'roughly stable')
        self.assertEqual(_direction_word(-0.02), 'roughly stable')


class PeriodToMonthIndexTests(TestCase):
    def test_converts_a_period_string_into_a_sortable_month_index(self):
        self.assertEqual(_period_to_month_index('2024-06'), 2024 * 12 + 5)

    def test_consecutive_months_differ_by_exactly_one(self):
        self.assertEqual(
            _period_to_month_index('2025-01') - _period_to_month_index('2024-12'), 1
        )


class BuildSummaryTests(TestCase):
    def test_rising_trend_with_full_coverage_and_a_specific_organism(self):
        series = [point('2024-01', 0.2), point('2024-02', 0.35), point('2024-03', 0.5)]
        first, last = series[0], series[-1]
        first_idx, last_idx = _period_to_month_index('2024-01'), _period_to_month_index('2024-03')

        summary = _build_summary('CIP', 'Escherichia coli', series, first, last, first_idx, last_idx)

        self.assertEqual(
            summary,
            "Data is available for 3 of the 3 months between 2024-01 and 2024-03 (100% coverage). "
            "Across the recorded months, resistance to CIP in Escherichia coli has trended rising, "
            "moving from 20% in 2024-01 to 50% in 2024-03."
        )

    def test_organism_all_is_phrased_as_across_all_organisms(self):
        series = [point('2024-01', 0.2), point('2024-02', 0.5)]
        summary = _build_summary(
            'CIP', 'all', series, series[0], series[-1],
            _period_to_month_index('2024-01'), _period_to_month_index('2024-02'),
        )
        self.assertIn('resistance to CIP across all organisms in the dataset', summary)

    def test_stable_trend_uses_the_stayed_roughly_stable_phrasing(self):
        series = [point('2024-01', 0.20), point('2024-02', 0.21)]
        summary = _build_summary(
            'CIP', 'all', series, series[0], series[-1],
            _period_to_month_index('2024-01'), _period_to_month_index('2024-02'),
        )
        self.assertIn(
            'resistance to CIP across all organisms in the dataset has stayed roughly stable, '
            'at 20% in 2024-01 versus 21% in 2024-02',
            summary,
        )

    def test_declining_trend(self):
        series = [point('2024-01', 0.5), point('2024-02', 0.2)]
        summary = _build_summary(
            'CIP', 'all', series, series[0], series[-1],
            _period_to_month_index('2024-01'), _period_to_month_index('2024-02'),
        )
        self.assertIn('has trended declining', summary)

    def test_sparse_coverage_appends_a_caveat_sentence(self):
        # Only 2 recorded points across a 10-month span -> 20% coverage, well below 50%.
        series = [point('2024-01', 0.2), point('2024-10', 0.3)]
        summary = _build_summary(
            'CIP', 'all', series, series[0], series[-1],
            _period_to_month_index('2024-01'), _period_to_month_index('2024-10'),
        )
        self.assertIn('(20% coverage)', summary)
        self.assertTrue(summary.endswith(
            "Recorded months are sparse and irregularly spaced, so behavior in the gaps between "
            "them is unknown and shouldn't be assumed to follow a smooth line."
        ))

    def test_full_coverage_does_not_append_the_sparse_caveat(self):
        series = [point('2024-01', 0.2), point('2024-02', 0.21)]
        summary = _build_summary(
            'CIP', 'all', series, series[0], series[-1],
            _period_to_month_index('2024-01'), _period_to_month_index('2024-02'),
        )
        self.assertNotIn('sparse', summary)


class BuildKeyObservationsTests(TestCase):
    def test_low_variance_series_is_reported_as_stable(self):
        series = [point('2024-01', 0.30), point('2024-02', 0.31), point('2024-03', 0.29)]
        highest, lowest = series[1], series[2]

        obs = _build_key_observations(series, highest, lowest)

        self.assertEqual(obs['highest'], {'period': '2024-02', 'resistanceRate': 0.31, 'sampleSize': 20})
        self.assertEqual(obs['lowest'], {'period': '2024-03', 'resistanceRate': 0.29, 'sampleSize': 20})
        self.assertEqual(obs['stability'], 'stable')

    def test_high_variance_series_is_reported_as_volatile(self):
        series = [point('2024-01', 0.0), point('2024-02', 0.8)]
        obs = _build_key_observations(series, series[1], series[0])
        self.assertEqual(obs['stability'], 'volatile')
        self.assertGreater(obs['standardDeviation'], 0.10)

    def test_a_single_point_series_has_zero_standard_deviation(self):
        series = [point('2024-01', 0.4)]
        obs = _build_key_observations(series, series[0], series[0])
        self.assertEqual(obs['standardDeviation'], 0.0)
        self.assertEqual(obs['stability'], 'stable')


class BuildPossibleCausesTests(TestCase):
    def test_no_causes_for_a_clean_evenly_sampled_series(self):
        series = [point('2024-01', 0.2, 50), point('2024-02', 0.25, 50), point('2024-03', 0.3, 50)]
        self.assertEqual(_build_possible_causes(series), [])

    def test_flags_a_small_sample_point_with_singular_grammar_for_exactly_one_record(self):
        series = [
            point('2024-01', 0.2, 50),
            point('2024-02', 0.2, 1),  # far below median*0.3 and below the absolute floor of 10
            point('2024-03', 0.2, 50),
        ]
        causes = _build_possible_causes(series)
        self.assertEqual(len(causes), 1)
        self.assertIn('2024-02 is based on only 1 record ', causes[0])
        self.assertNotIn('records', causes[0])

    def test_flags_the_largest_gaps_first_and_caps_the_total_at_three(self):
        # Two points with no gap between them (both flagged as small-sample),
        # then two gaps of different sizes -- 4 raw causes, capped to 3, with
        # the smaller gap dropped in favor of the larger one.
        series = [
            point('2024-01', 0.2, 50),
            point('2024-02', 0.2, 1),   # small sample #1
            point('2024-03', 0.2, 1),   # small sample #2
            point('2024-08', 0.2, 50),  # gap vs 2024-03: 4 missing months
            point('2025-03', 0.2, 50),  # gap vs 2024-08: 6 missing months (larger)
        ]
        causes = _build_possible_causes(series)

        self.assertEqual(len(causes), 3)
        self.assertIn('2024-02', causes[0])
        self.assertIn('2024-03', causes[1])
        self.assertIn('between 2024-08 and 2025-03', causes[2])
        self.assertNotIn('between 2024-03 and 2024-08', ' '.join(causes))

    def test_a_gap_below_the_threshold_is_not_flagged(self):
        # Only 2 missing months -- below GAP_MONTHS_THRESHOLD (3).
        series = [point('2024-01', 0.2, 50), point('2024-04', 0.2, 50)]
        self.assertEqual(_build_possible_causes(series), [])


class BuildClinicalRelevanceTests(TestCase):
    def test_reserve_tier_antibiotic(self):
        text = _build_clinical_relevance('colistine', point('2024-03', 0.15))
        self.assertIn('WHO AWaRe Reserve tier', text)
        self.assertIn('15%', text)

    def test_watch_tier_antibiotic(self):
        text = _build_clinical_relevance('CIP', point('2024-03', 0.4))
        self.assertIn('WHO AWaRe Watch tier', text)
        self.assertIn('40%', text)

    def test_access_tier_antibiotic(self):
        text = _build_clinical_relevance('GEN', point('2024-03', 0.1))
        self.assertIn('WHO AWaRe Access-tier', text)
        self.assertIn('10%', text)

    def test_an_antibiotic_not_in_the_aware_map_defaults_to_access(self):
        text = _build_clinical_relevance('SomeFutureDrug', point('2024-03', 0.05))
        self.assertIn('WHO AWaRe Access-tier', text)


class BuildForecastTests(TestCase):
    def test_returns_none_below_the_minimum_number_of_periods(self):
        series = [point('2024-01', 0.2), point('2024-02', 0.3)]
        self.assertIsNone(_build_forecast(series, _period_to_month_index('2024-01'), _period_to_month_index('2024-02')))

    def test_a_clear_upward_trend_projects_rising_with_moderate_volatility(self):
        series = [point('2024-01', 0.1), point('2024-02', 0.2), point('2024-03', 0.3)]
        first_idx, last_idx = _period_to_month_index('2024-01'), _period_to_month_index('2024-03')

        forecast = _build_forecast(series, first_idx, last_idx)

        self.assertIsNotNone(forecast)
        self.assertAlmostEqual(forecast['projectedNextMonthRate'], 0.4, places=2)
        self.assertEqual(forecast['direction'], 'rising')
        self.assertEqual(forecast['confidenceNote'], 'moderate historical volatility, so treat this as a rough directional estimate')
        self.assertIn('3 recorded months', forecast['basis'])
        self.assertIn('This is an AI-generated statistical projection', forecast['disclaimer'])

    def test_a_flat_series_projects_roughly_stable_with_low_volatility(self):
        series = [point('2024-01', 0.2), point('2024-02', 0.2), point('2024-03', 0.2)]
        first_idx, last_idx = _period_to_month_index('2024-01'), _period_to_month_index('2024-03')

        forecast = _build_forecast(series, first_idx, last_idx)

        self.assertAlmostEqual(forecast['projectedNextMonthRate'], 0.2, places=2)
        self.assertEqual(forecast['direction'], 'roughly stable')
        self.assertEqual(forecast['confidenceNote'], 'low historical volatility, so this projection is comparatively stable')

    def test_a_highly_volatile_series_gets_the_high_volatility_note(self):
        series = [point('2024-01', 0.1), point('2024-02', 0.9), point('2024-03', 0.1)]
        first_idx, last_idx = _period_to_month_index('2024-01'), _period_to_month_index('2024-03')

        forecast = _build_forecast(series, first_idx, last_idx)

        self.assertEqual(forecast['confidenceNote'], 'high historical volatility, so this projection carries significant uncertainty')

    def test_sparse_coverage_overrides_the_volatility_based_note(self):
        # 3 points spread across a 12-month span (25% coverage) -- the
        # sparse-coverage note takes priority even though the series itself
        # (as sampled) looks perfectly flat/low-volatility.
        series = [point('2024-01', 0.2), point('2024-02', 0.2), point('2024-12', 0.2)]
        first_idx, last_idx = _period_to_month_index('2024-01'), _period_to_month_index('2024-12')

        forecast = _build_forecast(series, first_idx, last_idx)

        self.assertEqual(
            forecast['confidenceNote'],
            'recorded months are sparse and irregularly spaced, so this projection carries substantial uncertainty'
        )

    def test_the_projected_rate_is_clipped_to_the_0_to_1_range(self):
        series = [point('2024-01', 0.7), point('2024-02', 0.9), point('2024-03', 1.0)]
        first_idx, last_idx = _period_to_month_index('2024-01'), _period_to_month_index('2024-03')

        forecast = _build_forecast(series, first_idx, last_idx)

        self.assertLessEqual(forecast['projectedNextMonthRate'], 1.0)
        self.assertGreaterEqual(forecast['projectedNextMonthRate'], 0.0)


# Integration-level tests for generate_trend_insights() -- the entry
# point called from views.py's explain_trend_view. Each sub-builder above
# already has its own dedicated branch coverage, so this focuses on the
# empty-series short-circuit and the overall response assembly (correct
# highest/lowest selection, sources block).
class GenerateTrendInsightsTests(TestCase):
    def test_an_empty_series_returns_the_no_data_shape_without_touching_any_builder(self):
        result = generate_trend_insights('CIP', 'all', [])

        self.assertEqual(result, {
            "summary": "No data is available for this antibiotic/organism combination yet.",
            "keyObservations": None,
            "possibleCauses": [],
            "clinicalRelevance": None,
            "aiForecast": None,
            "sources": {"internalDataset": True, "recordsUsed": 0},
        })

    def test_a_populated_series_assembles_the_full_response(self):
        series = [
            point('2024-01', 0.2, 10),
            point('2024-02', 0.5, 20),  # highest
            point('2024-03', 0.1, 15),  # lowest
        ]

        result = generate_trend_insights('CIP', 'Escherichia coli', series)

        self.assertIn('resistance to CIP in Escherichia coli', result['summary'])
        self.assertEqual(result['keyObservations']['highest']['period'], '2024-02')
        self.assertEqual(result['keyObservations']['lowest']['period'], '2024-03')
        self.assertEqual(result['possibleCauses'], [])
        self.assertIn('WHO AWaRe Watch tier', result['clinicalRelevance'])
        self.assertIsNotNone(result['aiForecast'])  # 3 consecutive months meets FORECAST_MIN_PERIODS
        self.assertEqual(result['sources'], {
            "internalDataset": True,
            "recordsUsed": 45,  # 10 + 20 + 15
            "periodsCovered": 3,
        })

    def test_a_series_long_enough_for_a_forecast_includes_one(self):
        series = [point('2024-01', 0.1, 10), point('2024-02', 0.2, 10), point('2024-03', 0.3, 10)]
        result = generate_trend_insights('CIP', 'all', series)
        self.assertIsNotNone(result['aiForecast'])

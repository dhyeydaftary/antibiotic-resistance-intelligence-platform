"""
Tests for predictor.trends -- backs GET /trends/ and (via trend_insights.py)
GET /explain-trend/. Computes month-by-month resistance rate for one
antibiotic, optionally filtered by organism/ward -- purely descriptive
statistics over the historical dataset, no model inference (contrast with
predict.py). Distinct from trend_insights.py (already covered separately):
that module turns this module's series output into narrative text; this
module computes the series itself.

Same lazy-load/caching shape as dataset_stats.py (a module-level _df,
_antibiotic_columns pair, both reset here between tests) plus one extra
cache specific to this module: _has_ward_type, set from whether the loaded
DataFrame actually has a Ward_Type column (independent of which CSV path
was used, unlike dataset_stats.py's _has_augmented_columns which is tied
to the path itself). No real CSV/JSON file is ever read here -- pd.read_csv
and open() are mocked at their predictor.trends.* import site, following
the established convention in test_dataset_stats.py/test_ai_insights.py.
Plain unittest.TestCase throughout (no Django client or DB needed).
"""

import json
from unittest import TestCase
from unittest.mock import mock_open, patch

import pandas as pd

import predictor.trends as trends
from predictor.trends import (
    _load_antibiotic_columns,
    _load_data,
    get_resistance_trend,
)


# ---------------------------------------------------------------------------
# Minimal DataFrames used across test classes
# ---------------------------------------------------------------------------

def _make_df_with_ward_type():
    return pd.DataFrame({
        'Collection_Date': pd.to_datetime(['2023-01-01', '2023-06-15']),
        'Organism': ['Escherichia coli', 'Klebsiella pneumoniae'],
        'Ward_Type': ['ICU', 'General Ward'],
        'CIP': ['R', 'S'],
    })


def _make_df_without_ward_type():
    return pd.DataFrame({
        'Collection_Date': pd.to_datetime(['2023-01-01', '2023-06-15']),
        'Organism': ['Escherichia coli', 'Klebsiella pneumoniae'],
        'CIP': ['R', 'S'],
    })


def _reset_module_cache():
    trends._df = None
    trends._antibiotic_columns = None
    trends._has_ward_type = None


# ---------------------------------------------------------------------------
# _load_data
# ---------------------------------------------------------------------------

class LoadDataTests(TestCase):
    def setUp(self):
        _reset_module_cache()

    def test_loads_augmented_csv_when_augmented_path_exists(self):
        df = _make_df_with_ward_type()
        with patch('predictor.trends.os.path.exists', return_value=True), \
             patch('predictor.trends.pd.read_csv', return_value=df) as mock_read:
            result = _load_data()
        mock_read.assert_called_once()
        call_path = mock_read.call_args[0][0]
        self.assertIn('augmented', call_path)
        self.assertIs(result, df)

    def test_falls_back_to_legacy_csv_when_augmented_path_absent(self):
        df = _make_df_without_ward_type()
        with patch('predictor.trends.os.path.exists', return_value=False), \
             patch('predictor.trends.pd.read_csv', return_value=df) as mock_read:
            result = _load_data()
        mock_read.assert_called_once()
        call_path = mock_read.call_args[0][0]
        self.assertNotIn('augmented', call_path)
        self.assertIs(result, df)

    def test_has_ward_type_is_true_when_the_column_is_present(self):
        df = _make_df_with_ward_type()
        with patch('predictor.trends.os.path.exists', return_value=True), \
             patch('predictor.trends.pd.read_csv', return_value=df):
            _load_data()
        self.assertTrue(trends._has_ward_type)

    def test_has_ward_type_is_false_when_the_column_is_absent(self):
        df = _make_df_without_ward_type()
        with patch('predictor.trends.os.path.exists', return_value=False), \
             patch('predictor.trends.pd.read_csv', return_value=df):
            _load_data()
        self.assertFalse(trends._has_ward_type)

    def test_second_call_returns_the_cached_dataframe_without_re_reading(self):
        df = _make_df_with_ward_type()
        with patch('predictor.trends.os.path.exists', return_value=True), \
             patch('predictor.trends.pd.read_csv', return_value=df) as mock_read:
            first = _load_data()
            second = _load_data()
        self.assertEqual(mock_read.call_count, 1)
        self.assertIs(first, second)


# ---------------------------------------------------------------------------
# _load_antibiotic_columns
# ---------------------------------------------------------------------------

class LoadAntibioticColumnsTests(TestCase):
    def setUp(self):
        _reset_module_cache()

    def test_reads_antibiotic_columns_json_and_returns_parsed_list(self):
        fake_columns = ['CIP', 'GEN', 'IPM']
        m = mock_open(read_data=json.dumps(fake_columns))
        with patch('builtins.open', m):
            result = _load_antibiotic_columns()
        self.assertEqual(result, fake_columns)

    def test_second_call_returns_cached_list_without_re_opening_file(self):
        fake_columns = ['CIP', 'GEN']
        m = mock_open(read_data=json.dumps(fake_columns))
        with patch('builtins.open', m):
            _load_antibiotic_columns()
            _load_antibiotic_columns()
        self.assertEqual(m.call_count, 1)


# ---------------------------------------------------------------------------
# get_resistance_trend (integration)
# ---------------------------------------------------------------------------

class GetResistanceTrendTests(TestCase):
    """
    Patches _load_data/_load_antibiotic_columns (via side_effect functions
    that set the module globals directly, mirroring the real lazy-loaders)
    so get_resistance_trend's own filtering/grouping logic runs against a
    small, fully-controlled DataFrame -- same technique as
    test_dataset_stats.py's GetDatasetStatsTests.
    """

    def setUp(self):
        _reset_module_cache()

    # 6 rows: one has a NaN CIP value (must be dropped by dropna), spread
    # across two months (2024-01, 2024-02) and two organisms/wards, so
    # filtering and month-grouping can both be exercised precisely.
    def _make_df(self):
        return pd.DataFrame({
            'Collection_Date': pd.to_datetime([
                '2024-01-05', '2024-01-20', '2024-02-10', '2024-02-15', '2024-02-20', '2023-12-01',
            ]),
            'Organism': [
                'Escherichia coli', 'Escherichia coli', 'Escherichia coli',
                'Klebsiella pneumoniae', 'Escherichia coli', 'Escherichia coli',
            ],
            'Ward_Type': ['ICU', 'General Ward', 'ICU', 'ICU', 'General Ward', 'ICU'],
            'CIP': ['R', 'S', 'R', 'R', 'S', None],  # last row's CIP is NaN
        })

    def _run(self, antibiotic='CIP', organism=None, ward_type=None, df=None, columns=None, has_ward_type=True):
        if df is None:
            df = self._make_df()
        if columns is None:
            columns = ['CIP', 'GEN']

        def fake_load_data():
            trends._df = df
            trends._has_ward_type = has_ward_type
            return df

        def fake_load_cols():
            trends._antibiotic_columns = columns
            return columns

        with patch('predictor.trends._load_data', side_effect=fake_load_data), \
             patch('predictor.trends._load_antibiotic_columns', side_effect=fake_load_cols):
            return get_resistance_trend(antibiotic, organism, ward_type)

    # --- validation ---

    def test_unknown_antibiotic_raises_value_error(self):
        with self.assertRaisesRegex(ValueError, 'Unknown antibiotic: XYZ'):
            self._run(antibiotic='XYZ')

    def test_unknown_organism_raises_value_error(self):
        with self.assertRaisesRegex(ValueError, 'Unknown organism: Not A Real Organism'):
            self._run(organism='Not A Real Organism')

    def test_organism_all_is_not_treated_as_an_unknown_organism(self):
        series = self._run(organism='all')
        self.assertEqual(len(series), 2)

    def test_ward_type_filter_on_a_dataset_without_a_ward_type_column_raises_value_error(self):
        with self.assertRaisesRegex(ValueError, 'ward_type filter is unavailable'):
            self._run(ward_type='ICU', has_ward_type=False)

    def test_ward_type_all_does_not_require_a_ward_type_column(self):
        series = self._run(ward_type='all', has_ward_type=False)
        self.assertEqual(len(series), 2)

    def test_an_unrecognized_ward_type_value_raises_value_error(self):
        with self.assertRaisesRegex(ValueError, 'Unknown ward_type: Outpatient'):
            self._run(ward_type='Outpatient', has_ward_type=True)

    # --- row exclusion ---

    def test_a_row_with_a_missing_antibiotic_result_is_dropped(self):
        # The 2023-12 row has CIP=None -- it must never surface as its own
        # period, and must not be counted in any other period's sample size.
        series = self._run()
        periods = [p['period'] for p in series]
        self.assertNotIn('2023-12', periods)
        self.assertEqual(sum(p['sampleSize'] for p in series), 5)

    # --- unfiltered grouping/rate calculation ---

    def test_unfiltered_series_is_grouped_by_month_and_sorted_chronologically(self):
        series = self._run()
        self.assertEqual([p['period'] for p in series], ['2024-01', '2024-02'])

    def test_unfiltered_resistance_rate_and_sample_size_per_month(self):
        series = self._run()
        jan, feb = series
        self.assertEqual(jan, {'period': '2024-01', 'resistanceRate': 0.5, 'sampleSize': 2})  # R,S
        self.assertEqual(feb['sampleSize'], 3)  # R,R,S
        self.assertAlmostEqual(feb['resistanceRate'], round(2 / 3, 4))

    def test_a_month_with_no_resistant_results_has_a_zero_rate_not_an_error(self):
        df = pd.DataFrame({
            'Collection_Date': pd.to_datetime(['2024-01-01', '2024-01-02']),
            'Organism': ['Escherichia coli', 'Escherichia coli'],
            'Ward_Type': ['ICU', 'ICU'],
            'GEN': ['S', 'S'],
        })
        series = self._run(antibiotic='GEN', df=df, columns=['GEN'])
        self.assertEqual(series, [{'period': '2024-01', 'resistanceRate': 0.0, 'sampleSize': 2}])

    # --- organism filtering ---

    def test_organism_filter_excludes_non_matching_rows(self):
        series = self._run(organism='Klebsiella pneumoniae')
        # Only the single 2024-02 Klebsiella row (CIP=R) survives.
        self.assertEqual(series, [{'period': '2024-02', 'resistanceRate': 1.0, 'sampleSize': 1}])

    def test_organism_filter_changes_the_rate_for_a_shared_month(self):
        series = self._run(organism='Escherichia coli')
        feb = next(p for p in series if p['period'] == '2024-02')
        # Without the Klebsiella row, 2024-02 is just [R, S] for E. coli.
        self.assertEqual(feb, {'period': '2024-02', 'resistanceRate': 0.5, 'sampleSize': 2})

    # --- ward_type filtering ---

    def test_ward_type_filter_excludes_non_matching_rows(self):
        series = self._run(ward_type='ICU')
        jan = next(p for p in series if p['period'] == '2024-01')
        feb = next(p for p in series if p['period'] == '2024-02')
        # 2024-01 ICU rows: just the R row. 2024-02 ICU rows: both R.
        self.assertEqual(jan, {'period': '2024-01', 'resistanceRate': 1.0, 'sampleSize': 1})
        self.assertEqual(feb, {'period': '2024-02', 'resistanceRate': 1.0, 'sampleSize': 2})

    # --- combined filters ---

    def test_organism_and_ward_type_filters_combine_with_an_and(self):
        series = self._run(organism='Escherichia coli', ward_type='ICU')
        # E. coli AND ICU: 2024-01 R, 2024-02 R -- the Klebsiella ICU row
        # and the General Ward E. coli rows are both excluded.
        self.assertEqual(series, [
            {'period': '2024-01', 'resistanceRate': 1.0, 'sampleSize': 1},
            {'period': '2024-02', 'resistanceRate': 1.0, 'sampleSize': 1},
        ])

    # --- empty result ---

    def test_a_filter_combination_matching_no_rows_returns_an_empty_series(self):
        series = self._run(organism='Klebsiella pneumoniae', ward_type='General Ward')
        self.assertEqual(series, [])

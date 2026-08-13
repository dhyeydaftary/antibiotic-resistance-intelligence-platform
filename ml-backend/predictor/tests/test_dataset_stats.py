"""
Tests for predictor.dataset_stats -- backs GET /dataset-stats/.

The module lazily loads a CSV (augmented or legacy) and a JSON columns list,
both read from disk. Here we swap out those real file reads with in-memory
Pandas DataFrames / plain Python lists using unittest.mock.patch so:

  * No real CSV or JSON file is ever opened.
  * The module-level caches (_df, _antibiotic_columns, _has_augmented_columns)
    are reset before each test that exercises the lazy-loader, so tests don't
    bleed into each other through the globals.

All patches target the predictor.dataset_stats.* import site, following the
established convention in test_ai_insights.py. Plain unittest.TestCase is used
throughout (no Django client or DB needed).
"""

import json
import os
from io import StringIO
from unittest import TestCase
from unittest.mock import MagicMock, mock_open, patch

import pandas as pd

import predictor.dataset_stats as ds
from predictor.dataset_stats import (
    _load_antibiotic_columns,
    _load_data,
    _numeric_summary,
    _value_counts_list,
    _yes_no_prevalence,
    get_dataset_stats,
)


# ---------------------------------------------------------------------------
# Minimal DataFrames used across test classes
# ---------------------------------------------------------------------------

def _make_legacy_df():
    """Minimal legacy-shape DataFrame (no augmented columns)."""
    return pd.DataFrame({
        'Collection_Date': pd.to_datetime(['2023-01-01', '2023-06-15', '2022-11-30']),
        'Organism': ['Escherichia coli', 'Klebsiella pneumoniae', 'Escherichia coli'],
    })


def _make_augmented_df():
    """Full augmented-shape DataFrame with all optional columns."""
    return pd.DataFrame({
        'Collection_Date': pd.to_datetime(['2023-01-01', '2023-06-15']),
        'Organism': ['Escherichia coli', 'Klebsiella pneumoniae'],
        'Ward_Type': ['ICU', 'General Ward'],
        'Specimen_Source': ['Blood', 'Urine'],
        # Comorbidity Yes/No columns
        'Previous_Antibiotic_Use': ['Yes', 'No'],
        'CKD_Status': ['No', 'Yes'],
        'Liver_Disease': ['No', 'No'],
        'Cancer': ['Yes', 'No'],
        'Immunocompromised_Status': ['No', 'No'],
        # Symptom Yes/No columns
        'Fever': ['Yes', 'Yes'],
        'Cough': ['No', 'Yes'],
        'Burning_Urination': ['No', 'No'],
        'Wound_Infection': ['Yes', 'No'],
        # Numeric vitals/labs columns
        'WBC': [8.5, 11.2],
        'Neutrophils_pct': [70.0, 80.0],
        'Lymphocytes_pct': [25.0, 15.0],
        'CRP': [5.0, 40.0],
        'Procalcitonin': [0.1, 1.5],
        'Creatinine': [0.9, 1.4],
        'eGFR': [90.0, 65.0],
        'Temperature': [37.5, 38.9],
        'Heart_Rate': [78.0, 102.0],
        'Respiratory_Rate': [16.0, 22.0],
        'SpO2': [98.0, 95.0],
        'Weight_kg': [70.0, 85.0],
        'BMI': [24.2, 29.5],
    })


def _reset_module_cache():
    """Zero out dataset_stats.py's module-level lazy-load caches."""
    ds._df = None
    ds._antibiotic_columns = None
    ds._has_augmented_columns = None


# ---------------------------------------------------------------------------
# _load_data
# ---------------------------------------------------------------------------

class LoadDataTests(TestCase):
    def setUp(self):
        _reset_module_cache()

    def test_loads_augmented_csv_when_augmented_path_exists(self):
        aug_df = _make_augmented_df()
        with patch('predictor.dataset_stats.os.path.exists', return_value=True), \
             patch('predictor.dataset_stats.pd.read_csv', return_value=aug_df) as mock_read:
            result = _load_data()
            mock_read.assert_called_once()
            call_path = mock_read.call_args[0][0]
            self.assertIn('augmented', call_path)
            self.assertTrue(ds._has_augmented_columns)
            self.assertIs(result, aug_df)

    def test_falls_back_to_legacy_csv_when_augmented_path_absent(self):
        leg_df = _make_legacy_df()
        with patch('predictor.dataset_stats.os.path.exists', return_value=False), \
             patch('predictor.dataset_stats.pd.read_csv', return_value=leg_df) as mock_read:
            result = _load_data()
            mock_read.assert_called_once()
            call_path = mock_read.call_args[0][0]
            self.assertNotIn('augmented', call_path)
            self.assertFalse(ds._has_augmented_columns)
            self.assertIs(result, leg_df)

    def test_second_call_returns_the_cached_dataframe_without_re_reading(self):
        leg_df = _make_legacy_df()
        with patch('predictor.dataset_stats.os.path.exists', return_value=False), \
             patch('predictor.dataset_stats.pd.read_csv', return_value=leg_df) as mock_read:
            first = _load_data()
            second = _load_data()
            # pd.read_csv should have been called exactly once
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
        # open() should only have been called once
        self.assertEqual(m.call_count, 1)


# ---------------------------------------------------------------------------
# _value_counts_list
# ---------------------------------------------------------------------------

class ValueCountsListTests(TestCase):
    def test_converts_value_counts_to_a_list_of_key_count_dicts(self):
        series = pd.Series(['ICU', 'ICU', 'General Ward', None])
        result = _value_counts_list(series, 'wardType')
        # NaN is dropped; highest count first (Pandas default)
        self.assertEqual(len(result), 2)
        icu_entry = next(r for r in result if r['wardType'] == 'ICU')
        self.assertEqual(icu_entry['count'], 2)
        gw_entry = next(r for r in result if r['wardType'] == 'General Ward')
        self.assertEqual(gw_entry['count'], 1)

    def test_all_null_series_returns_an_empty_list(self):
        series = pd.Series([None, None])
        result = _value_counts_list(series, 'wardType')
        self.assertEqual(result, [])

    def test_count_values_are_plain_ints_not_numpy_int64(self):
        series = pd.Series(['A', 'A', 'B'])
        result = _value_counts_list(series, 'key')
        for entry in result:
            self.assertIsInstance(entry['count'], int)


# ---------------------------------------------------------------------------
# _yes_no_prevalence
# ---------------------------------------------------------------------------

class YesNoPrevalenceTests(TestCase):
    def test_returns_prevalence_for_each_present_yes_no_column(self):
        df = pd.DataFrame({'Fever': ['Yes', 'No', 'Yes', 'Yes']})
        result = _yes_no_prevalence(df, {'Fever': 'fever'})
        self.assertEqual(len(result), 1)
        entry = result[0]
        self.assertEqual(entry['field'], 'fever')
        self.assertEqual(entry['yesCount'], 3)
        self.assertEqual(entry['total'], 4)
        self.assertAlmostEqual(entry['prevalence'], 0.75, places=4)

    def test_skips_columns_not_present_in_the_dataframe(self):
        df = pd.DataFrame({'Fever': ['Yes', 'No']})
        result = _yes_no_prevalence(df, {'Fever': 'fever', 'Cough': 'cough'})
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['field'], 'fever')

    def test_skips_a_column_whose_non_null_values_are_all_null(self):
        df = pd.DataFrame({'Fever': [None, None]})
        result = _yes_no_prevalence(df, {'Fever': 'fever'})
        self.assertEqual(result, [])

    def test_zero_yes_values_are_still_included_with_prevalence_zero(self):
        df = pd.DataFrame({'Cancer': ['No', 'No']})
        result = _yes_no_prevalence(df, {'Cancer': 'cancer'})
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['yesCount'], 0)
        self.assertEqual(result[0]['prevalence'], 0.0)


# ---------------------------------------------------------------------------
# _numeric_summary
# ---------------------------------------------------------------------------

class NumericSummaryTests(TestCase):
    def test_returns_min_mean_max_and_sample_size_for_a_present_column(self):
        df = pd.DataFrame({'WBC': [4.0, 8.0, 12.0]})
        result = _numeric_summary(df, {'WBC': 'wbc'})
        self.assertEqual(len(result), 1)
        entry = result[0]
        self.assertEqual(entry['field'], 'wbc')
        self.assertAlmostEqual(entry['min'], 4.0)
        self.assertAlmostEqual(entry['mean'], 8.0)
        self.assertAlmostEqual(entry['max'], 12.0)
        self.assertEqual(entry['sampleSize'], 3)

    def test_skips_columns_not_present_in_the_dataframe(self):
        df = pd.DataFrame({'WBC': [8.0, 10.0]})
        result = _numeric_summary(df, {'WBC': 'wbc', 'CRP': 'crp'})
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['field'], 'wbc')

    def test_skips_a_column_that_is_entirely_null(self):
        df = pd.DataFrame({'WBC': [None, None]})
        result = _numeric_summary(df, {'WBC': 'wbc'})
        self.assertEqual(result, [])

    def test_values_are_rounded_to_two_decimal_places(self):
        df = pd.DataFrame({'WBC': [1.123456, 2.654321]})
        result = _numeric_summary(df, {'WBC': 'wbc'})
        self.assertEqual(result[0]['mean'], round((1.123456 + 2.654321) / 2, 2))

    def test_sample_size_is_a_plain_int(self):
        df = pd.DataFrame({'WBC': [5.0, 10.0]})
        result = _numeric_summary(df, {'WBC': 'wbc'})
        self.assertIsInstance(result[0]['sampleSize'], int)


# ---------------------------------------------------------------------------
# get_dataset_stats  (integration)
# ---------------------------------------------------------------------------

class GetDatasetStatsTests(TestCase):
    """
    Patches _load_data and _load_antibiotic_columns (via their module globals
    after the lazy-load functions have run) to keep these tests hermetic.
    Because get_dataset_stats() calls _load_data() and then reads ds._has_augmented_columns
    from the module global, we also set that flag directly.
    """

    def setUp(self):
        _reset_module_cache()

    def _run_legacy(self, df=None, columns=None):
        """Run get_dataset_stats() with the legacy (non-augmented) dataset."""
        if df is None:
            df = _make_legacy_df()
        if columns is None:
            columns = ['CIP', 'GEN', 'IPM']

        # Patch _load_data so it sets the cache to our fake df and clears the augmented flag
        def fake_load_data():
            ds._df = df
            ds._has_augmented_columns = False
            return df

        def fake_load_cols():
            ds._antibiotic_columns = columns
            return columns

        with patch('predictor.dataset_stats._load_data', side_effect=fake_load_data), \
             patch('predictor.dataset_stats._load_antibiotic_columns', side_effect=fake_load_cols):
            return get_dataset_stats()

    def _run_augmented(self, df=None, columns=None):
        """Run get_dataset_stats() with the augmented dataset."""
        if df is None:
            df = _make_augmented_df()
        if columns is None:
            columns = ['CIP', 'GEN']

        def fake_load_data():
            ds._df = df
            ds._has_augmented_columns = True
            return df

        def fake_load_cols():
            ds._antibiotic_columns = columns
            return columns

        with patch('predictor.dataset_stats._load_data', side_effect=fake_load_data), \
             patch('predictor.dataset_stats._load_antibiotic_columns', side_effect=fake_load_cols):
            return get_dataset_stats()

    # --- legacy path ---

    def test_legacy_stats_shape_has_the_expected_top_level_keys(self):
        stats = self._run_legacy()
        for key in ('totalRows', 'totalColumns', 'antibioticTargets', 'dateRange', 'organismDistribution'):
            self.assertIn(key, stats)

    def test_legacy_stats_reports_correct_row_count(self):
        stats = self._run_legacy()
        self.assertEqual(stats['totalRows'], 3)

    def test_legacy_stats_reports_correct_antibiotic_targets_count(self):
        stats = self._run_legacy(columns=['CIP', 'GEN'])
        self.assertEqual(stats['antibioticTargets'], 2)

    def test_legacy_stats_date_range_matches_the_dataframe_min_and_max(self):
        stats = self._run_legacy()
        self.assertEqual(stats['dateRange']['start'], '2022-11-30')
        self.assertEqual(stats['dateRange']['end'], '2023-06-15')

    def test_legacy_organism_distribution_sums_to_total_rows(self):
        stats = self._run_legacy()
        total = sum(e['count'] for e in stats['organismDistribution'])
        self.assertEqual(total, 3)

    def test_legacy_stats_does_not_include_augmented_only_keys(self):
        stats = self._run_legacy()
        for key in ('wardTypeDistribution', 'specimenSourceDistribution',
                    'comorbidityPrevalence', 'symptomPrevalence', 'vitalsLabsSummary'):
            self.assertNotIn(key, stats)

    # --- augmented path ---

    def test_augmented_stats_includes_ward_type_distribution(self):
        stats = self._run_augmented()
        self.assertIn('wardTypeDistribution', stats)
        ward_names = [e['wardType'] for e in stats['wardTypeDistribution']]
        self.assertIn('ICU', ward_names)
        self.assertIn('General Ward', ward_names)

    def test_augmented_stats_includes_specimen_source_distribution(self):
        stats = self._run_augmented()
        self.assertIn('specimenSourceDistribution', stats)
        sources = [e['specimenSource'] for e in stats['specimenSourceDistribution']]
        self.assertIn('Blood', sources)

    def test_augmented_stats_includes_comorbidity_prevalence(self):
        stats = self._run_augmented()
        self.assertIn('comorbidityPrevalence', stats)
        fields = {e['field'] for e in stats['comorbidityPrevalence']}
        self.assertIn('previousAntibioticUse', fields)

    def test_augmented_stats_includes_symptom_prevalence(self):
        stats = self._run_augmented()
        self.assertIn('symptomPrevalence', stats)
        fields = {e['field'] for e in stats['symptomPrevalence']}
        self.assertIn('fever', fields)

    def test_augmented_stats_includes_vitals_labs_summary(self):
        stats = self._run_augmented()
        self.assertIn('vitalsLabsSummary', stats)
        fields = {e['field'] for e in stats['vitalsLabsSummary']}
        self.assertIn('wbc', fields)

    def test_augmented_stats_vitals_entry_has_correct_numeric_values(self):
        stats = self._run_augmented()
        wbc_entry = next(e for e in stats['vitalsLabsSummary'] if e['field'] == 'wbc')
        self.assertAlmostEqual(wbc_entry['min'], 8.5)
        self.assertAlmostEqual(wbc_entry['max'], 11.2)
        self.assertAlmostEqual(wbc_entry['mean'], round((8.5 + 11.2) / 2, 2))
        self.assertEqual(wbc_entry['sampleSize'], 2)

    def test_augmented_stats_omits_ward_type_key_when_column_is_absent(self):
        df = _make_augmented_df().drop(columns=['Ward_Type'])

        def fake_load_data():
            ds._df = df
            ds._has_augmented_columns = True
            return df

        def fake_load_cols():
            ds._antibiotic_columns = ['CIP']
            return ['CIP']

        with patch('predictor.dataset_stats._load_data', side_effect=fake_load_data), \
             patch('predictor.dataset_stats._load_antibiotic_columns', side_effect=fake_load_cols):
            stats = get_dataset_stats()
        self.assertNotIn('wardTypeDistribution', stats)

    def test_augmented_stats_omits_specimen_source_key_when_column_is_absent(self):
        df = _make_augmented_df().drop(columns=['Specimen_Source'])

        def fake_load_data():
            ds._df = df
            ds._has_augmented_columns = True
            return df

        def fake_load_cols():
            ds._antibiotic_columns = ['CIP']
            return ['CIP']

        with patch('predictor.dataset_stats._load_data', side_effect=fake_load_data), \
             patch('predictor.dataset_stats._load_antibiotic_columns', side_effect=fake_load_cols):
            stats = get_dataset_stats()
        self.assertNotIn('specimenSourceDistribution', stats)

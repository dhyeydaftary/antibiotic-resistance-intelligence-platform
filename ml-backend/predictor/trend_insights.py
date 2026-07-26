import numpy as np
from .predict import AWARE_MAP

MIN_SAMPLE_SIZE_FOR_CONFIDENCE = 10
STABILITY_THRESHOLD = 0.10
FORECAST_MIN_PERIODS = 3
GAP_MONTHS_THRESHOLD = 3  # flag gaps of 3+ missing months


def _pct(rate):
    return round(rate * 100)


def _direction_word(delta):
    if delta > 0.02:
        return "rising"
    elif delta < -0.02:
        return "declining"
    return "roughly stable"


def _period_to_month_index(period):
    year, month = period.split('-')
    return int(year) * 12 + (int(month) - 1)


def _build_summary(antibiotic, organism, series, first, last, first_idx, last_idx):
    organism_phrase = f" in {organism}" if organism and organism != 'all' else " across all organisms in the dataset"
    delta = last['resistanceRate'] - first['resistanceRate']
    direction = _direction_word(delta)

    total_span_months = last_idx - first_idx + 1
    coverage_pct = round((len(series) / total_span_months) * 100) if total_span_months else 100

    coverage_clause = (
        f"Data is available for {len(series)} of the {total_span_months} months between "
        f"{first['period']} and {last['period']} ({coverage_pct}% coverage)"
    )

    trend_clause = (
        f"resistance to {antibiotic}{organism_phrase} has trended {direction.replace('roughly ', '')}, "
        f"moving from {_pct(first['resistanceRate'])}% in {first['period']} to "
        f"{_pct(last['resistanceRate'])}% in {last['period']}"
    ) if direction != "roughly stable" else (
        f"resistance to {antibiotic}{organism_phrase} has stayed roughly stable, at "
        f"{_pct(first['resistanceRate'])}% in {first['period']} versus {_pct(last['resistanceRate'])}% in {last['period']}"
    )

    summary = f"{coverage_clause}. Across the recorded months, {trend_clause}."

    if coverage_pct < 50:
        summary += (
            " Recorded months are sparse and irregularly spaced, so behavior in the gaps between "
            "them is unknown and shouldn't be assumed to follow a smooth line."
        )

    return summary


def _build_key_observations(series, highest, lowest):
    rates = [p['resistanceRate'] for p in series]
    stdev = float(np.std(rates)) if len(rates) > 1 else 0.0
    stability = "stable" if stdev < STABILITY_THRESHOLD else "volatile"

    return {
        "highest": {"period": highest['period'], "resistanceRate": highest['resistanceRate'], "sampleSize": highest['sampleSize']},
        "lowest": {"period": lowest['period'], "resistanceRate": lowest['resistanceRate'], "sampleSize": lowest['sampleSize']},
        "stability": stability,
        "standardDeviation": round(stdev, 4),
    }


def _build_possible_causes(series):
    """
    Strictly data-grounded. Only flags things verifiable from the dataset
    itself: small sample sizes and coverage gaps — never epidemiological
    or clinical causes we have no evidence for.
    """
    causes = []
    sizes = [p['sampleSize'] for p in series]
    median_size = float(np.median(sizes)) if sizes else 0

    for point in series:
        if median_size > 0 and point['sampleSize'] < median_size * 0.3 and point['sampleSize'] < MIN_SAMPLE_SIZE_FOR_CONFIDENCE:
            causes.append(
                f"{point['period']} is based on only {point['sampleSize']} record"
                f"{'s' if point['sampleSize'] != 1 else ''} — a small sample can swing the resistance "
                f"rate sharply, so this point should be read cautiously."
            )

    # Flag the largest gaps between consecutive recorded periods
    gaps = []
    for prev, curr in zip(series, series[1:]):
        prev_idx = _period_to_month_index(prev['period'])
        curr_idx = _period_to_month_index(curr['period'])
        missing_months = curr_idx - prev_idx - 1
        if missing_months >= GAP_MONTHS_THRESHOLD:
            gaps.append((missing_months, prev['period'], curr['period']))

    gaps.sort(reverse=True)
    for missing_months, start, end in gaps[:2]:
        causes.append(
            f"No data was recorded between {start} and {end} ({missing_months} months) — any "
            f"change in resistance rate across this gap can't be attributed to a specific cause."
        )

    return causes[:3]


def _build_clinical_relevance(antibiotic, last):
    tier = AWARE_MAP.get(antibiotic, 'Access')
    rate_pct = _pct(last['resistanceRate'])

    if tier == 'Reserve':
        return (
            f"{antibiotic} is classified under the WHO AWaRe Reserve tier — normally held back as a "
            f"last-line option for multidrug-resistant infections. A current resistance rate of "
            f"{rate_pct}% in this data is worth close attention, since Reserve-tier options are "
            f"meant to remain effective when other treatments fail."
        )
    elif tier == 'Watch':
        return (
            f"{antibiotic} falls under the WHO AWaRe Watch tier, associated with higher resistance "
            f"potential and recommended for more targeted use. The current resistance rate in this "
            f"data is {rate_pct}%."
        )
    return (
        f"{antibiotic} is a WHO AWaRe Access-tier antibiotic, generally recommended as a first-line "
        f"option. The current resistance rate in this data is {rate_pct}%."
    )


def _build_forecast(series, first_idx, last_idx):
    if len(series) < FORECAST_MIN_PERIODS:
        return None

    rates = np.array([p['resistanceRate'] for p in series])
    # Weight by actual elapsed months, not by position in the (sparse) list —
    # otherwise a 1-month gap and an 18-month gap get treated identically.
    x = np.array([_period_to_month_index(p['period']) - first_idx for p in series])
    slope, intercept = np.polyfit(x, rates, 1)

    next_x = (last_idx - first_idx) + 1  # one calendar month past the last recorded point
    next_value = float(np.clip(slope * next_x + intercept, 0, 1))

    stdev = float(np.std(rates))
    total_span_months = last_idx - first_idx + 1
    coverage_pct = (len(series) / total_span_months) if total_span_months else 1

    if coverage_pct < 0.5:
        confidence_note = "recorded months are sparse and irregularly spaced, so this projection carries substantial uncertainty"
    elif stdev < 0.05:
        confidence_note = "low historical volatility, so this projection is comparatively stable"
    elif stdev < 0.15:
        confidence_note = "moderate historical volatility, so treat this as a rough directional estimate"
    else:
        confidence_note = "high historical volatility, so this projection carries significant uncertainty"

    return {
        "projectedNextMonthRate": round(next_value, 4),
        "direction": _direction_word(slope * next_x),
        "confidenceNote": confidence_note,
        "basis": f"Linear projection weighted by elapsed time across {len(series)} recorded months from {series[0]['period']} to {series[-1]['period']}.",
        "disclaimer": "This is an AI-generated statistical projection, not a clinical or epidemiological forecast.",
    }


def generate_trend_insights(antibiotic, organism, series):
    if not series:
        return {
            "summary": "No data is available for this antibiotic/organism combination yet.",
            "keyObservations": None,
            "possibleCauses": [],
            "clinicalRelevance": None,
            "aiForecast": None,
            "sources": {"internalDataset": True, "recordsUsed": 0},
        }

    highest = max(series, key=lambda p: p['resistanceRate'])
    lowest = min(series, key=lambda p: p['resistanceRate'])
    first, last = series[0], series[-1]
    first_idx = _period_to_month_index(first['period'])
    last_idx = _period_to_month_index(last['period'])

    return {
        "summary": _build_summary(antibiotic, organism, series, first, last, first_idx, last_idx),
        "keyObservations": _build_key_observations(series, highest, lowest),
        "possibleCauses": _build_possible_causes(series),
        "clinicalRelevance": _build_clinical_relevance(antibiotic, last),
        "aiForecast": _build_forecast(series, first_idx, last_idx),
        "sources": {
            "internalDataset": True,
            "recordsUsed": sum(p['sampleSize'] for p in series),
            "periodsCovered": len(series),
        },
    }
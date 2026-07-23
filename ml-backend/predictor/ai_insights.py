import pandas as pd
import os
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTIFACTS_DIR = os.path.join(BASE_DIR, 'ml_artifacts')

_df = None
_antibiotic_columns = None

AGE_BAND = 5  # ± years for "similar" age matching
LOW_CONFIDENCE_THRESHOLD = 0.6
RESERVE_TIER = 'Reserve'
WATCH_TIER = 'Watch'


def _load_data():
    global _df
    if _df is None:
        _df = pd.read_csv(
            os.path.join(ARTIFACTS_DIR, 'cleaned_dataset.csv'),
            parse_dates=['Collection_Date']
        )
    return _df


def _load_antibiotic_columns():
    global _antibiotic_columns
    if _antibiotic_columns is None:
        with open(os.path.join(ARTIFACTS_DIR, 'antibiotic_columns.json')) as f:
            _antibiotic_columns = json.load(f)
    return _antibiotic_columns


def get_similar_historical_cases(organism, age):
    df = _load_data()
    antibiotic_columns = _load_antibiotic_columns()

    subset = df[
        (df['Organism'] == organism) &
        (df['Age'] >= age - AGE_BAND) &
        (df['Age'] <= age + AGE_BAND)
    ]

    sample_size = len(subset)

    if sample_size == 0:
        return {
            "sampleSize": 0,
            "matchCriteria": f"{organism}, age {age - AGE_BAND}-{age + AGE_BAND}",
            "resistanceBreakdown": [],
        }

    breakdown = []
    for antibiotic in antibiotic_columns:
        col_data = subset[antibiotic].dropna()
        if len(col_data) == 0:
            continue
        resistant_rate = (col_data == 'R').sum() / len(col_data)
        breakdown.append({
            "antibiotic": antibiotic,
            "resistantRate": round(float(resistant_rate), 4),
            "recordsConsidered": len(col_data),
        })

    breakdown.sort(key=lambda x: x['resistantRate'], reverse=True)

    return {
        "sampleSize": sample_size,
        "matchCriteria": f"{organism}, age {age - AGE_BAND}-{age + AGE_BAND}",
        "resistanceBreakdown": breakdown,
    }


def generate_ai_insights(patient_data, predictions):
    resistant = [p for p in predictions if p['result'] == 'R']
    susceptible = [p for p in predictions if p['result'] == 'S']
    intermediate = [p for p in predictions if p['result'] == 'I']

    # --- Summary ---
    summary_parts = [
        f"Out of 15 antibiotics evaluated, {len(resistant)} show predicted resistance, "
        f"{len(susceptible)} show predicted susceptibility, and {len(intermediate)} show an intermediate response."
    ]

    reserve_resistant = [p for p in resistant if p['awareCategory'] == RESERVE_TIER]
    watch_resistant = [p for p in resistant if p['awareCategory'] == WATCH_TIER]

    if reserve_resistant:
        names = ', '.join(p['antibiotic'] for p in reserve_resistant)
        summary_parts.append(
            f"Notably, resistance is predicted for {names} - a Reserve-tier antibiotic, "
            f"typically held back as a last-line treatment option."
        )
    elif watch_resistant:
        names = ', '.join(p['antibiotic'] for p in watch_resistant)
        summary_parts.append(
            f"Resistance is predicted for {names}, classified under the WHO AWaRe Watch tier."
        )

    summary = ' '.join(summary_parts)

    # --- Confidence Interpretation ---
    low_confidence = [p for p in predictions if p['confidence'] < LOW_CONFIDENCE_THRESHOLD]
    high_confidence = [p for p in predictions if p['confidence'] >= 0.85]

    if low_confidence:
        names = ', '.join(p['antibiotic'] for p in low_confidence)
        confidence_text = (
            f"Most predictions carry solid confidence levels, though {names} "
            f"{'show' if len(low_confidence) > 1 else 'shows'} lower certainty and should be "
            f"interpreted more cautiously."
        )
    else:
        confidence_text = "All 15 predictions carry reasonably high confidence levels."

    if high_confidence:
        confidence_text += (
            f" Predictions for {', '.join(p['antibiotic'] for p in high_confidence)} "
            f"are especially confident."
        )

    # --- Plain English explanation (top driver across resistant predictions) ---
    if resistant:
        top_driver_counts = {}
        for p in resistant:
            if p['shapExplanation']:
                top_feature = p['shapExplanation'][0]['feature']
                top_driver_counts[top_feature] = top_driver_counts.get(top_feature, 0) + 1

        if top_driver_counts:
            most_common_driver = max(top_driver_counts, key=top_driver_counts.get)
            plain_explanation = (
                f"Across the antibiotics predicted as resistant, {_humanize_feature(most_common_driver)} "
                f"was the most frequently influential factor pushing the model toward a resistant prediction."
            )
        else:
            plain_explanation = "The model's predictions are based on the patient profile and organism provided."
    else:
        plain_explanation = (
            "No resistance was predicted across the 15 antibiotics evaluated for this patient profile."
        )

    # --- Risk Assessment ---
    if reserve_resistant:
        risk_level = "High"
        risk_text = (
            "Predicted resistance to a Reserve-tier antibiotic is a significant finding, "
            "as these are typically reserved for multi-drug-resistant infections."
        )
    elif len(watch_resistant) >= 3:
        risk_level = "Moderate-High"
        risk_text = (
            "Multiple Watch-tier antibiotics show predicted resistance, suggesting a "
            "more limited set of effective treatment options."
        )
    elif watch_resistant or resistant:
        risk_level = "Moderate"
        risk_text = (
            "Some resistance is predicted, but multiple Access-tier options may remain viable."
        )
    else:
        risk_level = "Low"
        risk_text = "No resistance predicted across the panel; standard first-line options appear viable."

    # --- Similar Historical Cases ---
    historical_cases = get_similar_historical_cases(
        patient_data['organism'], patient_data['age']
    )

    # --- Recommended Next Steps (templated, non-prescriptive) ---
    next_steps = [
        "Confirm findings with laboratory-based antibiotic susceptibility testing before any treatment decision.",
        "Review the SHAP explainability breakdown for each antibiotic of interest to understand contributing factors.",
    ]
    if reserve_resistant or len(watch_resistant) >= 3:
        next_steps.append(
            "Consider consulting infectious disease guidance given the limited predicted treatment options."
        )
    if low_confidence:
        next_steps.append(
            "Treat lower-confidence predictions as directional only, and prioritize lab confirmation for these."
        )
    next_steps.append(
        "Use the Similar Historical Cases data as context, not as a substitute for patient-specific testing."
    )

    disclaimer = (
        "This tool is intended for research and educational purposes only. It is not a substitute "
        "for clinical judgment, laboratory testing, or professional medical advice. All predictions "
        "should be verified through appropriate diagnostic procedures before informing treatment decisions."
    )

    return {
        "summary": summary,
        "confidenceInterpretation": confidence_text,
        "plainEnglishExplanation": plain_explanation,
        "riskAssessment": {
            "level": risk_level,
            "text": risk_text,
        },
        "similarHistoricalCases": historical_cases,
        "recommendedNextSteps": next_steps,
        "disclaimer": disclaimer,
    }


def _humanize_feature(feature_name):
    """Convert internal feature column names into readable phrases."""
    mapping = {
        'Age': "the patient's age",
        'Gender': "the patient's gender",
        'Diabetes': "diabetes status",
        'Hypertension': "hypertension status",
        'Hospital_before': "prior hospitalization history",
        'Infection_Freq': "infection frequency",
        'Year': "the collection year",
        'Month': "the collection month",
    }
    if feature_name in mapping:
        return mapping[feature_name]
    if feature_name.startswith('Organism_'):
        return f"the organism ({feature_name.replace('Organism_', '')})"
    return feature_name
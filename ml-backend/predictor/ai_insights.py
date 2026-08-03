import pandas as pd
import os
import json
import re

from google import genai
from google.genai import types

try:
    from decouple import config as decouple_config
except ImportError:
    decouple_config = None

# Bounded comfortably under the gateway's djangoClient timeout (30s — see
# gateway/utils/djangoClient.js) so a slow/hanging Gemini call surfaces as a
# clean fallback to the template-based summary here, rather than the
# gateway giving up first and masking what actually happened upstream.
GEMINI_TIMEOUT_SECONDS = 20

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTIFACTS_DIR = os.path.join(BASE_DIR, 'ml_artifacts')

_df = None
_antibiotic_columns = None

AGE_BAND = 5  # ± years for "similar" age matching
LOW_CONFIDENCE_THRESHOLD = 0.6
HIGH_CONFIDENCE_THRESHOLD = 0.85
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


def _pct(n, total):
    return round((n / total) * 100) if total else 0


def _join_names(names):
    names = list(names)
    if len(names) == 1:
        return names[0]
    if len(names) == 2:
        return f"{names[0]} and {names[1]}"
    return f"{', '.join(names[:-1])}, and {names[-1]}"


def _build_summary(resistant, susceptible, intermediate, total, reserve_resistant, watch_resistant):
    r_pct = _pct(len(resistant), total)
    s_pct = _pct(len(susceptible), total)

    # Vary the opening line based on the overall shape of the results
    if not resistant:
        opening = (
            f"All {total} antibiotics evaluated show predicted susceptibility "
            f"or an intermediate response — no resistance was flagged for this profile."
        )
    elif len(resistant) == total:
        opening = (
            f"Every antibiotic in the panel — all {total} — is predicted resistant for this profile, "
            f"a result worth flagging prominently."
        )
    elif r_pct >= 60:
        opening = (
            f"Resistance dominates this panel: {len(resistant)} of {total} antibiotics ({r_pct}%) "
            f"are predicted resistant, against {len(susceptible)} susceptible ({s_pct}%)."
        )
    elif r_pct <= 20:
        opening = (
            f"Most of the panel remains viable — {len(susceptible)} of {total} antibiotics ({s_pct}%) "
            f"are predicted susceptible, with resistance limited to {len(resistant)} ({r_pct}%)."
        )
    else:
        opening = (
            f"The panel is mixed: {len(resistant)} of {total} antibiotics ({r_pct}%) are predicted resistant, "
            f"{len(susceptible)} ({s_pct}%) susceptible, and {len(intermediate)} intermediate."
        )

    parts = [opening]

    if reserve_resistant:
        names = _join_names(p['antibiotic'] for p in reserve_resistant)
        tier_word = 'antibiotic' if len(reserve_resistant) == 1 else 'antibiotics'
        parts.append(
            f"Of particular note, {names} — a Reserve-tier {tier_word}, normally held back for "
            f"infections resistant to multiple drugs — {'is' if len(reserve_resistant) == 1 else 'are'} among the resistant predictions."
        )
    elif watch_resistant:
        names = _join_names(p['antibiotic'] for p in watch_resistant)
        parts.append(
            f"This includes {names}, classified under the WHO AWaRe Watch tier."
        )

    return ' '.join(parts)


def _build_confidence_text(predictions, low_confidence, high_confidence):
    avg_conf = sum(p['confidence'] for p in predictions) / len(predictions)
    conf_pct = round(avg_conf * 100)

    if not low_confidence:
        base = f"Model confidence is consistently strong across the panel, averaging {conf_pct}%."
    elif len(low_confidence) == 1:
        p = low_confidence[0]
        base = (
            f"Confidence averages {conf_pct}% across the panel, though the {p['antibiotic']} prediction "
            f"sits at just {round(p['confidence'] * 100)}% and should be treated as directional rather than definitive."
        )
    else:
        names = _join_names(p['antibiotic'] for p in low_confidence)
        lowest = min(low_confidence, key=lambda p: p['confidence'])
        base = (
            f"Confidence averages {conf_pct}% overall, but {names} fall below the {int(LOW_CONFIDENCE_THRESHOLD * 100)}% "
            f"threshold — {lowest['antibiotic']} is the least certain at {round(lowest['confidence'] * 100)}%."
        )

    if high_confidence and len(high_confidence) <= 4:
        names = _join_names(p['antibiotic'] for p in high_confidence)
        base += f" {names} {'is' if len(high_confidence) == 1 else 'are'} the most confidently predicted, each above {int(HIGH_CONFIDENCE_THRESHOLD * 100)}%."
    elif high_confidence:
        base += f" {len(high_confidence)} predictions exceed {int(HIGH_CONFIDENCE_THRESHOLD * 100)}% confidence."

    return base


def _is_named_category_present(feature_name, value):
    """
    Organism_* and Specimen_Source_* are one-hot dummies whose humanized text
    names a specific category (e.g. "the organism (E. coli)"). That phrasing
    is only accurate when the dummy's value is actually 1 for this patient —
    a high |SHAP| magnitude at value 0 means the model found "not being this
    category" informative, which is not the same claim. Returns False to
    veto naming it in that case; True/None (not a named-category dummy, e.g.
    a lab value or a Yes/No flag) means it's safe to attribute as-is.
    """
    if feature_name.startswith('Organism_') or feature_name.startswith('Specimen_Source_'):
        return value == 1
    return True


def _build_plain_explanation(resistant, total):
    if not resistant:
        return (
            "No resistance was predicted across the panel for this patient profile, so no single "
            "clinical factor stands out as a driver of concern."
        )

    # Aggregate top SHAP driver per resistant antibiotic, with signed magnitude.
    # Walk each antibiotic's ranked SHAP list and take the first feature that's
    # actually attributable to this patient (see _is_named_category_present).
    driver_totals = {}
    driver_examples = {}
    for p in resistant:
        chosen = None
        for feat in p['shapExplanation']:
            if _is_named_category_present(feat['feature'], feat.get('value')):
                chosen = feat
                break
        if chosen is None:
            continue
        feature = chosen['feature']
        driver_totals[feature] = driver_totals.get(feature, 0) + abs(chosen['contribution'])
        driver_examples.setdefault(feature, []).append(p['antibiotic'])

    if not driver_totals:
        return (
            f"{len(resistant)} of {total} antibiotics are predicted resistant, based on the patient "
            f"profile and organism provided."
        )

    most_common_feature = max(driver_totals, key=driver_totals.get)
    affected = driver_examples[most_common_feature]
    readable = _humanize_feature(most_common_feature)

    if len(affected) == len(resistant):
        coverage = "every resistant prediction"
    elif len(affected) >= len(resistant) / 2:
        coverage = f"most of the resistant predictions ({_join_names(affected)})"
    else:
        coverage = f"several resistant predictions, including {_join_names(affected)}"

    return (
        f"{readable.capitalize()} is the strongest recurring signal behind the resistant predictions, "
        f"showing up as the top contributing factor for {coverage}."
    )


# --- Gemini-generated summary + recommended next steps -----------------
#
# Both are handed a GROUNDING FACTS dict built entirely from real, already-
# computed numbers (counts, tier names, confidence values, historical case
# count) — the same facts the template versions above use. The prompt
# instructs Gemini to use ONLY these facts and never invent additional
# antibiotic names, percentages, or statistics. On any failure (bad/missing
# API key, malformed response, rate limit, network error), the caller falls
# back to _build_summary() and the template-based next_steps list, so a
# prediction can never fail or go incomplete because of this call.

def _build_grounding_facts(
    resistant, susceptible, intermediate, total,
    reserve_resistant, watch_resistant, access_resistant,
    low_confidence, high_confidence, historical_cases, risk_level,
):
    return {
        "total_antibiotics": total,
        "resistant_count": len(resistant),
        "susceptible_count": len(susceptible),
        "intermediate_count": len(intermediate),
        "resistant_antibiotics": [p['antibiotic'] for p in resistant],
        "susceptible_antibiotics": [p['antibiotic'] for p in susceptible],
        "reserve_tier_resistant": [p['antibiotic'] for p in reserve_resistant],
        "watch_tier_resistant": [p['antibiotic'] for p in watch_resistant],
        "access_tier_resistant": [p['antibiotic'] for p in access_resistant],
        "low_confidence_antibiotics": [
            {"antibiotic": p['antibiotic'], "confidence": round(p['confidence'], 2)}
            for p in low_confidence
        ],
        "high_confidence_antibiotics": [p['antibiotic'] for p in high_confidence],
        "risk_level": risk_level,
        "similar_historical_case_count": historical_cases['sampleSize'],
    }


GEMINI_PROMPT_TEMPLATE = """You are writing two short sections of a clinical research report on \
predicted antibiotic resistance for a single patient case. This is a research/education tool, \
NOT a clinical diagnosis system.

You must use ONLY the facts given below. Do not invent, estimate, or assume any antibiotic name, \
percentage, or statistic that is not explicitly present in these facts.

FACTS (JSON):
{facts_json}

Write:
1. "summary": a 2-4 sentence prose summary of these results, similar in tone to a radiology or \
lab report summary — factual, precise, no speculation beyond the given facts.
2. "recommendedNextSteps": a list of 3-5 short, actionable next-step strings for a clinician or \
researcher reviewing this result (e.g. confirming with lab testing, consulting specialists for \
concerning results, treating low-confidence predictions cautiously). Always include a step about \
confirming with laboratory-based susceptibility testing before any treatment decision.

Return ONLY valid JSON, no markdown code fences, no explanation text, in exactly this shape:
{{"summary": "...", "recommendedNextSteps": ["...", "..."]}}
"""


def _strip_code_fences(text):
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _generate_llm_summary_and_next_steps(facts):
    """
    Returns (summary_or_None, next_steps_or_None, error_or_None).
    Never raises — any failure is reported via the error slot so the caller
    can fall back to the template versions.
    """
    api_key = None
    if decouple_config is not None:
        api_key = decouple_config("GEMINI_API_KEY", default=None)
    if not api_key:
        api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None, None, "GEMINI_API_KEY not configured"

    try:
        client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=GEMINI_TIMEOUT_SECONDS * 1000),
        )
        prompt = GEMINI_PROMPT_TEMPLATE.format(facts_json=json.dumps(facts, indent=2))

        response = client.models.generate_content(
            model="gemini-flash-latest",
            contents=prompt,
        )
        raw_text = _strip_code_fences(response.text)
        parsed = json.loads(raw_text)

        summary = parsed.get("summary")
        next_steps = parsed.get("recommendedNextSteps")

        if not summary or not isinstance(next_steps, list) or not next_steps:
            return None, None, "Gemini response missing expected fields"

        return summary, next_steps, None

    except Exception as e:
        return None, None, f"Gemini insight generation failed: {e}"


def generate_ai_insights(patient_data, predictions):
    resistant = [p for p in predictions if p['result'] == 'R']
    susceptible = [p for p in predictions if p['result'] == 'S']
    intermediate = [p for p in predictions if p['result'] == 'I']
    total = len(predictions)

    reserve_resistant = [p for p in resistant if p['awareCategory'] == RESERVE_TIER]
    watch_resistant = [p for p in resistant if p['awareCategory'] == WATCH_TIER]
    access_resistant = [p for p in resistant if p['awareCategory'] == 'Access']

    low_confidence = [p for p in predictions if p['confidence'] < LOW_CONFIDENCE_THRESHOLD]
    high_confidence = [p for p in predictions if p['confidence'] >= HIGH_CONFIDENCE_THRESHOLD]
    confidence_text = _build_confidence_text(predictions, low_confidence, high_confidence)

    plain_explanation = _build_plain_explanation(resistant, total)

    # --- Risk Assessment (more granular, with counts) ---
    if reserve_resistant:
        risk_level = "High"
        names = _join_names(p['antibiotic'] for p in reserve_resistant)
        if len(reserve_resistant) == 1:
            risk_text = (
                f"Predicted resistance to {names} — a Reserve-tier, last-line option — is the primary "
                f"driver of this rating; this antibiotic is typically held back for infections "
                f"resistant to multiple drugs."
            )
        else:
            risk_text = (
                f"Predicted resistance to {names} — Reserve-tier, last-line options — is the primary "
                f"driver of this rating; these antibiotics are typically held back for infections "
                f"resistant to multiple drugs."
            )
    elif len(watch_resistant) >= 3:
        risk_level = "Moderate-High"
        risk_text = (
            f"{len(watch_resistant)} Watch-tier antibiotics show predicted resistance "
            f"({_join_names(p['antibiotic'] for p in watch_resistant)}), narrowing the field of "
            f"likely-effective treatment options."
        )
    elif watch_resistant or resistant:
        remaining_access = len(susceptible) + len([p for p in intermediate if p['awareCategory'] == 'Access'])
        risk_text = f"Resistance is predicted for {len(resistant)} of {total} antibiotics"
        if access_resistant:
            risk_text += f" ({_join_names(p['antibiotic'] for p in access_resistant)} among the Access tier)"
        risk_text += f", but {remaining_access} Access-tier or susceptible options appear to remain viable."
        risk_level = "Moderate"
    else:
        risk_level = "Low"
        risk_text = f"No resistance predicted across all {total} antibiotics; standard first-line Access-tier options appear viable."

    historical_cases = get_similar_historical_cases(
        patient_data['organism'], patient_data['age']
    )

    # --- Summary + Recommended Next Steps: try Gemini first, grounded in
    # the exact same facts the template versions use, then fall back to the
    # deterministic templates on any failure. ---
    facts = _build_grounding_facts(
        resistant, susceptible, intermediate, total,
        reserve_resistant, watch_resistant, access_resistant,
        low_confidence, high_confidence, historical_cases, risk_level,
    )
    llm_summary, llm_next_steps, llm_error = _generate_llm_summary_and_next_steps(facts)

    if llm_summary and llm_next_steps:
        summary = llm_summary
        next_steps = llm_next_steps
    else:
        summary = _build_summary(resistant, susceptible, intermediate, total, reserve_resistant, watch_resistant)

        next_steps = [
            "Confirm findings with laboratory-based antibiotic susceptibility testing before any treatment decision.",
        ]

        if resistant:
            next_steps.append(
                f"Review the SHAP explainability breakdown for {_join_names(p['antibiotic'] for p in resistant[:3])} "
                f"to understand what's driving each resistant prediction."
            )
        else:
            next_steps.append(
                "Review the SHAP explainability breakdown for each antibiotic to understand contributing factors."
            )

        if reserve_resistant:
            next_steps.append(
                "Consult infectious disease guidance given predicted resistance to a Reserve-tier antibiotic."
            )
        elif len(watch_resistant) >= 3:
            next_steps.append(
                "Consider consulting infectious disease guidance given the limited predicted treatment options."
            )

        if low_confidence:
            names = _join_names(p['antibiotic'] for p in low_confidence)
            next_steps.append(
                f"Treat the {names} prediction{'s' if len(low_confidence) > 1 else ''} as directional only — "
                f"confidence fell below {int(LOW_CONFIDENCE_THRESHOLD * 100)}%, so prioritize lab confirmation here."
            )

        if historical_cases['sampleSize'] > 0:
            next_steps.append(
                f"Use the {historical_cases['sampleSize']} similar historical cases as context, "
                f"not as a substitute for patient-specific testing."
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
        # Synthetic clinical variables added for the expanded feature set
        'Ward_Type': "ward type (ICU vs. general ward)",
        'Previous_Antibiotic_Use': "recent prior antibiotic use",
        'CKD_Status': "chronic kidney disease status",
        'Liver_Disease': "liver disease status",
        'Cancer': "cancer history",
        'Immunocompromised_Status': "immunocompromised status",
        'Fever': "presence of fever",
        'Cough': "presence of cough",
        'Burning_Urination': "burning urination symptom",
        'Wound_Infection': "wound infection symptom",
        'WBC': "white blood cell count",
        'Neutrophils_pct': "neutrophil percentage",
        'Lymphocytes_pct': "lymphocyte percentage",
        'CRP': "C-reactive protein (CRP) level",
        'Procalcitonin': "procalcitonin level",
        'Creatinine': "creatinine level",
        'eGFR': "kidney filtration rate (eGFR)",
        'Temperature': "body temperature",
        'Heart_Rate': "heart rate",
        'Respiratory_Rate': "respiratory rate",
        'SpO2': "blood oxygen saturation (SpO2)",
        'Weight_kg': "weight",
        'BMI': "body mass index (BMI)",
    }
    if feature_name in mapping:
        return mapping[feature_name]
    if feature_name.startswith('Organism_'):
        return f"the organism ({feature_name.replace('Organism_', '')})"
    if feature_name.startswith('Specimen_Source_'):
        return f"the specimen source ({feature_name.replace('Specimen_Source_', '')})"
    return feature_name
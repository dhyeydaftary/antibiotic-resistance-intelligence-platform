"""
test_predict.py

Two scenarios, run back to back on the SAME underlying patient (same
organism/age/gender/etc.), so any difference in output is attributable
ONLY to the presence/absence of the 24 new synthetic clinical fields:

SCENARIO 1 — MINIMAL: only the 9 original required fields. Confirms
    backward compatibility — old-style requests still work, defaults
    fill in the rest.

SCENARIO 2 — FULL: all 9 original fields + all 24 new fields populated
    with realistic values representing a plausible severe/resistant-
    looking case (elevated WBC/CRP/procalcitonin, ICU ward, prior
    antibiotic use, etc.). Confirms the new fields are actually used —
    predictions and SHAP explanations should shift, and new-field names
    should appear in the top SHAP contributors when they're the ones
    driving the result.

Run from ml-backend/ via:
    python manage.py shell -c "exec(open('predictor/test_predict.py').read())"
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'amr_project.settings')
django.setup()

from predictor.predict import predict_resistance


BASE_PATIENT = {
    "age": 68,
    "gender": "Male",
    "diabetes": True,
    "hypertension": True,
    "hospital_before": True,
    "infection_freq": 3.0,
    "year": 2024,
    "month": 6,
    "organism": "Klebsiella pneumoniae",
}

FULL_EXTRA_FIELDS = {
    "ward_type": "ICU",
    "previous_antibiotic_use": True,
    "ckd_status": True,
    "liver_disease": False,
    "cancer": False,
    "immunocompromised_status": True,
    "fever": True,
    "cough": False,
    "burning_urination": False,
    "wound_infection": False,
    "specimen_source": "Blood",
    "wbc": 18.5,
    "neutrophils_pct": 82.0,
    "lymphocytes_pct": 12.0,
    "crp": 145.0,
    "procalcitonin": 4.2,
    "creatinine": 1.8,
    "egfr": 48.0,
    "temperature": 39.1,
    "heart_rate": 118.0,
    "respiratory_rate": 24.0,
    "spo2": 91.0,
    "weight_kg": 74.0,
    "bmi": 27.3,
}


def print_scenario(title, patient_data, focus_antibiotics=("CIP", "IPM", "GEN")):
    print("=" * 70)
    print(title)
    print("=" * 70)
    results = predict_resistance(patient_data)

    print(f"{'Antibiotic':<20}{'Result':<10}{'Confidence':<12}{'AWaRe'}")
    for r in results:
        print(f"{r['antibiotic']:<20}{r['result']:<10}{r['confidence']:<12}{r['awareCategory']}")

    print()
    for r in results:
        if r["antibiotic"] in focus_antibiotics:
            print(f"--- SHAP top features for {r['antibiotic']} (predicted: {r['result']}) ---")
            for feat in r["shapExplanation"]:
                print(f"  {feat['feature']:<30} contrib={feat['contribution']:>8}  "
                      f"({feat['direction']:<8})  value={feat['value']}")
            print()

    return results


minimal_results = print_scenario("SCENARIO 1: MINIMAL (original 9 fields only)", BASE_PATIENT)

full_patient = {**BASE_PATIENT, **FULL_EXTRA_FIELDS}
full_results = print_scenario("SCENARIO 2: FULL (9 original + 24 new fields)", full_patient)

print("=" * 70)
print("DIFF: predictions that changed between scenarios")
print("=" * 70)
changed = False
for m, f in zip(minimal_results, full_results):
    if m["result"] != f["result"] or abs(m["confidence"] - f["confidence"]) > 0.01:
        changed = True
        print(f"{m['antibiotic']:<20} minimal={m['result']}({m['confidence']})  "
              f"-> full={f['result']}({f['confidence']})")
if not changed:
    print("No predictions changed meaningfully — check SHAP sections above to see "
          "whether new fields still appear as top contributors even if the final "
          "R/S/I label didn't flip (confidence shifting is expected even without "
          "a label change).")
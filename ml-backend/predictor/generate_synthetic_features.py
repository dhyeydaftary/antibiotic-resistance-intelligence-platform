"""
generate_synthetic_features.py

Adds 24 synthetic, report-derived clinical variables to cleaned_dataset.csv.

Originally 28 columns (see git history). Four were removed after a SHAP
review of the v2 models found Blood_Pressure_Systolic, Height_cm, Platelets,
and Hemoglobin ranking surprisingly high in |SHAP| magnitude despite having
near-zero real correlation with resistance outcomes — added model complexity
without a meaningful accuracy contribution. Height is still sampled
internally (needed to derive BMI) but is no longer exposed as its own column.

METHODOLOGY (for report/presentation documentation):
- All new columns are SYNTHETIC. None come from real patient records.
- Values are sampled from distributions conditioned ONLY on real, pre-outcome
  columns already in the dataset: Organism, Age, Gender, Diabetes,
  Hypertension, Hospital_before, Infection_Freq.
- Nothing is conditioned on the 15 real antibiotic AST result columns (or any
  aggregate derived from them). An earlier version of this script computed a
  "Resistance_Count" (count of 'R' across the 15 AST columns) and used it to
  condition Ward_Type, Previous_Antibiotic_Use, WBC/CRP/Procalcitonin, and the
  four comorbidity flags. That was target leakage: those columns partially
  encoded the very labels the models are meant to predict, via a fabricated
  relationship, not a real one. Resistance_Count has been removed entirely —
  it is not computed, not added as a column, and does not condition anything.
- Gram_Stain was deliberately EXCLUDED: the current Organism panel is 100%
  Gram-negative, so the column would carry zero information.
- MIC, Breakpoint_Guideline, Dose/Route/Duration/Treatment dates,
  Culture_Result/Growth/Colony_Count were deliberately EXCLUDED as either
  target leakage (MIC/breakpoint define R/S/I) or post-outcome variables
  (treatment happens after resistance is already determined).

Run: python generate_synthetic_features.py
Output: cleaned_dataset_augmented.csv (review before overwriting original)

A leakage check (validate_no_leakage) runs at the end of main(): it encodes
each antibiotic result numerically (R=1, I=0.5, S=0) and reports the
correlation of every new column against every antibiotic. Anything above
LEAKAGE_CORR_THRESHOLD is flagged.
"""

import os
import sys

import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
from constants import ORGANISM_LIST

RNG_SEED = 42
rng = np.random.default_rng(RNG_SEED)

INPUT_PATH = "cleaned_dataset.csv"
OUTPUT_PATH = "cleaned_dataset_augmented.csv"

LEAKAGE_CORR_THRESHOLD = 0.15

ANTIBIOTIC_COLS = [
    "AMX/AMP", "AMC", "CZ", "FOX", "CTX/CRO", "IPM", "GEN", "AN",
    "Acide nalidixique", "ofx", "CIP", "C", "Co-trimoxazole",
    "Furanes", "colistine",
]

# Organism -> plausible specimen source weights (Blood, Urine, Wound, Respiratory, Catheter)
SPECIMEN_PRIORS = {
    "Escherichia coli":          [0.05, 0.70, 0.05, 0.05, 0.15],
    "Klebsiella pneumoniae":     [0.10, 0.45, 0.10, 0.20, 0.15],
    "Proteus mirabilis":         [0.05, 0.65, 0.10, 0.05, 0.15],
    "Pseudomonas aeruginosa":    [0.10, 0.20, 0.25, 0.30, 0.15],
    "Acinetobacter baumannii":   [0.15, 0.10, 0.20, 0.40, 0.15],
    "Enterobacteria spp.":       [0.10, 0.50, 0.10, 0.15, 0.15],
    "Citrobacter spp.":          [0.10, 0.55, 0.10, 0.10, 0.15],
    "Morganella morganii":       [0.10, 0.55, 0.10, 0.10, 0.15],
    "Serratia marcescens":       [0.15, 0.35, 0.15, 0.20, 0.15],
    "Unknown":                   [0.10, 0.45, 0.15, 0.15, 0.15],
}
assert set(SPECIMEN_PRIORS.keys()) == set(ORGANISM_LIST), (
    "SPECIMEN_PRIORS is keyed on the organism list — it must stay in sync "
    "with constants.ORGANISM_LIST. Update SPECIMEN_PRIORS if the organism "
    "panel changes."
)
SPECIMEN_LEVELS = ["Blood", "Urine", "Wound", "Respiratory", "Catheter"]


# Loads the original (pre-augmentation) cleaned dataset CSV.
def load_data():
    df = pd.read_csv(INPUT_PATH)
    return df


# Draws n random categorical values from the given levels/weights.
def sample_categorical(n, levels, weights):
    return rng.choice(levels, size=n, p=weights)


# Synthesizes a Ward_Type column, conditioned on legitimate pre-outcome inputs.
def add_ward_type(df):
    # Higher prior hospitalization + higher infection frequency -> higher ICU probability.
    # Legitimate pre-outcome inputs only (no resistance conditioning).
    prior_hosp = (df["Hospital_before"] == "Yes").astype(int).values
    inf_freq = df["Infection_Freq"].values
    icu_prob = 0.15 + 0.10 * prior_hosp + 0.15 * inf_freq
    icu_prob = np.clip(icu_prob, 0, 0.75)
    draws = rng.random(len(df))
    return np.where(draws < icu_prob, "ICU", "General Ward")


# Synthesizes a Specimen_Source column using per-organism sampling priors.
def add_specimen_source(df):
    out = np.empty(len(df), dtype=object)
    for organism, weights in SPECIMEN_PRIORS.items():
        mask = df["Organism"] == organism
        n = mask.sum()
        if n > 0:
            out[mask.values] = sample_categorical(n, SPECIMEN_LEVELS, weights)
    # any organism not in the prior table (shouldn't happen, but safe fallback)
    unfilled = out == None  # noqa: E711
    if unfilled.any():
        out[unfilled] = sample_categorical(unfilled.sum(), SPECIMEN_LEVELS,
                                            [0.1, 0.45, 0.15, 0.15, 0.15])
    return out


# Synthesizes a Previous_Antibiotic_Use column, conditioned on legitimate
# pre-outcome inputs.
def add_previous_antibiotic_use(df):
    prior_hosp = (df["Hospital_before"] == "Yes").astype(int).values
    inf_freq = df["Infection_Freq"].values
    prob_yes = 0.20 + 0.25 * prior_hosp + 0.12 * inf_freq
    prob_yes = np.clip(prob_yes, 0, 0.90)
    draws = rng.random(len(df))
    return np.where(draws < prob_yes, "Yes", "No")


# Synthesizes CKD/liver-disease/cancer/immunocompromised flags, each
# conditioned on age and existing comorbidities.
def add_comorbidities(df):
    age = df["Age"].values
    diabetes = (df["Diabetes"] == "Yes").astype(int).values
    hyper = (df["Hypertension"] == "Yes").astype(int).values

    # Draws a Yes/No column from a per-row Bernoulli probability.
    def bern(prob):
        return np.where(rng.random(len(df)) < prob, "Yes", "No")

    ckd_prob = 0.03 + 0.002 * age + 0.05 * diabetes + 0.03 * hyper
    liver_prob = 0.02 + 0.001 * age
    cancer_prob = 0.01 + 0.0015 * age
    immuno_prob = 0.05 + 0.001 * age + 0.03 * diabetes

    return (
        bern(np.clip(ckd_prob, 0, 0.6)),
        bern(np.clip(liver_prob, 0, 0.4)),
        bern(np.clip(cancer_prob, 0, 0.35)),
        bern(np.clip(immuno_prob, 0, 0.5)),
    )


# Synthesizes lab values (WBC, CRP, creatinine, eGFR, etc.), mildly
# conditioned on infection frequency, age, and CKD status.
def add_labs(df, ckd_status):
    n = len(df)
    age = df["Age"].values
    inf_freq = df["Infection_Freq"].values
    ckd = (ckd_status == "Yes").astype(int)

    # Mild, legitimate conditioning: real infections modestly elevate
    # inflammatory markers and mildly shift the cell-count picture; age has a
    # small independent effect on baseline renal function.
    # NOTE: Platelets and Hemoglobin were removed (see module docstring) —
    # SHAP review showed near-zero real correlation with resistance outcomes
    # relative to their model-complexity cost.
    wbc = rng.normal(8.0 + 0.5 * inf_freq + 0.01 * age, 2.2, n).clip(2.0, 30.0)
    neutrophils_pct = rng.normal(58 + 2.5 * inf_freq, 8, n).clip(20, 95)
    lymphocytes_pct = (100 - neutrophils_pct - rng.normal(10, 3, n)).clip(5, 50)

    crp = rng.exponential(10 + 10 * inf_freq, n).clip(1, 300)
    procalcitonin = rng.exponential(0.2 + 0.2 * inf_freq, n).clip(0.01, 20)

    egfr = (100 - 0.6 * age - 15 * ckd + rng.normal(0, 8, n)).clip(5, 130)
    creatinine = (1.2 - 0.008 * egfr + rng.normal(0, 0.15, n)).clip(0.3, 8.0)

    return {
        "WBC": wbc.round(1),
        "Neutrophils_pct": neutrophils_pct.round(1),
        "Lymphocytes_pct": lymphocytes_pct.round(1),
        "CRP": crp.round(1),
        "Procalcitonin": procalcitonin.round(2),
        "Creatinine": creatinine.round(2),
        "eGFR": egfr.round(1),
    }


# Synthesizes vital signs (temperature, heart rate, resp rate, SpO2),
# mildly conditioned on infection frequency.
def add_vitals(df):
    n = len(df)
    inf_freq = df["Infection_Freq"].values

    # NOTE: Blood_Pressure_Systolic was removed (see module docstring) — SHAP
    # review showed near-zero real correlation with resistance outcomes
    # relative to its model-complexity cost.
    temperature = rng.normal(36.9 + 0.15 * inf_freq, 0.7, n).clip(35.5, 40.5)
    heart_rate = rng.normal(78 + 3.0 * inf_freq, 12, n).clip(50, 150)
    resp_rate = rng.normal(15.5 + 0.7 * inf_freq, 3, n).clip(10, 35)
    spo2 = rng.normal(97.5 - 0.4 * inf_freq, 2, n).clip(85, 100)

    return {
        "Temperature": temperature.round(1),
        "Heart_Rate": heart_rate.round(0),
        "Respiratory_Rate": resp_rate.round(0),
        "SpO2": spo2.round(1),
    }


# Synthesizes fever/cough/burning-urination/wound-infection flags,
# conditioned on the (already synthesized) specimen source.
def add_symptoms(specimen_source):
    n = len(specimen_source)

    # Draws a Yes/No column with a boosted probability where a mask is true.
    def bern(prob_yes_mask, base_prob, boosted_prob):
        probs = np.where(prob_yes_mask, boosted_prob, base_prob)
        return np.where(rng.random(n) < probs, "Yes", "No")

    fever = np.where(rng.random(n) < 0.55, "Yes", "No")
    cough = bern(specimen_source == "Respiratory", 0.10, 0.70)
    burning_urination = bern(specimen_source == "Urine", 0.10, 0.65)
    wound_infection = bern(specimen_source == "Wound", 0.05, 0.80)

    return fever, cough, burning_urination, wound_infection


# Synthesizes weight/BMI from gender-based height/weight distributions.
def add_demographics(df):
    n = len(df)
    age = df["Age"].values
    is_female = (df["Gender"] == "Female").values

    # rough population height/weight distributions by gender. Height itself
    # is no longer exposed as an output column (see module docstring — SHAP
    # review showed near-zero real correlation with resistance outcomes
    # relative to its model-complexity cost) but is still needed internally
    # to derive BMI.
    height = np.where(
        is_female,
        rng.normal(162, 7, n),
        rng.normal(175, 7, n),
    ).clip(140, 200)
    weight = np.where(
        is_female,
        rng.normal(68, 14, n),
        rng.normal(78, 14, n),
    ).clip(35, 150)
    # mild age effect on weight (adults heavier than very young/very old)
    weight = weight + np.where((age > 10) & (age < 65), 3, -3)
    weight = weight.clip(20, 160)

    bmi = weight / ((height / 100) ** 2)

    return {
        "Weight_kg": weight.round(1),
        "BMI": bmi.round(1),
    }


# Checks every new synthetic column for suspicious correlation with the
# real antibiotic-resistance labels (target leakage).
def validate_no_leakage(df, new_cols):
    """
    Encode each antibiotic result numerically (R=1, I=0.5, S=0) and correlate
    against every new synthetic column (categoricals one-hot/binary-encoded
    first). Returns (report_df, ok) where ok is False if any |corr| exceeds
    LEAKAGE_CORR_THRESHOLD.
    """
    label_map = {"R": 1.0, "I": 0.5, "S": 0.0}

    # Build a numeric view of every new column for correlation purposes only.
    numeric_view = {}
    for col in new_cols:
        series = df[col]
        if not pd.api.types.is_numeric_dtype(series):
            uniques = sorted(series.dropna().unique())
            if set(uniques) <= {"Yes", "No"}:
                numeric_view[col] = (series == "Yes").astype(float)
            elif len(uniques) <= 2:
                # e.g. Ward_Type: ICU/General Ward -> binary
                numeric_view[col] = (series == uniques[0]).astype(float)
            else:
                # multi-level categorical (Specimen_Source) -> one dummy per level
                for level in uniques:
                    numeric_view[f"{col}={level}"] = (series == level).astype(float)
        else:
            numeric_view[col] = series.astype(float)

    rows = []
    worst = 0.0
    for ab in ANTIBIOTIC_COLS:
        y = df[ab].map(label_map)
        valid = y.notna()
        for feat_name, feat_series in numeric_view.items():
            corr = np.corrcoef(feat_series[valid], y[valid])[0, 1]
            rows.append({"antibiotic": ab, "feature": feat_name, "corr": corr})
            worst = max(worst, abs(corr))

    report = pd.DataFrame(rows)
    offenders = report[report["corr"].abs() > LEAKAGE_CORR_THRESHOLD]
    ok = offenders.empty

    print(f"\n=== Leakage check: max |corr| across all new-feature x antibiotic pairs = {worst:.4f} "
          f"(threshold {LEAKAGE_CORR_THRESHOLD}) ===")
    if ok:
        print("PASS: no new column exceeds the leakage correlation threshold.")
    else:
        print(f"FAIL: {len(offenders)} pair(s) exceed the threshold:")
        print(offenders.sort_values("corr", key=lambda s: s.abs(), ascending=False).to_string(index=False))

    return report, ok


# Entry point: generates all synthetic columns, writes the augmented
# CSV, and runs the leakage check.
def main():
    df = load_data()
    original_cols = set(df.columns)

    df["Ward_Type"] = add_ward_type(df)
    df["Specimen_Source"] = add_specimen_source(df)
    df["Previous_Antibiotic_Use"] = add_previous_antibiotic_use(df)

    ckd, liver, cancer, immuno = add_comorbidities(df)
    df["CKD_Status"] = ckd
    df["Liver_Disease"] = liver
    df["Cancer"] = cancer
    df["Immunocompromised_Status"] = immuno

    labs = add_labs(df, ckd)
    for col, vals in labs.items():
        df[col] = vals

    vitals = add_vitals(df)
    for col, vals in vitals.items():
        df[col] = vals

    fever, cough, burning, wound = add_symptoms(df["Specimen_Source"].values)
    df["Fever"] = fever
    df["Cough"] = cough
    df["Burning_Urination"] = burning
    df["Wound_Infection"] = wound

    demo = add_demographics(df)
    for col, vals in demo.items():
        df[col] = vals

    new_cols = [c for c in df.columns if c not in original_cols]

    df.to_csv(OUTPUT_PATH, index=False)
    print(f"Wrote {OUTPUT_PATH} with shape {df.shape}")
    print("\nNew columns added:")
    for c in new_cols:
        print(" -", c)

    _, ok = validate_no_leakage(df, new_cols)
    if not ok:
        raise SystemExit(
            "Leakage check FAILED — see report above. Fix conditioning before proceeding."
        )


if __name__ == "__main__":
    main()

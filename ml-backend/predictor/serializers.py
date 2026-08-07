# DRF serializers used two ways here: PredictionRequestSerializer is the
# real authority on /predict/ request shape (views.py's predict_view
# validates against it — the gateway's utils/predictionValidation.js
# mirrors these same fields/ranges as a pre-check, but this file is the
# source of truth; keep both in sync on any change). The remaining
# classes (PredictionResponseSerializer and its nested pieces) document
# the response shape predict_resistance() + generate_ai_insights()
# produce but are not actively invoked to serialize the response —
# views.py returns those dicts directly.
import os
import sys

from rest_framework import serializers

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
from constants import ORGANISM_LIST


# Validates and shapes an incoming /predict/ request body. The real
# authority on request contract — everything else mirrors this.
class PredictionRequestSerializer(serializers.Serializer):
    age = serializers.IntegerField(min_value=0, max_value=120)
    gender = serializers.ChoiceField(choices=['Male', 'Female'])
    diabetes = serializers.BooleanField()
    hypertension = serializers.BooleanField()
    hospital_before = serializers.BooleanField()
    infection_freq = serializers.FloatField(min_value=0, max_value=3)
    year = serializers.IntegerField(min_value=2000, max_value=2030)
    month = serializers.IntegerField(min_value=1, max_value=12)
    organism = serializers.ChoiceField(choices=ORGANISM_LIST)

    # --- Optional synthetic clinical variables (28 total). Omitting any of
    # these must not break a request — predict.py falls back to a
    # conservative default (see NEW_BINARY_FIELDS/NEW_NUMERIC_FIELDS there). ---
    ward_type = serializers.ChoiceField(
        choices=['ICU', 'General Ward'], required=False, allow_null=True)
    specimen_source = serializers.ChoiceField(
        choices=['Blood', 'Urine', 'Wound', 'Respiratory', 'Catheter'],
        required=False, allow_null=True)
    previous_antibiotic_use = serializers.BooleanField(required=False, allow_null=True)
    ckd_status = serializers.BooleanField(required=False, allow_null=True)
    liver_disease = serializers.BooleanField(required=False, allow_null=True)
    cancer = serializers.BooleanField(required=False, allow_null=True)
    immunocompromised_status = serializers.BooleanField(required=False, allow_null=True)
    fever = serializers.BooleanField(required=False, allow_null=True)
    cough = serializers.BooleanField(required=False, allow_null=True)
    burning_urination = serializers.BooleanField(required=False, allow_null=True)
    wound_infection = serializers.BooleanField(required=False, allow_null=True)

    # Bounds are real clinical reference ranges (wide enough to admit a
    # genuinely sick patient), not the training dataset's narrow observed
    # min/max — those were rejecting realistic severe cases (high fever,
    # hypoxia, tachycardia, renal failure, etc.) with a 400 error.
    wbc = serializers.FloatField(required=False, allow_null=True, min_value=0.1, max_value=50.0)
    neutrophils_pct = serializers.FloatField(required=False, allow_null=True, min_value=0, max_value=100)
    lymphocytes_pct = serializers.FloatField(required=False, allow_null=True, min_value=0, max_value=100)
    crp = serializers.FloatField(required=False, allow_null=True, min_value=0, max_value=500)
    procalcitonin = serializers.FloatField(required=False, allow_null=True, min_value=0, max_value=100)
    creatinine = serializers.FloatField(required=False, allow_null=True, min_value=0.1, max_value=15)
    egfr = serializers.FloatField(required=False, allow_null=True, min_value=0, max_value=150)
    temperature = serializers.FloatField(required=False, allow_null=True, min_value=30, max_value=43)
    heart_rate = serializers.FloatField(required=False, allow_null=True, min_value=20, max_value=250)
    respiratory_rate = serializers.FloatField(required=False, allow_null=True, min_value=4, max_value=60)
    spo2 = serializers.FloatField(required=False, allow_null=True, min_value=50, max_value=100)
    weight_kg = serializers.FloatField(required=False, allow_null=True, min_value=2, max_value=300)
    # Not a model feature (Height_cm was dropped from the v3 feature set —
    # see predict.py's MODELS-loading comment); accepted here purely so the
    # frontend's auto-calculated-BMI height input has somewhere validated
    # to land and gets persisted in prediction history. build_feature_row()
    # never reads it.
    height_cm = serializers.FloatField(required=False, allow_null=True, min_value=50, max_value=250)
    bmi = serializers.FloatField(required=False, allow_null=True, min_value=8, max_value=80)


# Documents the shape of one SHAP feature-contribution entry.
class ShapFeatureSerializer(serializers.Serializer):
    feature = serializers.CharField()
    contribution = serializers.FloatField()
    direction = serializers.CharField()


# Documents the shape of one antibiotic's prediction result.
class PredictionResultItemSerializer(serializers.Serializer):
    antibiotic = serializers.CharField()
    result = serializers.CharField()
    awareCategory = serializers.CharField()
    confidence = serializers.FloatField()
    shapExplanation = ShapFeatureSerializer(many=True)


# Documents one antibiotic's historical resistance rate breakdown.
class HistoricalResistanceBreakdownSerializer(serializers.Serializer):
    antibiotic = serializers.CharField()
    resistantRate = serializers.FloatField()
    recordsConsidered = serializers.IntegerField()


# Documents the shape of the similar-historical-cases summary block.
class SimilarHistoricalCasesSerializer(serializers.Serializer):
    sampleSize = serializers.IntegerField()
    matchCriteria = serializers.CharField()
    resistanceBreakdown = HistoricalResistanceBreakdownSerializer(many=True)


# Documents the shape of the risk-level assessment block.
class RiskAssessmentSerializer(serializers.Serializer):
    level = serializers.CharField()
    text = serializers.CharField()


# Documents the shape of the full aiInsights response block.
class AiInsightsSerializer(serializers.Serializer):
    summary = serializers.CharField()
    confidenceInterpretation = serializers.CharField()
    plainEnglishExplanation = serializers.CharField()
    riskAssessment = RiskAssessmentSerializer()
    similarHistoricalCases = SimilarHistoricalCasesSerializer()
    recommendedNextSteps = serializers.ListField(child=serializers.CharField())
    disclaimer = serializers.CharField()


# Documents the full /predict/ response shape end-to-end.
class PredictionResponseSerializer(serializers.Serializer):
    predictions = PredictionResultItemSerializer(many=True)
    aiInsights = AiInsightsSerializer()
    modelVersion = serializers.CharField()
from rest_framework import serializers


class PredictionRequestSerializer(serializers.Serializer):
    age = serializers.IntegerField(min_value=0, max_value=120)
    gender = serializers.ChoiceField(choices=['Male', 'Female'])
    diabetes = serializers.BooleanField()
    hypertension = serializers.BooleanField()
    hospital_before = serializers.BooleanField()
    infection_freq = serializers.FloatField(min_value=0, max_value=3)
    year = serializers.IntegerField(min_value=2000, max_value=2030)
    month = serializers.IntegerField(min_value=1, max_value=12)
    organism = serializers.ChoiceField(choices=[
        'Acinetobacter baumannii', 'Citrobacter spp.', 'Enterobacteria spp.',
        'Escherichia coli', 'Klebsiella pneumoniae', 'Morganella morganii',
        'Proteus mirabilis', 'Pseudomonas aeruginosa', 'Serratia marcescens', 'Unknown'
    ])


class ShapFeatureSerializer(serializers.Serializer):
    feature = serializers.CharField()
    contribution = serializers.FloatField()
    direction = serializers.CharField()


class PredictionResultItemSerializer(serializers.Serializer):
    antibiotic = serializers.CharField()
    result = serializers.CharField()
    awareCategory = serializers.CharField()
    confidence = serializers.FloatField()
    shapExplanation = ShapFeatureSerializer(many=True)


class HistoricalResistanceBreakdownSerializer(serializers.Serializer):
    antibiotic = serializers.CharField()
    resistantRate = serializers.FloatField()
    recordsConsidered = serializers.IntegerField()


class SimilarHistoricalCasesSerializer(serializers.Serializer):
    sampleSize = serializers.IntegerField()
    matchCriteria = serializers.CharField()
    resistanceBreakdown = HistoricalResistanceBreakdownSerializer(many=True)


class RiskAssessmentSerializer(serializers.Serializer):
    level = serializers.CharField()
    text = serializers.CharField()


class AiInsightsSerializer(serializers.Serializer):
    summary = serializers.CharField()
    confidenceInterpretation = serializers.CharField()
    plainEnglishExplanation = serializers.CharField()
    riskAssessment = RiskAssessmentSerializer()
    similarHistoricalCases = SimilarHistoricalCasesSerializer()
    recommendedNextSteps = serializers.ListField(child=serializers.CharField())
    disclaimer = serializers.CharField()


class PredictionResponseSerializer(serializers.Serializer):
    predictions = PredictionResultItemSerializer(many=True)
    aiInsights = AiInsightsSerializer()
    modelVersion = serializers.CharField()
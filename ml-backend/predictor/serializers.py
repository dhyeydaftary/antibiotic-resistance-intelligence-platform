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


class PredictionResultItemSerializer(serializers.Serializer):
    antibiotic = serializers.CharField()
    result = serializers.CharField()
    awareCategory = serializers.CharField()


class PredictionResponseSerializer(serializers.Serializer):
    predictions = PredictionResultItemSerializer(many=True)
    modelVersion = serializers.CharField()
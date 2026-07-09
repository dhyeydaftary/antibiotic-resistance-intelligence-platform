import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'amr_project.settings')
django.setup()

import pandas as pd
from predictor.predict import predict_resistance, FEATURE_COLUMNS, ANTIBIOTIC_COLUMNS

X = pd.read_csv('ml_artifacts/X_engineered.csv')
y = pd.read_csv('ml_artifacts/y_targets.csv')

row_index = 5
real_row = X.iloc[row_index]
real_answer = y.iloc[row_index]

organism_col = [c for c in FEATURE_COLUMNS if c.startswith('Organism_') and real_row[c] == 1]
organism_name = organism_col[0].replace('Organism_', '') if organism_col else 'Unknown'

patient_data = {
    'age': int(real_row['Age']),
    'gender': 'Male' if real_row['Gender'] == 1 else 'Female',
    'diabetes': bool(real_row['Diabetes']),
    'hypertension': bool(real_row['Hypertension']),
    'hospital_before': bool(real_row['Hospital_before']),
    'infection_freq': real_row['Infection_Freq'],
    'year': int(real_row['Year']),
    'month': int(real_row['Month']),
    'organism': organism_name,
}

print("Reconstructed patient input:", patient_data)
print()

predicted = predict_resistance(patient_data)

print(f"{'Antibiotic':<20} {'Predicted':<12} {'Actual':<10} {'Match'}")
for p in predicted:
    actual = real_answer[p['antibiotic']]
    match = "✅" if p['result'] == actual else "❌"
    print(f"{p['antibiotic']:<20} {p['result']:<12} {actual!s:<10} {match}")
import pandas as pd
import json

X = pd.read_csv('X_engineered.csv')
y = pd.read_csv('y_targets.csv')

feature_columns = X.columns.tolist()
antibiotic_columns = y.columns.tolist()

with open('feature_columns.json', 'w') as f:
    json.dump(feature_columns, f, indent=2)

with open('antibiotic_columns.json', 'w') as f:
    json.dump(antibiotic_columns, f, indent=2)

print("Feature columns:", feature_columns)
print("Antibiotic columns:", antibiotic_columns)
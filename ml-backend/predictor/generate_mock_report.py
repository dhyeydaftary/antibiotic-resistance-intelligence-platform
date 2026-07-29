"""
generate_mock_report.py

Generates a mock clinical/lab report PDF for testing the report-extraction
pipeline. This is NOT real patient data — purely a structured sample used
to design and validate extraction logic against a realistic layout.

Covers all 31 extractable fields: original 7 (age, gender, diabetes,
hypertension, hospital_before, infection_freq, organism) + all 24 new
synthetic-schema fields (comorbidities, labs, vitals, symptoms, specimen,
ward, previous antibiotic use, weight, BMI).
"""

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.lib.units import inch

OUTPUT_PATH = "mock_lab_report.pdf"

doc = SimpleDocTemplate(OUTPUT_PATH, pagesize=letter,
                         topMargin=0.6 * inch, bottomMargin=0.6 * inch)
styles = getSampleStyleSheet()
story = []

story.append(Paragraph("City General Hospital — Clinical Microbiology &amp; Laboratory Report", styles["Title"]))
story.append(Spacer(1, 10))

# --- Patient / Admission Information ---
story.append(Paragraph("Patient &amp; Admission Information", styles["Heading2"]))
patient_table = Table([
    ["Patient Age:", "68 years", "Gender:", "Male"],
    ["Ward:", "ICU", "Admission Date:", "2026-06-14"],
    ["Diabetes Mellitus:", "Yes", "Hypertension:", "Yes"],
    ["Prior Hospitalization (last 6mo):", "Yes", "Infection Frequency (past year):", "3"],
    ["Previous Antibiotic Use:", "Yes", "Immunocompromised:", "Yes"],
    ["Chronic Kidney Disease:", "Yes", "Liver Disease:", "No"],
    ["Cancer / Malignancy:", "No", "Weight:", "74 kg"],
    ["BMI:", "27.3", "", ""],
], colWidths=[2.1*inch, 1.4*inch, 2.1*inch, 1.4*inch])
patient_table.setStyle(TableStyle([
    ("FONTSIZE", (0, 0), (-1, -1), 9),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
]))
story.append(patient_table)
story.append(Spacer(1, 14))

# --- Symptoms & Vitals ---
story.append(Paragraph("Presenting Symptoms &amp; Vital Signs", styles["Heading2"]))
vitals_table = Table([
    ["Fever:", "Yes", "Cough:", "No"],
    ["Burning Urination:", "No", "Wound Infection:", "No"],
    ["Temperature:", "39.1 C", "Heart Rate:", "118 bpm"],
    ["Respiratory Rate:", "24 /min", "SpO2:", "91 %"],
], colWidths=[2.1*inch, 1.4*inch, 2.1*inch, 1.4*inch])
vitals_table.setStyle(TableStyle([
    ("FONTSIZE", (0, 0), (-1, -1), 9),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
]))
story.append(vitals_table)
story.append(Spacer(1, 14))

# --- Specimen Information ---
story.append(Paragraph("Specimen Information", styles["Heading2"]))
specimen_table = Table([
    ["Specimen Source:", "Blood", "Organism Identified:", "Klebsiella pneumoniae"],
], colWidths=[2.1*inch, 1.4*inch, 2.1*inch, 1.4*inch])
specimen_table.setStyle(TableStyle([
    ("FONTSIZE", (0, 0), (-1, -1), 9),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
]))
story.append(specimen_table)
story.append(Spacer(1, 14))

# --- Laboratory Investigations ---
story.append(Paragraph("Laboratory Investigations", styles["Heading2"]))
lab_table = Table([
    ["Test", "Result", "Test", "Result"],
    ["WBC", "18.5 x10^3/uL", "Neutrophils", "82.0 %"],
    ["Lymphocytes", "12.0 %", "CRP", "145.0 mg/L"],
    ["Procalcitonin", "4.20 ng/mL", "Creatinine", "1.80 mg/dL"],
    ["eGFR", "48.0 mL/min", "", ""],
], colWidths=[2.1*inch, 1.4*inch, 2.1*inch, 1.4*inch])
lab_table.setStyle(TableStyle([
    ("FONTSIZE", (0, 0), (-1, -1), 9),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
]))
story.append(lab_table)

doc.build(story)
print(f"Wrote {OUTPUT_PATH}")
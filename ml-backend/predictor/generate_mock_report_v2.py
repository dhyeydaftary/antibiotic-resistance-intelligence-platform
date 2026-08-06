"""
generate_mock_report_v2.py

Same underlying data as generate_mock_report.py, but with DIFFERENT label
wording/abbreviations throughout — simulating a different hospital's
report format. Used to test whether LLM-based extraction actually
generalizes to phrasing it wasn't designed around, vs. regex which
would completely fail on this without new patterns written by hand.
"""

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.lib.units import inch

OUTPUT_PATH = "mock_lab_report_v2.pdf"

doc = SimpleDocTemplate(OUTPUT_PATH, pagesize=letter,
                         topMargin=0.6 * inch, bottomMargin=0.6 * inch)
styles = getSampleStyleSheet()
story = []

story.append(Paragraph("St. Xavier Diagnostics — Culture &amp; Sensitivity Report", styles["Title"]))
story.append(Spacer(1, 10))

story.append(Paragraph("Demographics &amp; Hx", styles["Heading2"]))
patient_table = Table([
    ["Age/Sex:", "68 Y / M", "Unit:", "ICU"],
    ["DOA:", "14-Jun-2026", "DM:", "Present"],
    ["HTN:", "Present", "Hx Admission (6m):", "Yes"],
    ["No. Infections/yr:", "3", "Abx Hx:", "Yes"],
    ["Immunosuppressed:", "Y", "CKD Hx:", "Y"],
    ["Liver Dz:", "N", "Malignancy:", "N"],
    ["Body Wt:", "74 kg", "BMI:", "27.3"],
], colWidths=[1.9*inch, 1.4*inch, 1.9*inch, 1.4*inch])
patient_table.setStyle(TableStyle([("FONTSIZE", (0, 0), (-1, -1), 9), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
story.append(patient_table)
story.append(Spacer(1, 14))

story.append(Paragraph("C/O &amp; Vitals", styles["Heading2"]))
vitals_table = Table([
    ["Febrile:", "Y", "Cough:", "Absent"],
    ["Dysuria:", "Absent", "Wound Dx:", "Absent"],
    ["Temp:", "39.1 C", "PR:", "118/min"],
    ["RR:", "24/min", "SpO2 (RA):", "91%"],
], colWidths=[1.9*inch, 1.4*inch, 1.9*inch, 1.4*inch])
vitals_table.setStyle(TableStyle([("FONTSIZE", (0, 0), (-1, -1), 9), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
story.append(vitals_table)
story.append(Spacer(1, 14))

story.append(Paragraph("Specimen", styles["Heading2"]))
specimen_table = Table([
    ["Sample:", "Blood", "Isolate:", "Klebsiella pneumoniae"],
], colWidths=[1.9*inch, 1.4*inch, 1.9*inch, 1.4*inch])
specimen_table.setStyle(TableStyle([("FONTSIZE", (0, 0), (-1, -1), 9), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
story.append(specimen_table)
story.append(Spacer(1, 14))

story.append(Paragraph("Investigations", styles["Heading2"]))
lab_table = Table([
    ["Parameter", "Value", "Parameter", "Value"],
    ["TLC", "18.5 K/uL", "Polys", "82.0%"],
    ["Lymphs", "12.0%", "hs-CRP", "145.0 mg/L"],
    ["PCT", "4.20 ng/mL", "S. Creat", "1.80 mg/dL"],
    ["GFR (est.)", "48.0", "", ""],
], colWidths=[1.9*inch, 1.4*inch, 1.9*inch, 1.4*inch])
lab_table.setStyle(TableStyle([
    ("FONTSIZE", (0, 0), (-1, -1), 9),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
]))
story.append(lab_table)

doc.build(story)
print(f"Wrote {OUTPUT_PATH}")
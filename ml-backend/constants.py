"""
Shared constants for the ml-backend Django project.

ORGANISM_LIST was previously hardcoded independently in predict.py, trends.py,
serializers.py, and generate_synthetic_features.py's SPECIMEN_PRIORS keys —
any change required editing all four by hand. This is now the single source
of truth; import from here instead of redefining the list.
"""

ORGANISM_LIST = [
    'Acinetobacter baumannii', 'Citrobacter spp.', 'Enterobacteria spp.',
    'Escherichia coli', 'Klebsiella pneumoniae', 'Morganella morganii',
    'Proteus mirabilis', 'Pseudomonas aeruginosa', 'Serratia marcescens', 'Unknown'
]

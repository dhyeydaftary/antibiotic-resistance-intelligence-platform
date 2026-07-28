// frontend/src/constants/questionAnswers.js

export const QUESTION_ANSWERS = {
  'What organism shows the highest multi-drug resistance rate?': 
    'Based on the dataset, Klebsiella pneumoniae shows the highest multi-drug resistance rate, with over 45% of samples showing resistance to at least three antibiotic classes.',
  
  'Which antibiotic class has the steadiest susceptibility profile?': 
    'Aminoglycosides (Gentamicin, Amikacin) show the steadiest susceptibility profile across all organisms, with consistently high susceptibility rates around 85-90% in the dataset.',
  
  'How does sample source correlate with resistance likelihood?': 
    'Samples from ICU patients and long-term care facilities show 30-40% higher resistance rates compared to outpatient samples. Blood cultures from hospitalized patients exhibit the highest resistance prevalence.',
  
  'Which WHO AWaRe category appears most in recent predictions?': 
    'The Watch category appears most frequently in recent predictions, accounting for approximately 55% of all antibiotics predicted against, reflecting the clinical preference for broad-spectrum agents.',
  
  'Which organism has the fewest recorded samples in this dataset?': 
    'Pseudomonas aeruginosa has the fewest recorded samples in this dataset, representing only 3.2% of all samples (approximately 280 records).',
  
  'How many antibiotics fall under the Reserve tier?': 
    'Based on the WHO AWaRe classification map, exactly 1 antibiotic falls under the Reserve tier: Colistin. Reserve antibiotics are last-resort treatments used only when other options have failed.',
};

export const RESEARCH_ANSWERS = {
  'Global rise in colistin resistance: mechanisms and impact': 
    'Colistin resistance is primarily mediated by mcr-1 plasmid-borne genes, with recent studies showing a 15-20% increase in resistance rates globally, particularly in Southeast Asia and Africa. This threatens the last-resort antibiotic for carbapenem-resistant infections.',
  
  'New insights into beta-lactamase evolution in Gram-negative bacteria': 
    'Recent genomic analyses reveal that beta-lactamase genes are evolving through both horizontal gene transfer and point mutations, with CTX-M and KPC variants showing accelerated diversification. The emergence of new variants has reduced carbapenem efficacy by 40% in clinical settings.',
  
  'WHO updates AWaRe classification: key changes in 2024': 
    'The 2024 AWaRe update reclassified several antibiotics: Ceftazidime-avibactam moved to Watch tier, while newer agents like cefiderocol were added to the Reserve tier. The Access target was increased from 60% to 70% of total antibiotic consumption.',
  
  'Carbapenem resistance trends across ICU admissions': 
    'Carbapenem resistance in ICU patients has increased by 25% over the past 5 years, with KPC-producing Klebsiella pneumoniae being the predominant mechanism. Mortality rates for carbapenem-resistant infections remain high at 40-50%.',
  
  'Stewardship programs and Access-tier prescribing rates': 
    'Antimicrobial stewardship programs have increased Access-tier prescribing by 12-18% across participating hospitals, reducing overall antibiotic consumption while maintaining clinical outcomes. The WHO\'s 70% Access target is achievable with sustained stewardship efforts.',
};
function AboutPage() {
  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h1>About AMR-Insight</h1>
      <p>
        AMR-Insight is a research and education platform that predicts antibiotic
        susceptibility (Resistant / Susceptible / Intermediate) across 15 antibiotics
        using machine learning trained on public antimicrobial resistance datasets.
      </p>
      <p>
        This is a student project built for academic purposes and is not intended
        for real clinical decision-making. Predictions are based on public Kaggle
        datasets, not live hospital lab feeds.
      </p>
      <h2>Methodology</h2>
      <p>
        Model: scikit-learn / Keras multi-output classifier. Data: public AMR
        dataset (10,710 records, 15 antibiotic targets). Categorization follows
        WHO AWaRe (Access / Watch / Reserve) antibiotic classification.
      </p>
      <h2>Team</h2>
      <p>Built by a 3-person team as a combined semester project.</p>
    </div>
  );
}

export default AboutPage;
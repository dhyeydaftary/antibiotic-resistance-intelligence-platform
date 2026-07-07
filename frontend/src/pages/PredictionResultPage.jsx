import { useParams } from 'react-router-dom';

const FAKE_PREDICTION = {
  predictionId: 'test123',
  organism: 'E. coli',
  predictions: [
    { antibiotic: 'Amoxicillin', result: 'R', confidence: 0.87, awareCategory: 'Access' },
    { antibiotic: 'Ciprofloxacin', result: 'S', confidence: 0.92, awareCategory: 'Watch' },
    { antibiotic: 'Meropenem', result: 'I', confidence: 0.65, awareCategory: 'Reserve' },
  ],
  modelVersion: 'v1.0',
  createdAt: '2026-07-06T10:00:00Z',
};

const AWARE_COLORS = {
  Access: '#2e7d32',
  Watch: '#f9a825',
  Reserve: '#c62828',
};

function PredictionResultPage() {
  const { id } = useParams();

  return (
    <div style={{ padding: '20px' }}>
      <h1>Prediction Result Page</h1>
      <p>Prediction ID: {id}</p>
      <p>Organism: {FAKE_PREDICTION.organism}</p>

      <table style={{ borderCollapse: 'collapse', marginTop: '16px' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Antibiotic</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Result</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Confidence</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>AWaRe Category</th>
          </tr>
        </thead>
        <tbody>
          {FAKE_PREDICTION.predictions.map((p) => (
            <tr key={p.antibiotic}>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>{p.antibiotic}</td>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>{p.result}</td>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>{(p.confidence * 100).toFixed(0)}%</td>
              <td
                style={{
                  border: '1px solid #ccc',
                  padding: '8px',
                  color: AWARE_COLORS[p.awareCategory],
                  fontWeight: 'bold',
                }}
              >
                {p.awareCategory}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PredictionResultPage;
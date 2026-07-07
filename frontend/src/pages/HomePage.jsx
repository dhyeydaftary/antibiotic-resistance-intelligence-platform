import { Link } from 'react-router-dom';

const FAKE_USER = { name: 'Dhyey' };

const FAKE_RECENT_PREDICTIONS = [
  { predictionId: 'test123', organism: 'E. coli', createdAt: '2026-07-06T10:00:00Z' },
  { predictionId: 'test456', organism: 'Staphylococcus aureus', createdAt: '2026-07-05T14:30:00Z' },
  { predictionId: 'test789', organism: 'Klebsiella pneumoniae', createdAt: '2026-07-04T09:15:00Z' },
];

const FAKE_STATS = {
  totalPredictions: 12,
  mostCommonOrganism: 'E. coli',
  lastPredictionDate: '2026-07-06',
};

function HomePage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Welcome back, {FAKE_USER.name}</h1>

      <div style={{ display: 'flex', gap: '16px', margin: '20px 0' }}>
        <div style={{ border: '1px solid #ccc', padding: '12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>Total Predictions</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{FAKE_STATS.totalPredictions}</div>
        </div>
        <div style={{ border: '1px solid #ccc', padding: '12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>Most Common Organism</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{FAKE_STATS.mostCommonOrganism}</div>
        </div>
        <div style={{ border: '1px solid #ccc', padding: '12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>Last Prediction</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{FAKE_STATS.lastPredictionDate}</div>
        </div>
      </div>

      <Link to="/predict">
        <button style={{ padding: '10px 20px', fontSize: '16px' }}>+ New Prediction</button>
      </Link>

      <h2 style={{ marginTop: '32px' }}>Recent Predictions</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '400px' }}>
        {FAKE_RECENT_PREDICTIONS.map((p) => (
          <Link
            key={p.predictionId}
            to={`/predict/result/${p.predictionId}`}
            style={{
              border: '1px solid #ccc',
              borderRadius: '8px',
              padding: '10px',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div style={{ fontWeight: 'bold' }}>{p.organism}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {new Date(p.createdAt).toLocaleDateString()}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default HomePage;
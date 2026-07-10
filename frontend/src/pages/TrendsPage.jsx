import { useState, useEffect } from 'react';
import { getTrends } from '../api/trendsApi';

const ANTIBIOTIC_OPTIONS = [
  'AMX/AMP', 'AMC', 'CZ', 'FOX', 'CTX/CRO', 'IPM', 'GEN', 'AN',
  'Acide nalidixique', 'ofx', 'CIP', 'C', 'Co-trimoxazole', 'Furanes', 'colistine'
];

function TrendsPage() {
  const [antibiotic, setAntibiotic] = useState('CIP');
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    getTrends(antibiotic)
      .then((result) => {
        setSeries(result.data.series);
      })
      .catch((err) => {
        setError('Failed to load trend data.');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [antibiotic]);

  const maxRate = series.length > 0 ? Math.max(...series.map((d) => d.resistanceRate)) : 1;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Trends Page</h1>

      <label>
        Antibiotic:{' '}
        <select value={antibiotic} onChange={(e) => setAntibiotic(e.target.value)}>
          {ANTIBIOTIC_OPTIONS.map((ab) => (
            <option key={ab} value={ab}>{ab}</option>
          ))}
        </select>
      </label>

      <p style={{ marginTop: '12px' }}>Resistance rate over time — {antibiotic} (live data)</p>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '200px', marginTop: '24px' }}>
          {series.map((d) => (
            <div key={d.period} style={{ textAlign: 'center' }}>
              <div
                style={{
                  height: `${(d.resistanceRate / maxRate) * 150}px`,
                  width: '40px',
                  backgroundColor: '#c62828',
                  marginBottom: '4px',
                }}
              />
              <div style={{ fontSize: '12px' }}>{(d.resistanceRate * 100).toFixed(0)}%</div>
              <div style={{ fontSize: '11px', color: '#666' }}>{d.period}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TrendsPage;
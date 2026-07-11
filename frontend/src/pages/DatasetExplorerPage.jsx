import { useState, useEffect } from 'react';
import { getDatasetStats } from '../api/datasetApi';

function DatasetExplorerPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getDatasetStats()
      .then((result) => {
        setStats(result.data);
      })
      .catch((err) => {
        setError('Failed to load dataset statistics.');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Dataset Explorer</h1>
      <p>Overview of the underlying dataset used to train the prediction model.</p>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && stats && (
        <>
          <div style={{ display: 'flex', gap: '16px', marginTop: '20px' }}>
            <div style={{ border: '1px solid #ccc', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>Total Rows</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{stats.totalRows.toLocaleString()}</div>
            </div>
            <div style={{ border: '1px solid #ccc', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>Total Columns</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{stats.totalColumns}</div>
            </div>
            <div style={{ border: '1px solid #ccc', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>Antibiotic Targets</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{stats.antibioticTargets}</div>
            </div>
            <div style={{ border: '1px solid #ccc', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>Date Range</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                {stats.dateRange.start} – {stats.dateRange.end}
              </div>
            </div>
          </div>

          <h2 style={{ marginTop: '32px' }}>Organism Distribution</h2>
          <table style={{ borderCollapse: 'collapse', marginTop: '12px', width: '100%', maxWidth: '500px' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Organism</th>
                <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Count</th>
              </tr>
            </thead>
            <tbody>
              {stats.organismDistribution.map((item) => (
                <tr key={item.organism}>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{item.organism}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{item.count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export default DatasetExplorerPage;
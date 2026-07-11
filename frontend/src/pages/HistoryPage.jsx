import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHistory } from '../api/historyApi';

function summarize(predictions) {
  const summary = { resistantCount: 0, susceptibleCount: 0, intermediateCount: 0 };
  predictions.forEach((p) => {
    if (p.result === 'R') summary.resistantCount += 1;
    else if (p.result === 'S') summary.susceptibleCount += 1;
    else if (p.result === 'I') summary.intermediateCount += 1;
  });
  return summary;
}

function HistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getHistory()
      .then((result) => {
        setHistory(result.data.history);
      })
      .catch((err) => {
        setError('Failed to load history.');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  function handleView(item) {
    navigate('/predict/result/live', {
      state: { prediction: { predictions: item.predictions, inputData: item.inputData } },
    });
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>History Page</h1>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && history.length === 0 && (
        <p>No predictions yet. Run a prediction to see it here.</p>
      )}

      {!loading && !error && history.length > 0 && (
        <table style={{ borderCollapse: 'collapse', marginTop: '16px', width: '100%', maxWidth: '700px' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Date</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Organism</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>R / S / I Summary</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => {
              const summary = summarize(item.predictions);
              return (
                <tr key={item._id}>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    {item.inputData?.organism || 'Unknown'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    R: {summary.resistantCount} / S: {summary.susceptibleCount} / I: {summary.intermediateCount}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    <button onClick={() => handleView(item)}>View</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default HistoryPage;
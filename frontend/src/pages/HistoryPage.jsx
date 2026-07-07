import { Link } from 'react-router-dom';

const FAKE_HISTORY = [
  {
    predictionId: 'test123',
    organism: 'E. coli',
    createdAt: '2026-07-06T10:00:00Z',
    summary: { resistantCount: 1, susceptibleCount: 1, intermediateCount: 1 },
  },
  {
    predictionId: 'test456',
    organism: 'Staphylococcus aureus',
    createdAt: '2026-07-05T14:30:00Z',
    summary: { resistantCount: 2, susceptibleCount: 2, intermediateCount: 0 },
  },
  {
    predictionId: 'test789',
    organism: 'Klebsiella pneumoniae',
    createdAt: '2026-07-04T09:15:00Z',
    summary: { resistantCount: 3, susceptibleCount: 0, intermediateCount: 1 },
  },
];

function HistoryPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>History Page</h1>

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
          {FAKE_HISTORY.map((item) => (
            <tr key={item.predictionId}>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                {new Date(item.createdAt).toLocaleDateString()}
              </td>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>{item.organism}</td>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                R: {item.summary.resistantCount} / S: {item.summary.susceptibleCount} / I: {item.summary.intermediateCount}
              </td>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                <Link to={`/predict/result/${item.predictionId}`}>View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default HistoryPage;
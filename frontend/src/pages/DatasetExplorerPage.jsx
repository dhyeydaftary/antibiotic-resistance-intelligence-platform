const FAKE_DATASET_STATS = {
  totalRows: 10710,
  totalColumns: 23,
  antibioticTargets: 15,
  dateRange: 'Jan 2024 – Jun 2026',
};

function DatasetExplorerPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Dataset Explorer</h1>
      <p>Overview of the underlying dataset used to train the prediction model.</p>

      <div style={{ display: 'flex', gap: '16px', marginTop: '20px' }}>
        <div style={{ border: '1px solid #ccc', padding: '12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>Total Rows</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{FAKE_DATASET_STATS.totalRows.toLocaleString()}</div>
        </div>
        <div style={{ border: '1px solid #ccc', padding: '12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>Total Columns</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{FAKE_DATASET_STATS.totalColumns}</div>
        </div>
        <div style={{ border: '1px solid #ccc', padding: '12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>Antibiotic Targets</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{FAKE_DATASET_STATS.antibioticTargets}</div>
        </div>
        <div style={{ border: '1px solid #ccc', padding: '12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>Date Range</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{FAKE_DATASET_STATS.dateRange}</div>
        </div>
      </div>
    </div>
  );
}

export default DatasetExplorerPage;
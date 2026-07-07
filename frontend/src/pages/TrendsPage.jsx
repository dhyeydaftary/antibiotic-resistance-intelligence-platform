const FAKE_TREND_DATA = [
  { period: '2025-01', resistanceRate: 0.34 },
  { period: '2025-02', resistanceRate: 0.37 },
  { period: '2025-03', resistanceRate: 0.41 },
  { period: '2025-04', resistanceRate: 0.39 },
  { period: '2025-05', resistanceRate: 0.45 },
  { period: '2025-06', resistanceRate: 0.48 },
];

function TrendsPage() {
  const maxRate = Math.max(...FAKE_TREND_DATA.map((d) => d.resistanceRate));

  return (
    <div style={{ padding: '20px' }}>
      <h1>Trends Page</h1>
      <p>Resistance rate over time — Ciprofloxacin (fake data)</p>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '200px', marginTop: '24px' }}>
        {FAKE_TREND_DATA.map((d) => (
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
    </div>
  );
}

export default TrendsPage;
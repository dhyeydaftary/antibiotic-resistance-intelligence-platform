import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

const FEATURES = [
  {
    title: 'AI-Powered Prediction',
    description: 'Predicts susceptibility across 15 antibiotics using trained machine learning models.',
  },
  {
    title: 'Trend Analysis',
    description: 'Visualize resistance patterns over time across different organisms and regions.',
  },
  {
    title: 'Research-Grade Data',
    description: 'Built on public antimicrobial resistance datasets, aligned with WHO AWaRe classification.',
  },
];

function LandingPage() {
  const videoRef = useRef(null);
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasPlayed && videoRef.current) {
          videoRef.current.play().catch(() => { });
          setHasPlayed(true);
        }
      },
      { threshold: 0.5 }
    );

    if (videoRef.current) observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, [hasPlayed]);

  return (
    <div>
      {/* Hero Section */}
      <section style={{
        padding: '80px 20px',
        textAlign: 'center',
        background: 'linear-gradient(180deg, #0d1b2a 0%, #1b263b 100%)',
        color: '#fff',
      }}>
        <h1 style={{ fontSize: '42px', marginBottom: '12px' }}>AMR-Insight</h1>
        <p style={{ fontSize: '18px', color: '#ccc', maxWidth: '600px', margin: '0 auto 32px' }}>
          Predicting antibiotic resistance before it becomes a crisis — an AI-powered
          research and education platform for antimicrobial resistance intelligence.
        </p>
        <Link to="/signup">
          <button style={{
            padding: '14px 32px',
            fontSize: '16px',
            backgroundColor: '#5DCAA5',
            color: '#04342C',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}>
            Get Started
          </button>
        </Link>
      </section>

      {/* Scroll-Triggered Animation Slot */}
      <section style={{ padding: '40px 20px', maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          borderRadius: '12px',
          overflow: 'hidden',
          backgroundColor: '#f0f0f0',
          minHeight: '300px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <video
            ref={videoRef}
            muted
            playsInline
            preload="auto"
            style={{ width: '100%', display: 'block' }}
          >
            {/* TODO: replace with real generated clip once Whisk/Flow/ezgif export is ready */}
            <source src="/assets/resistance-animation.webm" type="video/webm" />
            <source src="/assets/resistance-animation.mp4" type="video/mp4" />
          </video>
          {/* Fallback text shown if no video file exists yet */}
          <p style={{ position: 'absolute', color: '#999', fontSize: '14px' }}>
            [Animation placeholder — video not yet added]
          </p>
        </div>
      </section>

      {/* Feature Highlights */}
      <section style={{ padding: '60px 20px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              style={{
                border: '1px solid #ddd',
                borderRadius: '12px',
                padding: '24px',
                width: '260px',
                textAlign: 'left',
              }}
            >
              <h3 style={{ marginBottom: '8px' }}>{feature.title}</h3>
              <p style={{ color: '#666', fontSize: '14px' }}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '24px 20px',
        textAlign: 'center',
        borderTop: '1px solid #eee',
        color: '#888',
        fontSize: '13px',
      }}>
        <p>AMR-Insight — Academic project, LJU Institute of Engineering &amp; Technology</p>
        <p>Built for research and educational purposes. Not intended for clinical decision-making.</p>
      </footer>
    </div>
  );
}

export default LandingPage;
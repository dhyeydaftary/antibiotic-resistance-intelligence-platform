import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <Link to="/home">
        <button style={{ padding: '10px 20px', fontSize: '16px', marginTop: '16px' }}>
          Back to Dashboard
        </button>
      </Link>
    </div>
  );
}

export default NotFoundPage;
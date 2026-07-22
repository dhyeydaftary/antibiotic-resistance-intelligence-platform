import { Link } from 'react-router-dom';

function AuthHeader() {
  return (
    <header style={{ padding: '12px', borderBottom: '1px solid #ccc' }}>
      <Link to="/" style={{ fontWeight: 'bold', textDecoration: 'none' }}>
        AMR-Insight
      </Link>
    </header>
  );
}

export default AuthHeader;
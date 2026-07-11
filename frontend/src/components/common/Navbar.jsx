import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function Navbar() {
  const { isAuthenticated, logout } = useAuth();

  function handleLogout() {
    logout();
  }

  return (
    <nav style={{ display: 'flex', gap: '16px', padding: '12px', borderBottom: '1px solid #ccc' }}>
      <Link to="/">Landing</Link>
      <Link to="/about">About</Link>

      {!isAuthenticated && (
        <>
          <Link to="/login">Login</Link>
          <Link to="/signup">Signup</Link>
        </>
      )}

      {isAuthenticated && (
        <>
          <Link to="/home">Home</Link>
          <Link to="/predict">Predict</Link>
          <Link to="/history">History</Link>
          <Link to="/trends">Trends</Link>
          <Link to="/explore">Explore</Link>
          <button onClick={handleLogout} style={{ marginLeft: 'auto' }}>
            Logout
          </button>
        </>
      )}
    </nav>
  );
}

export default Navbar;
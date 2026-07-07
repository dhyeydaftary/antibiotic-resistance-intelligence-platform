import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav style={{ display: 'flex', gap: '16px', padding: '12px', borderBottom: '1px solid #ccc' }}>
      <Link to="/">Landing</Link>
      <Link to="/login">Login</Link>
      <Link to="/signup">Signup</Link>
      <Link to="/home">Home</Link>
      <Link to="/predict">Predict</Link>
      <Link to="/history">History</Link>
      <Link to="/trends">Trends</Link>
      <Link to="/explore">Explore</Link>
      <Link to="/about">About</Link>
    </nav>
  );
}

export default Navbar;
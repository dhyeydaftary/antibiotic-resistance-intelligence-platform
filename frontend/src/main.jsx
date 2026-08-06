// ===================================================================
// App entrypoint — mounts the React tree into #root (see index.html).
// Provider order matters: ErrorBoundary wraps everything (catches render
// crashes anywhere below), BrowserRouter enables routing, AuthProvider
// (context/AuthContext.jsx) must sit inside the router since it calls
// useNavigate() internally. App.jsx is the actual UI root; routing is
// resolved by routes/AppRoutes.jsx.
// ===================================================================
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);

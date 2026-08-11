// ===================================================================
// The single route table for the app. Every page is registered here —
// this is the extension point for adding a new page/route. Two auth
// gates wrap individual routes: GuestRoute (redirects an already-logged-
// in user away from auth pages) and ProtectedRoute (redirects a guest
// away from app pages, both defined alongside this file). "/" (landing),
// "/about", and "/glossary" are intentionally public — no gate.
// ===================================================================
import { Routes, Route } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import SignupPage from '../pages/SignupPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import HomePage from '../pages/HomePage';
import PredictionInputPage from '../pages/PredictionInputPage';
import PredictionResultPage from '../pages/PredictionResultPage';
import HistoryPage from '../pages/HistoryPage';
import TrendsPage from '../pages/TrendsPage';
import DatasetExplorerPage from '../pages/DatasetExplorerPage';
import AboutPage from '../pages/AboutPage';
import GlossaryPage from '../pages/GlossaryPage';
import NotFoundPage from '../pages/NotFoundPage';
import ProtectedRoute from './ProtectedRoute';
import GuestRoute from './GuestRoute';
import TermsPage from '../pages/TermsPage';
import PrivacyPage from '../pages/PrivacyPage';

// Declares every route in the app and the auth gate (if any) each sits behind.
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/signup" element={<GuestRoute><SignupPage /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
      <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/predict" element={<ProtectedRoute><PredictionInputPage /></ProtectedRoute>} />
      <Route path="/predict/result/:id" element={<ProtectedRoute><PredictionResultPage /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
      <Route path="/trends" element={<ProtectedRoute><TrendsPage /></ProtectedRoute>} />
      <Route path="/explore" element={<ProtectedRoute><DatasetExplorerPage /></ProtectedRoute>} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/glossary" element={<GlossaryPage />} />
      <Route path="*" element={<NotFoundPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
    </Routes>
  );
}

export default AppRoutes;
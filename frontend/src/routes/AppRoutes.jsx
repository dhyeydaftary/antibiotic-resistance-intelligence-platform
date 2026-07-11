import { Routes, Route } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import SignupPage from '../pages/SignupPage';
import HomePage from '../pages/HomePage';
import PredictionInputPage from '../pages/PredictionInputPage';
import PredictionResultPage from '../pages/PredictionResultPage';
import HistoryPage from '../pages/HistoryPage';
import TrendsPage from '../pages/TrendsPage';
import DatasetExplorerPage from '../pages/DatasetExplorerPage';
import AboutPage from '../pages/AboutPage';
import NotFoundPage from '../pages/NotFoundPage';
import ProtectedRoute from './ProtectedRoute';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/predict" element={<ProtectedRoute><PredictionInputPage /></ProtectedRoute>} />
      <Route path="/predict/result/:id" element={<ProtectedRoute><PredictionResultPage /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
      <Route path="/trends" element={<ProtectedRoute><TrendsPage /></ProtectedRoute>} />
      <Route path="/explore" element={<ProtectedRoute><DatasetExplorerPage /></ProtectedRoute>} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRoutes;
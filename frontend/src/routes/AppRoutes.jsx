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

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/predict" element={<PredictionInputPage />} />
      <Route path="/predict/result/:id" element={<PredictionResultPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/trends" element={<TrendsPage />} />
      <Route path="/explore" element={<DatasetExplorerPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRoutes;
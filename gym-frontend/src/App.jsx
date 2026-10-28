import React, { lazy, Suspense, useCallback, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Members = lazy(() => import('./pages/Members'));
const Trainers = lazy(() => import('./pages/Trainers'));
const Plans = lazy(() => import('./pages/Plans'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Payments = lazy(() => import('./pages/Payments'));
const AssignPlan = lazy(() => import('./pages/AssignPlan'));
const Equipment = lazy(() => import('./pages/Equipment'));
const Supplements = lazy(() => import('./pages/Supplements'));
const Reports = lazy(() => import('./pages/Reports'));
const DBFeatures = lazy(() => import('./pages/DBFeatures'));

const TITLES = {
  '/': 'Performance Overview',
  '/members': 'Members Management',
  '/attendance': 'Attendance Records',
  '/payments': 'Financial Transactions',
  '/trainers': 'Trainer Directory',
  '/plans': 'Class Schedules',
  '/equipment': 'Equipment Inventory',
  '/reports': 'Detailed Metrics',
  '/supplements': 'Supplement Shop',
  '/assign': 'Assign Plans',
  '/db': 'Database Features',
};

const PageFallback = () => (
  <p role="status" className="py-20 text-center text-iron-text-secondary text-sm">Loading…</p>
);

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = useCallback(() => setNavOpen(false), []);
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="app-container">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Sidebar open={navOpen} onClose={closeNav} />
      <div className="main-wrapper">
        <TopBar title={TITLES[location.pathname] || 'Gym Ecosystem'} navOpen={navOpen} onMenu={() => setNavOpen(true)} />
        <main id="main-content" className="main-content" tabIndex={-1}>
          <Suspense fallback={<PageFallback />}>{children}</Suspense>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
    <Router>
      <Routes>
        <Route path="/login" element={<Suspense fallback={null}><Login /></Suspense>} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />
        <Route path="/trainers" element={<ProtectedRoute><Trainers /></ProtectedRoute>} />
        <Route path="/plans" element={<ProtectedRoute><Plans /></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
        <Route path="/assign" element={<ProtectedRoute><AssignPlan /></ProtectedRoute>} />
        <Route path="/equipment" element={<ProtectedRoute><Equipment /></ProtectedRoute>} />
        <Route path="/supplements" element={<ProtectedRoute><Supplements /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/db" element={<ProtectedRoute><DBFeatures /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
    </ThemeProvider>
  );
}

export default App;

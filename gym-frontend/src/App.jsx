import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Trainers from './pages/Trainers';
import Plans from './pages/Plans';
import Attendance from './pages/Attendance';
import Payments from './pages/Payments';
import AssignPlan from './pages/AssignPlan';
import Equipment from './pages/Equipment';
import Supplements from './pages/Supplements';
import Reports from './pages/Reports';
import DBFeatures from './pages/DBFeatures';
import './index.css';

import TopBar from './components/TopBar';
import { ThemeProvider } from './context/ThemeContext';

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;

  // Simple titles based on path
  const getTitle = () => {
    switch(location.pathname) {
      case '/': return 'Performance Overview';
      case '/members': return 'Members Management';
      case '/attendance': return 'Attendance Records';
      case '/payments': return 'Financial Transactions';
      case '/trainers': return 'Trainer Directory';
      case '/plans': return 'Class Schedules';
      case '/equipment': return 'Equipment Inventory';
      case '/reports': return 'Detailed Metrics';
      case '/supplements': return 'Supplement Shop';
      case '/assign': return 'Assign Plans';
      case '/db': return 'Database Features';
      default: return 'Gym Ecosystem';
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-wrapper">
        <TopBar title={getTitle()} />
        <div className="main-content">
          {children}
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
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

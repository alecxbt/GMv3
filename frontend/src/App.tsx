import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LoginPage } from './components/Auth/LoginPage';
import { RegisterPage } from './components/Auth/RegisterPage';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { LayoutsPage } from './pages/LayoutsPage';
import { WatchlistsPage } from './pages/WatchlistsPage';
import { DashboardPage } from './pages/DashboardPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { useAuthStore } from './stores/authStore';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; // Import the CSS for toastify

// Component to handle redirect for unknown paths
const NotFoundRedirect: React.FC = () => {
  const { user, accessToken, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // If authenticated, redirect to dashboard
  if (accessToken && user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  
  // If not authenticated, redirect to login
  return <Navigate to="/login" state={{ from: location }} replace />;
};

function App() {
  return (
    <Router>
      {/* ToastContainer provides the UI for displaying toast notifications */}
      <ToastContainer 
        position="top-right"
        autoClose={5000} 
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick 
        rtl={false}
        pauseOnFocusLoss 
        draggable 
        pauseOnHover 
        theme="dark" 
      />
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}
        />
        <Route
          path="/layouts"
          element={<ProtectedRoute requirePro={true}><LayoutsPage /></ProtectedRoute>}
        />
        <Route
          path="/watchlists"
          element={<ProtectedRoute requirePro={true}><WatchlistsPage /></ProtectedRoute>}
        />
        
        {/* Redirect from any other path to the dashboard if authenticated, or login if not */}
        <Route path="*" element={<NotFoundRedirect />} />
      </Routes>
    </Router>
  );
}

export default App;

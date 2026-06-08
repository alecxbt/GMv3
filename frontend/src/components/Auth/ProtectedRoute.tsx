import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requirePro?: boolean;
  requireEnterprise?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requirePro = false,
  requireEnterprise = false,
}) => {
  const location = useLocation();
  const { user, accessToken, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    if (accessToken && !user) {
      checkAuth();
    }
  }, [accessToken, user, checkAuth]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!accessToken || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check subscription level
  if (requireEnterprise && user.subscription !== 'enterprise') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-100 mb-4">Enterprise Feature</h2>
          <p className="text-gray-400 mb-6">
            This feature requires an Enterprise subscription.
          </p>
          <button className="px-6 py-2 bg-green-500 text-black rounded hover:bg-green-400">
            Contact Sales
          </button>
        </div>
      </div>
    );
  }

  if (requirePro && user.subscription === 'free') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-100 mb-4">Pro Feature</h2>
          <p className="text-gray-400 mb-6">
            Upgrade to Pro to access real-time data and advanced features.
          </p>
          <button className="px-6 py-2 bg-green-500 text-black rounded hover:bg-green-400">
            Upgrade to Pro - $29/month
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
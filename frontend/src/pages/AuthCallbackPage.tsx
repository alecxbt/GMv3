import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const setAuthFromOAuth = useAuthStore((s) => s.setAuthFromOAuth);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const userStr = params.get('user');
    if (accessToken && refreshToken && userStr) {
      try {
        const user = JSON.parse(userStr);
        setAuthFromOAuth(accessToken, refreshToken, user).then(() => navigate('/', { replace: true }));
        return;
      } catch {
        // fall through to error
      }
    }
    navigate('/login', { replace: true });
  }, [navigate, setAuthFromOAuth]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500" />
    </div>
  );
};

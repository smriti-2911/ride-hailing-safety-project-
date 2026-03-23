import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';

const ProtectedRoute = () => {
  const { user, loading } = useApp();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute; 
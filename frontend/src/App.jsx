import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PostRide from './pages/PostRide';
import Profile from './pages/Profile';
import RideHistory from './pages/RideHistory';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  return children;
};

const App = () => {
  return (
    <AuthProvider>
      <AppProvider>
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard/*"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/post-ride/:id"
              element={
                <ProtectedRoute>
                  <PostRide />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rides"
              element={
                <ProtectedRoute>
                  <RideHistory />
                </ProtectedRoute>
              }
            />
          </Routes>
          <Toaster position="top-right" toastOptions={{
            duration: 4000,
            style: { background: '#363636', color: '#fff', borderRadius: '8px' }
          }} />
        </div>
      </AppProvider>
    </AuthProvider>
  );
};

export default App;

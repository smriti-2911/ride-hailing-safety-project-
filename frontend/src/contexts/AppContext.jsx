import React, { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const login = async (email, password) => {
    try {
      // We'll implement this later
      toast.error('Login not implemented yet');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed');
    }
  };

  const register = async (userData) => {
    try {
      // We'll implement this later
      toast.error('Registration not implemented yet');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Registration failed');
    }
  };

  const logout = () => {
    setUser(null);
    navigate('/');
    toast.success('Logged out successfully');
  };

  const value = {
    user,
    login,
    register,
    logout
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContext;
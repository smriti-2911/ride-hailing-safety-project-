import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

/** Match backend `auth_routes._normalize_email` (NFKC + lower) so prod login/register agree. */
function normalizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email.normalize('NFKC').trim().toLowerCase();
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authService.login(normalizeEmail(email), password);
      const { access_token, user: userData } = response.data;

      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      return { success: true };
    } catch (error) {
      const dbg = error.response?.data?.debug;
      const base =
        error.response?.data?.error ||
        (error.code === 'ECONNABORTED'
          ? 'Server took too long (try again in a moment — API may be waking up)'
          : error.message);
      const msg =
        base +
        (dbg
          ? ` (${dbg === 'no_user' ? 'account not on this server — register again' : 'wrong password'})`
          : '');
      return {
        success: false,
        error: msg || 'Login failed'
      };
    }
  };

  const register = async (userData) => {
    try {
      const payload = { ...userData, email: normalizeEmail(userData.email) };
      await authService.register(payload);
      return await login(payload.email, userData.password);
    } catch (error) {
      const dbg = error.response?.data?.debug;
      const base =
        error.response?.data?.error ||
        (error.code === 'ECONNABORTED'
          ? 'Server took too long (try again — API may be waking up)'
          : error.message);
      const msg = base + (dbg ? ` (${dbg})` : '');
      return {
        success: false,
        error: msg || 'Registration failed'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
import axios from 'axios';

const configuredBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const BASE_URL = configuredBase.replace(/\/+$/, '');

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints mapping correctly to Python backend
const endpoints = {
  auth: {
    login: (email, password) => api.post('/api/auth/login', { email, password }),
    register: (userData) => api.post('/api/auth/register', userData),
  },
  rides: {
    bookRide: (source, destination, routeObj, safetyScore) => api.post('/api/ride/book-ride', {
      source,
      destination,
      route: routeObj,
      safety_score: safetyScore
    }),
    checkDeviation: (rideId, currentLocation, context = {}) => api.post('/api/ride/check-deviation', { ride_id: rideId, current_location: currentLocation, context }),
    completeRide: (rideId) => api.post(`/api/ride/complete/${rideId}`),
    getAlerts: (rideId) => api.get(`/api/ride/alerts/${rideId}`),
    listMyRides: () => api.get('/api/ride/my-rides'),
    clearHistory: () => api.delete('/api/ride/clear-history'),
    deleteRide: (rideId) => api.delete(`/api/ride/${rideId}`),
  },
  user: {
    getProfile: () => api.get('/api/user/profile'),
    updateProfile: (payload) => api.put('/api/user/profile', payload),
  },
  safety: {
    getSafetyScore: (source, destination, safetyMode = 'normal') => api.get('/api/safety/safety-score', { params: { source, destination, safety_mode: safetyMode } }),
  },
  history: {
    getPostRideAnalysis: (rideId) => api.get(`/api/history/post-ride/${rideId}`)
  }
};

export const authService = endpoints.auth;
export const rideService = endpoints.rides;
export const safetyService = endpoints.safety;
export const historyService = endpoints.history;
export const userService = endpoints.user;

export default api;
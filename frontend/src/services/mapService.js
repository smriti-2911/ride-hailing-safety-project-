import axios from 'axios';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'
).replace(/\/+$/, '');

export const mapService = {
  // Fetch safety data for heatmap
  async getSafetyData() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/safety/heatmap`);
      return response.data;
    } catch (error) {
      console.error('Error fetching safety data:', error);
      return [];
    }
  },

  // Fetch emergency points (police stations, hospitals)
  async getEmergencyPoints() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/emergency/points`);
      return response.data;
    } catch (error) {
      console.error('Error fetching emergency points:', error);
      return [];
    }
  },

  // Fetch popular locations in Pune
  async getPopularLocations() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/locations/popular`);
      return response.data;
    } catch (error) {
      console.error('Error fetching popular locations:', error);
      return [];
    }
  },

  // Get route suggestions between two points
  async getRouteSuggestions(origin, destination) {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/routes/suggestions`, {
        origin,
        destination
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching route suggestions:', error);
      throw error;
    }
  },

  // Get real-time vehicle location
  async getVehicleLocation(vehicleId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/vehicles/${vehicleId}/location`);
      return response.data;
    } catch (error) {
      console.error('Error fetching vehicle location:', error);
      return null;
    }
  },

  // Get Pune boundary coordinates
  async getPuneBoundary() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/locations/pune-boundary`);
      return response.data;
    } catch (error) {
      console.error('Error fetching Pune boundary:', error);
      // Return a simplified Pune boundary as fallback
      return {
        type: 'Polygon',
        coordinates: [[
          [73.7372, 18.4088],
          [73.9939, 18.4088],
          [73.9939, 18.6298],
          [73.7372, 18.6298],
          [73.7372, 18.4088]
        ]]
      };
    }
  },

  // Calculate safety score for a given location
  async calculateSafetyScore(location) {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/safety/score`, {
        latitude: location[0],
        longitude: location[1]
      });
      return response.data.score;
    } catch (error) {
      console.error('Error calculating safety score:', error);
      return null;
    }
  }
};

export default mapService; 
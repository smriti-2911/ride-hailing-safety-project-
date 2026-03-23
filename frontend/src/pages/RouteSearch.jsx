import React, { useState, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { motion } from 'framer-motion';
import { rideService } from '../services/api';
import 'leaflet/dist/leaflet.css';

const PUNE_CENTER = [18.5204, 73.8567];
const ZOOM_LEVEL = 12;

const customIcon = new Icon({
  iconUrl: '/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const RouteSearch = () => {
  const [searchForm, setSearchForm] = useState({
    from: '',
    to: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [currentRide, setCurrentRide] = useState(null);
  const mapRef = useRef(null);

  const getSafetyColor = (score) => {
    if (score >= 90) return '#22c55e'; // green
    if (score >= 70) return '#3b82f6'; // blue
    if (score >= 50) return '#eab308'; // yellow
    return '#ef4444'; // red
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await rideService.getRoutes(searchForm.from, searchForm.to);
      setRoutes(response.routes);
      if (response.routes.length > 0) {
        setSelectedRoute(response.routes[0]);
        // Center map on the route
        if (mapRef.current) {
          const bounds = response.routes[0].path.reduce(
            (bounds, point) => bounds.extend(point),
            mapRef.current.getBounds()
          );
          mapRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch routes');
    } finally {
      setLoading(false);
    }
  };

  const handleStartRide = async (route) => {
    try {
      const response = await rideService.startRide(route.id);
      setCurrentRide({ ...route, ...response });
    } catch (err) {
      setError(err.message || 'Failed to start ride');
    }
  };

  return (
    <div className="h-screen flex">
      {/* Map Container */}
      <div className="flex-1 relative">
        <MapContainer
          center={PUNE_CENTER}
          zoom={ZOOM_LEVEL}
          className="h-full w-full"
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Display Routes */}
          {routes.map((route, index) => (
            <React.Fragment key={route.id}>
              <Polyline
                positions={route.path}
                pathOptions={{
                  color: getSafetyColor(route.safety_score),
                  weight: selectedRoute?.id === route.id ? 6 : 4,
                  opacity: selectedRoute?.id === route.id ? 1 : 0.7
                }}
                eventHandlers={{
                  click: () => setSelectedRoute(route)
                }}
              />
              <Marker position={route.path[0]} icon={customIcon}>
                <Popup>Start: {route.source}</Popup>
              </Marker>
              <Marker position={route.path[route.path.length - 1]} icon={customIcon}>
                <Popup>End: {route.destination}</Popup>
              </Marker>
            </React.Fragment>
          ))}
        </MapContainer>

        {/* Search Panel */}
        <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-4 w-80">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">From</label>
              <input
                type="text"
                value={searchForm.from}
                onChange={(e) => setSearchForm(prev => ({ ...prev, from: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Enter starting location"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">To</label>
              <input
                type="text"
                value={searchForm.to}
                onChange={(e) => setSearchForm(prev => ({ ...prev, to: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Enter destination"
                required
              />
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Searching...' : 'Search Routes'}
            </button>
          </form>
        </div>

        {/* Route Details Panel */}
        {selectedRoute && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-4 w-80"
          >
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Route Details</h3>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Safety Score</span>
                    <span
                      className={`px-2 py-1 rounded-full text-sm font-medium ${
                        selectedRoute.safety_score >= 90
                          ? 'bg-green-100 text-green-800'
                          : selectedRoute.safety_score >= 70
                          ? 'bg-blue-100 text-blue-800'
                          : selectedRoute.safety_score >= 50
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {selectedRoute.safety_score}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Distance</span>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedRoute.distance} km
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Duration</span>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedRoute.duration} mins
                    </span>
                  </div>
                </div>
              </div>
              {!currentRide && (
                <button
                  onClick={() => handleStartRide(selectedRoute)}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Start Ride
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Emergency Button */}
        {currentRide && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute bottom-4 right-4 z-[1000] bg-red-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Emergency
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default RouteSearch; 
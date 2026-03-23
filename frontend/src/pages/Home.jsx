import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import axios from 'axios';

function Home() {
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('http://localhost:5000/api/routes', {
        start_location: startLocation,
        end_location: endLocation,
      });

      setRoutes(response.data.routes || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch routes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-1 bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-6">Find Safe Route</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Start Location
              </label>
              <input
                type="text"
                value={startLocation}
                onChange={(e) => setStartLocation(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter start location"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                End Location
              </label>
              <input
                type="text"
                value={endLocation}
                onChange={(e) => setEndLocation(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter end location"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Finding Routes...' : 'Find Routes'}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {routes.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Available Routes</h3>
            <div className="space-y-4">
              {routes.map((route, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-md hover:bg-gray-50"
                >
                  <div className="font-medium">Route {index + 1}</div>
                  <div className="text-sm text-gray-600">
                    Safety Score: {route.safety_score}
                  </div>
                  <div className="text-sm text-gray-600">
                    Duration: {route.duration} mins
                  </div>
                  <div className="text-sm text-gray-600">
                    Distance: {route.distance} km
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="md:col-span-2 bg-white p-2 rounded-lg shadow h-[600px]">
        <MapContainer
          center={[18.5204, 73.8567]} // Pune coordinates
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
        </MapContainer>
      </div>
    </div>
  );
}

export default Home; 
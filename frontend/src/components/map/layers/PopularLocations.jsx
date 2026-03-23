import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { motion } from 'framer-motion';

const PopularLocations = ({ locations }) => {
  // Custom icon for popular locations
  const popularIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div class="bg-white rounded-full p-2 shadow-lg transform hover:scale-110 transition-transform duration-200">
        <div class="w-4 h-4 bg-indigo-500 rounded-full animate-pulse"></div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });

  return (
    <>
      {locations?.map((location, index) => (
        <Marker
          key={index}
          position={[location.lat, location.lng]}
          icon={popularIcon}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-semibold text-lg">{location.name}</h3>
              <p className="text-sm text-gray-600">
                Average daily pickups: {location.dailyPickups}
              </p>
              <div className="mt-2">
                <div className="flex items-center">
                  <span className="text-sm text-gray-500">Safety Score:</span>
                  <div className="ml-2 w-24 h-2 bg-gray-200 rounded">
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${location.safetyScore * 10}%`,
                        backgroundColor: location.safetyScore >= 7 ? '#22c55e' :
                                       location.safetyScore >= 5 ? '#eab308' : '#ef4444'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
};

export default PopularLocations; 
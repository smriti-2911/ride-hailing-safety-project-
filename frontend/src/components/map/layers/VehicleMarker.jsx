import React, { useEffect, useRef } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { motion, animate } from 'framer-motion';

const VehicleMarker = ({ position, rotation, vehicleType = 'taxi', status, driverInfo }) => {
  const markerRef = useRef(null);
  const prevPosition = useRef(position);

  // Custom vehicle icon
  const vehicleIcon = L.divIcon({
    className: 'custom-vehicle-icon',
    html: `
      <div class="relative">
        <div class="absolute -translate-x-1/2 -translate-y-1/2">
          <div class="relative">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="text-indigo-600 transform transition-transform duration-300"
              style="transform: rotate(${rotation}deg)"
            >
              <path d="M5,11L6.5,6.5H17.5L19,11M17.5,16A1.5,1.5 0 0,1 16,14.5A1.5,1.5 0 0,1 17.5,13A1.5,1.5 0 0,1 19,14.5A1.5,1.5 0 0,1 17.5,16M6.5,16A1.5,1.5 0 0,1 5,14.5A1.5,1.5 0 0,1 6.5,13A1.5,1.5 0 0,1 8,14.5A1.5,1.5 0 0,1 6.5,16M18.92,6C18.72,5.42 18.16,5 17.5,5H6.5C5.84,5 5.28,5.42 5.08,6L3,12V20A1,1 0 0,0 4,21H5A1,1 0 0,0 6,20V19H18V20A1,1 0 0,0 19,21H20A1,1 0 0,0 21,20V12L18.92,6Z" />
            </svg>
            ${status === 'active' ? 
              '<div class="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>' : 
              '<div class="absolute -top-1 -right-1 w-3 h-3 bg-gray-500 rounded-full"></div>'
            }
          </div>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });

  useEffect(() => {
    if (markerRef.current && prevPosition.current) {
      const marker = markerRef.current;
      const start = prevPosition.current;
      const end = position;

      // Animate marker movement
      animate({
        from: 0,
        to: 1,
        duration: 1,
        onUpdate: (progress) => {
          const lat = start[0] + (end[0] - start[0]) * progress;
          const lng = start[1] + (end[1] - start[1]) * progress;
          marker.setLatLng([lat, lng]);
        }
      });
    }
    prevPosition.current = position;
  }, [position]);

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={vehicleIcon}
      rotationAngle={rotation}
    >
      <Popup>
        <div className="p-3">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold">{driverInfo?.name}</h3>
              <p className="text-sm text-gray-600">{vehicleType.toUpperCase()}</p>
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-center text-sm text-gray-600">
              <span className="font-medium">Rating:</span>
              <div className="ml-2 flex items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(driverInfo?.rating || 0)
                        ? 'text-yellow-400'
                        : 'text-gray-300'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
            <div className="mt-2 text-sm">
              <span className={`px-2 py-1 rounded-full ${
                status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {status === 'active' ? 'On Trip' : 'Available'}
              </span>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

export default VehicleMarker; 
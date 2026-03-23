import React, { useEffect, useState } from 'react';
import { Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion, useAnimation } from 'framer-motion';
import { interpolate } from '@turf/turf';

// Custom Icons
const createIcon = (iconUrl, size = [32, 32]) => new L.Icon({
  iconUrl,
  iconSize: size,
  iconAnchor: [size[0]/2, size[1]/2],
  popupAnchor: [0, -size[1]/2],
});

const icons = {
  taxi: createIcon('/assets/icons/taxi.svg'),
  start: createIcon('/assets/icons/start-location.svg', [38, 38]),
  end: createIcon('/assets/icons/end-location.svg', [38, 38]),
  police: createIcon('/assets/icons/police.svg'),
  hospital: createIcon('/assets/icons/hospital.svg'),
  emergency: createIcon('/assets/icons/emergency.svg'),
};

// Animated Vehicle Component
export const MovingVehicle = ({ route, isActive }) => {
  const [position, setPosition] = useState(route.path[0]);
  const [rotation, setRotation] = useState(0);
  const map = useMap();
  const controls = useAnimation();

  useEffect(() => {
    if (!isActive) return;

    let currentIndex = 0;
    const animateMovement = async () => {
      while (currentIndex < route.path.length - 1) {
        const start = route.path[currentIndex];
        const end = route.path[currentIndex + 1];
        
        // Calculate rotation angle
        const dx = end[1] - start[1];
        const dy = end[0] - start[0];
        const angle = Math.atan2(dx, dy) * (180 / Math.PI);
        setRotation(angle);

        // Animate movement
        const steps = 20;
        for (let i = 0; i <= steps; i++) {
          const progress = i / steps;
          const lat = start[0] + (end[0] - start[0]) * progress;
          const lng = start[1] + (end[1] - start[1]) * progress;
          setPosition([lat, lng]);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        currentIndex++;
      }
    };

    animateMovement();
  }, [route, isActive, map]);

  if (!isActive) return null;

  return (
    <Marker
      position={position}
      icon={icons.taxi}
      rotationAngle={rotation}
      rotationOrigin="center"
    >
      <Popup>Current Location</Popup>
    </Marker>
  );
};

// Route Markers Component
export const RouteMarkers = ({ route, isSelected }) => {
  return (
    <>
      <Marker position={route.path[0]} icon={icons.start}>
        <Popup>Start: {route.source}</Popup>
      </Marker>
      <Marker position={route.path[route.path.length - 1]} icon={icons.end}>
        <Popup>End: {route.destination}</Popup>
      </Marker>
    </>
  );
};

// Safety Heatmap Component
export const SafetyHeatmap = ({ safetyData }) => {
  return safetyData.map((point, index) => (
    <Circle
      key={index}
      center={point.location}
      radius={200}
      pathOptions={{
        color: point.score >= 90 ? '#22c55e' :
               point.score >= 70 ? '#3b82f6' :
               point.score >= 50 ? '#eab308' : '#ef4444',
        fillOpacity: 0.3,
        weight: 1
      }}
    >
      <Popup>
        Safety Score: {point.score}%
        <br />
        {point.description}
      </Popup>
    </Circle>
  ));
};

// Emergency Points Component
export const EmergencyPoints = ({ points }) => {
  return points.map((point, index) => (
    <Marker
      key={index}
      position={point.location}
      icon={point.type === 'police' ? icons.police :
            point.type === 'hospital' ? icons.hospital : icons.emergency}
    >
      <Popup>
        <div className="font-medium">{point.name}</div>
        <div className="text-sm text-gray-600">{point.type}</div>
        <div className="text-sm">{point.contact}</div>
      </Popup>
    </Marker>
  ));
};

// Pune Boundary Component
export const PuneBoundary = ({ boundary }) => {
  return (
    <Circle
      center={[18.5204, 73.8567]}
      radius={15000}
      pathOptions={{
        color: '#6366f1',
        fillColor: '#6366f1',
        fillOpacity: 0.05,
        weight: 2,
        dashArray: '5, 5'
      }}
    />
  );
};

// Popular Locations Component
export const PopularLocations = ({ locations }) => {
  return locations.map((location, index) => (
    <Marker
      key={index}
      position={location.coordinates}
      icon={createIcon('/assets/icons/location.svg')}
    >
      <Popup>
        <div className="font-medium">{location.name}</div>
        <div className="text-sm text-gray-600">{location.type}</div>
      </Popup>
    </Marker>
  ));
}; 
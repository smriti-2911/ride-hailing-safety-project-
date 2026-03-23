import { useEffect, useState, useRef } from 'react';
import { Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-rotatedmarker';

// Custom vehicle icon
const vehicleIcon = new L.Icon({
  iconUrl: '/assets/taxi.png', // We'll add this asset
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

// Custom location markers
const startIcon = new L.Icon({
  iconUrl: '/assets/start-location.png',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
});

const endIcon = new L.Icon({
  iconUrl: '/assets/end-location.png',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
});

export const MovingVehicle = ({ route, isActive }) => {
  const map = useMap();
  const markerRef = useRef(null);
  const [position, setPosition] = useState(route[0]);
  const [rotation, setRotation] = useState(0);
  const frameRef = useRef();
  
  useEffect(() => {
    if (!isActive) return;
    
    let idx = 0;
    let startTime;
    const duration = 30000; // 30 seconds to complete route
    
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = (timestamp - startTime) / duration;
      
      if (progress >= 1) {
        setPosition(route[route.length - 1]);
        return;
      }
      
      const targetIdx = Math.floor(progress * (route.length - 1));
      if (targetIdx !== idx) {
        idx = targetIdx;
        const currentPos = route[idx];
        const nextPos = route[Math.min(idx + 1, route.length - 1)];
        
        // Calculate rotation angle
        const dx = nextPos[1] - currentPos[1];
        const dy = nextPos[0] - currentPos[0];
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        
        setPosition(currentPos);
        setRotation(angle);
      }
      
      frameRef.current = requestAnimationFrame(animate);
    };
    
    frameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [route, isActive]);
  
  return (
    <Marker
      position={position}
      icon={vehicleIcon}
      rotationAngle={rotation}
      rotationOrigin="center"
      ref={markerRef}
    />
  );
};

export const RouteMarkers = ({ start, end }) => {
  return (
    <>
      <Marker position={start} icon={startIcon}>
        <Popup>Starting Point</Popup>
      </Marker>
      <Marker position={end} icon={endIcon}>
        <Popup>Destination</Popup>
      </Marker>
    </>
  );
};

export const PuneBoundary = () => {
  const map = useMap();
  
  useEffect(() => {
    const bounds = L.latLngBounds(
      L.latLng(18.4088, 73.7539), // SW
      L.latLng(18.6357, 73.9619)  // NE
    );
    
    map.setMaxBounds(bounds);
    map.on('drag', () => {
      if (!map.getBounds().intersects(bounds)) {
        map.panInsideBounds(bounds, { animate: false });
      }
    });
    
    // Add Pune boundary polygon
    const puneBoundaryStyle = {
      color: '#4F46E5',
      weight: 2,
      opacity: 0.6,
      fillOpacity: 0.1,
    };
    
    // Simplified Pune boundary coordinates
    const puneBoundaryCoords = [
      [18.4088, 73.7539],
      [18.6357, 73.7539],
      [18.6357, 73.9619],
      [18.4088, 73.9619],
    ];
    
    L.polygon(puneBoundaryCoords, puneBoundaryStyle).addTo(map);
  }, [map]);
  
  return null;
};

export const SafetyHeatmap = ({ safetyData }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!safetyData?.length) return;
    
    const points = safetyData.map(point => ({
      lat: point.latitude,
      lng: point.longitude,
      intensity: point.safety_score / 100,
    }));
    
    const heat = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 10,
      gradient: {
        0.4: '#ef4444',
        0.6: '#60a5fa',
        0.8: '#22c55e',
      },
    }).addTo(map);
    
    return () => {
      map.removeLayer(heat);
    };
  }, [map, safetyData]);
  
  return null;
};

export const PopularLocations = ({ onSelect }) => {
  const popularPlaces = [
    { name: 'Hinjewadi IT Park', coords: [18.5912, 73.7380] },
    { name: 'Koregaon Park', coords: [18.5314, 73.8446] },
    { name: 'Shaniwar Wada', coords: [18.5195, 73.8553] },
    { name: 'Phoenix Market City', coords: [18.5623, 73.9175] },
    { name: 'Pune Airport', coords: [18.5793, 73.9089] },
    // Add more popular locations
  ];
  
  return (
    <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-4 max-w-xs w-full">
      <h3 className="text-sm font-semibold text-gray-900 mb-2">Popular Locations</h3>
      <div className="space-y-2">
        {popularPlaces.map((place) => (
          <button
            key={place.name}
            onClick={() => onSelect(place)}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
          >
            {place.name}
          </button>
        ))}
      </div>
    </div>
  );
}; 
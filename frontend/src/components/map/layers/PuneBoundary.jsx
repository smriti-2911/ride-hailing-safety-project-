import React from 'react';
import { Polygon } from 'react-leaflet';
import { motion } from 'framer-motion';

// Approximate Pune boundary coordinates
const puneBoundaryCoords = [
  [18.4088, 73.7370],
  [18.4088, 73.9916],
  [18.6357, 73.9916],
  [18.6357, 73.7370],
];

const PuneBoundary = () => {
  return (
    <Polygon
      positions={puneBoundaryCoords}
      pathOptions={{
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.1,
        weight: 2,
        dashArray: '5, 5',
      }}
    />
  );
};

export default PuneBoundary; 
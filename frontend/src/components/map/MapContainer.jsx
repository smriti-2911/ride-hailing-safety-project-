import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap, LayersControl, ZoomControl } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { Switch } from '@headlessui/react';
import { mapService } from '../../services/mapService';
import PuneBoundary from './layers/PuneBoundary';
import SafetyHeatmap from './layers/SafetyHeatmap';
import EmergencyPoints from './layers/EmergencyPoints';
import PopularLocations from './layers/PopularLocations';
import RouteMarkers from './layers/RouteMarkers';
import MovingVehicle from './layers/MovingVehicle';
import 'leaflet/dist/leaflet.css';

const MapCenter = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

const MapControls = ({ layers, toggleLayer }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="absolute top-4 left-4 bg-white p-4 rounded-lg shadow-lg z-[1000]"
    >
      <h3 className="text-lg font-semibold mb-3">Map Layers</h3>
      {Object.entries(layers).map(([key, value]) => (
        <div key={key} className="flex items-center space-x-3 mb-2">
          <Switch
            checked={value}
            onChange={() => toggleLayer(key)}
            className={`${
              value ? 'bg-blue-600' : 'bg-gray-200'
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
          >
            <span
              className={`${
                value ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />
          </Switch>
          <span className="text-sm">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
        </div>
      ))}
    </motion.div>
  );
};

const Map = ({ selectedRoute, vehicleLocation }) => {
  const [center, setCenter] = useState([18.5204, 73.8567]); // Pune center
  const [zoom, setZoom] = useState(12);
  const [layers, setLayers] = useState({
    safetyHeatmap: true,
    emergencyPoints: true,
    popularLocations: true
  });

  const toggleLayer = (layerName) => {
    setLayers(prev => ({
      ...prev,
      [layerName]: !prev[layerName]
    }));
  };

  useEffect(() => {
    if (selectedRoute?.coordinates?.length > 0) {
      const [lat, lng] = selectedRoute.coordinates[0];
      setCenter([lat, lng]);
      setZoom(13);
    }
  }, [selectedRoute]);

  return (
    <div className="relative w-full h-[calc(100vh-64px)]">
      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />
        <MapCenter center={center} zoom={zoom} />
        
        <PuneBoundary />
        
        <AnimatePresence>
          {layers.safetyHeatmap && <SafetyHeatmap />}
          {layers.emergencyPoints && <EmergencyPoints />}
          {layers.popularLocations && <PopularLocations />}
        </AnimatePresence>

        {selectedRoute && (
          <>
            <RouteMarkers route={selectedRoute} />
            <MovingVehicle
              route={selectedRoute}
              currentLocation={vehicleLocation}
            />
          </>
        )}
      </MapContainer>

      <MapControls layers={layers} toggleLayer={toggleLayer} />
    </div>
  );
};

export default Map; 
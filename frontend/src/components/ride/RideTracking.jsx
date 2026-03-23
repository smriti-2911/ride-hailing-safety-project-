import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MapPinIcon,
  ClockIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/solid';

const RideTracking = ({
  rideData,
  currentLocation,
  estimatedTime,
  safetyScore,
  onRouteDeviation,
}) => {
  const [progress, setProgress] = useState(0);
  const [safetyStatus, setSafetyStatus] = useState('normal');
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    // Update progress based on current location and route
    if (rideData && currentLocation) {
      const totalDistance = calculateTotalDistance(rideData.route);
      const coveredDistance = calculateCoveredDistance(
        rideData.route,
        currentLocation
      );
      setProgress((coveredDistance / totalDistance) * 100);
    }
  }, [currentLocation, rideData]);

  useEffect(() => {
    // Monitor safety score and trigger alerts
    if (safetyScore < 0.6) {
      setSafetyStatus('warning');
      addAlert({
        type: 'warning',
        message: 'Entering area with lower safety score',
      });
    } else {
      setSafetyStatus('normal');
    }
  }, [safetyScore]);

  const addAlert = (alert) => {
    setAlerts((prev) => [...prev, { ...alert, id: Date.now() }]);
  };

  const calculateTotalDistance = (route) => {
    // Implementation of distance calculation
    return route.reduce((total, point, index, array) => {
      if (index === 0) return total;
      return (
        total + calculateDistance(array[index - 1], point)
      );
    }, 0);
  };

  const calculateCoveredDistance = (route, currentLoc) => {
    // Implementation of covered distance calculation
    let covered = 0;
    for (let i = 1; i < route.length; i++) {
      const prevPoint = route[i - 1];
      const point = route[i];
      if (isPointPassed(point, currentLoc)) {
        covered += calculateDistance(prevPoint, point);
      }
    }
    return covered;
  };

  const calculateDistance = (point1, point2) => {
    // Haversine formula implementation
    const R = 6371; // Earth's radius in km
    const dLat = toRad(point2.lat - point1.lat);
    const dLon = toRad(point2.lng - point1.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(point1.lat)) *
        Math.cos(toRad(point2.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRad = (value) => (value * Math.PI) / 180;

  const isPointPassed = (point, currentLoc) => {
    // Simple check if we've passed this point
    return calculateDistance(point, currentLoc) < 0.1; // Within 100m
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 max-w-md w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Current Ride</h2>
        <div className="flex items-center space-x-2">
          <ClockIcon className="h-5 w-5 text-gray-500" />
          <span className="text-sm">
            {Math.round(estimatedTime)} mins remaining
          </span>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full bg-green-200 text-green-600">
                Progress
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold inline-block text-green-600">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
          <motion.div
            className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-green-100"
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
          >
            <motion.div
              style={{ width: `${progress}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500"
              animate={{
                backgroundColor:
                  safetyStatus === 'warning' ? '#f97316' : '#22c55e',
              }}
            />
          </motion.div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheckIcon
              className={`h-6 w-6 ${
                safetyStatus === 'warning'
                  ? 'text-orange-500'
                  : 'text-green-500'
              }`}
            />
            <span className="font-medium">Safety Score</span>
          </div>
          <span
            className={`text-lg font-bold ${
              safetyStatus === 'warning'
                ? 'text-orange-500'
                : 'text-green-500'
            }`}
          >
            {(safetyScore * 100).toFixed(0)}%
          </span>
        </div>

        <AnimatePresence>
          {alerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex items-center space-x-2 p-3 rounded-md ${
                alert.type === 'warning'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              <ExclamationTriangleIcon className="h-5 w-5" />
              <span className="text-sm">{alert.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RideTracking; 
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SafetyFactor = ({ label, value, color }) => (
  <div className="flex items-center space-x-2">
    <div className={`w-2 h-2 rounded-full ${color}`} />
    <span className="text-sm text-gray-600">{label}</span>
    <span className="text-sm font-medium text-gray-900">{value}</span>
  </div>
);

const RouteCard = ({ route, isSelected, onSelect, isAnimating }) => {
  const getSafetyColor = (score) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    return 'bg-red-500';
  };

  const getTextColor = (score) => {
    if (score >= 90) return 'text-green-700';
    if (score >= 60) return 'text-blue-700';
    return 'text-red-700';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`relative p-4 rounded-xl transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'bg-indigo-50 border-2 border-indigo-500 shadow-lg'
          : 'bg-white border border-gray-200 hover:border-indigo-300 hover:shadow-md'
      }`}
      onClick={() => onSelect(route)}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-lg font-semibold text-gray-900">Route {route.id}</span>
            {isAnimating && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500">{route.duration} • {route.distance}</div>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getTextColor(route.safety_score)} bg-opacity-10 ${getSafetyColor(route.safety_score)} bg-opacity-10`}>
          {route.safety_score}% Safe
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <SafetyFactor
          label="Crime Rate"
          value={route.safety_factors.crime_rate}
          color={`${getSafetyColor(route.safety_factors.crime_rate * 100)}`}
        />
        <SafetyFactor
          label="Traffic"
          value={route.safety_factors.traffic_congestion}
          color={`${getSafetyColor(route.safety_factors.traffic_congestion * 100)}`}
        />
        <SafetyFactor
          label="Road Conditions"
          value={route.safety_factors.road_conditions}
          color={`${getSafetyColor(route.safety_factors.road_conditions * 100)}`}
        />
      </div>

      {isSelected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 pt-4 border-t border-gray-200"
        >
          <button
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onClick={(e) => {
              e.stopPropagation();
              // Handle booking
            }}
          >
            Book This Route
          </button>
        </motion.div>
      )}
    </motion.div>
  );
};

const RouteComparison = ({ routes, onRouteSelect, activeRoute }) => {
  const [selectedRoute, setSelectedRoute] = useState(null);

  const handleRouteSelect = (route) => {
    setSelectedRoute(route);
    onRouteSelect(route);
  };

  return (
    <div className="space-y-4 max-h-[calc(100vh-24rem)] overflow-y-auto px-2 -mx-2">
      <AnimatePresence>
        {routes.map((route) => (
          <RouteCard
            key={route.id}
            route={route}
            isSelected={selectedRoute?.id === route.id}
            isAnimating={activeRoute?.id === route.id}
            onSelect={handleRouteSelect}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default RouteComparison; 
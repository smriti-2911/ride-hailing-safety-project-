import React, { useEffect, useState } from 'react';
import { Polyline, Tooltip } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';

const RouteLayer = ({ route, isActive = false }) => {
  const [animationProgress, setAnimationProgress] = useState(0);
  const [hoveredSegment, setHoveredSegment] = useState(null);

  // Split route into segments based on safety scores
  const segments = route.coordinates.reduce((acc, coord, index, array) => {
    if (index === 0) return acc;
    
    const segment = {
      start: array[index - 1],
      end: coord,
      safetyScore: route.safetyScores[index - 1],
      distance: route.segmentDistances[index - 1],
      time: route.segmentTimes[index - 1]
    };
    
    acc.push(segment);
    return acc;
  }, []);

  // Calculate color based on safety score
  const getSegmentColor = (score) => {
    if (score >= 0.8) return '#22c55e';      // Green - Very Safe
    if (score >= 0.6) return '#eab308';      // Yellow - Moderately Safe
    if (score >= 0.4) return '#f97316';      // Orange - Less Safe
    return '#ef4444';                        // Red - Unsafe
  };

  // Animate route drawing when active
  useEffect(() => {
    if (isActive) {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 0.01;
        if (progress >= 1) {
          clearInterval(interval);
          progress = 1;
        }
        setAnimationProgress(progress);
      }, 50);

      return () => clearInterval(interval);
    }
  }, [isActive]);

  return (
    <>
      {segments.map((segment, index) => {
        const positions = [
          [segment.start.lat, segment.start.lng],
          [segment.end.lat, segment.end.lng]
        ];

        const color = getSegmentColor(segment.safetyScore);
        const isHovered = hoveredSegment === index;

        return (
          <Polyline
            key={index}
            positions={positions}
            pathOptions={{
              color,
              weight: isHovered ? 6 : 4,
              opacity: isActive ? Math.min(1, animationProgress * (index + 1) / segments.length) : 1,
              dashArray: isHovered ? '10, 10' : null
            }}
            eventHandlers={{
              mouseover: () => setHoveredSegment(index),
              mouseout: () => setHoveredSegment(null)
            }}
          >
            {isHovered && (
              <Tooltip permanent>
                <div className="bg-white p-2 rounded shadow">
                  <div className="font-semibold">Segment {index + 1}</div>
                  <div>Safety Score: {(segment.safetyScore * 100).toFixed(1)}%</div>
                  <div>Distance: {segment.distance.toFixed(2)} km</div>
                  <div>Time: {Math.round(segment.time)} mins</div>
                </div>
              </Tooltip>
            )}
          </Polyline>
        );
      })}
    </>
  );
};

export default RouteLayer; 
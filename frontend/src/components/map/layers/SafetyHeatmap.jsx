import React, { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet.heat';
import { useMap } from 'react-leaflet';

const SafetyHeatmap = ({ data, gradient = {
  0.4: '#ff0000',
  0.6: '#ffff00',
  0.8: '#00ff00',
  1.0: '#008000'
}, radius = 25, blur = 15, maxZoom = 18 }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !data || !data.length) return;

    // Transform data into format required by leaflet.heat
    // [lat, lng, intensity]
    const points = data.map(point => [
      point.latitude,
      point.longitude,
      point.safetyScore // normalized between 0 and 1
    ]);

    // Create and add the heatmap layer
    const heatLayer = L.heatLayer(points, {
      radius,
      blur,
      maxZoom,
      gradient,
      minOpacity: 0.3
    }).addTo(map);

    // Add legend
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'info legend');
      div.style.backgroundColor = 'white';
      div.style.padding = '10px';
      div.style.borderRadius = '5px';
      div.style.boxShadow = '0 1px 5px rgba(0,0,0,0.2)';

      const grades = [0.4, 0.6, 0.8, 1.0];
      const labels = ['High Risk', 'Moderate Risk', 'Safe', 'Very Safe'];

      div.innerHTML = '<h4 class="font-semibold mb-2">Safety Levels</h4>';

      for (let i = 0; i < grades.length; i++) {
        div.innerHTML += 
          '<div class="flex items-center space-x-2 mb-1">' +
            '<div style="background:' + gradient[grades[i]] + 
            '; width: 15px; height: 15px; border-radius: 50%;"></div>' +
            '<span>' + labels[i] + '</span>' +
          '</div>';
      }

      return div;
    };
    legend.addTo(map);

    // Cleanup
    return () => {
      map.removeLayer(heatLayer);
      map.removeControl(legend);
    };
  }, [map, data, gradient, radius, blur, maxZoom]);

  return null; // This component doesn't render anything directly
};

export default SafetyHeatmap; 
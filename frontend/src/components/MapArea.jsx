import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix typical Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
});

// Create custom animated live tracker HTML icon
const createPulseIcon = () => {
    return L.divIcon({
        className: 'custom-live-marker bg-transparent border-none',
        html: `<div class="relative w-12 h-12 flex items-center justify-center">
             <div class="absolute w-10 h-10 bg-emerald-500 rounded-full animate-ping opacity-40"></div>
             <div class="relative z-10 w-10 h-10 bg-slate-900 rounded-full border-2 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.8)] flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
                  <circle cx="7" cy="17" r="2"/>
                  <path d="M9 17h6"/>
                  <circle cx="17" cy="17" r="2"/>
                </svg>
             </div>
           </div>`,
        iconSize: [48, 48],
        iconAnchor: [24, 24]
    });
};

const MapUpdater = ({ routes }) => {
    const map = useMap();
    useEffect(() => {
        if (routes && routes.length > 0) {
            const allPoints = routes.flatMap(r => r.coords || []);
            if (allPoints.length > 0) {
                // Offset mapping to account for floating sidebar UI on the left
                const bounds = L.latLngBounds(allPoints);
                map.fitBounds(bounds, { paddingBottomRight: [50, 50], paddingTopLeft: [450, 50] });
            }
        }
    }, [routes, map]);
    return null;
};

const MapArea = ({ routes, safestRouteIndex, leastSafeRouteIndex, activeRide, liveLocation }) => {
    // Center roughly over Pune
    const defaultCenter = [18.5204, 73.8567];

    return (
        <div className="h-full w-full relative z-0 bg-[#0B0F19]">
            <MapContainer
                center={defaultCenter}
                zoom={12}
                zoomControl={false} // Disable default control so we can position it cleanly if needed
                style={{ height: '100%', width: '100%', background: '#0B0F19' }}
            >
                {/* Sleek Dark Mode CartoDB Map Tiles */}
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    subdomains="abcd"
                    maxZoom={19}
                />

                {routes && routes.map((route, idx) => {
                    const isSafest = idx === safestRouteIndex;
                    const isLeastSafe = idx === leastSafeRouteIndex;
                    const isSelected = activeRide && activeRide.selectedRouteIndex === idx;
                    const isFaded = activeRide && !isSelected;

                    if (isFaded) return null;

                    let color = '#6366F1'; // Default Indigo
                    let opac = 0.4;
                    let weightCurve = 4;
                    let glowClass = '';

                    if (isSafest) {
                        color = '#10B981'; // Emerald
                        opac = 0.9;
                        weightCurve = 8;
                        glowClass = 'neon-glow-emerald';
                    } else if (isLeastSafe || route.safety_score < 40) {
                        color = '#FF3366'; // Hot Neon Red/Pink
                        opac = 0.8;
                        weightCurve = 6;
                        glowClass = 'neon-glow-red';
                    }

                    return (
                        <Polyline
                            key={idx}
                            positions={route.coords}
                            color={color}
                            weight={isSelected ? 8 : weightCurve}
                            opacity={isSelected ? 0.9 : opac}
                            lineCap="round"
                            lineJoin="round"
                            className={glowClass}
                        >
                            <Popup className="custom-popup dark-popup">
                                <div className="font-semibold text-slate-800">{route.summary}</div>
                                <div className="text-slate-600">Metric Score: {route.safety_score}/100</div>
                                {isSafest && <div className="text-emerald-600 font-bold mt-1 text-sm flex items-center gap-1">★ AI Recommended Safe Path</div>}
                                {isLeastSafe && <div className="text-red-600 font-bold mt-1 text-sm flex items-center gap-1">⚠️ High Risk Path</div>}
                            </Popup>
                        </Polyline>
                    );
                })}

                {/* Start / End Points */}
                {routes && routes.length > 0 && !activeRide && (
                    <>
                        <Marker position={routes[0].coords[0]}>
                            <Popup>Pickup Location</Popup>
                        </Marker>
                        <Marker position={routes[0].coords[routes[0].coords.length - 1]}>
                            <Popup>Destination</Popup>
                        </Marker>
                    </>
                )}

                <MapUpdater routes={routes} />

                {/* Live Simulation Tracking Marker */}
                {liveLocation && (
                    <Marker position={liveLocation} icon={createPulseIcon()}>
                        <Popup>LIVE VEHICLE TRACKER</Popup>
                    </Marker>
                )}

            </MapContainer>

            {/* Edge Gradient Overlay to blend Map into UI */}
            <div className="absolute top-0 bottom-0 left-0 w-64 bg-gradient-to-r from-[#0B0F19] to-transparent pointer-events-none z-[5]"></div>
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#0B0F19] to-transparent pointer-events-none z-[5]"></div>
        </div>
    );
};

export default MapArea;

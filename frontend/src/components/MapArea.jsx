import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_VISUAL } from '../services/simulator';

function bearingDeg(lat1, lng1, lat2, lng2) {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
});

/** safe | warning | critical | idle — top-down vehicle, glass + glow */
const createPulseIcon = (rotationDeg = 0, carState = 'safe', blink = false) => {
  const palette = {
    safe: { ring: '#10b981', glass: '#0f172a', accent: '#34d399', ping: 'rgba(16,185,129,0.45)', head: '#a7f3d0' },
    warning: { ring: '#f59e0b', glass: '#1c1917', accent: '#fbbf24', ping: 'rgba(245,158,11,0.4)', head: '#fde68a' },
    critical: { ring: '#f43f5e', glass: '#1a0a0f', accent: '#fb7185', ping: 'rgba(244,63,94,0.5)', head: '#fecdd3' },
    idle: { ring: '#64748b', glass: '#0f172a', accent: '#94a3b8', ping: 'rgba(148,163,184,0.35)', head: '#e2e8f0' },
  };
  const c = palette[carState] || palette.safe;
  const blinkClass = blink ? ' map-car-blink' : '';
  const sz = 56;
  const half = sz / 2;
  return L.divIcon({
    className: 'custom-live-marker bg-transparent border-none',
    html: `<div class="map-vehicle-root relative flex items-center justify-center${blinkClass}" style="width:${sz}px;height:${sz}px;transform:rotate(${rotationDeg}deg);transition:transform 0.4s cubic-bezier(0.4,0,0.2,1);">
      <div class="absolute rounded-full animate-ping opacity-50" style="width:44px;height:44px;background:${c.ping};left:50%;top:50%;transform:translate(-50%,-50%);"></div>
      <div class="relative z-10 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.55),0_0_28px_currentColor]" style="width:46px;height:46px;border:2px solid ${c.ring};background:radial-gradient(120% 120% at 30% 20%, ${c.glass} 0%, #020617 70%);color:${c.accent};box-shadow:0 0 0 1px rgba(255,255,255,0.06) inset;">
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="vb" x1="8" y1="6" x2="24" y2="26" gradientUnits="userSpaceOnUse">
              <stop stop-color="${c.accent}" stop-opacity="0.95"/>
              <stop offset="1" stop-color="${c.ring}" stop-opacity="0.85"/>
            </linearGradient>
          </defs>
          <ellipse cx="16" cy="22" rx="9" ry="5.5" fill="url(#vb)" opacity="0.9"/>
          <path d="M9 18.5c0-3 2.2-5.2 7-5.2s7 2.2 7 5.2v1.2c0 .8-.7 1.4-1.5 1.4h-11c-.8 0-1.5-.6-1.5-1.4v-1.2z" fill="#0f172a" stroke="${c.accent}" stroke-width="1.1"/>
          <path d="M11 14.5c1.2-2.8 3.2-4.2 5-4.2s3.8 1.4 5 4.2" stroke="${c.accent}" stroke-width="1.2" stroke-linecap="round" fill="none"/>
          <rect x="12" y="8" width="8" height="5" rx="1.2" fill="${c.head}" opacity="0.85"/>
          <circle cx="12.5" cy="20" r="0.9" fill="#fef3c7" opacity="0.9"/>
          <circle cx="19.5" cy="20" r="0.9" fill="#fef3c7" opacity="0.9"/>
        </svg>
      </div>
    </div>`,
    iconSize: [sz, sz],
    iconAnchor: [half, half],
  });
};

const DEVIATION_MODES = new Set([
  MAP_VISUAL.SLIGHT_OFF,
  MAP_VISUAL.SUSTAINED_OFF,
  MAP_VISUAL.SUSTAINED_CRITICAL,
  MAP_VISUAL.SOS,
]);

function deviationTrailStyle(mode, blink) {
  const m = mode || MAP_VISUAL.ON_CORRIDOR;
  if (m === MAP_VISUAL.SLIGHT_OFF) {
    return { color: '#ff8a65', weight: 6, opacity: 0.95, dashArray: '12 10', className: 'neon-glow-amber navsafe-dev-route' };
  }
  if (m === MAP_VISUAL.SUSTAINED_OFF) {
    return { color: '#ff1744', weight: 8, opacity: 0.98, dashArray: null, className: 'neon-glow-red navsafe-dev-route' };
  }
  if (m === MAP_VISUAL.SUSTAINED_CRITICAL) {
    return {
      color: '#ff003c',
      weight: 9,
      opacity: 1,
      dashArray: null,
      className: `neon-glow-red navsafe-dev-route ${blink ? 'route-line-critical-blink' : ''}`,
    };
  }
  if (m === MAP_VISUAL.SOS) {
    return {
      color: '#d50000',
      weight: 10,
      opacity: 1,
      dashArray: null,
      className: `neon-glow-red navsafe-dev-route ${blink ? 'route-line-critical-blink' : ''}`,
    };
  }
  return { color: '#ff8a65', weight: 6, opacity: 0.9, dashArray: '12 10', className: 'navsafe-dev-route' };
}

function carStateFromMap(mode, blink) {
  const m = mode || MAP_VISUAL.ON_CORRIDOR;
  if (m === MAP_VISUAL.IDLE || m === MAP_VISUAL.IDLE_LONG) return { state: 'idle', blink: !!blink };
  if (m === MAP_VISUAL.SLIGHT_OFF) return { state: 'warning', blink: false };
  if ([MAP_VISUAL.SUSTAINED_OFF, MAP_VISUAL.SUSTAINED_CRITICAL, MAP_VISUAL.SOS].includes(m)) {
    return { state: 'critical', blink: !!blink };
  }
  return { state: 'safe', blink: false };
}

function plannedCorridorStyle(mode) {
  const m = mode || MAP_VISUAL.ON_CORRIDOR;
  const muted = DEVIATION_MODES.has(m);
  if (muted) {
    return { color: '#064e3b', opacity: 0.42, weight: 5 };
  }
  return { color: '#10B981', opacity: 0.95, weight: 8 };
}

const MapUpdater = ({ routes, deviatedPath }) => {
  const map = useMap();
  useEffect(() => {
    const allPoints = [];
    if (routes && routes.length > 0) {
      allPoints.push(...routes.flatMap((r) => r.coords || []));
    }
    if (deviatedPath && deviatedPath.length > 0) {
      allPoints.push(...deviatedPath);
    }
    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { paddingBottomRight: [50, 50], paddingTopLeft: [450, 50] });
    }
  }, [routes, deviatedPath, map]);
  return null;
};

const LiveVehicleMarker = ({ position, liveMapVisual }) => {
  const prev = useRef(null);
  const [fallbackBearing, setFallbackBearing] = useState(0);
  const mode = liveMapVisual?.mode || MAP_VISUAL.ON_CORRIDOR;
  const blink = !!liveMapVisual?.blink;
  const { state: carState, blink: carBlink } = carStateFromMap(mode, blink);
  const headingFromSim = liveMapVisual?.heading;

  useEffect(() => {
    if (!position) return;
    if (headingFromSim != null && !Number.isNaN(headingFromSim)) return;
    if (!prev.current) {
      prev.current = position;
      return;
    }
    const b = bearingDeg(prev.current[0], prev.current[1], position[0], position[1]);
    if (!Number.isNaN(b)) setFallbackBearing(b);
    prev.current = position;
  }, [position, headingFromSim]);

  const bearing =
    headingFromSim != null && !Number.isNaN(Number(headingFromSim))
      ? Number(headingFromSim)
      : fallbackBearing;

  const icon = useMemo(
    () => createPulseIcon(bearing, carState, carBlink),
    [Math.round(bearing * 10) / 10, carState, carBlink]
  );
  return (
    <Marker key="navsafe-live-vehicle" position={position} icon={icon}>
      <Popup>Live vehicle · heading toward destination</Popup>
    </Marker>
  );
};

const MapArea = ({ routes, safestRouteIndex, leastSafeRouteIndex, activeRide, liveLocation, liveMapVisual, deviatedPath }) => {
  const defaultCenter = [18.5204, 73.8567];
  const mode = liveMapVisual?.mode || MAP_VISUAL.ON_CORRIDOR;
  const blink = !!liveMapVisual?.blink;

  const pinRoute = useMemo(() => {
    if (!routes?.length) return null;
    const idx = activeRide?.selectedRouteIndex ?? 0;
    return routes[idx] || routes[0];
  }, [routes, activeRide]);

  const corridorStyle = useMemo(() => plannedCorridorStyle(mode), [mode]);
  const trailStyle = useMemo(() => deviationTrailStyle(mode, blink), [mode, blink]);

  return (
    <div className="h-full w-full relative z-0 bg-[#0B0F19]">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        zoomControl={false}
        style={{ height: '100%', width: '100%', background: '#0B0F19' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />

        {routes &&
          routes.map((route, idx) => {
            const isSafest = idx === safestRouteIndex;
            const isLeastSafe = idx === leastSafeRouteIndex;
            const isSelected = activeRide && activeRide.selectedRouteIndex === idx;
            const isFaded = activeRide && !isSelected;

            if (isFaded) return null;

            let color = '#6366F1';
            let opac = 0.4;
            let weightCurve = 4;
            let glowClass = '';

            if (isSafest) {
              color = '#10B981';
              opac = 0.9;
              weightCurve = 8;
              glowClass = 'neon-glow-emerald';
            } else if (isLeastSafe || route.safety_score < 40) {
              color = '#FF3366';
              opac = 0.8;
              weightCurve = 6;
              glowClass = 'neon-glow-red';
            }

            const liveRide = activeRide && isSelected;
            const strokeColor = liveRide ? corridorStyle.color : color;
            const strokeOpac = liveRide ? corridorStyle.opacity : isSelected ? 0.9 : opac;
            const strokeWeight = liveRide ? corridorStyle.weight : isSelected ? 8 : weightCurve;
            const gc = liveRide ? '' : glowClass;

            return (
              <Polyline
                key={idx}
                positions={route.coords}
                color={strokeColor}
                weight={strokeWeight}
                opacity={strokeOpac}
                lineCap="round"
                lineJoin="round"
                className={gc}
              >
                <Popup className="custom-popup dark-popup">
                  <div className="font-semibold text-slate-800">{route.summary}</div>
                  <div className="text-slate-600">Metric Score: {route.safety_score}/100</div>
                  {isSafest && (
                    <div className="text-emerald-600 font-bold mt-1 text-sm flex items-center gap-1">★ AI Recommended Safe Path</div>
                  )}
                  {isLeastSafe && (
                    <div className="text-red-600 font-bold mt-1 text-sm flex items-center gap-1">⚠️ High Risk Path</div>
                  )}
                </Popup>
              </Polyline>
            );
          })}

        {deviatedPath && deviatedPath.length > 1 && DEVIATION_MODES.has(mode) && (
          <Polyline
            positions={deviatedPath}
            pathOptions={{
              color: trailStyle.color,
              weight: trailStyle.weight,
              opacity: trailStyle.opacity,
              dashArray: trailStyle.dashArray || undefined,
              lineCap: 'round',
              lineJoin: 'round',
            }}
            className={trailStyle.className}
          />
        )}

        {pinRoute?.coords?.length > 1 && (
          <>
            <Marker position={pinRoute.coords[0]}>
              <Popup>Pickup Location</Popup>
            </Marker>
            <Marker position={pinRoute.coords[pinRoute.coords.length - 1]}>
              <Popup>Destination</Popup>
            </Marker>
          </>
        )}

        <MapUpdater routes={routes} deviatedPath={deviatedPath} />

        {liveLocation && <LiveVehicleMarker position={liveLocation} liveMapVisual={liveMapVisual} />}
      </MapContainer>

      <div className="absolute top-0 bottom-0 left-0 w-[22rem] max-w-[40vw] bg-gradient-to-r from-[#0B0F19] to-transparent pointer-events-none z-[5]"></div>
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#0B0F19] to-transparent pointer-events-none z-[5]"></div>
    </div>
  );
};

export default MapArea;

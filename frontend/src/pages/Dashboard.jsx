import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { rideService, safetyService } from '../services/api';
import polyline from '@mapbox/polyline';
import toast from 'react-hot-toast';
import { LogOut, ShieldAlert, Sparkles, History, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import MapArea from '../components/MapArea';
import RideControls from '../components/RideControls';
import { MAP_VISUAL, SCENARIO_IDS, createRideSimulator } from '../services/simulator';

const DEFAULT_MAP_VISUAL = { mode: MAP_VISUAL.ON_CORRIDOR, blink: false, heading: null };

/** Scenarios where GPS is offset — append to deviation trail for red/orange path. */
const DEVIATION_TRACE_SCENARIOS = new Set([
  SCENARIO_IDS.SLIGHT_DEVIATION,
  SCENARIO_IDS.SUSTAINED_DEVIATION,
  SCENARIO_IDS.SUSTAINED_DEVIATION_HIGH_RISK,
  SCENARIO_IDS.SOS_TRIGGER,
]);

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [routes, setRoutes] = useState([]);
  const [safestRouteIndex, setSafestRouteIndex] = useState(null);
  const [leastSafeRouteIndex, setLeastSafeRouteIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeRide, setActiveRide] = useState(null);
  const [liveLocation, setLiveLocation] = useState(null);
  const [searchSource, setSearchSource] = useState('');
  const [searchDest, setSearchDest] = useState('');
  const [liveRisk, setLiveRisk] = useState({
    score: 0,
    status: 'Safe',
    reasons: [],
    pingSerial: 0,
  });
  const [liveMapVisual, setLiveMapVisual] = useState(DEFAULT_MAP_VISUAL);
  const [deviatedPath, setDeviatedPath] = useState([]);
  /** Full scripted ledger + deviations on map. Off = simple A→B trip. */
  const [simulateLiveEvents, setSimulateLiveEvents] = useState(false);

  const simulationInterval = useRef(null);

  useEffect(() => {
    return () => {
      if (simulationInterval.current) simulationInterval.current.stop();
    };
  }, []);

  const handleSearchRoutes = async (source, destination, safetyMode = 'normal') => {
    setSearchSource(source);
    setSearchDest(destination);
    setLoading(true);
    setRoutes([]);
    try {
      const response = await safetyService.getSafetyScore(source, destination, safetyMode);
      if (response.data && response.data.routes) {
        const decodedRoutes = response.data.routes.map((r) => {
          const actualPolyStr = r.route?.polyline || r.polyline || r.route?.overview_polyline?.points || '';

          let coords = [];
          if (typeof actualPolyStr === 'string' && actualPolyStr.length > 0) {
            coords = polyline.decode(actualPolyStr);
          } else if (r.route?.points) {
            coords = r.route.points.map((p) => [p.lat, p.lng]);
          }

          return {
            ...r,
            coords,
            summary: r.route?.summary || r.summary || 'Route option',
            safety_score: r.safety_score != null ? Number(r.safety_score) : 50,
          };
        }).filter((r) => r.coords.length > 0);

        setRoutes(decodedRoutes);

        setSafestRouteIndex(0);
        setLeastSafeRouteIndex(decodedRoutes.length > 1 ? decodedRoutes.length - 1 : null);

        if (decodedRoutes.length === 0) toast.error("Found paths but couldn't decode coordinates.", { icon: '⚠️' });
      }
    } catch (error) {
      console.error('Safety score error:', error);
      const msg =
        error.response?.data?.error ||
        (error.code === 'ECONNABORTED' ? 'Request timed out. Ensure backend is running on port 5001.' : null) ||
        (error.code === 'ERR_NETWORK' ? 'Cannot reach backend. Is the server running on port 5001?' : null) ||
        'Failed to fetch safe routes from Google Maps.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBookRide = async (route, index, routesOverride = null, bookingSource = null, bookingDest = null) => {
    try {
      const src = bookingSource ?? searchSource;
      const dst = bookingDest ?? searchDest;
      if (!src?.trim() || !dst?.trim()) {
        toast.error('Pickup and destination are required to start tracking.');
        return;
      }

      const polyStr = route.route?.polyline || route.polyline || route.route?.overview_polyline?.points || '';

      const response = await rideService.bookRide(
        src,
        dst,
        { polyline: polyStr, summary: route.summary },
        route.safety_score
      );

      const baseScore = route.safety_score != null ? Number(route.safety_score) : 72;

      const rideData = {
        id: response.data.ride_id,
        route: route.coords,
        selectedRouteIndex: index,
        baseScore,
        simulateLiveEvents,
      };

      setActiveRide(rideData);
      setLiveLocation(route.coords[0]);
      setLiveRisk({
        score: baseScore,
        status: 'Safe',
        reasons: [],
        pingSerial: 0,
      });
      setLiveMapVisual(DEFAULT_MAP_VISUAL);
      setDeviatedPath([]);
      toast.success(
        simulateLiveEvents
          ? 'Ride started — live scenario simulation (ledger + map).'
          : 'Ride started — normal trip to destination.',
        { icon: '🛡️' }
      );

      startSimulation(rideData);
    } catch (error) {
      console.error(error);
      toast.error('Failed to reserve ride.');
    }
  };

  const startSimulation = (ride) => {
    if (simulationInterval.current) simulationInterval.current.stop();

    const sim = createRideSimulator(
      ride.route,
      async (newLoc, context) => {
        const ctx = context || {};
        const scenario = ctx.scenario;
        const isDemo = ctx.demo_mode === true;

        if (isDemo && scenario === SCENARIO_IDS.RECOVERED_CRUISE && ctx.alert_trigger === 'SCENARIO_RECOVERED') {
          setDeviatedPath([]);
        } else if (isDemo && scenario && DEVIATION_TRACE_SCENARIOS.has(scenario)) {
          setDeviatedPath((prev) => [...prev, newLoc]);
        }

        if (ctx.map_visual) {
          setLiveMapVisual({
            mode: ctx.map_visual,
            blink: !!ctx.car_blink,
            heading: ctx.heading_deg != null ? Number(ctx.heading_deg) : null,
          });
        }

        setLiveLocation(newLoc);
        try {
          const locString = `${newLoc[0]},${newLoc[1]}`;
          const devRes = await rideService.checkDeviation(ride.id, locString, ctx);

          if (devRes.data) {
            setLiveRisk((prev) => ({
              score: devRes.data.score ?? 0,
              status: devRes.data.status ?? 'Safe',
              reasons: devRes.data.reasons ?? [],
              pingSerial: (prev.pingSerial || 0) + 1,
            }));
          }

          if (
            devRes.data?.message &&
            (devRes.data.message.includes('🚨') ||
              devRes.data.status === 'SOS_TRIGGERED' ||
              devRes.data.status === 'SOS_TRIGGER')
          ) {
            toast.error(devRes.data.message, { duration: 5000, icon: '🚨' });
          }
        } catch (err) {
          console.error('Deviation ping failed', err);
        }
      },
      () => {
        handleCompleteRide();
      },
      { baseScore: ride.baseScore, fullJourney: !!ride.simulateLiveEvents }
    );

    simulationInterval.current = sim;
    sim.start();
  };

  const handleCompleteRide = async () => {
    if (!activeRide) return;
    if (simulationInterval.current) simulationInterval.current.stop();

    try {
      await rideService.completeRide(activeRide.id);
      toast.success('Destination reached.', { icon: '🎉' });
      navigate(`/post-ride/${activeRide.id}`);
    } catch (error) {
      console.error('End ride error block:', error);
    }

    setActiveRide(null);
    setLiveLocation(null);
    setDeviatedPath([]);
    setRoutes([]);
    setLiveMapVisual(DEFAULT_MAP_VISUAL);
  };

  return (
    <div className="relative h-screen w-full bg-[#0B0F19] overflow-hidden flex">
      <div className="absolute inset-0 z-0">
        <MapArea
          routes={routes}
          safestRouteIndex={safestRouteIndex}
          leastSafeRouteIndex={leastSafeRouteIndex}
          activeRide={activeRide}
          liveLocation={liveLocation}
          liveMapVisual={liveMapVisual}
          deviatedPath={deviatedPath}
        />
      </div>

      <AnimatePresence>
        <motion.div
          initial={{ x: -400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          className="relative z-30 ml-6 mt-6 mb-6 w-[min(28rem,calc(100vw-3rem))] max-w-[28rem] flex flex-col glass rounded-3xl overflow-hidden shadow-2xl"
        >
          <div className="p-6 border-b border-white/10 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-500/20 blur-3xl rounded-full"></div>

            <div className="relative z-10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                  <ShieldAlert className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                    Nav<span className="text-indigo-400">Safe</span>{' '}
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                  </h1>
                  <p className="text-xs font-medium text-slate-400 mt-0.5">Welcome, {user?.name}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  to="/profile"
                  className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
                  title="Profile"
                >
                  <User className="w-5 h-5" />
                </Link>
                <Link
                  to="/rides"
                  className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
                  title="Ride history"
                >
                  <History className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar relative z-10">
            <RideControls
              onSearchRoutes={handleSearchRoutes}
              onBookRide={handleBookRide}
              onCompleteRide={handleCompleteRide}
              routes={routes}
              safestRouteIndex={safestRouteIndex}
              leastSafeRouteIndex={leastSafeRouteIndex}
              activeRide={activeRide}
              loading={loading}
              liveRisk={liveRisk}
              simulateLiveEvents={simulateLiveEvents}
              setSimulateLiveEvents={setSimulateLiveEvents}
            />
          </div>

          <div className="p-4 border-t border-white/10 bg-slate-900/40 backdrop-blur-md relative z-10">
            <button
              onClick={logout}
              className="w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-300 group"
            >
              <LogOut className="w-4 h-4 group-hover:text-red-400 transition-colors" />
              Sign out session
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;

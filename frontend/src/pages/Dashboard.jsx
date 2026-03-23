import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { rideService, safetyService } from '../services/api';
import polyline from '@mapbox/polyline';
import toast from 'react-hot-toast';
import { LogOut, ShieldAlert, Sparkles, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import MapArea from '../components/MapArea';
import RideControls from '../components/RideControls';

const Dashboard = () => {
  const { user, logout } = useAuth();

  // State
  const [routes, setRoutes] = useState([]);
  const [safestRouteIndex, setSafestRouteIndex] = useState(null);
  const [leastSafeRouteIndex, setLeastSafeRouteIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeRide, setActiveRide] = useState(null);
  const [liveLocation, setLiveLocation] = useState(null);
  const [searchSource, setSearchSource] = useState('');
  const [searchDest, setSearchDest] = useState('');
  const [liveRisk, setLiveRisk] = useState({ score: 0, status: 'Safe', reasons: [] });
  const [activeScenario, setActiveScenario] = useState(null);
  const [isAutoLooping, setIsAutoLooping] = useState(false);

  const simulationInterval = useRef(null);

  // Stop simulation on unmount
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
        // Decode Google polylines for leaflet
        const decodedRoutes = response.data.routes.map(r => {
          const actualPolyStr = r.route?.polyline || r.polyline || r.route?.overview_polyline?.points || '';

          let coords = [];
          if (typeof actualPolyStr === 'string' && actualPolyStr.length > 0) {
            coords = polyline.decode(actualPolyStr);
          } else if (r.route?.points) {
            coords = r.route.points.map(p => [p.lat, p.lng]);
          }

          return {
            ...r,
            coords: coords,
            summary: r.route?.summary || r.summary || 'Route option',
            safety_score: r.safety_score != null ? Number(r.safety_score) : 50
          };
        }).filter(r => r.coords.length > 0);

        setRoutes(decodedRoutes);

        // Auto-loop booking handler
        if (isAutoLooping && decodedRoutes.length > 0 && !activeRide) {
            handleBookRide(decodedRoutes[0], 0, decodedRoutes);
            return;
        }

        // Routes are inherently sorted by safety score on the backend descending
        setSafestRouteIndex(0);
        setLeastSafeRouteIndex(decodedRoutes.length > 1 ? decodedRoutes.length - 1 : null);

        if (decodedRoutes.length === 0) toast.error("Found paths but couldn't decode coordinates.", { icon: '⚠️' });
      }
    } catch (error) {
      console.error('Safety score error:', error);
      const msg = error.response?.data?.error
        || (error.code === 'ECONNABORTED' ? 'Request timed out. Ensure backend is running on port 5001.' : null)
        || (error.code === 'ERR_NETWORK' ? 'Cannot reach backend. Is the server running on port 5001?' : null)
        || 'Failed to fetch safe routes from Google Maps.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBookRide = async (route, index, routesOverride = null) => {
    try {
      const activeRoutes = routesOverride || routes;
      const polyStr = route.route?.polyline || route.polyline || route.route?.overview_polyline?.points || '';
      const response = await rideService.bookRide(
        searchSource,
        searchDest,
        { polyline: polyStr, summary: route.summary },
        route.safety_score
      );

      const rideData = {
        id: response.data.ride_id,
        route: route.coords,
        selectedRouteIndex: index,
        currentStep: 0,
        expectedDistanceKm: route.distance ? route.distance / 1000 : 10
      };

      setActiveRide(rideData);
      setLiveLocation(route.coords[0]);
      setLiveRisk({ score: route.safety_score, status: 'Safe', reasons: [] });
      toast.success('Safe Ride Booked! Authentic Physics Simulator Active.', { icon: '🛡️' });

      startSimulation(rideData);

    } catch (error) {
      console.error(error);
      toast.error('Failed to reserve ride.');
    }
  };

  const startSimulation = (ride) => {
    if (simulationInterval.current) {
      simulationInterval.current.stop();
    }

    import('../services/simulator').then(({ AuthenticGPSSimulator }) => {
      const sim = new AuthenticGPSSimulator(
        ride.route,
        async (newLoc, context) => {
          setLiveLocation(newLoc);
          try {
            const locString = `${newLoc[0]},${newLoc[1]}`;
            const devRes = await rideService.checkDeviation(ride.id, locString, context);
            
            if (devRes.data) {
                setLiveRisk({
                    score: devRes.data.score || 0,
                    status: devRes.data.status || 'Safe',
                    reasons: devRes.data.reasons || [],
                    confidence: devRes.data.confidence || 'High'
                });
            }

            if (devRes.data.message.includes('Alert') || devRes.data.status === 'Critical Danger') {
              toast.error(devRes.data.message, { duration: 6000, icon: '🚨' });
            }
          } catch (err) {
            console.error("Deviation ping failed", err);
          }
        },
        () => {
          handleCompleteRide();
        }
      );
      
      setActiveScenario(sim.scenario);
      simulationInterval.current = sim;
      sim.start();
    });
  };

  const handleSimulateDeviation = async () => {
    if (!activeRide || !liveLocation) return;

    const deviatedLoc = [liveLocation[0] + 0.05, liveLocation[1] + 0.05];
    setLiveLocation(deviatedLoc);
    toast('CRITICAL: Route Deviation Detected. Initiating Twilio SOS.', { icon: '⚠️', style: { border: '1px solid #ef4444', backgroundColor: '#450a0a' } });

    try {
      const locString = `${deviatedLoc[0]},${deviatedLoc[1]}`;
      const devRes = await rideService.checkDeviation(activeRide.id, locString, { speedClass: "Detour" });
      if (devRes.data.message.includes('Alert') || devRes.data.status === 'Critical Danger') {
        toast.error('TWILIO SMS ALERT SENT TO EMERGENCY CONTACT', { duration: 8000, icon: '📱' });
      }
    } catch (err) {
      toast.error('Failed to reach emergency endpoint');
    }
  };

  const handleCompleteRide = async () => {
    if (!activeRide) return;
    if (simulationInterval.current) simulationInterval.current.stop();

    try {
      await rideService.completeRide(activeRide.id);
      toast.success('Destination Reached Safely!', { icon: '🎉' });
      navigate(`/post-ride/${activeRide.id}`);
    } catch (error) {
      console.error("End ride error block:", error);
    }

    setActiveRide(null);
    setLiveLocation(null);
    setRoutes([]);
    setActiveScenario(null);

    // Automation Controller
    if (isAutoLooping) {
        toast.loading('Restarting Demo Execution Loop in 3 seconds...', { duration: 3000 });
        setTimeout(() => {
            if (isAutoLooping) {
                handleSearchRoutes(searchSource, searchDest);
            }
        }, 3000);
    }
  };

  return (
    <div className="relative h-screen w-full bg-[#0B0F19] overflow-hidden flex">
      {/* Background Map layer */}
      <div className="absolute inset-0 z-0">
        <MapArea
          routes={routes}
          safestRouteIndex={safestRouteIndex}
          leastSafeRouteIndex={leastSafeRouteIndex}
          activeRide={activeRide}
          liveLocation={liveLocation}
        />
      </div>

      {/* Floating Glassmorphic UI Panel */}
      <AnimatePresence>
        <motion.div
          initial={{ x: -400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="relative z-30 ml-6 mt-6 mb-6 w-96 flex flex-col glass rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-500/20 blur-3xl rounded-full"></div>

            <div className="relative z-10 flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                <ShieldAlert className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                  Nav<span className="text-indigo-400">Safe</span> <Sparkles className="w-4 h-4 text-emerald-400" />
                </h1>
                <p className="text-xs font-medium text-slate-400 mt-0.5">Welcome, {user?.name}</p>
              </div>
            </div>
          </div>

          {/* Control Content */}
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar relative z-10">
            <RideControls
              onSearchRoutes={handleSearchRoutes}
              onBookRide={handleBookRide}
              onSimulateDeviation={handleSimulateDeviation}
              onCompleteRide={handleCompleteRide}
              routes={routes}
              safestRouteIndex={safestRouteIndex}
              leastSafeRouteIndex={leastSafeRouteIndex}
              activeRide={activeRide}
              loading={loading}
              liveRisk={liveRisk}
              activeScenario={activeScenario}
              isAutoLooping={isAutoLooping}
              setIsAutoLooping={setIsAutoLooping}
            />
          </div>

          {/* Footer Account Actions */}
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
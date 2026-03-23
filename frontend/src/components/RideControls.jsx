import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Navigation2, Search, MapPin, ShieldCheck, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import LiveRiskDashboard from './LiveRiskDashboard';

const RideControls = ({
    onSearchRoutes,
    onBookRide,
    onSimulateDeviation,
    onCompleteRide,
    routes,
    safestRouteIndex,
    leastSafeRouteIndex,
    activeRide,
    loading,
    liveRisk,
    activeScenario,
    isAutoLooping,
    setIsAutoLooping
}) => {
    const [source, setSource] = useState('');
    const [destination, setDestination] = useState('');
    const [safetyMode, setSafetyMode] = useState('normal');

    const handleSearch = (e) => {
        e.preventDefault();
        if (!source || !destination) {
            toast.error('Please enter both source and destination');
            return;
        }
        onSearchRoutes(source, destination, 'normal'); // Send standard request
    };

    if (activeRide) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
            >
                <div className="bg-emerald-500/10 border-emerald-500/30 border rounded-2xl p-5 relative overflow-hidden backdrop-blur-md">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/20 blur-2xl rounded-full"></div>
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="p-2 bg-emerald-500/20 rounded-xl">
                            <ShieldCheck className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-emerald-400 tracking-wide">Secure Ride Active</h3>
                            <p className="text-xs text-emerald-200/70 font-medium">
                                {activeScenario ? `Simulating: ${activeScenario}` : 'AI monitoring route deviation'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* The Live Intelligance Dashboard replaces the static SOS buttons */}
                <LiveRiskDashboard 
                    rideId={activeRide.id || 'demo_123'} 
                    liveRisk={liveRisk}
                />

                <div className="space-y-4 pt-4">
                    <label className="flex items-center justify-between bg-slate-800/50 border border-white/5 py-3 px-4 rounded-xl cursor-pointer">
                        <div>
                            <span className="text-sm font-bold text-white block">Auto-Loop Demos</span>
                            <span className="text-[10px] text-slate-400 font-medium">Continuously trigger random scenarios</span>
                        </div>
                        <div className={`w-11 h-6 rounded-full transition-colors relative ${isAutoLooping ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                            <input type="checkbox" className="sr-only" checked={isAutoLooping} onChange={() => setIsAutoLooping(!isAutoLooping)} />
                            <div className={`absolute top-1 max-w-full bottom-1 w-4 bg-white rounded-full transition-transform ${isAutoLooping ? 'translate-x-6' : 'translate-x-1'}`}></div>
                        </div>
                    </label>

                    <button
                        onClick={onCompleteRide}
                        className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] font-bold tracking-wide rounded-2xl transition-all duration-300"
                    >
                        Finish Journey
                    </button>
                </div>
            </motion.div>
        );
    }

    return (
        <div className="space-y-8">
            <form onSubmit={handleSearch} className="space-y-5 block">
                <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/10 mb-1 z-10">
                        <MapPin className="w-4 h-4 text-indigo-400" />
                    </div>
                    <input
                        type="text"
                        className="w-full pl-14 pr-4 py-4 rounded-xl bg-slate-800/50 border border-white/5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-medium"
                        placeholder="Pickup Location"
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                    />
                </div>

                <div className="flex justify-center -my-3 relative z-10">
                    <div className="bg-slate-800 border border-white/10 p-1.5 rounded-lg text-slate-400 shadow-lg">
                        <Navigation2 className="w-4 h-4" />
                    </div>
                </div>

                <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 z-10">
                        <Navigation2 className="w-4 h-4 text-emerald-400 transform rotate-180" />
                    </div>
                    <input
                        type="text"
                        className="w-full pl-14 pr-4 py-4 rounded-xl bg-slate-800/50 border border-white/5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-medium"
                        placeholder="Destination"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                    />
                </div>



                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 border border-transparent rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)] py-4 px-4 font-bold text-white transition-all duration-300 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                    ) : (
                        <>
                            <Search className="w-5 h-5" /> Analyze Safe Routes
                        </>
                    )}
                </button>
            </form>

            {routes && routes.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 mt-8 border-t border-white/10 pt-8">
                    <h3 className="text-sm font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        AI Recommended Paths
                    </h3>
                    <div className="space-y-6">
                        {routes.map((route, index) => {
                            const normalizedScore = Math.min(100, Math.max(0, route.safety_score));
                            
                            const routeStyles = [
                                {
                                    title: "🚨 Safest Route",
                                    subtitle: "Maximum Risk Avoidance",
                                    borderColor: 'border-emerald-500/50',
                                    bgColor: 'bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
                                    scoreBadgeBg: 'bg-emerald-500/20 text-emerald-400',
                                    barColor: 'bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]',
                                    glowColor: 'bg-emerald-500/10'
                                },
                                {
                                    title: "🛡️ Balanced Route",
                                    subtitle: "Balanced Avoidance & ETA",
                                    borderColor: 'border-indigo-500/50',
                                    bgColor: 'bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.1)]',
                                    scoreBadgeBg: 'bg-indigo-500/20 text-indigo-400',
                                    barColor: 'bg-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.8)]',
                                    glowColor: 'bg-indigo-500/10'
                                },
                                {
                                    title: "🧭 Standard Route",
                                    subtitle: "Standard ETA Optimized",
                                    borderColor: 'border-amber-500/50',
                                    bgColor: 'bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.1)]',
                                    scoreBadgeBg: 'bg-amber-500/20 text-amber-400',
                                    barColor: 'bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.8)]',
                                    glowColor: 'bg-amber-500/10'
                                }
                            ];
                            
                            const defaultStyle = {
                                title: "Alternative Route",
                                subtitle: "Standard Routing",
                                borderColor: 'border-white/5',
                                bgColor: 'bg-slate-800/40 hover:bg-slate-800/70',
                                scoreBadgeBg: 'bg-slate-500/20 text-slate-400',
                                barColor: 'bg-slate-500',
                                glowColor: 'bg-transparent'
                            };

                            const style = routeStyles[index] || defaultStyle;

                            return (
                                <div
                                    key={index}
                                    className={`relative p-5 rounded-2xl border transition-all duration-300 overflow-hidden ${style.borderColor} ${style.bgColor}`}
                                >
                                    <div className="flex justify-between items-start relative z-10">
                                        <div>
                                            <h4 className="font-bold text-white text-lg">{style.title}</h4>
                                            <p className="text-xs font-bold text-slate-300 mt-1 uppercase tracking-wider">{route.summary} • {style.subtitle}</p>
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-lg text-lg font-black tracking-tighter ${style.scoreBadgeBg}`}>
                                                Safety Score: {route.safety_score}
                                            </span>
                                            {(() => {
                                                const isSafest = index === 0;
                                                const isWorst = index === routes.length - 1 && routes.length > 1;
                                                let label = "";
                                                let reason = "";
                                                let colorClass = "";
                                                if (isSafest) {
                                                    label = "Lower Risk";
                                                    reason = "Best safety profile among options";
                                                    colorClass = "text-emerald-400";
                                                } else if (isWorst) {
                                                    label = "Comparatively High Risk";
                                                    reason = "Higher exposure than other routes";
                                                    colorClass = "text-amber-400";
                                                } else {
                                                    label = "Moderate Risk";
                                                    reason = "Balanced between safety and efficiency";
                                                    colorClass = "text-indigo-400";
                                                }
                                                return (
                                                    <span className={`block mt-1 ${colorClass}`}>
                                                        <span className="text-[10px] uppercase font-bold tracking-wider">{label}</span>
                                                        <span className="text-[9px] block opacity-80 mt-0.5">{reason}</span>
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* Explainability Section */}
                                    {route.breakdown && (
                                        <div className="mt-3 p-3 bg-black/20 rounded-xl space-y-2 border border-white/5">
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Why this route?</p>
                                                <p className="text-xs font-medium text-slate-300 leading-relaxed">{route.breakdown.justification || "Optimized for minimal risk."}</p>
                                            </div>

                                            {route.breakdown.risk_breakdown && (
                                                <div className="pt-2 border-t border-white/5">
                                                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Risk Breakdown</p>
                                                    <div className="flex justify-between text-xs font-medium text-slate-400 mb-1">
                                                        <span>Crime Impact</span>
                                                        <span className="text-emerald-400">{route.breakdown.risk_breakdown['Crime Impact'] ?? 0}%</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs font-medium text-slate-400 mb-1">
                                                        <span>Isolation Impact</span>
                                                        <span className="text-amber-400">{route.breakdown.risk_breakdown['Isolation Impact'] ?? 0}%</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs font-medium text-slate-400">
                                                        <span>Lighting Impact</span>
                                                        <span className="text-indigo-300">{route.breakdown.risk_breakdown['Lighting Impact'] ?? 0}%</span>
                                                    </div>
                                                </div>
                                            )}

                                            {route.breakdown.confidence && (
                                                <div className="pt-2 border-t border-white/5 flex justify-between items-center">
                                                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Confidence Level</span>
                                                    <span className="text-xs font-bold text-white bg-white/10 px-2 py-0.5 rounded flex items-center gap-1">
                                                        {route.breakdown.confidence}%
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Animated Progress Bar */}
                                    <div className="w-full bg-slate-900/50 h-1.5 rounded-full mt-4 overflow-hidden relative z-10">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${normalizedScore}%` }}
                                            transition={{ duration: 1, delay: index * 0.2 }}
                                            className={`h-full rounded-full ${style.barColor}`}
                                        />
                                    </div>

                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => onBookRide(route, index)}
                                        className="mt-5 w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white shadow-lg rounded-xl py-3 px-4 font-bold transition-all flex items-center justify-center gap-2 relative z-10"
                                    >
                                        <ShieldCheck className="w-5 h-5" /> Start Tracking {style.title.split(' ')[1]}
                                    </motion.button>

                                    <div className={`absolute top-0 right-0 w-32 h-32 ${style.glowColor} blur-3xl rounded-full z-0 pointer-events-none`}></div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default RideControls;

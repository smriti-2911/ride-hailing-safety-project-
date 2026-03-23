import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { rideService } from '../services/api';

const LiveRiskDashboard = ({ rideId, liveRisk }) => {
  const [riskData, setRiskData] = useState([]);
  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    if (!rideId || rideId === 'demo_123') return;
    const fetchTimeline = async () => {
      try {
        const res = await rideService.getAlerts(rideId);
        setTimeline(res.data.alerts);
      } catch (e) {
        console.error("Failed fetching timeline", e);
      }
    };
    fetchTimeline();
    const iv = setInterval(fetchTimeline, 3000);
    return () => clearInterval(iv);
  }, [rideId]);

  useEffect(() => {
    if (!liveRisk) return;
    
    setRiskData(prev => {
      const newPoint = {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        score: liveRisk.score || 0
      };
      const updated = [...prev, newPoint];
      // Keep last 20 pings for the scrolling window
      return updated.length > 20 ? updated.slice(1) : updated;
    });
  }, [liveRisk?.score, liveRisk?.status, liveRisk?.reasons]);

  const currentScore = liveRisk?.score || 0;
  const currentRiskLevel = liveRisk?.status || 'Safe';
  const alerts = liveRisk?.reasons || [];
  
  // Determine UI Colors mapping 100 = SAFEST, 0 = DANGER
  const getStatusColor = () => {
    if (currentScore >= 75) return 'text-emerald-500';
    if (currentScore >= 50) return 'text-amber-500';
    return 'text-rose-600 animate-pulse';
  };
  
  const getBgColor = () => {
    if (currentScore >= 75) return 'bg-emerald-50 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
    if (currentScore >= 50) return 'bg-amber-50 shadow-[0_0_15px_rgba(245,158,11,0.1)]';
    return 'bg-rose-100 border-2 border-rose-500 shadow-[0_0_20px_rgba(225,29,72,0.3)]';
  };

  return (
    <div className={`p-6 rounded-2xl shadow-xl transition-all duration-500 ${getBgColor()}`}>
        <div className="flex justify-between items-center mb-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Live Safety Intelligence</h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-sm font-medium text-gray-600">Simulating Live Trace</span>
                </div>
            </div>
            
            <div className="text-right">
                <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider">Current Risk Score</p>
                <div className={`text-5xl font-black ${getStatusColor()}`}>
                    {currentScore}<span className="text-2xl text-gray-400">/100</span>
                </div>
                <p className={`text-lg font-bold mt-1 ${getStatusColor()}`}>{currentRiskLevel}</p>
            </div>
        </div>

        {/* ALERTS SECTION */}
        {alerts.length > 0 && (
            <div className={`mb-6 p-4 rounded-xl shadow-inner ${currentScore < 50 ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-900 border border-amber-300'}`}>
                <div className="flex items-center gap-3 mb-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    <h3 className="font-bold text-lg">System Flag</h3>
                </div>
                <ul className="list-disc pl-8 font-medium">
                    {alerts.map((alert, i) => <li key={i}>{alert}</li>)}
                </ul>
            </div>
        )}

        {/* TIMELINE GRAPH */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">Risk Timeline</h3>
            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={riskData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="time" tick={{fontSize: 12}} stroke="#9CA3AF" />
                        <Tooltip />
                        <ReferenceLine y={50} stroke="#E11D48" strokeDasharray="3 3" />
                        <ReferenceLine y={75} stroke="#F59E0B" strokeDasharray="3 3" />
                        <Line type="stepAfter" dataKey="score" stroke="#000000" strokeWidth={3} dot={{r: 4, fill: '#000'}} activeDot={{r: 8}} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* EVENT VERIFICATION LOGGING */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mt-6 max-h-64 overflow-y-auto">
            <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider flex items-center justify-between">
                <div>Activity Ledger</div>
                <div className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Secure Enterprise Audit</div>
            </h3>
            
            <div className="space-y-4">
                {timeline.length === 0 ? (
                    <div className="text-gray-400 text-sm italic py-4 text-center">No anomalies recorded yet...</div>
                ) : (
                    timeline.map((event, idx) => (
                        <div key={idx} className={`pl-4 border-l-2 py-1 ${
                            event.severity === 'SOS' ? 'border-rose-500' :
                            event.severity === 'Critical' ? 'border-amber-500' :
                            event.severity === 'Warning' ? 'border-amber-400' : 'border-indigo-400'
                        }`}>
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-bold text-gray-500">
                                    {new Date(event.timestamp).toLocaleTimeString()}
                                </span>
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                    event.severity === 'SOS' ? 'bg-rose-100 text-rose-600' :
                                    event.severity === 'Critical' ? 'bg-amber-100 text-amber-600' :
                                    event.severity === 'Warning' ? 'bg-yellow-100 text-yellow-600' : 'bg-indigo-100 text-indigo-600'
                                }`}>
                                    {event.event_type}
                                </span>
                            </div>
                            <p className="text-sm font-medium text-gray-700 mt-1">{event.message}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    </div>
  );
};

export default LiveRiskDashboard;

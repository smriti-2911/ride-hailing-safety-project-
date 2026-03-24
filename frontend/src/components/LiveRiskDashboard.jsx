import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { rideService } from '../services/api';

function scoreZone(score) {
  if (score >= 75) return { key: 'safe', label: 'Lower risk', fill: '#10b981' };
  if (score >= 50) return { key: 'watch', label: 'Moderate', fill: '#f59e0b' };
  return { key: 'elevated', label: 'Elevated', fill: '#f43f5e' };
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const z = scoreZone(p.score ?? 0);
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/95 px-3 py-2 shadow-xl backdrop-blur-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{p.clock || p.time}</p>
      <p className="text-lg font-black tabular-nums text-white">
        {Number(p.score).toFixed(1)}
        <span className="text-sm text-slate-500 font-bold"> /100</span>
      </p>
      <p className="text-xs font-semibold mt-0.5" style={{ color: z.fill }}>
        {z.label}
      </p>
    </div>
  );
};

const LiveRiskDashboard = ({ rideId, liveRisk }) => {
  const [riskData, setRiskData] = useState([]);
  const [timeline, setTimeline] = useState([]);

  const fetchTimeline = useCallback(async () => {
    if (!rideId) return;
    try {
      const res = await rideService.getAlerts(rideId);
      setTimeline(res.data.alerts || []);
    } catch (e) {
      console.error('Failed fetching timeline', e);
    }
  }, [rideId]);

  useEffect(() => {
    if (!rideId) return;
    fetchTimeline();
    const iv = setInterval(fetchTimeline, 2000);
    return () => clearInterval(iv);
  }, [rideId, fetchTimeline]);

  useEffect(() => {
    if (!rideId || liveRisk?.pingSerial == null) return;
    fetchTimeline();
  }, [rideId, liveRisk?.pingSerial, fetchTimeline]);

  useEffect(() => {
    if (!liveRisk) return;
    setRiskData((prev) => {
      const clock = new Date().toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const score = liveRisk.score ?? 0;
      const z = scoreZone(score);
      const newPoint = {
        time: `#${liveRisk.pingSerial ?? prev.length + 1}`,
        clock,
        score,
        zone: z.key,
      };
      const updated = [...prev, newPoint];
      return updated.length > 48 ? updated.slice(-48) : updated;
    });
  }, [liveRisk?.pingSerial]);

  const currentScore = liveRisk?.score || 0;
  const currentRiskLevel = liveRisk?.status || 'Safe';
  const alerts = liveRisk?.reasons || [];

  const phaseLabel =
    typeof currentRiskLevel === 'string' && currentRiskLevel.length > 0
      ? currentRiskLevel.replace(/_/g, ' ')
      : '';

  const getStatusColor = () => {
    if (currentScore >= 75) return 'text-emerald-400';
    if (currentScore >= 50) return 'text-amber-400';
    return 'text-rose-400 animate-pulse';
  };

  const getPanelAccent = () => {
    if (currentScore >= 75) return 'border-emerald-500/25 shadow-[0_0_24px_rgba(16,185,129,0.08)]';
    if (currentScore >= 50) return 'border-amber-500/25 shadow-[0_0_24px_rgba(245,158,11,0.08)]';
    return 'border-rose-500/30 shadow-[0_0_28px_rgba(244,63,94,0.12)]';
  };

  const chartHasData = riskData.length > 0;

  const gradientStops = useMemo(
    () => (
      <defs>
        <linearGradient id="riskAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#818cf8" stopOpacity={0.35} />
          <stop offset="40%" stopColor="#6366f1" stopOpacity={0.12} />
          <stop offset="100%" stopColor="#0f172a" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="riskStrokeGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="45%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#fb7185" />
        </linearGradient>
      </defs>
    ),
    []
  );

  return (
    <div
      className={`rounded-2xl border bg-slate-900/55 backdrop-blur-md p-5 transition-all duration-500 ${getPanelAccent()}`}
    >
      <div className="flex justify-between items-start gap-4 mb-5">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-white tracking-tight">Live Safety Intelligence</h2>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-xs font-medium text-slate-400 truncate">Live trace · ledger synced</span>
          </div>
          {phaseLabel && (
            <p
              className="text-[11px] font-semibold text-indigo-300/90 mt-2 uppercase tracking-wide truncate"
              title={phaseLabel}
            >
              Phase · {phaseLabel}
            </p>
          )}
        </div>

        <div className="text-right shrink-0">
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Risk score</p>
          <div className={`text-4xl font-black tabular-nums leading-tight ${getStatusColor()}`}>
            {typeof currentScore === 'number' ? currentScore.toFixed(1) : currentScore}
            <span className="text-lg text-slate-500 font-bold">/100</span>
          </div>
          <p className={`text-sm font-bold mt-0.5 truncate max-w-[10rem] ${getStatusColor()}`}>{currentRiskLevel}</p>
        </div>
      </div>

      {alerts.length > 0 && (
        <div
          className={`mb-5 p-3 rounded-xl border ${
            currentScore < 50
              ? 'bg-rose-950/50 border-rose-500/35 text-rose-100'
              : 'bg-amber-950/40 border-amber-500/30 text-amber-100'
          }`}
        >
          <h3 className="font-bold text-sm mb-1.5">Latest flag</h3>
          <ul className="list-disc pl-5 text-sm font-medium opacity-95">
            {alerts.map((alert, i) => (
              <li key={i}>{alert}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-gradient-to-b from-slate-950/80 to-slate-950/40 p-4 rounded-xl border border-white/5 overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Risk timeline</h3>
          <div className="flex flex-wrap gap-1.5 justify-end text-[9px] font-bold uppercase tracking-tight">
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
              75+ safe
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/12 text-amber-200 border border-amber-500/25">
              50–75 watch
            </span>
            <span className="px-2 py-0.5 rounded-full bg-rose-500/12 text-rose-200 border border-rose-500/25">
              &lt;50 elevated
            </span>
          </div>
        </div>
        <div className="h-56 w-full min-w-0">
          {chartHasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={riskData} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
                {gradientStops}
                <ReferenceArea y1={0} y2={50} fill="#f43f5e" fillOpacity={0.06} />
                <ReferenceArea y1={50} y2={75} fill="#f59e0b" fillOpacity={0.05} />
                <ReferenceArea y1={75} y2={100} fill="#10b981" fillOpacity={0.06} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.1)" />
                <XAxis
                  dataKey="clock"
                  tick={{ fontSize: 9, fill: '#94a3b8' }}
                  stroke="#334155"
                  interval="preserveStartEnd"
                  minTickGap={28}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  stroke="#334155"
                  width={36}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(99,102,241,0.35)', strokeWidth: 1 }} />
                <ReferenceLine y={50} stroke="#fb7185" strokeDasharray="4 4" strokeOpacity={0.45} />
                <ReferenceLine y={75} stroke="#fbbf24" strokeDasharray="4 4" strokeOpacity={0.45} />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="none"
                  fill="url(#riskAreaGrad)"
                  fillOpacity={1}
                  isAnimationActive
                  animationDuration={400}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="url(#riskStrokeGrad)"
                  strokeWidth={2.5}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (cx == null || cy == null) return null;
                    const col = scoreZone(payload?.score ?? 0).fill;
                    return <circle cx={cx} cy={cy} r={4} fill={col} stroke="#0f172a" strokeWidth={1.5} />;
                  }}
                  activeDot={{ r: 7, strokeWidth: 0, fill: '#e2e8f0' }}
                  isAnimationActive
                  animationDuration={400}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm gap-2 px-4 text-center">
              <div className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-indigo-400/80 text-xs font-black">
                ∿
              </div>
              <span className="font-medium">Chart fills as monitoring pings arrive…</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 mt-4 max-h-72 overflow-y-auto custom-scrollbar">
        <h3 className="text-[11px] font-bold text-slate-500 mb-3 uppercase tracking-wider flex items-center justify-between gap-2">
          <span>Activity ledger</span>
          <span className="text-[9px] bg-white/5 text-slate-400 px-2 py-0.5 rounded-full font-semibold">
            {timeline.length} events
          </span>
        </h3>

        <div className="space-y-3">
          {timeline.length === 0 ? (
            <div className="text-slate-500 text-sm italic py-6 text-center">Recording activity…</div>
          ) : (
            timeline.map((event) => (
              <div
                key={event.id}
                className={`pl-3 border-l-2 py-1.5 ${
                  event.severity === 'SOS'
                    ? 'border-rose-500'
                    : event.severity === 'Critical'
                      ? 'border-amber-500'
                      : event.severity === 'Warning'
                        ? 'border-amber-400/90'
                        : 'border-indigo-400/80'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                    {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : '—'}
                  </span>
                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 max-w-[9rem] truncate ${
                      event.severity === 'SOS'
                        ? 'bg-rose-500/20 text-rose-300'
                        : event.severity === 'Critical'
                          ? 'bg-amber-500/15 text-amber-300'
                          : event.severity === 'Warning'
                            ? 'bg-yellow-500/15 text-yellow-200'
                            : 'bg-indigo-500/15 text-indigo-200'
                    }`}
                    title={event.event_type}
                  >
                    {event.event_type}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-300 mt-1 leading-snug">{event.message}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveRiskDashboard;

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { rideService } from '../services/api';
import { ArrowLeft, Route, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';

const LedgerBlock = ({ events }) => (
  <div className="mt-3 pt-3 border-t border-white/10 max-h-64 overflow-y-auto space-y-2.5">
    {events.length === 0 ? (
      <p className="text-xs text-slate-500 italic">No activity entries for this ride.</p>
    ) : (
      events.map((event) => (
        <div
          key={event.id}
          className={`pl-3 border-l-2 py-1 ${
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
              {event.timestamp ? new Date(event.timestamp).toLocaleString() : '—'}
            </span>
            <span
              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 max-w-[8rem] truncate ${
                event.severity === 'SOS'
                  ? 'bg-rose-500/20 text-rose-300'
                  : event.severity === 'Critical'
                    ? 'bg-amber-500/15 text-amber-300'
                    : event.severity === 'Warning'
                      ? 'bg-yellow-500/15 text-yellow-200'
                      : 'bg-indigo-500/15 text-indigo-200'
              }`}
            >
              {event.event_type}
            </span>
          </div>
          <p className="text-xs font-medium text-slate-300 mt-1 leading-snug">{event.message}</p>
        </div>
      ))
    )}
  </div>
);

const RideHistory = () => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [ledgerByRide, setLedgerByRide] = useState({});
  const [ledgerLoadingId, setLedgerLoadingId] = useState(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await rideService.listMyRides();
        if (!cancelled) setRides(res.data.rides || []);
      } catch (e) {
        toast.error('Could not load rides');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const deleteOneRide = async (rideId, e) => {
    e?.stopPropagation?.();
    if (!window.confirm('Delete this ride and its activity ledger? This cannot be undone.')) return;
    try {
      await rideService.deleteRide(rideId);
      setRides((prev) => prev.filter((r) => r.id !== rideId));
      setLedgerByRide((prev) => {
        const next = { ...prev };
        delete next[rideId];
        return next;
      });
      if (expandedId === rideId) setExpandedId(null);
      toast.success('Ride removed from history');
    } catch (e) {
      toast.error('Could not delete ride');
    }
  };

  const clearAllHistory = async () => {
    if (!window.confirm('Delete all ride history? This cannot be undone, like clearing activity in Google.')) return;
    setClearing(true);
    try {
      await rideService.clearHistory();
      setRides([]);
      setLedgerByRide({});
      setExpandedId(null);
      toast.success('Ride history cleared');
    } catch (e) {
      toast.error('Could not clear history');
    } finally {
      setClearing(false);
    }
  };

  const toggleLedger = async (rideId) => {
    if (expandedId === rideId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(rideId);
    if (ledgerByRide[rideId] !== undefined) return;
    setLedgerLoadingId(rideId);
    try {
      const res = await rideService.getAlerts(rideId);
      setLedgerByRide((prev) => ({ ...prev, [rideId]: res.data.alerts || [] }));
    } catch (e) {
      toast.error('Could not load activity ledger');
      setLedgerByRide((prev) => ({ ...prev, [rideId]: [] }));
    } finally {
      setLedgerLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white p-8">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 mb-8">
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </Link>
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Route className="w-7 h-7 text-emerald-400" /> Ride history
          </h1>
          {rides.length > 0 && (
            <button
              type="button"
              onClick={clearAllHistory}
              disabled={clearing}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-sm font-semibold disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {clearing ? 'Clearing…' : 'Clear all history'}
            </button>
          )}
        </div>
        <p className="text-sm text-slate-500 mb-6">
          Full simulation and monitoring events are stored per ride. Expand a row to view the activity ledger.
        </p>
        {loading ? (
          <p className="text-slate-400">Loading…</p>
        ) : rides.length === 0 ? (
          <p className="text-slate-400">No rides yet.</p>
        ) : (
          <ul className="space-y-3">
            {rides.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl border border-white/10 bg-slate-900/40 p-4"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {r.source} → {r.destination}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      #{r.id} · {r.status} · score {r.safety_score ?? '—'}
                      {typeof r.activity_count === 'number' && (
                        <span className="text-indigo-400/90"> · {r.activity_count} ledger events</span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Link
                      to={`/post-ride/${r.id}`}
                      className="text-sm text-indigo-400 hover:underline"
                    >
                      Details
                    </Link>
                    <button
                      type="button"
                      onClick={(e) => deleteOneRide(r.id, e)}
                      className="text-xs font-semibold text-rose-400/90 hover:text-rose-300"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleLedger(r.id)}
                      className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1"
                    >
                      {expandedId === r.id ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      Activity ledger
                    </button>
                  </div>
                </div>
                {expandedId === r.id && (
                  ledgerLoadingId === r.id ? (
                    <p className="mt-3 pt-3 border-t border-white/10 text-sm text-slate-500">Loading ledger…</p>
                  ) : (
                    <LedgerBlock events={ledgerByRide[r.id] || []} />
                  )
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default RideHistory;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { historyService } from '../services/api';
import { ShieldCheck, ArrowLeft, BarChart3, TrendingDown, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const PostRide = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const response = await historyService.getPostRideAnalysis(id);
        setData(response.data);
      } catch (err) {
        console.error("Failed to fetch post ride analytics", err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchAnalysis();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center text-white">Loading Security Analytics...</div>;
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center text-white">
        <p className="text-xl">Analysis missing or unauthorized.</p>
        <button onClick={() => navigate('/dashboard')} className="mt-4 px-6 py-2 bg-indigo-600 rounded-xl hover:bg-indigo-500">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const { counterfactual, final_safety_score, source, destination } = data;
  const isOptimal = counterfactual.actual_score >= counterfactual.safest_score;

  return (
    <div className="min-h-screen bg-[#0B0F19] p-8 text-white flex flex-col items-center">
      <div className="max-w-3xl w-full">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 mb-8 font-medium">
          <ArrowLeft className="w-5 h-5" /> Return to Dashboard
        </button>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500/20 blur-3xl rounded-full"></div>
          
          <div className="flex items-center gap-4 mb-8 relative z-10">
            <div className="p-4 bg-emerald-500/20 rounded-2xl border border-emerald-500/30">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">Post-Ride Security Analysis</h1>
              <p className="text-slate-400 mt-1 font-medium">{source} → {destination}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            {/* Actual Result Card */}
            <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4 text-slate-400 font-semibold uppercase tracking-wider text-sm">
                <BarChart3 className="w-4 h-4" /> Final Ride Safety
              </div>
              <div className="text-6xl font-black text-white mb-2">{final_safety_score}<span className="text-2xl text-slate-500 font-bold">/100</span></div>
              <p className="text-emerald-400 font-medium text-sm flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Safely Completed</p>
            </div>

            {/* Counterfactual Card */}
            <div className={`border rounded-2xl p-6 relative overflow-hidden ${isOptimal ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-current opacity-20 blur-3xl rounded-full"></div>
              <div className={`flex items-center gap-2 mb-4 font-semibold uppercase tracking-wider text-sm ${isOptimal ? 'text-indigo-400' : 'text-amber-400'}`}>
                {isOptimal ? <CheckCircle className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />} Counterfactual Engine
              </div>
              
              <h3 className="text-xl font-bold text-white mb-3">AI Retrospective Routing</h3>
              <p className="text-slate-300 font-medium leading-relaxed">{counterfactual.message}</p>
              
              {!isOptimal && (
                <div className="mt-4 inline-flex items-center gap-2 bg-amber-500/20 px-3 py-1.5 rounded-lg text-amber-300 text-sm font-bold border border-amber-500/20">
                  Missed Optimal Peak: {counterfactual.safest_score}/100
                </div>
              )}
            </div>
          </div>
          
        </motion.div>
      </div>
    </div>
  );
};

export default PostRide;

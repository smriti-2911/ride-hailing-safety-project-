import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, Navigation, Sparkles, Activity } from 'lucide-react';

const Landing = () => {
  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.3 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 10 } }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white overflow-hidden relative selection:bg-indigo-500/30">
      {/* Dynamic Background Mesh Gradients */}
      <div className="absolute top-0 left-1/4 w-[1000px] h-[1000px] bg-indigo-600/10 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-emerald-600/10 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
            <ShieldAlert className="w-6 h-6 text-indigo-400" />
          </div>
          <span className="text-xl font-bold tracking-wide">Nav<span className="text-indigo-400">Safe</span></span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <Link to="/login" className="text-slate-300 hover:text-white font-medium transition-colors px-4 py-2">
            Log in
          </Link>
          <Link to="/register" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-semibold shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all">
            Join Platform
          </Link>
        </motion.div>
      </nav>

      {/* Main Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-20 flex flex-col items-center text-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-emerald-500/30 text-emerald-400 text-sm font-semibold tracking-wide uppercase mb-8 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <Sparkles className="w-4 h-4" /> AI-Powered Safety Navigation
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-6xl md:text-8xl font-black tracking-tight leading-[1.1] mb-8"
          >
            Navigate your city <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">
              without fear.
            </span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-xl md:text-2xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            Our intelligent AI model calculates the absolute safest route home based on real-time crime data, lighting conditions, and emergency proximity.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link to="/register" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-slate-900 font-bold text-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 shadow-xl">
              Start your journey <Navigation className="w-5 h-5" />
            </Link>
          </motion.div>

        </motion.div>

        {/* Feature Cards */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 w-full max-w-5xl text-left"
        >
          <div className="glass-card p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full group-hover:bg-indigo-500/20 transition-colors"></div>
            <Activity className="w-10 h-10 text-indigo-400 mb-6" />
            <h3 className="text-xl font-bold text-white mb-3">Live Threat AI</h3>
            <p className="text-slate-400">Routes are dynamically scored using 7 critical risk parameters compiled from historical city data.</p>
          </div>

          <div className="glass-card p-8 border-emerald-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full group-hover:bg-emerald-500/20 transition-colors"></div>
            <ShieldAlert className="w-10 h-10 text-emerald-400 mb-6" />
            <h3 className="text-xl font-bold text-emerald-400 mb-3">Deviation Alerts</h3>
            <p className="text-slate-400">If your driver veers off the designated safe path, automatic SOS signals are triggered instantly.</p>
          </div>

          <div className="glass-card p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full group-hover:bg-indigo-500/20 transition-colors"></div>
            <Navigation className="w-10 h-10 text-indigo-400 mb-6" />
            <h3 className="text-xl font-bold text-white mb-3">Real-time GPS</h3>
            <p className="text-slate-400">Powered by the Google Maps API for pinpoint accurate routing and continuous journey monitoring.</p>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Landing;
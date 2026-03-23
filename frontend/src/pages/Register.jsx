import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Phone, HeartPulse, Sparkles, ShieldCheck } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    emergency_contact: '',
    age: '',
    gender: 'Unspecified'
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await register(formData);

    if (result.success) {
      toast.success('Registration successful. Welcome to NavSafe!', { icon: '🎉' });
      navigate('/dashboard');
    } else {
      toast.error(result.error || 'Registration failed', { icon: '🛑' });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] p-4 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-1/4 -right-1/4 w-[80vw] h-[80vw] bg-emerald-500/10 blur-[120px] rounded-full point-events-none mix-blend-screen" />
      <div className="absolute bottom-[-10%] -left-1/4 w-[60vw] h-[60vw] bg-indigo-500/10 blur-[120px] rounded-full point-events-none mix-blend-screen" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="max-w-md w-full glass-card p-10 relative z-10 my-8"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-16 h-16 bg-emerald-500/20 rounded-2xl mx-auto flex items-center justify-center mb-6 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
          >
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
          </motion.div>

          <h2 className="text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            Join NavSafe <Sparkles className="w-5 h-5 text-indigo-400" />
          </h2>
          <p className="mt-3 text-slate-400 font-medium">
            Already registered?{' '}
            <Link to="/login" className="text-emerald-400 hover:text-emerald-300 transition-colors font-bold underline decoration-emerald-500/30 underline-offset-4">
              Authenticate here
            </Link>
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>

          <div className="relative group">
            <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center text-slate-500 group-focus-within:text-emerald-400 transition-colors">
              <User className="w-5 h-5" />
            </div>
            <input
              name="name"
              type="text"
              required
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-medium"
              placeholder="Full Legal Name"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div className="relative group">
            <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center text-slate-500 group-focus-within:text-emerald-400 transition-colors">
              <Mail className="w-5 h-5" />
            </div>
            <input
              name="email"
              type="email"
              required
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-medium"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="relative group">
            <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center text-slate-500 group-focus-within:text-emerald-400 transition-colors">
              <Lock className="w-5 h-5" />
            </div>
            <input
              name="password"
              type="password"
              required
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-medium"
              placeholder="Secure Password"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <div className="relative group">
            <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center text-slate-500 group-focus-within:text-emerald-400 transition-colors">
              <Phone className="w-5 h-5" />
            </div>
            <input
              name="phone"
              type="tel"
              required
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-medium"
              placeholder="Personal Phone (e.g. +91...)"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>



          <div className="grid grid-cols-2 gap-4">
            <div className="relative group">
              <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center text-slate-500 group-focus-within:text-emerald-400 transition-colors">
                <User className="w-5 h-5" />
              </div>
              <input
                name="age"
                type="number"
                min="18"
                max="100"
                required
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-medium"
                placeholder="Age"
                value={formData.age}
                onChange={handleChange}
              />
            </div>
            <div className="relative group">
              <select
                name="gender"
                required
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-4 px-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-medium appearance-none"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="Unspecified">Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute left-0 top-0 bottom-[1.5rem] w-12 flex items-center justify-center text-slate-500 group-focus-within:text-red-400 transition-colors">
              <HeartPulse className="w-5 h-5" />
            </div>
            <input
              name="emergency_contact"
              type="tel"
              required
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all font-medium"
              placeholder="Emergency Contact Phone"
              value={formData.emergency_contact}
              onChange={handleChange}
            />
            <p className="mt-2 text-xs font-semibold text-slate-500 tracking-wide uppercase px-2 text-center">Auto-Alerts sent here on deviation</p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full py-4 px-4 mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              'Create Secure Profile'
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default Register;
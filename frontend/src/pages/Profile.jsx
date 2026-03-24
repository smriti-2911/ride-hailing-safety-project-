import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { userService } from '../services/api';
import { ArrowLeft, User, Phone, Shield, Mail, Calendar, Users } from 'lucide-react';

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    emergency_contact: '',
    age: '',
    gender: 'Unspecified',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await userService.getProfile();
        if (!cancelled && res.data) {
          setForm({
            name: res.data.name || '',
            email: res.data.email || '',
            phone: res.data.phone || '',
            emergency_contact: res.data.emergency_contact || '',
            age: res.data.age != null ? String(res.data.age) : '',
            gender: res.data.gender || 'Unspecified',
          });
        }
      } catch (e) {
        toast.error('Could not load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      await userService.updateProfile({
        name: form.name,
        phone: form.phone,
        emergency_contact: form.emergency_contact,
        age: form.age === '' ? undefined : parseInt(form.age, 10),
        gender: form.gender,
      });
      toast.success('Profile saved');
    } catch (err) {
      toast.error('Update failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white p-8">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 mb-8">
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </Link>
      <div className="max-w-lg mx-auto glass rounded-3xl p-8 border border-white/10">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-2">
          <User className="w-7 h-7 text-indigo-400" /> Profile
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Same fields as sign-up: keep your contact and safety profile current.
        </p>
        {loading ? (
          <p className="text-slate-400">Loading…</p>
        ) : (
          <form onSubmit={save} className="space-y-5">
            <div>
              <label className="text-xs uppercase text-slate-500 font-bold">Name</label>
              <input
                className="mt-1 w-full rounded-xl bg-slate-800/50 border border-white/10 px-4 py-3"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-slate-500 font-bold flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email
              </label>
              <input
                className="mt-1 w-full rounded-xl bg-slate-900/60 border border-white/5 px-4 py-3 text-slate-400 cursor-not-allowed"
                value={form.email}
                readOnly
                title="Email cannot be changed here"
              />
            </div>
            <div>
              <label className="text-xs uppercase text-slate-500 font-bold flex items-center gap-1">
                <Phone className="w-3 h-3" /> Phone
              </label>
              <input
                className="mt-1 w-full rounded-xl bg-slate-800/50 border border-white/10 px-4 py-3"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-slate-500 font-bold flex items-center gap-1">
                <Shield className="w-3 h-3" /> Emergency contact
              </label>
              <input
                className="mt-1 w-full rounded-xl bg-slate-800/50 border border-white/10 px-4 py-3"
                value={form.emergency_contact}
                onChange={(e) => setForm((f) => ({ ...f, emergency_contact: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-slate-500 font-bold flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Age
              </label>
              <input
                type="number"
                min={13}
                max={120}
                className="mt-1 w-full rounded-xl bg-slate-800/50 border border-white/10 px-4 py-3"
                value={form.age}
                onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-slate-500 font-bold flex items-center gap-1">
                <Users className="w-3 h-3" /> Gender
              </label>
              <select
                className="mt-1 w-full rounded-xl bg-slate-800/50 border border-white/10 px-4 py-3"
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
              >
                <option value="Unspecified">Unspecified</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold"
            >
              Save
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Profile;

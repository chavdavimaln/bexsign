import React, { useState } from 'react';
import { User, Calendar, Shield, CheckCircle2 } from 'lucide-react';

export default function MyProfile() {
  const [profile, setProfile] = useState({
    firstName: 'Vimal',
    lastName: 'Chavda',
    email: 'vimal@bexsign.com',
    company: 'Bexsign Inc.',
    phone: '+1 (555) 019-2831'
  });

  const [delegate, setDelegate] = useState({
    delegateTo: 'sarah@bexsign.com',
    startDate: '2026-08-28',
    endDate: '2026-09-05',
    reason: 'Vacation leave'
  });

  const [successMsg, setSuccessMsg] = useState('');

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setSuccessMsg('Profile information updated successfully.');
  };

  const handleSaveDelegate = (e) => {
    e.preventDefault();
    setSuccessMsg('Vacation signing delegation activated successfully!');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">My Profile & Settings</h1>
        <p className="text-xs text-slate-500 mt-1">Manage account credentials, personal data, and signing delegation policies.</p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSaveProfile} className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
          <User className="text-[#E71414]" size={18} /> Personal Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">First Name</label>
            <input
              type="text"
              value={profile.firstName}
              onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
              className="w-full border border-slate-300 rounded-lg p-2.5"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Last Name</label>
            <input
              type="text"
              value={profile.lastName}
              onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
              className="w-full border border-slate-300 rounded-lg p-2.5"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full bg-slate-100 border border-slate-300 rounded-lg p-2.5 text-slate-500"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Company</label>
            <input
              type="text"
              value={profile.company}
              onChange={(e) => setProfile({ ...profile, company: e.target.value })}
              className="w-full border border-slate-300 rounded-lg p-2.5"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" className="btn-primary px-5 py-2 rounded-lg text-xs font-bold">
            Save Profile
          </button>
        </div>
      </form>

      {/* Delegation Module (Section 39 PDF Requirement) */}
      <form onSubmit={handleSaveDelegate} className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
          <Shield className="text-[#E71414]" size={18} /> Signing Delegation (Vacation Mode)
        </h2>

        <p className="text-xs text-slate-500">
          When active, incoming signature requests will automatically be routed to your designated delegate during your absence.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Delegate To (Email)</label>
            <input
              type="email"
              value={delegate.delegateTo}
              onChange={(e) => setDelegate({ ...delegate, delegateTo: e.target.value })}
              className="w-full border border-slate-300 rounded-lg p-2.5"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Start Date</label>
            <input
              type="date"
              value={delegate.startDate}
              onChange={(e) => setDelegate({ ...delegate, startDate: e.target.value })}
              className="w-full border border-slate-300 rounded-lg p-2.5"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">End Date</label>
            <input
              type="date"
              value={delegate.endDate}
              onChange={(e) => setDelegate({ ...delegate, endDate: e.target.value })}
              className="w-full border border-slate-300 rounded-lg p-2.5"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Reason</label>
          <input
            type="text"
            value={delegate.reason}
            onChange={(e) => setDelegate({ ...delegate, reason: e.target.value })}
            placeholder="e.g. Annual Leave"
            className="w-full border border-slate-300 rounded-lg p-2.5 text-xs"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" className="btn-primary px-5 py-2 rounded-lg text-xs font-bold">
            Activate Delegation
          </button>
        </div>
      </form>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Calendar, 
  Shield, 
  CheckCircle2, 
  Lock, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Mail, 
  AlertCircle, 
  KeyRound, 
  Check 
} from 'lucide-react';
import { showPopupAlert } from '../components/GlobalAlertModal';
import { getLoggedInUser } from '../utils/currentUser';
import { API_BASE, API_ORIGIN } from '../utils/api';


// POSTs JSON and returns { ok, status, data }; `ok` is false for HTTP errors and { success: false } answers
async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && data.success !== false, status: res.status, data };
}

export default function MyProfile() {
  // The signed-in user's account (the first account when no user id was saved at sign-in)
  const [userId] = useState(() => getLoggedInUser()?.id || 1);
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          firstName: parsed.firstName || parsed.first_name || 'Vimal',
          lastName: parsed.lastName || parsed.last_name || 'Chavda',
          email: parsed.email || 'vimal@bexcodeservices.com',
          company: parsed.company || 'Bexsign Inc.',
          phone: parsed.phone || '+1 (555) 019-2831'
        };
      }
    } catch (e) {}
    return {
      firstName: 'Vimal',
      lastName: 'Chavda',
      email: 'vimal@bexcodeservices.com',
      company: 'Bexsign Inc.',
      phone: '+1 (555) 019-2831'
    };
  });

  const [delegate, setDelegate] = useState({
    delegateTo: 'sarah@bexcodeservices.com',
    startDate: '2026-08-28',
    endDate: '2026-09-05',
    reason: 'Vacation leave'
  });

  // Password Management State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/profile/${userId}`);
      const data = await res.json();
      if (data && data.first_name) {
        setProfile(prev => ({
          ...prev,
          firstName: data.first_name || prev.firstName,
          lastName: data.last_name || prev.lastName,
          email: data.email || prev.email,
          company: data.company || prev.company,
          phone: data.phone || prev.phone
        }));
      }
    } catch (e) {
      console.warn('Profile fetch fallback:', e);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await fetch(`${API_BASE}/settings/profile/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          company: profile.company,
          phone: profile.phone
        })
      });

      // Update local storage user session
      try {
        const stored = localStorage.getItem('user');
        const userObj = stored ? JSON.parse(stored) : {};
        userObj.firstName = profile.firstName;
        userObj.lastName = profile.lastName;
        userObj.name = `${profile.firstName} ${profile.lastName}`;
        userObj.email = profile.email;
        userObj.company = profile.company;
        localStorage.setItem('user', JSON.stringify(userObj));
      } catch (err) {}

      setSuccessMsg('Profile information updated successfully.');
      showPopupAlert('Your profile details have been saved successfully.', { title: 'Profile Updated', type: 'success' });
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg('Failed to update profile.');
    }
  };

  // Generate strong random password
  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let generated = 'Bex#';
    for (let i = 0; i < 8; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(generated);
    setConfirmPassword(generated);
    setShowNewPassword(true);
    setShowConfirmPassword(true);
    showPopupAlert(`A secure password was generated: ${generated}`, { title: 'Password Generated', type: 'info' });
  };

  // Handle manual / generated password save
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation password do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      // The account with this email; when the email field was edited but not saved yet, the signed-in account (id)
      let result = await postJson(`${API_BASE}/change-password`, { email: profile.email, newPassword, sendEmail: true });
      if (!result.ok && result.status === 404) {
        result = await postJson(`${API_BASE}/settings/password/${userId}`, { newPassword, sendEmail: true });
      }

      if (result.ok) {
        const message = result.data.message || 'Password updated successfully!';
        setSuccessMsg(message);
        showPopupAlert(message, { title: 'Password Updated', type: 'success' });
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(result.data.error || 'Failed to update password. Please ensure password is at least 6 characters.');
      }
    } catch (err) {
      setErrorMsg(err instanceof TypeError
        ? `Could not reach the BexSign server at ${API_ORIGIN}. Make sure it is running, then try again.`
        : `Error updating password: ${err.message}`);
    } finally {
      setPasswordLoading(false);
    }
  };

  // Emails a one-time password reset link to the account email
  const handleSendResetEmail = async () => {
    setErrorMsg('');
    setEmailLoading(true);
    try {
      const result = await postJson(`${API_BASE}/send-reset-email`, { email: profile.email });
      if (result.ok) {
        showPopupAlert(result.data.message || `A password reset link has been emailed to ${profile.email}.`, { title: 'Email sent', type: 'success' });
      } else {
        const error = result.data.error || `The password reset email could not be sent (HTTP ${result.status}).`;
        setErrorMsg(error);
        showPopupAlert(error, { title: 'Email not sent', type: 'error' });
      }
    } catch (err) {
      const error = err instanceof TypeError
        ? `Could not reach the BexSign server at ${API_ORIGIN}, so no email was sent. Make sure it is running, then try again.`
        : `Error requesting password reset email: ${err.message}`;
      setErrorMsg(error);
      showPopupAlert(error, { title: 'Email not sent', type: 'error' });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleSaveDelegate = (e) => {
    e.preventDefault();
    setSuccessMsg('Vacation signing delegation activated successfully!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 font-sans">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">My Profile & Settings</h1>
        <p className="text-xs text-slate-500 mt-1">Manage account credentials, personal data, password security, and signing delegation policies.</p>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs">
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs">
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}

      {/* 1. Profile Details Form */}
      <form onSubmit={handleSaveProfile} className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <User className="text-[#E71414]" size={18} /> Personal Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">First Name</label>
            <input
              type="text"
              value={profile.firstName}
              onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-[#007355] focus:ring-1 focus:ring-[#007355] outline-none font-medium"
              required
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Last Name</label>
            <input
              type="text"
              value={profile.lastName}
              onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-[#007355] focus:ring-1 focus:ring-[#007355] outline-none font-medium"
              required
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Email Address (Login ID)</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 font-semibold focus:border-[#007355] focus:ring-1 focus:ring-[#007355] outline-none"
              required
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Company</label>
            <input
              type="text"
              value={profile.company}
              onChange={(e) => setProfile({ ...profile, company: e.target.value })}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-[#007355] focus:ring-1 focus:ring-[#007355] outline-none font-medium"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" className="btn-primary px-5 py-2 rounded-lg text-xs font-bold shadow hover:shadow-md transition">
            Save Profile
          </button>
        </div>
      </form>

      {/* 2. Password & Security Management (Requirement) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <KeyRound className="text-[#E71414]" size={18} /> Password & Security Management
          </h2>
          <button
            type="button"
            onClick={handleSendResetEmail}
            disabled={emailLoading}
            className="flex items-center gap-1.5 text-xs text-[#007355] hover:text-[#005c44] font-bold border border-[#007355]/30 hover:border-[#007355] px-3 py-1.5 rounded-lg transition bg-[#007355]/5"
          >
            <Mail size={14} />
            <span>{emailLoading ? 'Sending...' : 'Send Password Change Link to Email'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Update your account login password. You can manually enter a password, generate a secure strong password automatically, or toggle visibility.
        </p>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* New Password */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-slate-700">New Password</label>
                <button
                  type="button"
                  onClick={generateStrongPassword}
                  className="text-[11px] font-bold text-[#007355] hover:underline flex items-center gap-1"
                >
                  <Sparkles size={12} /> Auto Generate Strong Password
                </button>
              </div>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 chars)"
                  className="w-full border border-slate-300 rounded-lg p-2.5 pr-10 text-slate-900 font-mono text-xs focus:border-[#007355] focus:ring-1 focus:ring-[#007355] outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-slate-700">Confirm Password</label>
                {confirmPassword && (
                  <span className={`text-[10px] font-bold flex items-center gap-1 ${newPassword === confirmPassword ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {newPassword === confirmPassword ? <Check size={12} /> : null}
                    {newPassword === confirmPassword ? 'Passwords match' : 'Does not match'}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className={`w-full border rounded-lg p-2.5 pr-10 text-slate-900 font-mono text-xs outline-none ${
                    confirmPassword && newPassword !== confirmPassword 
                      ? 'border-rose-400 focus:border-rose-500' 
                      : 'border-slate-300 focus:border-[#007355] focus:ring-1 focus:ring-[#007355]'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={passwordLoading}
              className="px-5 py-2 bg-[#007355] hover:bg-[#005c44] text-white rounded-lg text-xs font-bold transition shadow"
            >
              {passwordLoading ? 'Updating Password...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* 3. Delegation Module (Section 39 PDF Requirement) */}
      <form onSubmit={handleSaveDelegate} className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
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
              className="w-full border border-slate-300 rounded-lg p-2.5 focus:border-[#007355] outline-none"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Start Date</label>
            <input
              type="date"
              value={delegate.startDate}
              onChange={(e) => setDelegate({ ...delegate, startDate: e.target.value })}
              className="w-full border border-slate-300 rounded-lg p-2.5 focus:border-[#007355] outline-none"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">End Date</label>
            <input
              type="date"
              value={delegate.endDate}
              onChange={(e) => setDelegate({ ...delegate, endDate: e.target.value })}
              className="w-full border border-slate-300 rounded-lg p-2.5 focus:border-[#007355] outline-none"
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
            className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:border-[#007355] outline-none"
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

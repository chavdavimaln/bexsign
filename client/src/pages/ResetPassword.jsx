import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle2, AlertCircle, Check, KeyRound } from 'lucide-react';
import { API_BASE, API_ORIGIN } from '../utils/api';


/** Opened from the password reset email: sets a new password with the one-time link. */
export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  // 'checking' | 'valid' | 'invalid' | 'done'
  const [stage, setStage] = useState('checking');
  const [accountEmail, setAccountEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [doneMessage, setDoneMessage] = useState('');

  const serverError = (err) => (err instanceof TypeError
    ? `Could not reach the BexSign server at ${API_ORIGIN}. Make sure it is running, then try again.`
    : err.message);

  useEffect(() => {
    if (!token) {
      setError('This page opens from the "Reset password" button in the email. Request a new link to reset your password.');
      setStage('invalid');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/reset-password/verify?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) throw new Error(data.error || 'This password reset link is not valid.');
        setAccountEmail(data.email || '');
        setStage('valid');
      } catch (err) {
        setError(serverError(err));
        setStage('invalid');
      }
    })();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('The password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The two passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || `The password could not be changed (HTTP ${res.status}).`);
      setDoneMessage(data.message || 'Your password has been changed.');
      setStage('done');
    } catch (err) {
      setError(serverError(err));
    } finally {
      setSaving(false);
    }
  };

  const passwordInput = ({ id, label, value, onChange, visible, onToggle, placeholder, autoFocus }) => (
    <div>
      <label htmlFor={id} className="block text-slate-700 font-bold mb-1">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          required
          minLength={6}
          autoFocus={autoFocus}
          autoComplete="new-password"
          className="w-full p-2.5 pr-10 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#00a884] text-slate-900"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-8 font-sans">
      <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200 text-slate-800 space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-block bg-[#00a884] text-white px-3 py-1 rounded-lg text-lg font-black tracking-wider mb-2">
            BEXSIGN
          </div>
          <h2 className="text-2xl font-black text-slate-900">
            {stage === 'done' ? 'Password changed' : 'Reset your password'}
          </h2>
          {stage === 'valid' && accountEmail && (
            <p className="text-xs text-slate-500">Choose a new password for <strong className="text-slate-700">{accountEmail}</strong></p>
          )}
        </div>

        {stage === 'checking' && (
          <p className="text-center text-xs text-slate-500 font-semibold">Checking your reset link...</p>
        )}

        {stage === 'invalid' && (
          <div className="space-y-5">
            <div role="alert" className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
            <Link
              to="/forgot-password"
              className="block text-center w-full bg-[#E71414] hover:bg-red-700 text-white py-2.5 rounded-lg font-extrabold shadow-md transition text-xs"
            >
              Request a new link
            </Link>
          </div>
        )}

        {stage === 'valid' && (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
            {error && (
              <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-lg flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {passwordInput({
              id: 'reset-new-password',
              label: 'New password',
              value: newPassword,
              onChange: (v) => { setNewPassword(v); setError(''); },
              visible: showNew,
              onToggle: () => setShowNew(!showNew),
              placeholder: 'At least 6 characters',
              autoFocus: true
            })}
            {passwordInput({
              id: 'reset-confirm-password',
              label: 'Confirm new password',
              value: confirmPassword,
              onChange: (v) => { setConfirmPassword(v); setError(''); },
              visible: showConfirm,
              onToggle: () => setShowConfirm(!showConfirm),
              placeholder: 'Type the new password again'
            })}
            {confirmPassword && (
              <p className={`text-[11px] font-bold flex items-center gap-1 ${newPassword === confirmPassword ? 'text-emerald-600' : 'text-rose-500'}`}>
                {newPassword === confirmPassword ? <><Check size={12} /> Passwords match</> : 'Passwords do not match'}
              </p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#E71414] hover:bg-red-700 text-white py-2.5 rounded-lg font-extrabold shadow-md transition disabled:opacity-50 text-xs flex items-center justify-center gap-2"
            >
              <KeyRound size={14} />
              {saving ? 'Saving...' : 'Set new password'}
            </button>
          </form>
        )}

        {stage === 'done' && (
          <div className="space-y-5">
            <div role="status" className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg flex items-start gap-2.5">
              <CheckCircle2 size={18} className="shrink-0 text-[#00a884]" />
              <span className="leading-relaxed">{doneMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full bg-[#E71414] hover:bg-red-700 text-white py-2.5 rounded-lg font-extrabold shadow-md transition text-xs"
            >
              Sign in
            </button>
          </div>
        )}

        {stage !== 'done' && (
          <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
            Remembered it? <Link to="/login" className="text-[#00a884] font-bold hover:underline">Back to sign in</Link>
          </div>
        )}
      </div>
    </div>
  );
}

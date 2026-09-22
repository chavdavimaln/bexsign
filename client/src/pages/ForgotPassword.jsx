import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { API_BASE, API_ORIGIN } from '../utils/api';

/** "Forgot password?": emails a one-time link to reset the password of a BexSign account. */
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sentMessage, setSentMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/send-reset-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.error || `The reset email could not be sent (HTTP ${res.status}).`);
      }
      setSentMessage(data.message || `A password reset link has been emailed to ${email.trim()}.`);
    } catch (err) {
      setError(err instanceof TypeError
        ? `Could not reach the BexSign server at ${API_ORIGIN}, so no email was sent. Make sure it is running, then try again.`
        : err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-8 font-sans">
      <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200 text-slate-800 space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-block bg-[#00a884] text-white px-3 py-1 rounded-lg text-lg font-black tracking-wider mb-2">
            BEXSIGN
          </div>
          <h2 className="text-2xl font-black text-slate-900">Forgot your password?</h2>
          <p className="text-xs text-slate-500">Enter the email of your BexSign account and we will email you a link to reset it.</p>
        </div>

        {sentMessage ? (
          <div className="space-y-5">
            <div role="status" className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg flex items-start gap-2.5">
              <CheckCircle2 size={18} className="shrink-0 text-[#00a884]" />
              <div className="space-y-1.5 leading-relaxed">
                <p>{sentMessage}</p>
                <p className="font-normal text-emerald-700">Open the email and click "Reset password". Not there? Check your spam folder, or send the link again.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setSentMessage('')}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Send again
              </button>
              <Link
                to="/login"
                className="flex-1 text-center bg-[#E71414] hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-xs font-extrabold shadow-md transition"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
            {error && (
              <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-lg flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div>
              <label htmlFor="forgot-email" className="block text-slate-700 font-bold mb-1">Email address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="forgot-email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  className="w-full p-2.5 pl-9 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#00a884] text-slate-900"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={sending}
              className="w-full bg-[#E71414] hover:bg-red-700 text-white py-2.5 rounded-lg font-extrabold shadow-md transition disabled:opacity-50 text-xs"
            >
              {sending ? 'Sending link...' : 'Email me a reset link'}
            </button>
          </form>
        )}

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          <Link to="/login" className="inline-flex items-center gap-1 text-[#00a884] font-bold hover:underline">
            <ArrowLeft size={13} /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

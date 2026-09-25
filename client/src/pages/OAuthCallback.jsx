import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { API_BASE } from '../utils/api';

/** Google / Microsoft sign-in lands here with a short-lived ticket, which is swapped for the session. */
export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const ticket = searchParams.get('ticket');
    if (!ticket) {
      setError('The sign-in did not complete. Please try again.');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/oauth/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticket })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.token) throw new Error(data.error || 'The sign-in did not complete. Please try again.');
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/dashboard', { replace: true });
      } catch (err) {
        setError(err instanceof TypeError ? 'Could not reach the BexSign server. Please try again.' : err.message);
      }
    })();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 font-sans">
      <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200 text-slate-800 space-y-5 text-center">
        <div className="inline-block bg-[#00a884] text-white px-3 py-1 rounded-lg text-lg font-black tracking-wider">BEXSIGN</div>
        {error ? (
          <>
            <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-lg flex items-start gap-2 text-left">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
            <Link to="/login" className="block w-full bg-[#E71414] hover:bg-red-700 text-white py-2.5 rounded-lg font-extrabold shadow-md transition text-xs">
              Back to sign in
            </Link>
          </>
        ) : (
          <p className="text-xs font-semibold text-slate-500 flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin text-[#00a884]" /> Signing you in...
          </p>
        )}
      </div>
    </div>
  );
}

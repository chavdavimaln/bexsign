import React, { useEffect, useState } from 'react';
import { API_BASE } from '../../utils/api';

const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

const MicrosoftLogo = () => (
  <svg width="16" height="16" viewBox="0 0 23 23" aria-hidden="true">
    <path fill="#F35325" d="M1 1h10v10H1z" />
    <path fill="#81BC06" d="M12 1h10v10H12z" />
    <path fill="#05A6F0" d="M1 12h10v10H1z" />
    <path fill="#FFBA08" d="M12 12h10v10H12z" />
  </svg>
);

/** "Continue with Google / Microsoft": the server runs the OAuth flow and returns to /oauth/callback. */
export default function SocialAuthButtons({ mode = 'login', disabled = false, onBeforeStart }) {
  // A provider an administrator turned off in Settings > Integrations is hidden (both show if the check fails)
  const [hidden, setHidden] = useState({});
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/auth/oauth/providers`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.providers) setHidden(Object.fromEntries(Object.entries(data.providers).map(([k, v]) => [k, v.hidden === true])));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const start = (provider) => {
    if (onBeforeStart && onBeforeStart(provider) === false) return;
    window.location.href = `${API_BASE}/auth/oauth/${provider}?mode=${mode}`;
  };
  const btn = 'w-full flex items-center justify-center gap-2.5 py-2.5 px-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition disabled:opacity-50 disabled:cursor-not-allowed';
  const verb = mode === 'register' ? 'Sign up' : 'Sign in';

  const shown = ['google', 'microsoft'].filter((p) => !hidden[p]);
  if (shown.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
        <span className="h-px flex-1 bg-slate-200" />
        or
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <div className={`grid grid-cols-1 gap-2.5 ${shown.length > 1 ? 'sm:grid-cols-2' : ''}`}>
        {shown.includes('google') && (
          <button type="button" className={btn} disabled={disabled} onClick={() => start('google')}>
            <GoogleLogo /> {verb} with Google
          </button>
        )}
        {shown.includes('microsoft') && (
          <button type="button" className={btn} disabled={disabled} onClick={() => start('microsoft')}>
            <MicrosoftLogo /> {verb} with Microsoft
          </button>
        )}
      </div>
    </div>
  );
}

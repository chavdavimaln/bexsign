import React, { useState } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { API_BASE } from '../utils/api';
import PasswordInput from '../components/ui/PasswordInput';
import SocialAuthButtons from '../components/auth/SocialAuthButtons';

export default function Login() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const registeredEmail = location.state?.registeredEmail || '';
  const [email, setEmail] = useState(registeredEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(searchParams.get('oauth_error') || '');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Only the server decides who signs in: a failed sign-in never opens the app with another account
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.token && data.user) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/dashboard');
        return;
      }
      setError(data.error || 'Invalid email or password.');
    } catch (err) {
      setError('Could not reach the BexSign server. Check your connection and try again.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 font-sans">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-200 text-slate-800 space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-block bg-[#00a884] text-white px-3 py-1 rounded-lg text-lg font-black tracking-wider mb-2">
            BEXSIGN
          </div>
          <h2 className="text-2xl font-black text-slate-900">Sign in to your account</h2>
          <p className="text-xs text-slate-500">Access your Bexsign e-signature dashboard</p>
        </div>

        {registeredEmail && !error && (
          <div role="status" className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg text-center">
            Your account has been created. Sign in to continue.
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-lg text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs font-semibold">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Email ID / Username</label>
            <input 
              type="email" 
              required 
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#00a884] text-slate-900"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vimal@bexcodeservices.com"
            />
          </div>
          <div>
            <label className="block text-slate-700 font-bold mb-1">Password</label>
            <PasswordInput
              required
              autoComplete="current-password"
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#00a884] text-slate-900"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password123"
            />
          </div>
          <div className="flex items-center justify-between text-xs pt-1">
            <Link to="/forgot-password" className="text-[#00a884] hover:underline font-bold">Forgot password?</Link>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#E71414] hover:bg-red-700 text-white py-2.5 rounded-lg font-extrabold shadow-md transition disabled:opacity-50 text-xs"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <SocialAuthButtons mode="login" disabled={loading} />

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          Don't have an account? <Link to="/register" className="text-[#00a884] font-bold hover:underline">Register here</Link>
        </div>
      </div>
    </div>
  );
}

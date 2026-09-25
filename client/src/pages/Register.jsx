import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { API_BASE } from '../utils/api';
import PasswordInput from '../components/ui/PasswordInput';
import SocialAuthButtons from '../components/auth/SocialAuthButtons';

export default function Register() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState(searchParams.get('oauth_error') || '');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const termsError = 'Please accept the Terms of Service and Privacy Policy to continue.';

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('The password must be at least 6 characters long.');
      return;
    }
    if (!acceptedTerms) {
      setError(termsError);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, acceptedTerms }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        navigate('/login', { state: { registeredEmail: email.trim() } });
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Network connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-8 font-sans">
      <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200 text-slate-800 space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-block bg-[#00a884] text-white px-3 py-1 rounded-lg text-lg font-black tracking-wider mb-2">
            BEXSIGN
          </div>
          <h2 className="text-2xl font-black text-slate-900">Create your account</h2>
          <p className="text-xs text-slate-500">Start sending and signing documents in minutes</p>
        </div>

        {error && (
          <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-lg flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4 text-xs font-semibold">
          <div>
            <label htmlFor="register-email" className="block text-slate-700 font-bold mb-1">Email ID</label>
            <input
              id="register-email"
              type="email"
              required
              autoComplete="email"
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#00a884] text-slate-900"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label htmlFor="register-password" className="block text-slate-700 font-bold mb-1">Password</label>
            <PasswordInput
              id="register-password"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#00a884] text-slate-900"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="At least 6 characters"
            />
          </div>

          <label className="flex items-start gap-2 text-slate-600 font-medium cursor-pointer select-none leading-relaxed">
            <input
              type="checkbox"
              className="accent-[#00a884] h-3.5 w-3.5 mt-0.5 shrink-0"
              checked={acceptedTerms}
              onChange={(e) => { setAcceptedTerms(e.target.checked); setError(''); }}
            />
            <span>
              I agree to the BexSign <span className="font-bold text-slate-800">Terms of Service</span> and <span className="font-bold text-slate-800">Privacy Policy</span>.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#E71414] hover:bg-red-700 text-white py-2.5 rounded-lg font-extrabold shadow-md transition disabled:opacity-50 text-xs"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <SocialAuthButtons
          mode="register"
          disabled={loading}
          onBeforeStart={() => {
            if (acceptedTerms) return true;
            setError(termsError);
            return false;
          }}
        />

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          Already registered? <Link to="/login" className="text-[#00a884] font-bold hover:underline">Sign in here</Link>
        </div>
      </div>
    </div>
  );
}

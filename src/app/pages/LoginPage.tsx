import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ArcLogo } from '../components/ArcLogo';

export function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();

  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPwd,    setShowPwd]    = useState(false);
  const [remember,   setRemember]   = useState(false);
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    await new Promise(r => setTimeout(r, 600));

    const ok = login(email, password, remember);
    if (ok) {
      navigate('/', { replace: true });
    } else {
      setError('Invalid email or password. Please try again.');
      setLoading(false);
    }
  }

  function fillDemo() {
    setEmail('admin@arcai.com');
    setPassword('arcai2026');
    setError('');
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center px-4">

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">

        {/* Header band */}
        <div className="bg-[#163A5F] px-8 py-8 text-center">
          <div className="flex justify-center mb-4">
            <ArcLogo className="size-16" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Arc AI</h1>
          <p className="text-white/70 text-sm mt-1">Project Intelligence Platform</p>
        </div>

        {/* Form */}
        <div className="px-8 py-8">
          <h2 className="text-xl font-semibold text-[#163A5F] mb-1">Sign in</h2>
          <p className="text-sm text-gray-500 mb-6">Enter your credentials to access the platform</p>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-5">
              <AlertCircle className="size-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:border-[#0071E3] transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Password</label>
              </div>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-11 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:border-[#0071E3] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="size-4 accent-[#0071E3] rounded"
              />
              <span className="text-sm text-gray-600">Remember me</span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0071E3] hover:bg-[#0058B3] disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-6 border-t border-gray-100 pt-5">
            <p className="text-xs text-gray-400 text-center mb-3">Demo credentials</p>
            <button
              type="button"
              onClick={fillDemo}
              className="w-full flex items-center gap-3 bg-[#EBF5FF] hover:bg-blue-100 border border-[#D2D2D7] rounded-lg px-4 py-3 transition-colors"
            >
              <Sparkles className="size-4 text-[#0071E3] flex-shrink-0" />
              <div className="text-left">
                <p className="text-xs font-semibold text-[#163A5F]">admin@arcai.com</p>
                <p className="text-xs text-gray-400">Password: arcai2026 — click to fill</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-6">© 2026 Galactic Overlords. All rights reserved.</p>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { ArrowLeft, ChevronDown, Eye, EyeOff, Lock } from 'lucide-react';
import { useSite } from '../context/SiteContext';
import { getContrastTextColor } from '../utils/crypto';

export const AdminLoginPage: React.FC = () => {
  const { config, isAuthenticated, isDefaultAuth, login, navigate } = useSite();
  const [userId, setUserId] = useState('');
  const [passwd, setPasswd] = useState('');
  const [showPasswd, setShowPasswd] = useState(false);
  const [showStarterHint, setShowStarterHint] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const accent = config.theme.accentColor || '#1DB954';
  const accentText = getContrastTextColor(accent);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await login(userId, passwd);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error || 'Authentication failed.');
      return;
    }
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#F4F4F5] flex flex-col justify-between p-6">
      <div className="max-w-[1200px] w-full mx-auto">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-xs sm:text-sm text-zinc-400 hover:text-white transition-colors py-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {config.brand.domainName}</span>
        </button>
      </div>

      <div className="w-full max-w-md mx-auto my-auto py-12">
        <div className="rounded-2xl border border-zinc-800 bg-[#111113] p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl border border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-200">
              <Lock className="w-4 h-4" />
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-white">
              Admin Sign In
            </h1>
            <p className="text-sm text-zinc-400">
              Manage playlists, tracklists, buttons, and page customization for{' '}
              <span className="text-zinc-200">{config.brand.domainName}</span>.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="admin-userid" className="block text-xs font-medium text-zinc-300">
                User ID
              </label>
              <input
                id="admin-userid"
                type="text"
                autoComplete="username"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter user ID"
                className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="admin-passwd" className="block text-xs font-medium text-zinc-300">
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-passwd"
                  type={showPasswd ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={passwd}
                  onChange={(e) => setPasswd(e.target.value)}
                  placeholder="Enter password"
                  className="w-full h-11 pl-3.5 pr-11 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswd((prev) => !prev)}
                  aria-label={showPasswd ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  {showPasswd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3 rounded-lg border border-rose-500/40 bg-rose-950/30 text-xs text-rose-200"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{ backgroundColor: accent, color: accentText }}
              className="w-full h-11 rounded-lg text-sm font-semibold transition-opacity hover:opacity-95 disabled:opacity-60 cursor-pointer"
            >
              {submitting ? 'Signing In...' : 'Sign In to Studio'}
            </button>
          </form>

          {isDefaultAuth && (
            <div className="pt-2 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => setShowStarterHint((prev) => !prev)}
                className="w-full flex items-center justify-between text-xs text-zinc-400 hover:text-zinc-200 py-1 cursor-pointer"
              >
                <span>First-time setup credentials</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    showStarterHint ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {showStarterHint && (
                <div className="mt-2 p-3 rounded-lg bg-[#0A0A0D] border border-zinc-800 text-xs text-zinc-300 space-y-1.5">
                  <p>
                    User ID: <code className="font-mono-tabular text-white">admin</code>
                  </p>
                  <p>
                    Password: <code className="font-mono-tabular text-white">spotify123</code>
                  </p>
                  <p className="text-zinc-500">
                    Update these immediately inside the Theme & Auth tab after signing in.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-[1200px] w-full mx-auto text-center text-xs text-zinc-600">
        {config.brand.domainName}
      </div>
    </div>
  );
};

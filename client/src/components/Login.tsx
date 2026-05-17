import React, { useState } from 'react';

interface LoginProps {
  onLogin: (token: string) => void;
  onSwitchToSignup: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onSwitchToSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5002/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      onLogin(data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-[#121212] border border-slate-200 dark:border-zinc-800/80 rounded-xl p-8 shadow-xl transition-colors">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-zinc-100">Welcome Back</h2>
          <p className="text-slate-500 dark:text-zinc-400 mt-2 text-sm">Sign in to access your learning roadmaps</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-slate-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-md bg-slate-50 dark:bg-[#0a0a0a] border border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-indigo-500 dark:focus:border-zinc-500 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-zinc-500 transition-all"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-slate-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-md bg-slate-50 dark:bg-[#0a0a0a] border border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-indigo-500 dark:focus:border-zinc-500 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-zinc-500 transition-all"
              placeholder="••••••••"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-4 bg-indigo-600 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-indigo-500 dark:hover:bg-zinc-200 font-bold rounded-md transition-colors disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-slate-500 dark:text-zinc-500 text-sm">
          Don't have an account?{' '}
          <button onClick={onSwitchToSignup} className="text-indigo-600 dark:text-zinc-300 hover:text-indigo-500 dark:hover:text-white font-medium hover:underline">
            Sign up here
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;

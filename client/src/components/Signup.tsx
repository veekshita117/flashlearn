import React, { useState } from 'react';

interface SignupProps {
  onLogin: (token: string) => void;
  onSwitchToLogin: () => void;
}

const Signup: React.FC<SignupProps> = ({ onLogin, onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !username || !password || !confirmPassword) {
      setError('Please fill out all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5002/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
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
          <h2 className="text-3xl font-bold text-slate-900 dark:text-zinc-100">Create Account</h2>
          <p className="text-slate-500 dark:text-zinc-400 mt-2 text-sm">Join the AI Micro-Learning Platform</p>
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
            <label className="block text-slate-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.trim().toLowerCase())}
              className="w-full px-4 py-2.5 rounded-md bg-slate-50 dark:bg-[#0a0a0a] border border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-indigo-500 dark:focus:border-zinc-500 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-zinc-500 transition-all"
              placeholder="coollearner123"
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
          <div>
            <label className="block text-slate-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-md bg-slate-50 dark:bg-[#0a0a0a] border border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-indigo-500 dark:focus:border-zinc-500 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-zinc-500 transition-all"
              placeholder="••••••••"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-4 bg-indigo-600 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-indigo-500 dark:hover:bg-zinc-200 font-bold rounded-md transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center text-slate-500 dark:text-zinc-500 text-sm">
          Already have an account?{' '}
          <button onClick={onSwitchToLogin} className="text-indigo-600 dark:text-zinc-300 hover:text-indigo-500 dark:hover:text-white font-medium hover:underline">
            Sign in here
          </button>
        </div>
      </div>
    </div>
  );
};

export default Signup;

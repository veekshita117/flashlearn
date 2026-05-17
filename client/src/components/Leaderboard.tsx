import React, { useState, useEffect } from 'react';

interface LeaderboardProps {
  token: string | null;
  currentUsername?: string;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ token, currentUsername }) => {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaders = async () => {
      if (!token) return;
      try {
        const res = await fetch('http://localhost:5002/api/leaderboard', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setLeaders(data);
        }
      } catch (e) {
        console.error("Failed to fetch leaderboard", e);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaders();
  }, [token]);

  if (loading) {
    return <div className="text-center text-sm text-slate-500 dark:text-zinc-500 py-4">Loading Global Ranks...</div>;
  }

  return (
    <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-md shadow-slate-200/50 dark:shadow-zinc-900/50 transition-colors mt-8">
      <div className="bg-slate-50/50 dark:bg-zinc-900/30 p-5 border-b border-slate-100 dark:border-zinc-800/80 flex justify-between items-center">
        <h2 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-zinc-200 flex items-center gap-2">
          <span className="text-slate-400 dark:text-zinc-500">🏆</span> Global Leaderboard
        </h2>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Top 10 Learners</span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 dark:text-zinc-400 uppercase bg-slate-50 dark:bg-zinc-900/20 border-b border-slate-200 dark:border-zinc-800/80">
            <tr>
              <th className="px-6 py-3">Rank</th>
              <th className="px-6 py-3">User</th>
              <th className="px-6 py-3 text-right">Total XP</th>
              <th className="px-6 py-3 text-right">Streak</th>
              <th className="px-6 py-3 text-right">Study Time</th>
            </tr>
          </thead>
          <tbody>
            {leaders.map((user, idx) => {
              const isActive = currentUsername && user.username === currentUsername;
              const displayLetter = user.username ? user.username.charAt(0).toUpperCase() : 'A';
              
              return (
              <tr 
                key={user._id} 
                className={`border-b border-slate-100 dark:border-zinc-800/50 even:bg-slate-50/30 dark:even:bg-zinc-900/10 hover:bg-slate-50 dark:hover:bg-zinc-900/30 transition-colors ${isActive ? 'border-l-4 border-l-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10' : 'border-l-4 border-l-transparent'}`}
              >
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-zinc-100">
                  {idx === 0 ? '🥇 1st' : idx === 1 ? '🥈 2nd' : idx === 2 ? '🥉 3rd' : `#${idx + 1}`}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-zinc-400 shadow-sm">
                      {displayLetter}
                    </div>
                    <span className="text-slate-600 dark:text-zinc-300 font-medium">
                      {user.username ? `@${user.username}` : 'Anonymous Learner'}
                      {isActive && <span className="ml-2 text-[10px] text-indigo-500 font-bold tracking-widest uppercase">(You)</span>}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right font-semibold text-slate-800 dark:text-zinc-200">
                  {user.xp} <span className="text-slate-400 font-normal text-xs ml-1">XP</span>
                </td>
                <td className="px-6 py-4 text-right text-slate-600 dark:text-zinc-300">
                  {user.streakCount} 🔥
                </td>
                <td className="px-6 py-4 text-right text-slate-500 dark:text-zinc-500">
                  {Math.floor(user.totalStudyMinutes / 60)}h {user.totalStudyMinutes % 60}m
                </td>
              </tr>
            )})}
            {leaders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-zinc-500">
                  No active users yet. Start learning to claim 1st place!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Leaderboard;

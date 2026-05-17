import React, { useEffect, useState } from 'react';

interface AnalyticsData {
  streakCount: number;
  milestonesCompleted: number;
  totalQuizzesTaken: number;
  averageQuizScore: number;
}

interface AnalyticsProps {
  token: string;
}

const Analytics: React.FC<AnalyticsProps> = ({ token }) => {
  const [stats, setStats] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('http://localhost:5002/api/user/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  if (loading || !stats) {
    return (
      <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-zinc-800/80 rounded-2xl p-6 shadow-md shadow-slate-200/50 dark:shadow-zinc-900/50 mb-8 animate-pulse">
        <div className="h-6 w-48 bg-slate-200 dark:bg-zinc-800 rounded mb-4"></div>
        <div className="flex gap-4">
          <div className="h-24 flex-1 bg-slate-200 dark:bg-zinc-800 rounded"></div>
          <div className="h-24 flex-1 bg-slate-200 dark:bg-zinc-800 rounded"></div>
          <div className="h-24 flex-1 bg-slate-200 dark:bg-zinc-800 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-zinc-800/80 rounded-2xl p-8 shadow-md shadow-slate-200/50 dark:shadow-zinc-900/50 text-left transition-colors">
      <h2 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-zinc-200 mb-8 flex items-center gap-2">
        <span className="text-slate-400 dark:text-zinc-500">📊</span> Dashboard Analytics
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-50/50 dark:bg-zinc-900/30 border border-slate-100 dark:border-zinc-800/80 p-6 rounded-xl text-center transition-colors">
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-zinc-500 mb-3">Current Streak</div>
          <div className="text-3xl font-light text-slate-800 dark:text-zinc-200 flex items-baseline justify-center gap-2">
            <span className="text-xl">🔥</span> {stats.streakCount} <span className="text-sm font-medium text-slate-400 dark:text-zinc-500">Days</span>
          </div>
        </div>
        
        <div className="bg-slate-50/50 dark:bg-zinc-900/30 border border-slate-100 dark:border-zinc-800/80 p-6 rounded-xl text-center transition-colors">
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-zinc-500 mb-3">Milestones Completed</div>
          <div className="text-3xl font-light text-slate-800 dark:text-zinc-200 flex items-center justify-center gap-2">
            <span className="text-xl">✅</span> {stats.milestonesCompleted}
          </div>
        </div>

        <div className="bg-slate-50/50 dark:bg-zinc-900/30 border border-slate-100 dark:border-zinc-800/80 p-6 rounded-xl text-center transition-colors">
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-zinc-500 mb-3">Quiz Average</div>
          <div className="text-3xl font-light text-slate-800 dark:text-zinc-200 flex items-baseline justify-center gap-2">
            <span className="text-xl">🎯</span> {stats.totalQuizzesTaken > 0 ? stats.averageQuizScore : '-'} <span className="text-sm font-medium text-slate-400 dark:text-zinc-500">/ 10</span>
          </div>
          <div className="text-xs text-slate-400 dark:text-zinc-600 mt-2">Based on {stats.totalQuizzesTaken} quizzes</div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;

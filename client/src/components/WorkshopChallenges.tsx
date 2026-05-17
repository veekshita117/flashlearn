import React, { useState, useEffect } from 'react';

interface Challenge {
  title: string;
  repoUrl: string;
  taskDefinition: string;
  difficulty: string;
}

interface WorkshopChallengesProps {
  token: string | null;
  topic: string;
  onClose: () => void;
}

const WorkshopChallenges: React.FC<WorkshopChallengesProps> = ({ token, topic, onClose }) => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChallenges = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:5002/api/challenges/generate?topic=${encodeURIComponent(topic)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setChallenges(data.challenges || []);
        } else {
          throw new Error(data.error || 'Failed to fetch challenges');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchChallenges();
  }, [token, topic]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden font-mono flex flex-col">
        
        {/* Terminal Header */}
        <div className="flex justify-between items-center px-4 py-3 bg-[#1e293b] border-b border-slate-700">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <div className="text-slate-400 text-xs font-semibold tracking-widest">WORKSHOP_CHALLENGES.EXE</div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
        </div>

        {/* Terminal Body */}
        <div className="p-6 overflow-y-auto max-h-[70vh] text-slate-300 text-sm flex-1">
          <div className="mb-6">
            <p className="text-green-400 font-bold mb-1">&gt; Initiating Open Source Scanner...</p>
            <p className="text-slate-400">&gt; Target Keyword: "{topic}"</p>
            <p className="text-slate-400">&gt; Filter: "good first issue"</p>
          </div>

          {loading && (
            <div className="animate-pulse text-yellow-400">
              &gt; Scraping GitHub issues and consulting AI for task simplification... please wait...
              <span className="inline-block ml-2 w-2 h-4 bg-yellow-400 animate-ping"></span>
            </div>
          )}

          {error && !loading && (
            <div className="text-red-400 font-bold border-l-2 border-red-500 pl-4 py-2 mt-4 bg-red-900/20">
              [ERROR]: {error}
            </div>
          )}

          {!loading && !error && challenges.length === 0 && (
            <div className="text-slate-400">
              &gt; Scan complete. 0 issues found for topic: "{topic}".
            </div>
          )}

          {!loading && challenges.map((challenge, idx) => (
            <div key={idx} className="mb-8 border border-slate-700 rounded p-4 bg-[#1e293b]/50 shadow-inner">
              <h3 className="text-lg font-bold text-white mb-2 pb-2 border-b border-slate-700 flex justify-between items-start">
                <span className="text-green-400">[{idx + 1}] {challenge.title}</span>
                <span className={`text-xs px-2 py-1 rounded-sm uppercase tracking-wider ${challenge.difficulty.toLowerCase().includes('beginner') ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
                  {challenge.difficulty}
                </span>
              </h3>
              
              <div className="mt-4 mb-4 text-slate-300 leading-relaxed">
                <span className="text-indigo-400 font-bold uppercase text-xs mr-2">Task:</span>
                {challenge.taskDefinition}
              </div>
              
              <div className="mt-2 pt-3 border-t border-slate-700/50">
                <a 
                  href={challenge.repoUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded transition-colors text-xs font-semibold"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  View on GitHub
                </a>
              </div>
            </div>
          ))}

          {!loading && (
            <div className="mt-8 text-slate-500 flex items-center gap-2">
              <span className="w-2 h-4 bg-slate-500 animate-pulse inline-block"></span>
              Awaiting further instructions...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkshopChallenges;

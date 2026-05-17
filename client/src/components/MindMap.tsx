import React, { useState, useEffect } from 'react';

interface MindMapNode {
  name: string;
  children?: MindMapNode[];
}

interface MindMapProps {
  token: string | null;
  topic: string;
  context: string;
  onClose: () => void;
}

const TreeNode: React.FC<{ node: MindMapNode; level?: number }> = ({ node, level = 0 }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 py-2">
        {hasChildren ? (
          <button 
            onClick={() => setExpanded(!expanded)}
            className="w-5 h-5 flex items-center justify-center rounded bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 text-xs hover:bg-slate-300 dark:hover:bg-zinc-700 transition-colors"
          >
            {expanded ? '−' : '+'}
          </button>
        ) : (
          <span className="w-5 h-5 inline-block" />
        )}
        <div className={`px-4 py-2 rounded-lg border ${level === 0 ? 'bg-indigo-600 text-white border-indigo-700 shadow-md font-bold text-lg' : level === 1 ? 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 font-semibold shadow-sm' : 'bg-white text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 shadow-sm text-sm'}`}>
          {node.name}
        </div>
      </div>
      
      {hasChildren && expanded && (
        <div className="ml-6 pl-4 border-l-2 border-slate-200 dark:border-zinc-700 flex flex-col gap-1 mt-1 mb-2">
          {node.children!.map((child, idx) => (
            <div key={idx} className="relative">
              <div className="absolute w-4 h-0.5 bg-slate-200 dark:bg-zinc-700 top-5 -left-4" />
              <TreeNode node={child} level={level + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MindMap: React.FC<MindMapProps> = ({ token, topic, context, onClose }) => {
  const [data, setData] = useState<MindMapNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMindMap = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const res = await fetch('http://localhost:5002/api/generate-mindmap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ topic, context })
        });
        
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || 'Failed to generate mind map');
        
        setData(resData.mindmap);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMindMap();
  }, [token, topic, context]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
        
        <div className="flex justify-between items-center p-5 bg-white dark:bg-[#1e1e1e] border-b border-slate-200 dark:border-zinc-800 shadow-sm z-10">
          <div>
            <h2 className="font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2 text-lg">
              <span>🧠</span> AI Mind Map
            </h2>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Hierarchical breakdown of: {topic}</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-500 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto p-8 relative">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-500 rounded-full animate-spin"></div>
              <p className="mt-4 text-slate-500 dark:text-zinc-400 font-medium animate-pulse">Structuring knowledge tree...</p>
            </div>
          )}
          
          {error && !loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg text-center max-w-md">
                <p className="font-bold mb-2">Failed to build Mind Map</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {data && !loading && (
            <div className="min-w-max pb-16">
              <TreeNode node={data} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MindMap;

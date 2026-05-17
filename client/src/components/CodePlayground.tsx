import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';

interface CodePlaygroundProps {
  topic: string;
  onClose: () => void;
}

const CodePlayground: React.FC<CodePlaygroundProps> = ({ topic, onClose }) => {
  const defaultCode = `// 💻 Interactive Sandbox: ${topic}\n// Start writing your code below:\n\nfunction main() {\n  console.log("Hello from ${topic}!");\n}\n\nmain();`;
  
  const [code, setCode] = useState(() => {
    const saved = localStorage.getItem(`sandbox_${topic}`);
    return saved !== null ? saved : defaultCode;
  });
  const [output, setOutput] = useState('');

  useEffect(() => {
    localStorage.setItem(`sandbox_${topic}`, code);
  }, [code, topic]);

  const runCode = () => {
    try {
      // Very basic evaluation for simple JS execution in the browser
      // Note: This is for demonstration purposes. In production, consider a secure sandbox like WebContainers.
      const logBackup = console.log;
      let consoleOutput = '';
      console.log = (...args) => {
        consoleOutput += args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ') + '\\n';
      };
      
      // Execute the code
      // eslint-disable-next-line no-eval
      eval(code);
      
      console.log = logBackup;
      setOutput(consoleOutput || 'Code executed successfully with no output.');
    } catch (e: any) {
      setOutput(`Error: ${e.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
        
        <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-[#121212] border-b border-slate-200 dark:border-zinc-800">
          <h2 className="font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
            <span>💻</span> Code Sandbox: <span className="text-indigo-600 dark:text-indigo-400 font-medium">{topic}</span>
          </h2>
          <div className="flex items-center gap-3">
            <button 
              onClick={runCode}
              className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-md text-sm font-bold tracking-wide transition-colors flex items-center gap-1"
            >
              ▶ Run Code
            </button>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
          {/* Editor Side */}
          <div className="w-full md:w-2/3 h-1/2 md:h-full border-b md:border-b-0 md:border-r border-slate-200 dark:border-zinc-800">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: 'Consolas, monospace',
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                padding: { top: 16 }
              }}
            />
          </div>
          
          {/* Output Terminal Side */}
          <div className="w-full md:w-1/3 h-1/2 md:h-full bg-[#0d0d0d] p-4 font-mono text-sm overflow-y-auto">
            <div className="text-slate-500 uppercase tracking-widest text-xs font-bold mb-3">Terminal Output</div>
            <pre className="text-green-400 whitespace-pre-wrap break-words">{output}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodePlayground;

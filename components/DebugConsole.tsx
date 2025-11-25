import React, { useEffect, useRef, useState } from 'react';
import { Terminal, X, Minimize2, Maximize2, Trash2 } from 'lucide-react';

interface DebugConsoleProps {
  logs: string[];
  onClear: () => void;
}

export const DebugConsole: React.FC<DebugConsoleProps> = ({ logs, onClear }) => {
  const [isOpen, setIsOpen] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-[100] bg-slate-900 border border-amber-500/50 text-amber-500 p-2 rounded shadow-lg hover:bg-slate-800 transition-colors"
        title="Open Debug Console"
      >
        <Terminal size={20} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-96 h-64 bg-slate-950/95 border border-slate-700 rounded-lg shadow-2xl flex flex-col font-mono text-xs backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 rounded-t-lg cursor-move">
        <div className="flex items-center gap-2 text-slate-400">
          <Terminal size={14} />
          <span className="font-bold">System Log</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onClear} className="text-slate-500 hover:text-rose-400" title="Clear Logs">
            <Trash2 size={14} />
          </button>
          <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-slate-300" title="Minimize">
            <Minimize2 size={14} />
          </button>
        </div>
      </div>

      {/* Logs Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {logs.length === 0 && (
          <div className="text-slate-600 italic text-center mt-10">-- No active logs --</div>
        )}
        {logs.map((log, i) => (
          <div key={i} className="break-words leading-tight border-b border-slate-800/50 pb-0.5 mb-0.5 last:border-0">
            <span className="text-slate-600 mr-2">[{log.split(']')[0].replace('[', '')}]</span>
            <span className={log.includes('ERROR') ? 'text-rose-400' : log.includes('SUCCESS') ? 'text-emerald-400' : 'text-slate-300'}>
              {log.split(']')[1] || log}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};
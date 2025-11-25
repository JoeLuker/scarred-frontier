
import React from 'react';
import { PartySpeed } from '../types';
import { Gauge, Map as MapIcon, Loader2, MousePointerClick, Eye } from 'lucide-react';

interface ControlPanelProps {
  partySpeed: PartySpeed;
  setPartySpeed: (speed: PartySpeed) => void;
  onAddCluster: () => void;
  onRevealAll: () => void;
  isGenerating: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
  partySpeed, 
  setPartySpeed, 
  onRevealAll,
  isGenerating,
}) => {
  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-amber-500 mb-2 flex items-center gap-2">
          <Gauge size={20} />
          Party Stats
        </h3>
        <div className="flex flex-col gap-2">
            <label className="text-sm text-slate-400">Base Movement Speed</label>
            <div className="flex gap-2">
                {[15, 20, 30, 40, 50].map((speed) => (
                    <button
                        key={speed}
                        onClick={() => setPartySpeed(speed as PartySpeed)}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            partySpeed === speed 
                            ? 'bg-amber-600 text-white' 
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                    >
                        {speed}'
                    </button>
                ))}
            </div>
        </div>
      </div>

      <div className="border-t border-slate-700 pt-4">
        <h3 className="text-lg font-semibold text-purple-400 mb-2 flex items-center gap-2">
          <MapIcon size={20} />
          World Generation
        </h3>
        <div className="bg-purple-950/30 border border-purple-900/50 rounded-lg p-4 flex items-start gap-3">
            <MousePointerClick className="shrink-0 text-purple-400 mt-1" size={20} />
            <div className="space-y-2">
                <p className="text-sm text-slate-300 font-medium">Interactive Exploration</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                    The world grid is already mapped out. Zoom out to see Unexplored Sectors. 
                </p>
                <p className="text-xs text-purple-300">
                    Click on any large <span className="font-bold">Unexplored Sector</span> hex to generate its terrain.
                </p>
            </div>
        </div>
        
        <button 
            onClick={onRevealAll}
            disabled={isGenerating}
            className="w-full mt-4 bg-amber-900/30 hover:bg-amber-900/50 border border-amber-700/50 text-amber-200 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isGenerating ? <Loader2 className="animate-spin" size={14} /> : <Eye size={14} />}
            {isGenerating ? 'Generating Terrain...' : 'Reveal Entire Map'}
        </button>
      </div>
    </div>
  );
};

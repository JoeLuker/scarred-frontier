
import React from 'react';
import { HexData, TerrainType, ElementalOverlay } from '../types';
import { TERRAIN_PATHS, OVERLAY_COLORS } from '../constants';
import { generateEncounter } from '../services/geminiService';
import { MapPin, Clock, Calendar, Sword, RefreshCcw, AlertTriangle, Droplets, Flame, Snowflake, Skull, Leaf, Zap, Wand2 } from 'lucide-react';

interface CurrentHexProps {
  hex: HexData | null;
  onApplyOverlay: (hex: HexData, type: ElementalOverlay | null) => void;
}

export const CurrentHex: React.FC<CurrentHexProps> = ({ hex, onApplyOverlay }) => {
  const [encounterText, setEncounterText] = React.useState<string | null>(null);
  const [loadingEncounter, setLoadingEncounter] = React.useState(false);
  const [showOverlayMenu, setShowOverlayMenu] = React.useState(false);

  React.useEffect(() => {
    setEncounterText(null);
    setShowOverlayMenu(false);
  }, [hex]);

  const handleRollEncounter = async () => {
    if (!hex || hex.terrain === TerrainType.EMPTY) return;
    setLoadingEncounter(true);
    const text = await generateEncounter(hex.terrain, 5);
    setEncounterText(text);
    setLoadingEncounter(false);
  };

  if (!hex) {
    return (
      <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 text-center h-full flex flex-col justify-center items-center text-slate-500">
        <MapPin className="w-16 h-16 mb-4 opacity-20" />
        <p>Select a hex or explore new territory to view details.</p>
      </div>
    );
  }

  const iconPath = hex.icon || TERRAIN_PATHS[hex.terrain];

  if (hex.terrain === TerrainType.EMPTY) {
      return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg flex flex-col h-full">
             <div className="p-8 flex flex-col items-center justify-center h-full text-center space-y-4">
                 <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center border-2 border-slate-700 border-dashed text-slate-600">
                    <AlertTriangle size={32} />
                 </div>
                 <div>
                     <h2 className="text-xl font-bold text-slate-300">Unexplored Sector</h2>
                     <p className="text-slate-500 text-sm mt-2 max-w-[200px] mx-auto">
                        This region has not been generated yet. Click it on the map to scout the terrain.
                     </p>
                 </div>
             </div>
        </div>
      )
  }

  // Get primary overlay color for header if any exists, otherwise undefined
  const primaryEffect = hex.effects?.[0];
  const headerOverlayColor = primaryEffect ? OVERLAY_COLORS[primaryEffect.type] : undefined;

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg flex flex-col h-full">
      <div className="bg-slate-900 p-4 border-b border-slate-700 flex justify-between items-center">
        <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center text-slate-200 relative overflow-hidden">
                 {headerOverlayColor && (
                    <div 
                        className="absolute inset-0 opacity-30" 
                        style={{ backgroundColor: headerOverlayColor }}
                    />
                 )}
                 <svg viewBox="0 0 24 24" className="w-8 h-8 stroke-current fill-none stroke-2 relative z-10">
                    <path d={iconPath} />
                 </svg>
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-100">{hex.terrain}</h2>
                <p className="text-sm text-slate-400">{hex.element} Variation</p>
            </div>
        </div>
        <div className="text-right">
            <div className="text-xs text-slate-500">Coordinates</div>
            <div className="font-mono text-amber-500">q:{hex.coordinates.x}, r:{hex.coordinates.y}</div>
        </div>
      </div>

      <div className="p-6 space-y-6 overflow-y-auto flex-1">
        
        {/* Description Area */}
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50 italic text-slate-300 relative">
            "{hex.description || "No description available."}"
            
            {/* Display list of active effects */}
            {hex.effects && hex.effects.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800 flex flex-col gap-1">
                    {hex.effects.map((effect, idx) => (
                        <div key={idx} className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: OVERLAY_COLORS[effect.type] }}>
                            <Wand2 size={12} />
                            {effect.type} Influence ({Math.round(effect.strength * 100)}%)
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-700/30 p-3 rounded border border-slate-700">
                <div className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Clock size={12} /> Travel Time
                </div>
                <div className="text-2xl font-bold text-blue-400">{hex.travelTimeHours} <span className="text-sm font-normal text-slate-500">hours</span></div>
            </div>
            <div className="bg-slate-700/30 p-3 rounded border border-slate-700">
                <div className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Calendar size={12} /> Exploration
                </div>
                <div className="text-2xl font-bold text-emerald-400">{hex.explorationTimeDays} <span className="text-sm font-normal text-slate-500">days</span></div>
            </div>
        </div>

        {/* Actions: Encounter & Overlay */}
        <div className="border-t border-slate-700 pt-4 space-y-4">
             
             {/* Encounter */}
             <div>
                 <h3 className="font-semibold text-rose-400 mb-2 flex items-center gap-2">
                    <Sword size={16} /> Random Encounter
                 </h3>
                 
                 {!encounterText ? (
                     <button 
                        onClick={handleRollEncounter}
                        disabled={loadingEncounter}
                        className="text-sm bg-rose-900/30 hover:bg-rose-900/50 text-rose-300 px-4 py-2 rounded border border-rose-900 transition-colors w-full text-left flex justify-between items-center"
                     >
                        <span>Roll for danger (Gemini AI)</span>
                        {loadingEncounter && <span className="animate-pulse">...</span>}
                     </button>
                 ) : (
                     <div className="bg-rose-950/30 border border-rose-900/50 p-3 rounded text-sm text-rose-200 animate-in fade-in">
                        {encounterText}
                        <button onClick={() => setEncounterText(null)} className="mt-2 text-xs text-rose-500 hover:text-rose-400 underline flex items-center gap-1">
                          <RefreshCcw size={12} /> Clear
                        </button>
                     </div>
                 )}
             </div>

             {/* Elemental Overlay */}
             <div>
                <h3 className="font-semibold text-purple-400 mb-2 flex items-center gap-2 justify-between">
                    <span className="flex items-center gap-2"><Droplets size={16} /> Biome Influence</span>
                    <button 
                        onClick={() => setShowOverlayMenu(!showOverlayMenu)}
                        className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-300"
                    >
                        {showOverlayMenu ? 'Cancel' : 'Modify'}
                    </button>
                </h3>
                
                {showOverlayMenu && (
                    <div className="grid grid-cols-3 gap-2 bg-slate-900 p-2 rounded border border-slate-800 animate-in slide-in-from-top-2">
                        <button onClick={() => onApplyOverlay(hex, 'Infernal')} className="p-2 rounded bg-red-900/30 hover:bg-red-900/50 border border-red-900 flex flex-col items-center gap-1 text-red-400 text-[10px] uppercase font-bold">
                            <Flame size={16} /> Infernal
                        </button>
                        <button onClick={() => onApplyOverlay(hex, 'Frozen')} className="p-2 rounded bg-sky-900/30 hover:bg-sky-900/50 border border-sky-900 flex flex-col items-center gap-1 text-sky-400 text-[10px] uppercase font-bold">
                            <Snowflake size={16} /> Frozen
                        </button>
                        <button onClick={() => onApplyOverlay(hex, 'Necrotic')} className="p-2 rounded bg-purple-900/30 hover:bg-purple-900/50 border border-purple-900 flex flex-col items-center gap-1 text-purple-400 text-[10px] uppercase font-bold">
                            <Skull size={16} /> Necrotic
                        </button>
                        <button onClick={() => onApplyOverlay(hex, 'Verdant')} className="p-2 rounded bg-green-900/30 hover:bg-green-900/50 border border-green-900 flex flex-col items-center gap-1 text-green-400 text-[10px] uppercase font-bold">
                            <Leaf size={16} /> Verdant
                        </button>
                        <button onClick={() => onApplyOverlay(hex, 'Storm')} className="p-2 rounded bg-yellow-900/30 hover:bg-yellow-900/50 border border-yellow-900 flex flex-col items-center gap-1 text-yellow-400 text-[10px] uppercase font-bold">
                            <Zap size={16} /> Storm
                        </button>
                        <button onClick={() => onApplyOverlay(hex, 'Arcane')} className="p-2 rounded bg-pink-900/30 hover:bg-pink-900/50 border border-pink-900 flex flex-col items-center gap-1 text-pink-400 text-[10px] uppercase font-bold">
                            <Wand2 size={16} /> Arcane
                        </button>
                         <button onClick={() => onApplyOverlay(hex, null)} className="col-span-3 p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] uppercase font-bold mt-1">
                            Clear Influence (Unmodify)
                        </button>
                    </div>
                )}
             </div>

        </div>
      </div>
    </div>
  );
};

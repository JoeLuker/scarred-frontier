
import React, { useState, useCallback, useEffect } from 'react';
import { HexData, PartySpeed, ElementalOverlay } from './types';
import { getInitialMapData, revealSingleSector, revealEntireMap, applyElementalOverlay } from './services/mapData';
import { HexGrid } from './components/HexGrid';
import { ControlPanel } from './components/ControlPanel';
import { CurrentHex } from './components/CurrentHex';
import { StatsChart } from './components/StatsChart';
import { MapEditor } from './components/MapEditor';
import { ClusterManager } from './components/ClusterManager';
import { DebugConsole } from './components/DebugConsole';
import { Globe, Code, Map as MapIcon } from 'lucide-react';

const App: React.FC = () => {
  const [hexes, setHexes] = useState<HexData[]>([]);
  const [selectedHexId, setSelectedHexId] = useState<string | null>(null);
  const [partySpeed, setPartySpeed] = useState<PartySpeed>(30);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isClusterMgrOpen, setIsClusterMgrOpen] = useState(false);
  
  // Debugging System
  const [logs, setLogs] = useState<string[]>([]);
  const addLog = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    console.log(`[AppLog] ${msg}`); // Also log to browser console
    setLogs(prev => [...prev, `[${timestamp}] ${msg}`]);
  }, []);

  const selectedHex = hexes.find(h => h.id === selectedHexId) || null;
  
  useEffect(() => {
    const initialMap = getInitialMapData();
    setHexes(initialMap);
    addLog(`System Initialized. Loaded ${initialMap.length} hexes.`);
  }, [addLog]);

  // Handle standard selection OR generating a placeholder
  const handleHexClick = useCallback((hex: HexData) => {
    if (hex.isSectorPlaceholder) {
        setIsGenerating(true);
        addLog(`Generating sector at (${hex.coordinates.x}, ${hex.coordinates.y})...`);
        // Use timeout to allow UI to render the "Generating..." state
        setTimeout(() => {
            try {
                setHexes(prev => revealSingleSector(hex, prev));
                addLog(`Sector revealed successfully.`);
            } catch (e) {
                console.error("Sector generation failed:", e);
                addLog(`ERROR: Sector generation failed: ${e}`);
            } finally {
                setIsGenerating(false);
            }
        }, 50);
    } else {
        setSelectedHexId(hex.id);
        addLog(`Selected hex: ${hex.coordinates.x}, ${hex.coordinates.y}`);
    }
  }, [addLog]);

  const handleRevealAll = useCallback(() => {
    // Removed window.confirm to ensure immediate feedback and prevent blocking
    addLog("Button Clicked: Reveal Entire Map");
    setIsGenerating(true);
    
    // Wrap in timeout to allow the "Generating..." spinner to render first
    setTimeout(() => {
        try {
            addLog("Starting generation algorithm...");
            setHexes(prev => {
                const newMap = revealEntireMap(prev, addLog);
                addLog(`Generation complete. Map size: ${newMap.length} hexes.`);
                return newMap;
            });
        } catch (e) {
            console.error("Map generation error:", e);
            addLog(`CRITICAL ERROR: ${e}`);
        } finally {
            setIsGenerating(false);
        }
    }, 100);
  }, [addLog]);

  const handleAddCluster = useCallback(() => {
     // Deprecated button action, but kept for ClusterManager compatibility
  }, []);

  const handleRemoveCluster = useCallback((groupId: string) => {
      setHexes(prev => {
          const next = prev.filter(h => h.groupId !== groupId);
          if (selectedHexId && !next.find(h => h.id === selectedHexId)) {
              setSelectedHexId(null);
          }
          addLog(`Removed cluster: ${groupId}. Remaining hexes: ${next.length}`);
          return next;
      });
  }, [selectedHexId, addLog]);

  const handleImportMap = useCallback((newHexes: HexData[]) => {
      setHexes(newHexes);
      if (selectedHexId && !newHexes.find(h => h.id === selectedHexId)) {
          setSelectedHexId(null);
      }
      addLog(`Map imported with ${newHexes.length} hexes.`);
  }, [selectedHexId, addLog]);

  const handleApplyOverlay = useCallback((targetHex: HexData, type: ElementalOverlay | null) => {
      if (!targetHex.groupId) {
          addLog("Cannot apply overlay: Hex has no GroupID.");
          return;
      }
      if (type) {
          addLog(`Applying ${type} overlay to sector ${targetHex.groupId} and neighbors...`);
      } else {
          addLog(`Clearing overlay from sector ${targetHex.groupId} and neighbors...`);
      }
      setHexes(prev => applyElementalOverlay(targetHex, type, prev));
  }, [addLog]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-amber-500 selection:text-black">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-20 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center font-bold text-slate-900">
              <MapIcon size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">
              Scarred Frontier <span className="text-amber-500">Campaign Helper</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
                onClick={() => setIsClusterMgrOpen(true)}
                className="text-xs font-bold bg-purple-900/30 hover:bg-purple-900/50 border border-purple-700/50 text-purple-300 px-3 py-1.5 rounded transition-colors flex items-center gap-2"
            >
                <Globe size={14} />
                World Gen
            </button>
            <button 
                onClick={() => setIsEditorOpen(true)}
                className="text-xs font-mono bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded text-slate-300 transition-colors flex items-center gap-2"
            >
                <Code size={14} />
                JSON
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Controls & Charts (3 cols) */}
        <div className="lg:col-span-3 space-y-6 flex flex-col">
          <ControlPanel 
            partySpeed={partySpeed}
            setPartySpeed={setPartySpeed}
            onAddCluster={handleAddCluster}
            onRevealAll={handleRevealAll}
            isGenerating={isGenerating}
          />
          
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg flex-1 min-h-[300px]">
             <StatsChart hexes={hexes} />
          </div>
        </div>

        {/* Center Column: Map (6 cols) */}
        <div className="lg:col-span-6 min-h-[400px] lg:min-h-[600px]">
          <HexGrid hexes={hexes} onHexClick={handleHexClick} />
        </div>

        {/* Right Column: Hex Details (3 cols) */}
        <div className="lg:col-span-3 h-[600px] lg:h-auto sticky top-24">
          <CurrentHex 
            hex={selectedHex} 
            onApplyOverlay={handleApplyOverlay}
          />
        </div>

      </main>

      <MapEditor 
        isOpen={isEditorOpen} 
        onClose={() => setIsEditorOpen(false)} 
        hexes={hexes}
        onImport={handleImportMap}
      />

      <ClusterManager
        isOpen={isClusterMgrOpen}
        onClose={() => setIsClusterMgrOpen(false)}
        hexes={hexes}
        onAddCluster={handleAddCluster}
        onRemoveCluster={handleRemoveCluster}
        isGenerating={isGenerating}
      />
      
      <DebugConsole logs={logs} onClear={() => setLogs([])} />
    </div>
  );
};

export default App;

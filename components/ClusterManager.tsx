import React, { useMemo } from 'react';
import { HexData } from '../types';
import { X, Globe, Trash2, Plus, Map as MapIcon } from 'lucide-react';

interface ClusterManagerProps {
  isOpen: boolean;
  onClose: () => void;
  hexes: HexData[];
  onAddCluster: () => void;
  onRemoveCluster: (groupId: string) => void;
  isGenerating: boolean;
}

interface ClusterSummary {
  name: string;
  count: number;
  id: string;
}

export const ClusterManager: React.FC<ClusterManagerProps> = ({ 
  isOpen, 
  onClose, 
  hexes, 
  onAddCluster, 
  onRemoveCluster,
  isGenerating 
}) => {
  
  const clusters = useMemo<ClusterSummary[]>(() => {
    const clustersMap = new Map<string, ClusterSummary>();
    hexes.forEach(h => {
      if (h.groupId) {
        let cluster = clustersMap.get(h.groupId);
        if (!cluster) {
          cluster = { name: h.notes || h.groupId, count: 0, id: h.groupId };
          clustersMap.set(h.groupId, cluster);
        }
        cluster.count++;
      }
    });
    return Array.from(clustersMap.values());
  }, [hexes]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8">
       <div className="bg-slate-900 w-full max-w-2xl border border-slate-700 rounded-xl flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
          
          <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/50">
             <div className="flex items-center gap-2">
                <Globe className="text-purple-500" size={24} />
                <div>
                  <h2 className="text-xl font-bold text-purple-500">World Generation</h2>
                  <p className="text-xs text-slate-400">Manage procedurally generated clusters.</p>
                </div>
             </div>
             <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                <X size={24} />
             </button>
          </div>

          <div className="p-4 bg-slate-950/50 flex items-center justify-between border-b border-slate-800">
              <div className="text-slate-300 text-sm flex items-center gap-2">
                  <MapIcon size={16} className="text-slate-500" />
                  <span className="font-bold text-white">{clusters.length}</span> active regions 
                  <span className="mx-2">•</span> 
                  <span className="font-bold text-white">{hexes.length}</span> total hexes
              </div>
              <button 
                onClick={onAddCluster}
                disabled={isGenerating}
                className="bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 disabled:opacity-50 text-white px-4 py-2 rounded shadow-lg shadow-purple-900/20 text-sm font-bold flex items-center gap-2 transition-all"
              >
                {isGenerating ? <span className="animate-spin">⏳</span> : <Plus size={16} />}
                {isGenerating ? 'Generating...' : 'Expand World'}
              </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
             {clusters.length === 0 && (
                 <div className="text-center py-10 text-slate-600 italic">No clusters found. The world is empty.</div>
             )}
             {clusters.map((cluster) => (
                 <div key={cluster.id} className="bg-slate-800 p-3 rounded border border-slate-700 flex items-center justify-between hover:border-slate-600 transition-colors">
                     <div>
                         <h3 className="font-bold text-slate-200">{cluster.name}</h3>
                         <div className="text-xs text-slate-500 font-mono">ID: {cluster.id} • {cluster.count} hexes</div>
                     </div>
                     <button 
                        onClick={() => onRemoveCluster(cluster.id)}
                        className="text-xs bg-rose-950 hover:bg-rose-900 text-rose-400 border border-rose-900 px-3 py-1.5 rounded transition-colors flex items-center gap-1"
                     >
                        <Trash2 size={12} /> Delete
                     </button>
                 </div>
             ))}
          </div>

          <div className="p-4 border-t border-slate-800 bg-slate-800/50 text-center">
             <p className="text-xs text-slate-500">
                 New clusters are procedurally placed in a spiral pattern around the origin.
             </p>
          </div>

       </div>
    </div>
  );
};

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { HexData, TerrainType } from '../types';
import { TERRAIN_COLORS } from '../constants';

interface StatsChartProps {
  hexes: HexData[];
}

export const StatsChart: React.FC<StatsChartProps> = ({ hexes }) => {
  const data = React.useMemo(() => {
    const counts: Record<string, number> = {};
    // Initialize with 0, excluding EMPTY
    Object.values(TerrainType)
      .filter(t => t !== TerrainType.EMPTY)
      .forEach(t => counts[t] = 0);
    
    hexes.forEach(h => {
      if (h.terrain !== TerrainType.EMPTY) {
        counts[h.terrain] = (counts[h.terrain] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [hexes]);

  if (data.length === 0) {
    return <div className="text-center text-slate-500 py-10">No data to visualize</div>;
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={TERRAIN_COLORS[entry.name as TerrainType] || '#8884d8'} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
              itemStyle={{ color: '#f1f5f9' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="text-center text-xs text-slate-400 mb-2">Explored Terrain Distribution</div>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 px-2">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: TERRAIN_COLORS[entry.name as TerrainType] || '#8884d8' }}
            />
            <span className="text-xs text-slate-400">
              {entry.name} <span className="text-slate-500">({entry.value})</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

import { TerrainType, TerrainElement, PartySpeed, TravelRuleResult, HexData } from "../types";
import { TRAVEL_TIME_TABLE, EXPLORATION_TIME_TABLE, getSlowerSpeed } from "../constants";

export const calculateTravelStats = (
  speed: PartySpeed,
  terrain: TerrainType,
  element: TerrainElement
): TravelRuleResult => {
  let effectiveSpeed = speed;

  // Difficult terrain treats party speed as one category slower
  if (element === TerrainElement.DIFFICULT) {
    effectiveSpeed = getSlowerSpeed(speed);
  }

  // Determine Travel Time (Hours)
  const travelTimeEntry = TRAVEL_TIME_TABLE[effectiveSpeed];
  let travelTime = terrain === TerrainType.PLAIN ? travelTimeEntry[0] : travelTimeEntry[1];

  // Settlement bonus (reduce travel time by 25%)
  if (terrain === TerrainType.SETTLEMENT) {
    travelTime = travelTime * 0.75;
  }

  // Determine Exploration Time (Days)
  const explorationTimeEntry = EXPLORATION_TIME_TABLE[effectiveSpeed];
  let explorationTime = 1;

  if (terrain === TerrainType.PLAIN || terrain === TerrainType.HILL) {
    explorationTime = explorationTimeEntry[0];
  } else if (terrain === TerrainType.MOUNTAIN) {
    explorationTime = explorationTimeEntry[2];
  } else {
    // Desert, Forest, Marsh
    explorationTime = explorationTimeEntry[1];
  }
  
  if (element === TerrainElement.SECRET && terrain === TerrainType.FOREST) {
    explorationTime = explorationTime * 1.5;
  }

  return {
    travelTime: parseFloat(travelTime.toFixed(1)),
    explorationTime: parseFloat(explorationTime.toFixed(1))
  };
};

export const rollD20 = (): number => Math.floor(Math.random() * 20) + 1;
export const rollD100 = (): number => Math.floor(Math.random() * 100) + 1;

export const generateRandomTerrain = (previousTerrain?: TerrainType): TerrainType => {
  const roll = rollD20();
  
  if (roll <= 3) return TerrainType.FOREST;
  if (roll <= 6) return TerrainType.HILL;
  if (roll <= 8) return TerrainType.MARSH;
  if (roll <= 10) return TerrainType.MOUNTAIN;
  if (roll <= 13) return TerrainType.PLAIN;
  if (roll === 14) return TerrainType.SETTLEMENT;
  if (roll <= 16) return TerrainType.WATER;
  
  // 17-20: As previous. If no previous, default to Plain.
  return previousTerrain || TerrainType.PLAIN;
};

export const generateRandomElement = (): TerrainElement => {
  const roll = rollD20();

  if (roll <= 3) return TerrainElement.DIFFICULT;
  if (roll <= 6) return TerrainElement.FEATURE;
  if (roll <= 10) return TerrainElement.HUNTING_GROUND;
  if (roll <= 12) return TerrainElement.RESOURCE;
  if (roll <= 14) return TerrainElement.SECRET;
  return TerrainElement.STANDARD;
};

// Neighbors in axial coordinates (q, r)
const DIRECTIONS = [
    { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: -1 },
    { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: 1 }
];

export const getUnoccupiedNeighbor = (hexes: HexData[], centerHex: HexData | null): { x: number, y: number } => {
    const occupiedMap = new Set(hexes.map(h => `${h.coordinates.x},${h.coordinates.y}`));

    // If no center hex, spiral out from 0,0 until we find an empty spot
    let queue = centerHex ? [centerHex.coordinates] : [{x:0, y:0}];
    if (!centerHex && occupiedMap.has("0,0")) {
         // Logic if map is fully occupied at 0,0 handled by spiral below
    } else if (!centerHex) {
        return { x: 0, y: 0 };
    }

    // Simple Breadth-First Search to find nearest empty spot
    // If centerHex is provided, we specifically look for neighbors of THAT hex first.
    // But for "Sandbox" generation, usually we want to append to the map. 
    // Let's refine: We return a random empty neighbor of the centerHex.
    
    if (centerHex) {
        const neighbors = DIRECTIONS.map(d => ({ x: centerHex.coordinates.x + d.x, y: centerHex.coordinates.y + d.y }));
        const emptyNeighbors = neighbors.filter(n => !occupiedMap.has(`${n.x},${n.y}`));
        if (emptyNeighbors.length > 0) {
            const idx = Math.floor(Math.random() * emptyNeighbors.length);
            return emptyNeighbors[idx];
        }
    }

    // Fallback: Spiral search for ANY empty spot near the center (or 0,0)
    const start = centerHex ? centerHex.coordinates : { x: 0, y: 0 };
    const visited = new Set<string>();
    const bfsQueue = [start];
    visited.add(`${start.x},${start.y}`);

    while (bfsQueue.length > 0) {
        const current = bfsQueue.shift()!;
        
        // Check neighbors
        for (const d of DIRECTIONS) {
            const n = { x: current.x + d.x, y: current.y + d.y };
            const key = `${n.x},${n.y}`;
            if (!visited.has(key)) {
                if (!occupiedMap.has(key)) {
                    return n;
                }
                visited.add(key);
                bfsQueue.push(n);
            }
        }
        
        // Safety break for very large maps
        if (visited.size > 5000) break;
    }

    return { x: 0, y: 0 }; // Fallback
};
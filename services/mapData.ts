
import { HexData, TerrainType, TerrainElement, ElementalOverlay, HexEffect } from '../types';
import { calculateTravelStats } from './gameLogic';

// CONFIGURATION
// SECTOR_SIZE defines the size of the generated content "island".
export const SECTOR_SIZE = 4; 

// SECTOR_SPACING defines the distance between sector centers.
// Increased to 9 to reduce overlap while keeping sectors close (Radius 4 = Width 9).
export const SECTOR_SPACING = 9; 

// The visual scale (radius in hexes) of the Placeholders.
export const SECTOR_SCALE = SECTOR_SIZE * Math.sqrt(3); 

export const WORLD_RADIUS_SECTORS = 6; 

// Width of bridges (Radius 2 = 5 wide: center + 2 left + 2 right)
const BRIDGE_RADIUS = 2;

// --- NOISE & BIOME GENERATION ---

const noise = (x: number, y: number, seed: number): number => {
    const sx = x + seed * 100;
    const sy = y + seed * 100;
    const n1 = Math.sin(sx * 0.05) + Math.cos(sy * 0.05);
    const n2 = Math.sin(sx * 0.1 + 2) + Math.cos(sy * 0.1 + 4);
    const n3 = Math.sin(sx * 0.3 - 2) + Math.cos(sy * 0.3 - 1);
    const raw = n1 * 1.0 + n2 * 0.5 + n3 * 0.25;
    return (raw + 2.5) / 5.0;
};

interface BiomeInfo {
    terrain: TerrainType;
    element: TerrainElement;
    flavor: string;
}

const getBiomeAt = (q: number, r: number): BiomeInfo => {
    const ELEVATION_SEED = 123.45;
    const MOISTURE_SEED = 987.65;
    const ELEMENT_SEED = 555.55;

    // Bias towards higher elevation (Plateaus/Mountains)
    const elevation = noise(q, r, ELEVATION_SEED) + 0.1; 
    
    // Bias towards dryness (Steppe/Desert)
    const moisture = noise(q, r, MOISTURE_SEED) - 0.15; 
    
    const elementVal = noise(q * 5, r * 5, ELEMENT_SEED);

    let terrain: TerrainType = TerrainType.PLAIN;
    let flavor = "Wilderness";

    // --- AESTHETIC: American Frontier x Western China ---
    if (elevation < 0.25) {
        terrain = TerrainType.WATER;
        flavor = Math.random() > 0.5 ? "Salt Lake" : "River Canyon";
    } else if (elevation > 0.80) {
        terrain = TerrainType.MOUNTAIN;
        flavor = "Jade Peaks";
    } else if (elevation > 0.65) {
        // Hills/Badlands
        terrain = TerrainType.HILL;
        if (moisture < 0.3) {
            flavor = "Red Rock Badlands";
        } else {
            flavor = "Rocky Foothills";
        }
    } else {
        // Low to Mid Elevation
        if (moisture < 0.25) {
            terrain = TerrainType.DESERT;
            flavor = Math.random() > 0.5 ? "Dune Sea" : "Cracked Earth Flats";
        } else if (moisture > 0.70) {
            terrain = TerrainType.MARSH;
            flavor = "River Delta Wetlands";
        } else if (moisture > 0.55) {
            terrain = TerrainType.FOREST;
            flavor = elevation > 0.5 ? "Alpine Pine" : "Bamboo Thicket";
        } else {
            // The default "Plain" is now Steppe/Prairie
            terrain = TerrainType.PLAIN;
            flavor = Math.random() > 0.5 ? "High Steppe" : "Sagebrush Prairie";
        }
    }

    let element = TerrainElement.STANDARD;
    const isHabitable = terrain !== TerrainType.MOUNTAIN && terrain !== TerrainType.WATER;
    
    // Elements logic
    if (elementVal > 0.85) {
        element = isHabitable && elementVal > 0.92 ? TerrainElement.FEATURE : TerrainElement.SECRET;
    } else if (elementVal < 0.15) {
        element = TerrainElement.DIFFICULT;
    } else if (elementVal > 0.70 && elementVal < 0.75) {
        element = TerrainElement.RESOURCE;
    }

    const coordHash = Math.sin(q * 345 + r * 123) * 1000;
    const isSettlement = (coordHash - Math.floor(coordHash)) > 0.985;
    
    if (isSettlement && isHabitable) {
        terrain = TerrainType.SETTLEMENT;
        element = TerrainElement.FEATURE;
        flavor = Math.random() > 0.5 ? "Frontier Trading Post" : "Silk Road Caravanserai";
    }

    return { terrain, element, flavor };
};

// --- Geometry Helpers ---

const getSectorCenter = (sq: number, sr: number) => {
    // We want the logical grid (sq, sr) to visually look like a rectangular grid on screen.
    // In Pointy-Top hexes:
    // +q is Right
    // +r is Down-Right
    // To make +sr go straight Down, we need to shear q.
    // q = sq * Spacing - (sr * Spacing / 2)
    
    const r = sr * SECTOR_SPACING;
    const q = (sq * SECTOR_SPACING) - Math.floor(r / 2);
    
    return { q, r };
};

const getHexDistance = (a: {x: number, y: number}, b: {x: number, y: number}) => {
    return (Math.abs(a.x - b.x) + Math.abs(a.x + a.y - b.x - b.y) + Math.abs(a.y - b.y)) / 2;
};

const axialRound = (x: number, y: number) => {
    const xgrid = Math.round(x);
    const ygrid = Math.round(y);
    const xrem = x - xgrid;
    const yrem = y - ygrid;
    if (Math.abs(xrem) >= Math.abs(yrem)) {
      return { q: xgrid + Math.round(xrem + 0.5 * yrem), r: ygrid };
    } else {
      return { q: xgrid, r: ygrid + Math.round(yrem + 0.5 * xrem) };
    }
  };

// FP Helper: Range generation
const range = (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, i) => start + i);

// FP Helper: Interpolate line between hexes
const hexLine = (start: {q: number, r: number}, end: {q: number, r: number}): {q: number, r: number}[] => {
    const dist = getHexDistance({x: start.q, y: start.r}, {x: end.q, y: end.r});
    if (dist === 0) return [];
    
    return range(1, Math.floor(dist) - 1).map(i => {
        const t = 1.0 / dist * i;
        const q = start.q + (end.q - start.q) * t;
        const r = start.r + (end.r - start.r) * t;
        return axialRound(q, r);
    });
};

// --- Public API ---

export const getInitialMapData = (): HexData[] => {
  const hexes: HexData[] = [];
  let idCounter = 1;

  // 1. Generate Center Sector (0,0)
  const centerHexes = generateCluster(0, 0, idCounter, 'SECTOR-0-0');
  hexes.push(...centerHexes);
  idCounter += centerHexes.length;

  // 2. Generate Placeholders
  for (let sq = -WORLD_RADIUS_SECTORS; sq <= WORLD_RADIUS_SECTORS; sq++) {
      for (let sr = -WORLD_RADIUS_SECTORS; sr <= WORLD_RADIUS_SECTORS; sr++) {
          if (Math.abs(sq + sr) <= WORLD_RADIUS_SECTORS && Math.abs(sq) <= WORLD_RADIUS_SECTORS && Math.abs(sr) <= WORLD_RADIUS_SECTORS) {
              if (sq === 0 && sr === 0) continue;

              const center = getSectorCenter(sq, sr);
              
              hexes.push({
                  id: `PLACEHOLDER-${sq}_${sr}`,
                  groupId: `SECTOR-${sq}-${sr}`,
                  terrain: TerrainType.EMPTY,
                  element: TerrainElement.STANDARD,
                  coordinates: { x: center.q, y: center.r },
                  travelTimeHours: 0,
                  explorationTimeDays: 0,
                  isExplored: false,
                  isSectorPlaceholder: true,
                  notes: `Unexplored Sector (${sq}, ${sr})`,
                  description: "A vast, uncharted region waiting to be explored."
              });
          }
      }
  }

  return hexes;
};

/**
 * Generates a specific sector from a placeholder and connects it to existing neighbors.
 */
export const revealSingleSector = (placeholder: HexData, currentMap: HexData[]): HexData[] => {
    if (!placeholder.isSectorPlaceholder) return currentMap;

    // 1. Generate the new sector content
    const newSectorHexes = generateCluster(
        placeholder.coordinates.x, 
        placeholder.coordinates.y, 
        0, 
        placeholder.groupId || 'UNKNOWN'
    );

    const existingCoords = new Set(currentMap.map(h => `${h.coordinates.x},${h.coordinates.y}`));
    
    // Remove the placeholder itself
    let updatedMap = currentMap.filter(h => h.id !== placeholder.id);

    existingCoords.delete(`${placeholder.coordinates.x},${placeholder.coordinates.y}`);

    const uniqueNewHexes = newSectorHexes.filter(h => !existingCoords.has(`${h.coordinates.x},${h.coordinates.y}`));
    updatedMap = [...updatedMap, ...uniqueNewHexes];

    // 3. Generate Bridges
    const bridges = generateBridges(placeholder.coordinates, updatedMap);
    
    const finalCoords = new Set(updatedMap.map(h => `${h.coordinates.x},${h.coordinates.y}`));
    const uniqueBridges = bridges.filter(b => !finalCoords.has(`${b.coordinates.x},${b.coordinates.y}`));

    return [...updatedMap, ...uniqueBridges];
};

/**
 * Efficiently reveals the entire map by replacing all placeholders.
 * Uses a Functional "Writer" pattern approach to separate side effects (logs) from logic.
 */
export const revealEntireMap = (currentHexes: HexData[], log: (msg: string) => void): HexData[] => {
    
    // Core logic wrapper - returns data + logs
    const runGeneration = (hexes: HexData[]): [HexData[], string[]] => {
        const logs: string[] = ["Starting revealEntireMap sequence..."];

        // 1. Partition Data (Placeholders vs Real)
        const isPlaceholder = (h: HexData) => !!h.isSectorPlaceholder;
        const placeholders = hexes.filter(isPlaceholder);
        const existing = hexes.filter(h => !isPlaceholder(h));
        
        logs.push(`Phase 1: Found ${placeholders.length} placeholders.`);

        // Create O(1) Lookup for collision
        const occupiedSet = new Set(existing.map(h => `${h.coordinates.x},${h.coordinates.y}`));
        
        // 2. Identify Active Sectors (Recovered Centers)
        // Generate valid sector coordinates
        const validSectors = range(-WORLD_RADIUS_SECTORS, WORLD_RADIUS_SECTORS).flatMap(sq => 
            range(-WORLD_RADIUS_SECTORS, WORLD_RADIUS_SECTORS)
                .filter(sr => Math.abs(sq + sr) <= WORLD_RADIUS_SECTORS)
                .map(sr => ({ sq, sr }))
        );

        // Map valid sectors to their center hex coordinates
        const allSectorCenters = validSectors.map(({sq, sr}) => {
            const center = getSectorCenter(sq, sr);
            return { sq, sr, x: center.q, y: center.r };
        });

        // A sector center is "active" if it has a hex (either existing or a placeholder we are about to fill)
        const activeCenters = allSectorCenters.filter(c => 
            occupiedSet.has(`${c.x},${c.y}`) || 
            placeholders.some(p => p.coordinates.x === c.x && p.coordinates.y === c.y)
        );

        logs.push(`Phase 1: Identified ${activeCenters.length} active sector centers.`);

        // 3. Generate New Sectors (FlatMap)
        const newSectorHexes = placeholders.flatMap(p => 
            generateCluster(p.coordinates.x, p.coordinates.y, 0, p.groupId || 'UNKNOWN')
        ).filter(h => !occupiedSet.has(`${h.coordinates.x},${h.coordinates.y}`));

        logs.push(`Phase 2: Generated ${newSectorHexes.length} new terrain hexes.`);

        // Update collision set with new hexes for bridge generation
        const extendedOccupiedSet = new Set([
            ...occupiedSet, 
            
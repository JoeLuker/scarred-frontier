import { HexData, TerrainType, TerrainElement, ElementalOverlay, HexEffect } from '../types';
import { calculateTravelStats } from './gameLogic';
import { MAP_CONFIG } from '../constants';
import { getSectorCenter, getHexDistance, axialRound, hexLine, range, AxialCoord } from './geometry';

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
        terrain = TerrainType.HILL;
        flavor = moisture < 0.3 ? "Red Rock Badlands" : "Rocky Foothills";
    } else {
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
            terrain = TerrainType.PLAIN;
            flavor = Math.random() > 0.5 ? "High Steppe" : "Sagebrush Prairie";
        }
    }

    let element = TerrainElement.STANDARD;
    const isHabitable = terrain !== TerrainType.MOUNTAIN && terrain !== TerrainType.WATER;
    
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

// --- Public API ---

export const getInitialMapData = (): HexData[] => {
  const hexes: HexData[] = [];
  let idCounter = 1;

  // 1. Generate Center Sector (0,0)
  const centerHexes = generateCluster(0, 0, idCounter, 'SECTOR-0-0');
  hexes.push(...centerHexes);
  idCounter += centerHexes.length;

  // 2. Generate Placeholders
  for (let sq = -MAP_CONFIG.WORLD_RADIUS_SECTORS; sq <= MAP_CONFIG.WORLD_RADIUS_SECTORS; sq++) {
      for (let sr = -MAP_CONFIG.WORLD_RADIUS_SECTORS; sr <= MAP_CONFIG.WORLD_RADIUS_SECTORS; sr++) {
          if (Math.abs(sq + sr) <= MAP_CONFIG.WORLD_RADIUS_SECTORS && Math.abs(sq) <= MAP_CONFIG.WORLD_RADIUS_SECTORS && Math.abs(sr) <= MAP_CONFIG.WORLD_RADIUS_SECTORS) {
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

export const revealSingleSector = (placeholder: HexData, currentMap: HexData[]): HexData[] => {
    if (!placeholder.isSectorPlaceholder) return currentMap;

    const newSectorHexes = generateCluster(
        placeholder.coordinates.x, 
        placeholder.coordinates.y, 
        0, 
        placeholder.groupId || 'UNKNOWN'
    );

    const existingCoords = new Set(currentMap.map(h => `${h.coordinates.x},${h.coordinates.y}`));
    let updatedMap = currentMap.filter(h => h.id !== placeholder.id);
    existingCoords.delete(`${placeholder.coordinates.x},${placeholder.coordinates.y}`);

    const uniqueNewHexes = newSectorHexes.filter(h => !existingCoords.has(`${h.coordinates.x},${h.coordinates.y}`));
    updatedMap = [...updatedMap, ...uniqueNewHexes];

    const bridges = generateBridges(placeholder.coordinates, updatedMap);
    const finalCoords = new Set(updatedMap.map(h => `${h.coordinates.x},${h.coordinates.y}`));
    const uniqueBridges = bridges.filter(b => !finalCoords.has(`${b.coordinates.x},${b.coordinates.y}`));

    return [...updatedMap, ...uniqueBridges];
};

export const revealEntireMap = (currentHexes: HexData[], log: (msg: string) => void): HexData[] => {
    const runGeneration = (hexes: HexData[]): [HexData[], string[]] => {
        const logs: string[] = ["Starting revealEntireMap sequence..."];

        const isPlaceholder = (h: HexData) => !!h.isSectorPlaceholder;
        const placeholders = hexes.filter(isPlaceholder);
        const existing = hexes.filter(h => !isPlaceholder(h));
        
        logs.push(`Phase 1: Found ${placeholders.length} placeholders.`);

        const occupiedSet = new Set(existing.map(h => `${h.coordinates.x},${h.coordinates.y}`));
        
        const validSectors = range(-MAP_CONFIG.WORLD_RADIUS_SECTORS, MAP_CONFIG.WORLD_RADIUS_SECTORS).flatMap(sq => 
            range(-MAP_CONFIG.WORLD_RADIUS_SECTORS, MAP_CONFIG.WORLD_RADIUS_SECTORS)
                .filter(sr => Math.abs(sq + sr) <= MAP_CONFIG.WORLD_RADIUS_SECTORS)
                .map(sr => ({ sq, sr }))
        );

        const allSectorCenters = validSectors.map(({sq, sr}) => {
            const center = getSectorCenter(sq, sr);
            return { sq, sr, x: center.q, y: center.r };
        });

        const activeCenters = allSectorCenters.filter(c => 
            occupiedSet.has(`${c.x},${c.y}`) || 
            placeholders.some(p => p.coordinates.x === c.x && p.coordinates.y === c.y)
        );

        logs.push(`Phase 1: Identified ${activeCenters.length} active sector centers.`);

        const newSectorHexes = placeholders.flatMap(p => 
            generateCluster(p.coordinates.x, p.coordinates.y, 0, p.groupId || 'UNKNOWN')
        ).filter(h => !occupiedSet.has(`${h.coordinates.x},${h.coordinates.y}`));

        logs.push(`Phase 2: Generated ${newSectorHexes.length} new terrain hexes.`);

        const extendedOccupiedSet = new Set([
            ...occupiedSet, 
            ...newSectorHexes.map(h => `${h.coordinates.x},${h.coordinates.y}`)
        ]);

        const directions = [{dq: 1, dr: 0}, {dq: 1, dr: -1}, {dq: 0, dr: -1}];
        const activeCenterMap = new Set(activeCenters.map(c => `${c.sq},${c.sr}`));

        const bridgeHexes = activeCenters.flatMap(c => {
            return directions.flatMap(d => {
                const nSq = c.sq + d.dq;
                const nSr = c.sr + d.dr;
                
                if (!activeCenterMap.has(`${nSq},${nSr}`)) return [];

                const nCenter = getSectorCenter(nSq, nSr);
                const path = hexLine({q: c.x, r: c.y}, {q: nCenter.q, r: nCenter.r});
                
                return path.flatMap(pt => {
                    const wideArea: HexData[] = [];
                    for (let dq = -MAP_CONFIG.BRIDGE_RADIUS; dq <= MAP_CONFIG.BRIDGE_RADIUS; dq++) {
                        for (let dr = -MAP_CONFIG.BRIDGE_RADIUS; dr <= MAP_CONFIG.BRIDGE_RADIUS; dr++) {
                            if (Math.abs(dq + dr) > MAP_CONFIG.BRIDGE_RADIUS) continue;
                            const tx = pt.q + dq;
                            const ty = pt.r + dr;
                            
                            if (!extendedOccupiedSet.has(`${tx},${ty}`)) {
                                extendedOccupiedSet.add(`${tx},${ty}`);
                                const { terrain, element, flavor } = getBiomeAt(tx, ty);
                                const stats = calculateTravelStats(30, terrain, element);
                                
                                wideArea.push({
                                    id: `BRIDGE-${tx}_${ty}`,
                                    groupId: 'BRIDGE',
                                    terrain,
                                    element,
                                    coordinates: { x: tx, y: ty },
                                    travelTimeHours: stats.travelTime,
                                    explorationTimeDays: stats.explorationTime,
                                    isExplored: true,
                                    description: flavor,
                                    notes: "Land Bridge",
                                    isSectorPlaceholder: false
                                });
                            }
                        }
                    }
                    return wideArea;
                });
            });
        });

        logs.push(`Phase 3: Generated ${bridgeHexes.length} bridge hexes.`);
        logs.push(`SUCCESS: Map generation complete.`);

        return [[...existing, ...newSectorHexes, ...bridgeHexes], logs];
    };

    const [resultMap, logs] = runGeneration(currentHexes);
    logs.forEach(l => log(l));
    return resultMap;
};

export const applyElementalOverlay = (
    targetHex: HexData, 
    type: ElementalOverlay | null, 
    allHexes: HexData[]
): HexData[] => {
    // 1. Find Nearest Valid Sector Center
    let bestCenter: AxialCoord = { q: targetHex.coordinates.x, r: targetHex.coordinates.y };
    let minDist = Infinity;

    for (let sq = -MAP_CONFIG.WORLD_RADIUS_SECTORS; sq <= MAP_CONFIG.WORLD_RADIUS_SECTORS; sq++) {
        for (let sr = -MAP_CONFIG.WORLD_RADIUS_SECTORS; sr <= MAP_CONFIG.WORLD_RADIUS_SECTORS; sr++) {
            if (Math.abs(sq + sr) > MAP_CONFIG.WORLD_RADIUS_SECTORS) continue;
            const center = getSectorCenter(sq, sr);
            const d = getHexDistance(center, {q: targetHex.coordinates.x, r: targetHex.coordinates.y});
            if (d < minDist) {
                minDist = d;
                bestCenter = center;
            }
        }
    }

    // Radius covers sector (4) + gap (1) + neighbor (4) + gap (1) ~ 10-12
    const EFFECT_RADIUS = 12; 

    return allHexes.map(hex => {
        const dist = getHexDistance(
            {q: bestCenter.q, r: bestCenter.r}, 
            {q: hex.coordinates.x, r: hex.coordinates.y}
        );

        if (dist <= EFFECT_RADIUS) {
            const normalizedDist = dist / EFFECT_RADIUS;
            const strength = Math.max(0, 1.0 - (normalizedDist * normalizedDist)); 
            
            if (strength <= 0.05) return hex; 

            let newEffects: HexEffect[] = hex.effects ? [...hex.effects] : [];

            if (type === null) {
                newEffects = [];
            } else {
                newEffects = newEffects.filter(e => e.type !== type);
                newEffects.push({
                    sourceGroupId: "MANUAL_OVERLAY",
                    type: type,
                    strength: parseFloat(strength.toFixed(2))
                });
            }

            return {
                ...hex,
                effects: newEffects.length > 0 ? newEffects : undefined
            };
        }
        return hex;
    });
};

const generateBridges = (
    newSectorCenter: {x: number, y: number}, 
    allHexes: HexData[],
): HexData[] => {
    const occupiedSet = new Set(allHexes.map(h => `${h.coordinates.x},${h.coordinates.y}`));
    
    const directions = [
        { sq: 1, sr: 0 }, { sq: 1, sr: -1 }, { sq: 0, sr: -1 },
        { sq: -1, sr: 0 }, { sq: -1, sr: 1 }, { sq: 0, sr: 1 }
    ];

    return directions.flatMap(d => {
        const offset = getSectorCenter(d.sq, d.sr); 
        const nX = newSectorCenter.x + offset.q;
        const nY = newSectorCenter.y + offset.r;

        const hasNeighbor = allHexes.some(h => 
            h.coordinates.x === nX && 
            h.coordinates.y === nY && 
            !h.isSectorPlaceholder
        );

        if (!hasNeighbor) return [];

        return hexLine({q: newSectorCenter.x, r: newSectorCenter.y}, {q: nX, r: nY}).flatMap(pt => {
            const wideHexes: HexData[] = [];
            for (let dq = -MAP_CONFIG.BRIDGE_RADIUS; dq <= MAP_CONFIG.BRIDGE_RADIUS; dq++) {
                for (let dr = -MAP_CONFIG.BRIDGE_RADIUS; dr <= MAP_CONFIG.BRIDGE_RADIUS; dr++) {
                    if (Math.abs(dq + dr) > MAP_CONFIG.BRIDGE_RADIUS) continue;
                    const tx = pt.q + dq;
                    const ty = pt.r + dr;
                    const key = `${tx},${ty}`;
                    
                    if (!occupiedSet.has(key)) {
                        occupiedSet.add(key);
                        const { terrain, element, flavor } = getBiomeAt(tx, ty);
                        const stats = calculateTravelStats(30, terrain, element);
                        
                        wideHexes.push({
                            id: `BRIDGE-${tx}_${ty}`,
                            groupId: 'BRIDGE',
                            terrain,
                            element,
                            coordinates: { x: tx, y: ty },
                            travelTimeHours: stats.travelTime,
                            explorationTimeDays: stats.explorationTime,
                            isExplored: true,
                            description: flavor,
                            notes: "Land Bridge",
                            isSectorPlaceholder: false
                        });
                    }
                }
            }
            return wideHexes;
        });
    });
};

export const generateCluster = (centerQ: number, centerR: number, startIndex: number, groupId: string): HexData[] => {
    const clusterHexes: HexData[] = [];
    const centerPoint = { q: centerQ, r: centerR };

    for (let dq = -MAP_CONFIG.SECTOR_SIZE; dq <= MAP_CONFIG.SECTOR_SIZE; dq++) {
        for (let dr = -MAP_CONFIG.SECTOR_SIZE; dr <= MAP_CONFIG.SECTOR_SIZE; dr++) {
            if (Math.abs(dq + dr) > MAP_CONFIG.SECTOR_SIZE) continue; 

            const q = centerQ + dq;
            const r = centerR + dr;
            
            if (getHexDistance(centerPoint, {q, r}) <= MAP_CONFIG.SECTOR_SIZE) {
                const { terrain, element, flavor } = getBiomeAt(q, r);
                const stats = calculateTravelStats(30, terrain, element);
                
                clusterHexes.push({
                    id: `HEX-${q}_${r}`, // Deterministic Safe ID based on coords to avoid collisions
                    groupId,
                    terrain,
                    element,
                    coordinates: { x: q, y: r },
                    travelTimeHours: stats.travelTime,
                    explorationTimeDays: stats.explorationTime,
                    isExplored: true,
                    description: flavor,
                    notes: groupId,
                });
            }
        }
    }
    return clusterHexes;
};
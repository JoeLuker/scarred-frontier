
export enum TerrainType {
  FOREST = 'Forest',
  HILL = 'Hill',
  MARSH = 'Marsh',
  MOUNTAIN = 'Mountain',
  PLAIN = 'Plain',
  SETTLEMENT = 'Settlement',
  WATER = 'Water',
  DESERT = 'Desert',
  EMPTY = 'Unexplored'
}

export enum TerrainElement {
  DIFFICULT = 'Difficult',
  FEATURE = 'Feature',
  HUNTING_GROUND = 'Hunting Ground',
  RESOURCE = 'Resource',
  SECRET = 'Secret',
  STANDARD = 'Standard'
}

export type ElementalOverlay = 'Infernal' | 'Frozen' | 'Necrotic' | 'Verdant' | 'Storm' | 'Arcane';

export type PartySpeed = 15 | 20 | 30 | 40 | 50;

export interface HexEffect {
  sourceGroupId: string; // The sector ID that originated this effect
  type: ElementalOverlay;
  strength: number; // 0.0 to 1.0
}

export interface HexData {
  id: string;
  groupId?: string; // ID of the cluster this hex belongs to
  terrain: TerrainType;
  element: TerrainElement;
  description?: string; // AI generated
  travelTimeHours: number;
  explorationTimeDays: number;
  coordinates: { x: number, y: number };
  isExplored: boolean;
  notes: string;
  color?: string; // Custom map color from imported data
  icon?: string; // Custom icon override
  isSectorPlaceholder?: boolean; // If true, this represents an entire ungenerated sector
  
  // Active elemental effects on this hex
  effects?: HexEffect[];
}

export interface TravelRuleResult {
  travelTime: number; // hours
  explorationTime: number; // days
}

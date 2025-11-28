import { TerrainType, TerrainElement, PartySpeed, ElementalOverlay } from './types';

// --- WORLD CONFIGURATION ---
// The Single Source of Truth for Map Dimensions
export const MAP_CONFIG = {
  HEX_SIZE: 50,               // Pixel radius of a single micro-hex
  SECTOR_SIZE: 4,             // Radius of a generated sector (in hexes)
  SECTOR_SPACING: 5,          // Distance between sector centers (in hexes). K=5 for Radius 4 (Dist 10)
  WORLD_RADIUS_SECTORS: 6,    // How many sectors out from center to generate
  BRIDGE_RADIUS: 2,           // Width of land bridges (radius)
};

// Derived Visual Config
// The visual scale (radius in hexes) of the Placeholders.
// Scaled to cover the extents of a Pointy Top hex cluster.
export const VISUAL_CONFIG = {
  SECTOR_SCALE: MAP_CONFIG.SECTOR_SIZE * Math.sqrt(3),
  // Padding for the placeholder visual to ensure it encompasses the jagged edges of the terrain
  PLACEHOLDER_PAD: 0.85 
};

// --- GAME RULES ---

// Speed category degradation for Difficult terrain
// 50->40, 40->30, 30->20, 20->15, 15->15
export const getSlowerSpeed = (speed: PartySpeed): PartySpeed => {
  if (speed === 50) return 40;
  if (speed === 40) return 30;
  if (speed === 30) return 20;
  if (speed === 20) return 15;
  return 15;
};

// Table: Travel Time (1 hex) - in Hours
// Speed mapped to [Plain, All Other]
export const TRAVEL_TIME_TABLE: Record<PartySpeed, [number, number]> = {
  15: [11, 16],
  20: [8, 12],
  30: [5, 8],
  40: [4, 6],
  50: [3, 5]
};

// Table: Exploration Time (1 hex) - in Days
// Speed mapped to [Plain/Hill, Desert/Forest/Marsh, Mountain]
export const EXPLORATION_TIME_TABLE: Record<PartySpeed, [number, number, number]> = {
  15: [3, 4, 5],
  20: [2, 3, 4],
  30: [1, 2, 3],
  40: [1, 1, 2],
  50: [1, 1, 1]
};

// East meets West / Frontier Color Palette
export const TERRAIN_COLORS: Record<TerrainType, string> = {
  [TerrainType.FOREST]: '#3f6212', // Olive/Pine Green
  [TerrainType.HILL]: '#92400e',   // Red Rock/Rust
  [TerrainType.MARSH]: '#57534e',  // Stone Grey/Mud
  [TerrainType.MOUNTAIN]: '#064e3b', // Jade/Dark Emerald for High Peaks
  [TerrainType.PLAIN]: '#d97706',  // Dusty Amber/Steppe
  [TerrainType.SETTLEMENT]: '#be123c', // Deep Rose/Crimson
  [TerrainType.WATER]: '#0e7490',  // Cyan/Teal River
  [TerrainType.DESERT]: '#7c2d12',  // Burnt Orange/Gobi
  [TerrainType.EMPTY]: '#0f172a'    // Slate-900 (Darker map background)
};

export const OVERLAY_COLORS: Record<ElementalOverlay, string> = {
  'Infernal': '#ef4444', // Red
  'Frozen': '#0ea5e9',   // Light Blue
  'Necrotic': '#9333ea', // Purple
  'Verdant': '#22c55e',  // Green
  'Storm': '#facc15',    // Yellow
  'Arcane': '#db2777'    // Pink
};

// SVG Path Data (ViewBox 0 0 24 24) - Outline Style to match Lucide
export const TERRAIN_PATHS: Record<TerrainType, string> = {
  [TerrainType.FOREST]: "M10 10c0-5 3-8 3-8s3 3 3 8c0 .5 0 1.5-.5 2v3h-5v-3c-.5-.5-.5-1.5-.5-2Z M7 12c0-4 2.5-6 2.5-6S12 8 12 12c0 .5 0 1-.5 1.5v1.5H9.5v-1.5c-.5-.5-.5-1-.5-1.5Z", 
  [TerrainType.HILL]: "M4.5 18C4.5 13.5 8 10.5 10 10.5c1 0 2 1 2 3M11 18c0-5.5 3.5-8.5 6.5-8.5 2.5 0 4.5 3 4.5 8.5", 
  [TerrainType.MARSH]: "M2 16c1.5-2 3-2 4.5 0s3 2 4.5 0s3-2 4.5 0s3 2 4.5 0 M6 12c0-3 2-4 2-4s2 1 2 4 M16 12c0-2.5 1.5-3.5 1.5-3.5s1.5 1 1.5 3.5", 
  [TerrainType.MOUNTAIN]: "M8 3l-4 18h16l-4-18l-4 8z M10 14l-2 7 M14 14l2 7", 
  [TerrainType.PLAIN]: "M3 18h18 M5 14h8 M15 14h2 M8 10h4", 
  [TerrainType.SETTLEMENT]: "M3 21h18v-8l-9-7-9 7v8zm5-8h8v8H8v-8z", 
  [TerrainType.WATER]: "M2 12c2-3 5-3 7 0 2 3 5 3 7 0 2-3 5-3 7 0v6c-2 3-5 3-7 0-2-3-5-3-7 0-2 3-5 3-7 0v-6z", 
  [TerrainType.DESERT]: "M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5L19 19 M5 19l1.5-1.5 M17.5 6.5L19 5", 
  [TerrainType.EMPTY]: "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z M12 6v6l4 2" // A clock/waiting icon
};
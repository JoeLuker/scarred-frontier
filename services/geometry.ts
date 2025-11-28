import { MAP_CONFIG } from '../constants';

// --- Shared Types ---
export interface AxialCoord { q: number; r: number; }
export interface PixelCoord { x: number; y: number; }

// --- Coordinate Systems ---

/**
 * Converts Axial Coordinates (Pointy Top) to Pixel Coordinates.
 * Used for placing hexes on the canvas.
 */
export const hexToPixel = (q: number, r: number): PixelCoord => {
    // Pointy Top Geometry
    // x = size * sqrt(3) * (q + r/2)
    // y = size * 3/2 * r
    const x = MAP_CONFIG.HEX_SIZE * Math.sqrt(3) * (q + r/2);
    const y = MAP_CONFIG.HEX_SIZE * (3 / 2 * r);
    return { x, y };
};

/**
 * Converts Pixel Coordinates to Axial Coordinates (Pointy Top).
 * Used for hit-testing clicks.
 */
export const pixelToHex = (x: number, y: number): AxialCoord => {
    // Pointy Top Geometry Inverse
    const q = (Math.sqrt(3)/3 * x - 1/3 * y) / MAP_CONFIG.HEX_SIZE;
    const r = (2/3 * y) / MAP_CONFIG.HEX_SIZE;
    return axialRound(q, r);
};

/**
 * Converts Screen/World Pixels to Flat Top Axial Coordinates.
 * Used exclusively for hit-testing the Flat Top Sector Placeholders.
 */
export const pixelToFlatHex = (x: number, y: number, scale: number): AxialCoord => {
    // Flat Top: q = 2/3 x, r = -1/3 x + sqrt(3)/3 y
    const size = MAP_CONFIG.HEX_SIZE * scale;
    const q = (2/3 * x) / size;
    const r = (-1/3 * x + Math.sqrt(3)/3 * y) / size;
    return axialRound(q, r);
};

/**
 * Determines the center coordinate of a Sector based on its Grid ID (sq, sr).
 * Enforces the specific tiling logic for Flat Top Sectors on a Pointy Top Grid.
 */
export const getSectorCenter = (sq: number, sr: number): AxialCoord => {
    // Vector Basis for Pointy Top Map made of Flat Top Sectors
    // We need vertical stacking for Flat Top sectors.
    // k = SECTOR_SPACING.
    // This specific linear combination ensures neighbors match the Flat Top tiling pattern.
    const k = MAP_CONFIG.SECTOR_SPACING;
    const q = k * (sq - sr);
    const r = k * (sq + 2 * sr);
    
    return { q, r };
};

// --- Math Helpers ---

export const axialRound = (x: number, y: number): AxialCoord => {
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

export const getHexDistance = (a: AxialCoord, b: AxialCoord): number => {
    return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
};

// Functional Range Helper
export const range = (start: number, end: number): number[] => 
    Array.from({ length: end - start + 1 }, (_, i) => start + i);

// Interpolate line between hexes
export const hexLine = (start: AxialCoord, end: AxialCoord): AxialCoord[] => {
    const dist = getHexDistance({q: start.q, r: start.r}, {q: end.q, r: end.r});
    if (dist === 0) return [];
    
    return range(1, Math.floor(dist) - 1).map(i => {
        const t = 1.0 / dist * i;
        const q = start.q + (end.q - start.q) * t;
        const r = start.r + (end.r - start.r) * t;
        return axialRound(q, r);
    });
};
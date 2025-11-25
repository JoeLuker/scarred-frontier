
import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { HexData, TerrainType, ElementalOverlay } from '../types';
import { TERRAIN_COLORS, TERRAIN_PATHS, OVERLAY_COLORS } from '../constants';
import { SECTOR_SCALE } from '../services/mapData';

interface HexGridProps {
  hexes: HexData[];
  onHexClick: (hex: HexData) => void;
}

const HEX_SIZE = 50;

// --- Color Interpolation Helper ---
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

export const HexGrid: React.FC<HexGridProps> = ({ hexes, onHexClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cache Path2D objects to improve performance
  const pathCache = useMemo(() => {
    const cache: Record<string, Path2D> = {};
    Object.entries(TERRAIN_PATHS).forEach(([key, d]) => {
      cache[key] = new Path2D(d);
    });
    return cache;
  }, []);

  const state = useRef({
    camera: { x: 0, y: 0, zoom: 0.15 }, 
    isDragging: false,
    lastMouse: { x: 0, y: 0 },
    totalDragDistance: 0,
    hexes: hexes
  });

  useEffect(() => {
    state.current.hexes = hexes;
  }, [hexes]);

  // --- Math Helpers ---

  // POINTY TOP: For individual terrain hexes
  const hexToPixelPointy = (q: number, r: number) => {
    const x = HEX_SIZE * Math.sqrt(3) * (q + r/2);
    const y = HEX_SIZE * (3 / 2 * r);
    return { x, y };
  };

  const pixelToHexPointy = (x: number, y: number) => {
    const q = (Math.sqrt(3)/3 * x - 1/3 * y) / HEX_SIZE;
    const r = (2/3 * y) / HEX_SIZE;
    return axialRound(q, r);
  };

  // FLAT TOP: For sector placeholders (sectors tile as flat-top)
  const hexToPixelFlat = (q: number, r: number) => {
    const x = HEX_SIZE * (3 / 2 * q);
    const y = HEX_SIZE * Math.sqrt(3) * (r + q/2);
    return { x, y };
  };

  const pixelToHexFlat = (x: number, y: number) => {
    const q = (2/3 * x) / HEX_SIZE;
    const r = (-1/3 * x + Math.sqrt(3)/3 * y) / HEX_SIZE;
    return axialRound(q, r);
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

  // --- Render Logic ---

  const drawHex = (
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    hex: HexData,
    scale: number = 1
  ) => {
    const currentSize = HEX_SIZE * scale;
    const isPlaceholder = !!hex.isSectorPlaceholder;

    // Terrain Hexes: Pointy Top (30 degrees)
    // Sector Placeholders: Flat Top (0 degrees) - sectors tile as flat-top to form pointy-top world
    const angleOffset = isPlaceholder ? 0 : 30;

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle_deg = 60 * i + angleOffset; 
      const angle_rad = Math.PI / 180 * angle_deg;
      ctx.lineTo(x + currentSize * Math.cos(angle_rad), y + currentSize * Math.sin(angle_rad));
    }
    ctx.closePath();
    
    // --- Functional Color Blending ---
    // Start with base terrain color
    const baseColorHex = hex.color || TERRAIN_COLORS[hex.terrain];
    const baseRgb = hexToRgb(baseColorHex);
    
    // Weighted Average Accumulators
    let r = baseRgb.r;
    let g = baseRgb.g;
    let b = baseRgb.b;
    let totalWeight = 1.0;

    if (hex.effects) {
        hex.effects.forEach(effect => {
            const effectColor = OVERLAY_COLORS[effect.type];
            if (effectColor) {
                const eRgb = hexToRgb(effectColor);
                // Strength determines influence. 
                // Increased weight slightly to make sure "no visible change" is addressed
                const w = effect.strength * 1.2; 
                
                r += eRgb.r * w;
                g += eRgb.g * w;
                b += eRgb.b * w;
                totalWeight += w;
            }
        });
    }

    const finalR = Math.min(255, Math.round(r / totalWeight));
    const finalG = Math.min(255, Math.round(g / totalWeight));
    const finalB = Math.min(255, Math.round(b / totalWeight));
    
    ctx.fillStyle = `rgb(${finalR}, ${finalG}, ${finalB})`;
    ctx.fill();

    // Border
    // Smooth joins for better grid aesthetic
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1 * scale;
    // Use a slightly lighter border for "selected" or heavily effected hexes could be an option, keeping it subtle for now
    ctx.strokeStyle = scale > 1 ? 'rgba(255,255,255,0.2)' : '#1e293b'; 
    ctx.stroke();

    // Content
    const currentZoom = state.current.camera.zoom;
    
    if (scale > 1 || currentZoom > 0.1) {
        ctx.save();
        
        // Icon
        const iconPath = pathCache[hex.terrain];
        if (iconPath) {
            const iconScale = scale > 1 
                ? scale * 2.5
                : Math.min(1.8, Math.max(0.5, currentZoom * 1.5));

            ctx.translate(x, y);
            ctx.translate(-12 * iconScale, -12 * iconScale); 
            ctx.scale(iconScale, iconScale);
            
            ctx.lineWidth = (2.5 / iconScale) * scale;
            ctx.strokeStyle = scale > 1 ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.7)";
            ctx.stroke(iconPath);
        }

        ctx.restore();

        // Coordinates
        if (scale > 1 || currentZoom > 0.6) {
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            const labelSize = scale > 1 ? 32 : Math.max(10, HEX_SIZE * 0.25);
            ctx.font = `${labelSize}px monospace`;
            ctx.fillStyle = "rgba(255,255,255,0.4)";
            const label = isPlaceholder
                ? `S (${Math.floor(hex.coordinates.x)},${Math.floor(hex.coordinates.y)})`
                : `${hex.coordinates.x},${hex.coordinates.y}`;
            ctx.fillText(label, x, y + (HEX_SIZE * 0.65 * scale));
        }
    }
  };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
    }

    ctx.fillStyle = "#020617"; 
    ctx.fillRect(0, 0, rect.width, rect.height);

    const { x: camX, y: camY, zoom } = state.current.camera;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    ctx.save();
    ctx.translate(centerX + camX, centerY + camY);
    ctx.scale(zoom, zoom);

    const margin = HEX_SIZE * SECTOR_SCALE * 3; 
    const viewRect = {
        left: -centerX / zoom - camX / zoom - margin,
        right: (rect.width - centerX) / zoom - camX / zoom + margin,
        top: -centerY / zoom - camY / zoom - margin,
        bottom: (rect.height - centerY) / zoom - camY / zoom + margin
    };

    state.current.hexes.forEach(hex => {
        // Use appropriate coordinate system: Flat Top for sectors, Pointy Top for terrain
        const pixel = hex.isSectorPlaceholder
            ? hexToPixelFlat(hex.coordinates.x, hex.coordinates.y)
            : hexToPixelPointy(hex.coordinates.x, hex.coordinates.y);

        if (
            pixel.x > viewRect.left &&
            pixel.x < viewRect.right &&
            pixel.y > viewRect.top &&
            pixel.y < viewRect.bottom
        ) {
            // Draw Sector Placeholders larger (+0.85) to encompass the Pointy Top cluster
            const scale = hex.isSectorPlaceholder ? SECTOR_SCALE + 0.85 : 1;

            drawHex(
                ctx,
                pixel.x,
                pixel.y,
                hex,
                scale
            );
        }
    });

    ctx.restore();
  }, [pathCache]);

  useEffect(() => {
    let animationFrameId: number;
    const loop = () => {
      render();
      animationFrameId = requestAnimationFrame(loop);
    };
    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [render]);

  // --- Interaction ---

  const handleMouseDown = (e: React.MouseEvent) => {
    state.current.isDragging = true;
    state.current.lastMouse = { x: e.clientX, y: e.clientY };
    state.current.totalDragDistance = 0;
    if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!state.current.isDragging) return;
    const dx = e.clientX - state.current.lastMouse.x;
    const dy = e.clientY - state.current.lastMouse.y;
    state.current.totalDragDistance += Math.abs(dx) + Math.abs(dy);
    state.current.camera.x += dx;
    state.current.camera.y += dy;
    state.current.lastMouse = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    state.current.isDragging = false;
    if (canvasRef.current) canvasRef.current.style.cursor = 'default';
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleFactor = 1.1;
    const direction = e.deltaY > 0 ? -1 : 1;
    const factor = direction > 0 ? scaleFactor : 1 / scaleFactor;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const worldX = (mouseX - centerX - state.current.camera.x) / state.current.camera.zoom;
    const worldY = (mouseY - centerY - state.current.camera.y) / state.current.camera.zoom;
    const newZoom = Math.max(0.01, Math.min(5, state.current.camera.zoom * factor));
    state.current.camera.zoom = newZoom;
    state.current.camera.x = mouseX - centerX - (worldX * newZoom);
    state.current.camera.y = mouseY - centerY - (worldY * newZoom);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (state.current.totalDragDistance > 5) return; 
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const worldX = (mouseX - centerX - state.current.camera.x) / state.current.camera.zoom;
    const worldY = (mouseY - centerY - state.current.camera.y) / state.current.camera.zoom;
    
    // 1. Exact Hex Click (Standard Pointy Top Grid)
    const hexCoords = pixelToHexPointy(worldX, worldY);
    const exactHex = state.current.hexes.find(h =>
        !h.isSectorPlaceholder &&
        h.coordinates.x === hexCoords.q &&
        h.coordinates.y === hexCoords.r
    );

    if (exactHex) {
        onHexClick(exactHex);
        return;
    }

    // 2. Placeholder Click (Scaled Flat Top Geometric Hit Test)
    const clickedPlaceholder = state.current.hexes.find(h => {
        if (!h.isSectorPlaceholder) return false;

        // Placeholders use Flat Top positioning
        const pPixel = hexToPixelFlat(h.coordinates.x, h.coordinates.y);

        // Visual scale used in Render
        const visualScale = SECTOR_SCALE + 0.85;

        const localX = (worldX - pPixel.x) / visualScale;
        const localY = (worldY - pPixel.y) / visualScale;

        // Flat Top hit test: q = 2/3 x, r = -1/3 x + sqrt(3)/3 y
        const localHex = pixelToHexFlat(localX, localY);

        return localHex.q === 0 && localHex.r === 0;
    });

    if (clickedPlaceholder) {
        onHexClick(clickedPlaceholder);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden bg-slate-900 border border-slate-700 rounded-lg relative group">
       <div className="absolute top-2 left-2 text-xs text-slate-400 z-10 pointer-events-none bg-slate-950/80 px-2 py-1 rounded select-none border border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
          Canvas Renderer • Drag to Pan • Scroll to Zoom (0.01x - 5x)
       </div>
       <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
        className="cursor-grab active:cursor-grabbing block"
       />
    </div>
  );
};

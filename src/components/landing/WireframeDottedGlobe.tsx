import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export interface DefenseSectorNode {
  id: string;
  name: string;
  code: string;
  coords: [number, number]; // [lng, lat]
  type: 'command' | 'radar' | 'patrol' | 'allied';
  status: 'active' | 'warning' | 'standby';
  description: string;
}

export const DEFENSE_SECTORS: DefenseSectorNode[] = [
  {
    id: 'SEC-04',
    name: 'Sector 04 Vanguard HQ',
    code: 'VGD-CMD',
    coords: [72.57, 23.02],
    type: 'command',
    status: 'active',
    description: 'Central Fusion Node & Air Defense Tracking Grid (23.02°N, 72.57°E)',
  },
  {
    id: 'SEC-PAC',
    name: 'Indo-Pacific Sentinel Array',
    code: 'PAC-NET',
    coords: [103.82, 1.35],
    type: 'radar',
    status: 'active',
    description: 'Maritime Kinematic Surface Sensor & Radar Sweep',
  },
  {
    id: 'SEC-EUR',
    name: 'Eastern Frontier Early Warning',
    code: 'EUR-EWS',
    coords: [25.32, 54.68],
    type: 'allied',
    status: 'warning',
    description: 'Allied Early Warning Radar & Space Surveillance Radar Link',
  },
  {
    id: 'SEC-ARC',
    name: 'Arctic Horizon Radar Fence',
    code: 'ARC-FNC',
    coords: [-156.78, 71.29],
    type: 'radar',
    status: 'standby',
    description: 'Over-the-Horizon Deep Radar Perimeter',
  },
];

// Fallback landmass dot cluster for zero-latency instant rendering
const PRESET_CONTINENT_DOTS: [number, number][] = [
  // India & S. Asia
  [72.5, 23.0], [77.2, 28.6], [88.3, 22.5], [80.2, 13.0], [72.8, 19.0], [67.0, 24.8], [74.3, 31.5], [85.3, 27.7],
  // East & SE Asia
  [116.4, 39.9], [121.4, 31.2], [113.2, 23.1], [139.6, 35.6], [126.9, 37.5], [100.5, 13.7], [103.8, 1.35], [106.8, -6.2],
  // Europe
  [2.3, 48.8], [-0.1, 51.5], [13.4, 52.5], [12.4, 41.9], [-3.7, 40.4], [18.0, 59.3], [24.9, 60.1], [21.0, 52.2], [37.6, 55.7],
  // Middle East
  [44.3, 33.3], [46.7, 24.7], [55.2, 25.2], [35.2, 31.7], [32.8, 39.9],
  // Africa
  [31.2, 30.0], [3.0, 36.7], [-7.5, 33.5], [36.8, -1.2], [18.4, -33.9], [3.3, 6.5], [15.2, -4.3],
  // North America
  [-74.0, 40.7], [-77.0, 38.9], [-87.6, 41.8], [-118.2, 34.0], [-122.4, 37.7], [-123.1, 49.2], [-73.5, 45.5], [-99.1, 19.4],
  // South America
  [-46.6, -23.5], [-43.1, -22.9], [-58.3, -34.6], [-70.6, -33.4], [-77.0, -12.0], [-74.0, 4.7],
  // Australia
  [151.2, -33.8], [144.9, -37.8], [115.8, -31.9], [138.6, -34.9], [153.0, -27.4],
];

interface WireframeDottedGlobeProps {
  width?: number;
  height?: number;
  className?: string;
  interactive?: boolean;
  selectedSectorId?: string;
  onSelectSector?: (sector: DefenseSectorNode) => void;
  theme?: 'dark' | 'light';
}

export const WireframeDottedGlobe: React.FC<WireframeDottedGlobeProps> = ({
  width = 600,
  height = 600,
  className = '',
  interactive = true,
  selectedSectorId = 'SEC-04',
  onSelectSector,
  theme = 'dark',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSector, setActiveSector] = useState<DefenseSectorNode | null>(
    DEFENSE_SECTORS.find((s) => s.id === selectedSectorId) || DEFENSE_SECTORS[0]
  );
  const [isRotating, setIsRotating] = useState(true);
  const [currentZoom, setCurrentZoom] = useState(1);

  const isDark = theme === 'dark';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const containerWidth = width;
    const containerHeight = height;
    const radius = Math.min(containerWidth, containerHeight) / 2.3;

    // HiDPI backing store
    const dpr = window.devicePixelRatio || 1;
    canvas.width = containerWidth * dpr;
    canvas.height = containerHeight * dpr;
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;
    context.scale(dpr, dpr);

    // D3 Orthographic Globe Projection
    const projection = d3
      .geoOrthographic()
      .scale(radius)
      .translate([containerWidth / 2, containerHeight / 2])
      .clipAngle(90);

    const path = d3.geoPath().projection(projection).context(context);

    // Initial rotation centered around Sector 04 (lng: 72.57, lat: 23.02)
    const rotation: [number, number] = [-72.57, -23.02];
    projection.rotate(rotation);

    let autoRotate = isRotating;
    const rotationSpeed = 0.35;
    let animFrameId: number;
    let photonOffset = 0;

    // Dots storage
    const landDots: { lng: number; lat: number }[] = PRESET_CONTINENT_DOTS.map(([lng, lat]) => ({
      lng,
      lat,
    }));

    // Point in polygon helpers (as in 21st.dev component)
    const pointInPolygon = (point: [number, number], polygon: [number, number][]): boolean => {
      const [x, y] = point;
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
          inside = !inside;
        }
      }
      return inside;
    };

    const pointInFeature = (point: [number, number], feature: any): boolean => {
      const geometry = feature.geometry;
      if (!geometry) return false;
      if (geometry.type === 'Polygon') {
        const coordinates = geometry.coordinates;
        if (!pointInPolygon(point, coordinates[0])) return false;
        for (let i = 1; i < coordinates.length; i++) {
          if (pointInPolygon(point, coordinates[i])) return false;
        }
        return true;
      } else if (geometry.type === 'MultiPolygon') {
        for (const polygon of geometry.coordinates) {
          if (pointInPolygon(point, polygon[0])) {
            let inHole = false;
            for (let i = 1; i < polygon.length; i++) {
              if (pointInPolygon(point, polygon[i])) {
                inHole = true;
                break;
              }
            }
            if (!inHole) return true;
          }
        }
      }
      return false;
    };

    const generateDotsInPolygon = (feature: any, dotSpacing = 20) => {
      const dots: [number, number][] = [];
      const bounds = d3.geoBounds(feature);
      const [[minLng, minLat], [maxLng, maxLat]] = bounds;
      const step = dotSpacing * 0.14;
      for (let lng = minLng; lng <= maxLng; lng += step) {
        for (let lat = minLat; lat <= maxLat; lat += step) {
          const pt: [number, number] = [lng, lat];
          if (pointInFeature(pt, feature)) {
            dots.push(pt);
          }
        }
      }
      return dots;
    };

    let landFeatures: any = null;

    // Asynchronously fetch high-detail Natural Earth GeoJSON for full density
    fetch(
      'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/110m/physical/ne_110m_land.json'
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        landFeatures = data;
        const generated: { lng: number; lat: number }[] = [];
        data.features.forEach((feat: any) => {
          const d = generateDotsInPolygon(feat, 20);
          d.forEach(([lng, lat]) => generated.push({ lng, lat }));
        });
        if (generated.length > 0) {
          landDots.length = 0;
          generated.forEach((pt) => landDots.push(pt));
        }
      })
      .catch(() => {
        // Fallback already in memory
      });

    // Render loop
    const render = () => {
      context.clearRect(0, 0, containerWidth, containerHeight);

      const currentScale = projection.scale();
      const scaleFactor = currentScale / radius;

      // 1. Globe Base Void Circle with Outer Tactical Atmospheric Glow
      const center = projection.translate();
      const grad = context.createRadialGradient(
        center[0],
        center[1],
        currentScale * 0.85,
        center[0],
        center[1],
        currentScale * 1.05
      );
      if (isDark) {
        grad.addColorStop(0, '#000000');
        grad.addColorStop(0.9, '#081005');
        grad.addColorStop(1, 'rgba(82, 106, 39, 0.25)');
      } else {
        grad.addColorStop(0, '#f8fafc');
        grad.addColorStop(0.9, '#f1f5f9');
        grad.addColorStop(1, 'rgba(82, 106, 39, 0.2)');
      }

      context.beginPath();
      context.arc(center[0], center[1], currentScale, 0, 2 * Math.PI);
      context.fillStyle = grad;
      context.fill();
      context.strokeStyle = isDark ? 'rgba(82, 106, 39, 0.6)' : 'rgba(82, 106, 39, 0.5)';
      context.lineWidth = 1.5 * scaleFactor;
      context.stroke();

      // Outer Halo Ring
      context.beginPath();
      context.arc(center[0], center[1], currentScale + 8 * scaleFactor, 0, 2 * Math.PI);
      context.strokeStyle = isDark ? 'rgba(82, 106, 39, 0.3)' : 'rgba(82, 106, 39, 0.2)';
      context.lineWidth = 1;
      context.stroke();

      // 2. Graticules (Latitude & Longitude Grid Lines)
      const graticule = d3.geoGraticule().step([20, 20]);
      context.beginPath();
      path(graticule());
      context.strokeStyle = isDark ? 'rgba(82, 106, 39, 0.22)' : 'rgba(82, 106, 39, 0.2)';
      context.lineWidth = 0.8 * scaleFactor;
      context.stroke();

      // Equator Accent Line
      const equator = d3.geoCircle().center([0, 0]).radius(90);
      context.beginPath();
      path(equator());
      context.strokeStyle = isDark ? 'rgba(164, 198, 57, 0.45)' : 'rgba(82, 106, 39, 0.35)';
      context.lineWidth = 1 * scaleFactor;
      context.stroke();

      // 3. Land Coastline Outlines (if loaded)
      if (landFeatures) {
        context.beginPath();
        landFeatures.features.forEach((feature: any) => {
          path(feature);
        });
        context.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(71, 85, 105, 0.28)';
        context.lineWidth = 0.7 * scaleFactor;
        context.stroke();
      }

      // 4. Halftone / Dotted Matrix Land Points
      context.fillStyle = isDark ? '#a4c639' : '#526a27';
      landDots.forEach((dot) => {
        const pt = projection([dot.lng, dot.lat]);
        if (
          pt &&
          pt[0] >= 0 &&
          pt[0] <= containerWidth &&
          pt[1] >= 0 &&
          pt[1] <= containerHeight
        ) {
          context.beginPath();
          context.arc(pt[0], pt[1], 1.2 * scaleFactor, 0, 2 * Math.PI);
          context.fill();
        }
      });

      // 5. Data Stream Trajectory Arcs to Sector 04
      const sector04 = DEFENSE_SECTORS[0];
      const p04 = projection(sector04.coords);

      DEFENSE_SECTORS.slice(1).forEach((sec) => {
        const pSec = projection(sec.coords);
        if (p04 && pSec) {
          // Arc Line
          context.beginPath();
          context.moveTo(pSec[0], pSec[1]);
          const midX = (pSec[0] + p04[0]) / 2;
          const midY = (pSec[1] + p04[1]) / 2 - 30 * scaleFactor;
          context.quadraticCurveTo(midX, midY, p04[0], p04[1]);
          context.strokeStyle = isDark ? 'rgba(82, 106, 39, 0.5)' : 'rgba(82, 106, 39, 0.45)';
          context.setLineDash([4, 4]);
          context.lineWidth = 1.2 * scaleFactor;
          context.stroke();
          context.setLineDash([]);

          // Traveling Photon Particle along Arc
          const t = (photonOffset % 100) / 100;
          const curX = (1 - t) * (1 - t) * pSec[0] + 2 * (1 - t) * t * midX + t * t * p04[0];
          const curY = (1 - t) * (1 - t) * pSec[1] + 2 * (1 - t) * t * midY + t * t * p04[1];

          context.beginPath();
          context.arc(curX, curY, 2.5 * scaleFactor, 0, 2 * Math.PI);
          context.fillStyle = isDark ? '#c6ff00' : '#526a27';
          context.shadowColor = isDark ? '#a4c639' : '#526a27';
          context.shadowBlur = 8;
          context.fill();
          context.shadowBlur = 0;
        }
      });

      // 6. Tactical Defense Sector Markers
      DEFENSE_SECTORS.forEach((sec) => {
        const pos = projection(sec.coords);
        if (
          pos &&
          pos[0] >= 0 &&
          pos[0] <= containerWidth &&
          pos[1] >= 0 &&
          pos[1] <= containerHeight
        ) {
          const isCommand = sec.type === 'command';
          const isWarning = sec.status === 'warning';
          const nodeColor = isCommand ? '#a4c639' : isWarning ? '#f59e0b' : isDark ? '#a4c639' : '#526a27';

          // Pulse Ring
          context.beginPath();
          context.arc(pos[0], pos[1], 8 * scaleFactor, 0, 2 * Math.PI);
          context.strokeStyle = nodeColor;
          context.lineWidth = 1;
          context.stroke();

          // Center Solid Dot
          context.beginPath();
          context.arc(pos[0], pos[1], 3.5 * scaleFactor, 0, 2 * Math.PI);
          context.fillStyle = nodeColor;
          context.shadowColor = nodeColor;
          context.shadowBlur = 10;
          context.fill();
          context.shadowBlur = 0;

          // Callout Label
          context.font = '10px JetBrains Mono, monospace';
          context.fillStyle = isDark ? '#f8fafc' : '#0f172a';
          context.fillText(sec.code, pos[0] + 10, pos[1] - 4);
        }
      });
    };

    // Animation Loop
    const animate = () => {
      if (autoRotate) {
        rotation[0] += rotationSpeed;
        projection.rotate(rotation);
      }
      photonOffset += 1.2;
      render();
      animFrameId = requestAnimationFrame(animate);
    };

    animFrameId = requestAnimationFrame(animate);

    // Mouse Interaction (Drag to rotate, Scroll to zoom)
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startRotation = [...rotation];

    const handleMouseDown = (e: MouseEvent) => {
      if (!interactive) return;
      isDragging = true;
      autoRotate = false;
      startX = e.clientX;
      startY = e.clientY;
      startRotation = [...projection.rotate()];
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !interactive) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const sensitivity = 0.35;

      const newLng = startRotation[0] + dx * sensitivity;
      const newLat = Math.max(-85, Math.min(85, startRotation[1] - dy * sensitivity));

      rotation[0] = newLng;
      rotation[1] = newLat;
      projection.rotate([newLng, newLat]);
    };

    const handleMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      if (isRotating) {
        setTimeout(() => {
          autoRotate = true;
        }, 1500);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (!interactive) return;
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      const newScale = Math.max(radius * 0.7, Math.min(radius * 2.8, projection.scale() * factor));
      projection.scale(newScale);
      setCurrentZoom(newScale / radius);
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      cancelAnimationFrame(animFrameId);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [width, height, isRotating, interactive]);

  const handlePivotSector = (sec: DefenseSectorNode) => {
    setActiveSector(sec);
    if (onSelectSector) onSelectSector(sec);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center bg-card rounded-2xl p-8 text-rose-400 font-mono text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* 3D CANVAS VIEW */}
      <div className={`relative rounded-2xl overflow-hidden border shadow-2xl backdrop-blur-md ${
        isDark ? 'border-white/10 bg-[#03060a]/90 shadow-black/80' : 'border-slate-200 bg-white/80 shadow-slate-300/60'
      }`}>
        <canvas ref={canvasRef} className="cursor-grab active:cursor-grabbing block" />

        {/* TOP HUD TELEMETRY BADGE */}
        <div className={`absolute top-3 left-3 flex items-center gap-2 border px-3 py-1.5 rounded-md text-[11px] font-mono backdrop-blur ${
          isDark ? 'bg-[#000000]/90 border-[#526a27]/60 text-slate-300' : 'bg-white/90 border-slate-200 text-slate-800 shadow-sm'
        }`}>
          <span className="w-2 h-2 rounded-full bg-[#a4c639] animate-ping shadow-[0_0_6px_#a4c639]" />
          <span className="font-semibold uppercase">Global Spatial Grid</span>
          <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>|</span>
          <span className="text-[#a4c639] font-bold">4D ORTHOGRAPHIC</span>
        </div>

        {/* BOTTOM HUD INTERACTION CONTROLS */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <div className={`pointer-events-auto border px-2.5 py-1 rounded text-[10px] font-mono ${
            isDark ? 'bg-[#000000]/90 border-[#526a27]/40 text-slate-400' : 'bg-white/95 border-slate-200 text-slate-600 shadow-sm'
          }`}>
            Drag to Rotate • Scroll to Zoom ({Math.round(currentZoom * 100)}%)
          </div>

          <button
            type="button"
            onClick={() => setIsRotating(!isRotating)}
            className={`pointer-events-auto border px-2.5 py-1 rounded text-[10px] font-mono transition-colors cursor-pointer ${
              isDark
                ? 'bg-[#000000]/90 hover:bg-[#33401c]/40 border-[#526a27]/50 text-slate-300 hover:text-white'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-950 shadow-sm'
            }`}
          >
            {isRotating ? 'Pause Orbit' : 'Auto-Orbit'}
          </button>
        </div>
      </div>

      {/* DEFENSE SECTOR SELECTION CHIPS */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 max-w-full">
        {DEFENSE_SECTORS.map((sec) => (
          <button
            key={sec.id}
            type="button"
            onClick={() => handlePivotSector(sec)}
            className={`px-2.5 py-1 rounded border text-xs font-mono transition-all cursor-pointer ${
              activeSector?.id === sec.id
                ? 'bg-[#33401c] border-[#526a27] text-[#a4c639] shadow-[0_0_12px_rgba(82,106,39,0.5)]'
                : isDark
                ? 'bg-[#000000]/90 border-white/10 text-slate-400 hover:text-slate-200 hover:border-[#526a27]/50'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-sm'
            }`}
          >
            <span className="font-semibold">{sec.code}</span>: {sec.name}
          </button>
        ))}
      </div>

      {/* SECTOR TELEMETRY CARD */}
      {activeSector && (
        <div className={`mt-2 w-full max-w-md border rounded p-2 text-xs font-mono flex items-center justify-between shadow-md ${
          isDark ? 'bg-[#070d17]/90 border-white/10 text-slate-300' : 'bg-white/95 border-slate-200 text-slate-800'
        }`}>
          <div>
            <span className="text-[#a4c639] font-bold">{activeSector.name}</span>
            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{activeSector.description}</p>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-[#33401c]/90 border border-[#526a27] text-[#a4c639] shrink-0 ml-2">
            {activeSector.status}
          </span>
        </div>
      )}
    </div>
  );
};

export default WireframeDottedGlobe;

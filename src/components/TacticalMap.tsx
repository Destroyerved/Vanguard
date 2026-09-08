import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { UnifiedEvent, CorrelationCluster } from '../types/schema';
import {
  Globe,
  ShieldAlert,
  Navigation,
  Layers,
  Filter,
  Maximize2,
  Minimize2,
  ExternalLink,
  Radio,
  Eye,
  Crosshair,
  Compass,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Plane,
  Ship,
  Truck,
  Users,
  CloudRain,
  MapPin,
  Activity,
  Zap,
  Target
} from 'lucide-react';

interface TacticalMapProps {
  events: UnifiedEvent[];
  clusters?: CorrelationCluster[];
  selectedEventId?: string;
  onSelectEvent: (event: UnifiedEvent) => void;
}

type MapLayerType = 'dark' | 'satellite' | 'dark_terrain';

// Mercator Projection Math
function latLngToWorld(lat: number, lng: number, zoom: number) {
  const scale = 256 * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = (0.5 - mercN / (2 * Math.PI)) * scale;
  return { x, y };
}

function worldToLatLng(x: number, y: number, zoom: number) {
  const scale = 256 * Math.pow(2, zoom);
  const lng = (x / scale) * 360 - 180;
  const mercN = (0.5 - y / scale) * (2 * Math.PI);
  const latRad = 2 * Math.atan(Math.exp(mercN)) - Math.PI / 2;
  const lat = (latRad * 180) / Math.PI;
  return { lat, lng };
}

function getMetersPerPixel(lat: number, zoom: number) {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}

/** True when the selected event is a member of this cluster (highlights it). */
function aliveMemberId(cluster: CorrelationCluster, selectedEventId?: string): boolean {
  return Boolean(selectedEventId && cluster.eventIds.includes(selectedEventId));
}

export default function TacticalMap({
  events,
  clusters = [],
  selectedEventId,
  onSelectEvent
}: TacticalMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 480 });

  // Map Navigation State
  const [center, setCenter] = useState<{ lat: number; lng: number }>({
    lat: 23.0300,
    lng: 72.5600
  });
  const [zoom, setZoom] = useState<number>(11);
  const [activeLayer, setActiveLayer] = useState<MapLayerType>('dark');
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Interaction Filters
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [showAnomaliesOnly, setShowAnomaliesOnly] = useState<boolean>(false);
  const [showRangeRings, setShowRangeRings] = useState<boolean>(true);
  const [showCorrelationArcs, setShowCorrelationArcs] = useState<boolean>(true);
  const [showRadarSweep, setShowRadarSweep] = useState<boolean>(true);
  const [activeHoverEvent, setActiveHoverEvent] = useState<UnifiedEvent | null>(null);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; centerLat: number; centerLng: number } | null>(null);

  // Update container size on mount / window resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setDimensions({ width: rect.width, height: rect.height });
        }
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Filter events based on active controls
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      if (selectedSource !== 'all' && evt.sourceType !== selectedSource) return false;
      if (selectedSeverity !== 'all' && evt.severity !== selectedSeverity) return false;
      if (showAnomaliesOnly && !evt.isAnomaly) return false;
      return true;
    });
  }, [events, selectedSource, selectedSeverity, showAnomaliesOnly]);

  // Recenter on active events
  const handleRecenter = useCallback(() => {
    const validCoords = filteredEvents
      .map((e) => e.location)
      .filter((loc): loc is { lat: number; lng: number } => Boolean(loc && typeof loc.lat === 'number' && typeof loc.lng === 'number'));

    if (validCoords.length > 0) {
      const avgLat = validCoords.reduce((sum, c) => sum + c.lat, 0) / validCoords.length;
      const avgLng = validCoords.reduce((sum, c) => sum + c.lng, 0) / validCoords.length;
      setCenter({ lat: avgLat, lng: avgLng });
      setZoom(11);
    } else {
      setCenter({ lat: 23.0300, lng: 72.5600 });
      setZoom(11);
    }
  }, [filteredEvents]);

  // Click a cluster badge → fly to its centroid and drive zoom in so members separate.
  const flyToCluster = useCallback((cluster: CorrelationCluster) => {
    const zoomed = cluster.eventIds.length >= 6 ? zoom + 3 : zoom + 2;
    setCenter({ lat: cluster.centroid.lat, lng: cluster.centroid.lng });
    setZoom(() => Math.min(16, Math.max(12, zoomed)));
  }, [zoom]);

  // Mouse Drag to Pan
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return; // Left click only
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      centerLat: center.lat,
      centerLng: center.lng
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;

    // Track Cursor GPS Coordinates
    const centerWorld = latLngToWorld(center.lat, center.lng, zoom);
    const cursorWorldX = centerWorld.x + (localX - dimensions.width / 2);
    const cursorWorldY = centerWorld.y + (localY - dimensions.height / 2);
    const coords = worldToLatLng(cursorWorldX, cursorWorldY, zoom);
    setCursorCoords(coords);

    if (!isDragging || !dragStartRef.current) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    const startCenterWorld = latLngToWorld(
      dragStartRef.current.centerLat,
      dragStartRef.current.centerLng,
      zoom
    );
    const newCenterWorldX = startCenterWorld.x - dx;
    const newCenterWorldY = startCenterWorld.y - dy;
    const newCenter = worldToLatLng(newCenterWorldX, newCenterWorldY, zoom);

    setCenter(newCenter);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    dragStartRef.current = null;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  // Wheel to Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom((z) => Math.min(16, z + 1));
    } else if (e.deltaY > 0) {
      setZoom((z) => Math.max(6, z - 1));
    }
  };

  // Calculate Visible Slippy Map Tiles
  const visibleTiles = useMemo(() => {
    const { width, height } = dimensions;
    const centerWorld = latLngToWorld(center.lat, center.lng, zoom);

    const x0 = centerWorld.x - width / 2;
    const y0 = centerWorld.y - height / 2;
    const x1 = centerWorld.x + width / 2;
    const y1 = centerWorld.y + height / 2;

    const minTileX = Math.floor(x0 / 256);
    const maxTileX = Math.floor(x1 / 256);
    const minTileY = Math.floor(y0 / 256);
    const maxTileY = Math.floor(y1 / 256);

    const maxTilesPerAxis = Math.pow(2, zoom);
    const tiles: Array<{ key: string; url: string; x: number; y: number }> = [];

    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        const wrappedX = ((tx % maxTilesPerAxis) + maxTilesPerAxis) % maxTilesPerAxis;
        if (ty < 0 || ty >= maxTilesPerAxis) continue;

        let url = '';
        if (activeLayer === 'dark') {
          url = `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${zoom}/${ty}/${wrappedX}`;
        } else if (activeLayer === 'satellite') {
          url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ty}/${wrappedX}`;
        } else {
          url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/${zoom}/${ty}/${wrappedX}`;
        }

        const screenX = tx * 256 - x0;
        const screenY = ty * 256 - y0;

        tiles.push({
          key: `${zoom}-${tx}-${ty}`,
          url,
          x: screenX,
          y: screenY
        });
      }
    }
    return tiles;
  }, [center, zoom, dimensions, activeLayer]);

  // Project events to screen pixel coordinates
  const projectedEvents = useMemo(() => {
    const { width, height } = dimensions;
    const centerWorld = latLngToWorld(center.lat, center.lng, zoom);
    const x0 = centerWorld.x - width / 2;
    const y0 = centerWorld.y - height / 2;

    return filteredEvents.map((evt) => {
      const lat = typeof evt.location?.lat === 'number' ? evt.location.lat : 23.0225;
      const lng = typeof evt.location?.lng === 'number' ? evt.location.lng : 72.5714;
      const world = latLngToWorld(lat, lng, zoom);
      const screenX = world.x - x0;
      const screenY = world.y - y0;
      const isVisible = screenX >= -50 && screenX <= width + 50 && screenY >= -50 && screenY <= height + 50;

      return {
        ...evt,
        lat,
        lng,
        screenX,
        screenY,
        isVisible
      };
    });
  }, [filteredEvents, center, zoom, dimensions]);

  // Center Base Station coordinates
  const baseStationScreen = useMemo(() => {
    const { width, height } = dimensions;
    const centerWorld = latLngToWorld(center.lat, center.lng, zoom);
    const baseWorld = latLngToWorld(23.0300, 72.5600, zoom);
    return {
      x: baseWorld.x - (centerWorld.x - width / 2),
      y: baseWorld.y - (centerWorld.y - height / 2)
    };
  }, [center, zoom, dimensions]);

  // Fusion correlation clusters → screen positions (F-13 map clustering).
  const projectedClusters = useMemo(() => {
    const { width, height } = dimensions;
    const centerWorld = latLngToWorld(center.lat, center.lng, zoom);
    const x0 = centerWorld.x - width / 2;
    const y0 = centerWorld.y - height / 2;
    const mPerPx = getMetersPerPixel(center.lat, zoom);

    return clusters
      .map((cluster) => {
        const lat = cluster.centroid?.lat ?? 23.0225;
        const lng = cluster.centroid?.lng ?? 72.5714;
        const world = latLngToWorld(lat, lng, zoom);
        const screenX = world.x - x0;
        const screenY = world.y - y0;
        const isVisible =
          screenX >= -(cluster.radiusMeters / mPerPx) - 40 &&
          screenX <= width + (cluster.radiusMeters / mPerPx) + 40 &&
          screenY >= -(cluster.radiusMeters / mPerPx) - 40 &&
          screenY <= height + (cluster.radiusMeters / mPerPx) + 40;

        return {
          ...cluster,
          lat,
          lng,
          screenX,
          screenY,
          isVisible,
          radiusPx: cluster.radiusMeters / mPerPx,
        };
      })
      .filter((c) => c.isVisible);
  }, [clusters, center, zoom, dimensions]);

  // Range rings radius in pixels
  const mPerPx = getMetersPerPixel(center.lat, zoom);
  const ring10kmPx = 10000 / mPerPx;
  const ring25kmPx = 25000 / mPerPx;
  const ring50kmPx = 50000 / mPerPx;

  // Helper for entity icons based on kind or source
  const getEntityIcon = (evt: UnifiedEvent) => {
    const kind = String(evt.raw?.kind || '').toLowerCase();
    const src = String(evt.sourceType);

    if (kind.includes('aircraft') || kind.includes('rotary') || src === 'radar') {
      return Plane;
    }
    if (kind.includes('vessel') || ((src === 'radar' || src === 'submarine') && evt.title.toLowerCase().includes('vessel'))) {
      return Ship;
    }
    if (kind.includes('vehicle') || (src === 'personnel' && evt.title.toLowerCase().includes('vehicle'))) {
      return Truck;
    }
    if (src === 'personnel') {
      return Users;
    }
    if (src === 'weather') {
      return CloudRain;
    }
    return Radio;
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      className={`relative w-full h-full min-h-[440px] bg-[#05070a] border border-white/10 rounded-sm overflow-hidden select-none font-mono shadow-2xl corner-brackets ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      {/* 1. TILE BASEMAP RENDERING LAYER */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {visibleTiles.map((tile) => (
          <img
            key={tile.key}
            src={tile.url}
            alt=""
            loading="eager"
            style={{
              position: 'absolute',
              left: `${tile.x}px`,
              top: `${tile.y}px`,
              width: '256px',
              height: '256px',
              imageRendering: 'auto'
            }}
            className={
              activeLayer === 'dark_terrain'
                ? 'invert brightness-75 contrast-150 hue-rotate-180'
                : activeLayer === 'dark'
                ? 'brightness-90 contrast-125'
                : 'brightness-95'
            }
          />
        ))}

        {/* TACTICAL HUD GRID & VIGNETTE OVERLAY */}
        <div className="absolute inset-0 tactical-grid-bg opacity-30 pointer-events-none" />
        <div className="absolute inset-0 bg-radial-vignette pointer-events-none" />
      </div>

      {/* 2. TOP TACTICAL CONTROL BAR */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#070b10]/95 border border-white/10 backdrop-blur text-xs">
          <Compass className="w-4 h-4 text-cyan-400" />
          <span className="font-heading font-bold text-sm tracking-wider text-slate-100 uppercase">
            GEOSPATIAL COMMON OPERATING PICTURE
          </span>
          <span className="text-[10px] text-cyan-400 font-bold px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-500/40">
            {filteredEvents.length} TRACKS LIVE
          </span>
          {clusters.length > 0 && (
            <span className="text-[10px] text-violet-300 font-bold px-1.5 py-0.2 rounded bg-violet-950/80 border border-violet-500/40">
              {clusters.length} CLUSTERS
            </span>
          )}
        </div>

        {/* CONTROLS: LAYER SELECTOR, FILTERS, ZOOM */}
        <div className="flex items-center gap-1.5 bg-[#070b10]/95 border border-white/10 rounded p-1 backdrop-blur text-xs">
          {/* Layer Selector */}
          <div className="flex items-center gap-1 pr-1.5 border-r border-white/10">
            {[
              { id: 'dark', label: 'DARK GIS' },
              { id: 'satellite', label: 'ORBITAL SATELLITE' },
              { id: 'dark_terrain', label: 'DARK TERRAIN' },
            ].map((lyr) => (
              <button
                key={lyr.id}
                onClick={() => setActiveLayer(lyr.id as MapLayerType)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  activeLayer === lyr.id
                    ? 'bg-cyan-950 border border-cyan-500/60 text-cyan-300 shadow-hud-glow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lyr.label}
              </button>
            ))}
          </div>

          {/* Feed Filter */}
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="bg-[#05070a] border border-white/10 text-cyan-300 px-2 py-0.5 rounded text-[11px] outline-none focus:border-cyan-500/40"
          >
            <option value="all">All Feeds</option>
            <option value="radar">Radar Tracks</option>
            <option value="weather">Weather Sensors</option>
            <option value="personnel">Patrol Units</option>
            <option value="log">Perimeter C2</option>
            <option value="incident">Dispatch</option>
          </select>

          {/* Arcs Toggle */}
          <button
            onClick={() => setShowCorrelationArcs(!showCorrelationArcs)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
              showCorrelationArcs
                ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300 shadow-hud-glow'
                : 'bg-[#05070a] border-white/10 text-slate-400'
            }`}
            title="Toggle Correlation Arcs"
          >
            ARCS
          </button>

          {/* Anomalies Toggle */}
          <button
            onClick={() => setShowAnomaliesOnly(!showAnomaliesOnly)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
              showAnomaliesOnly
                ? 'bg-rose-950/80 border-rose-500/60 text-rose-300 font-bold'
                : 'bg-[#05070a] border-white/10 text-slate-400 hover:text-slate-200'
            }`}
            title="Filter Anomalies Only"
          >
            ANOMALIES
          </button>

          {/* Zoom Buttons & Reset */}
          <div className="flex items-center gap-1 pl-1.5 border-l border-white/10">
            <button
              onClick={() => setZoom((z) => Math.min(16, z + 1))}
              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-cyan-300"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(6, z - 1))}
              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-cyan-300"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRecenter}
              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-cyan-300"
              title="Fit Fleet / Recenter AO"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. SVG OVERLAY: RANGE RINGS, CORRELATION ARCS, HEADING VECTORS */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
        {/* RADAR BASE STATION RANGE RINGS */}
        {showRangeRings && (
          <g>
            {/* 10km Ring */}
            <circle
              cx={baseStationScreen.x}
              cy={baseStationScreen.y}
              r={ring10kmPx}
              fill="none"
              stroke="rgba(6, 182, 212, 0.25)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            {/* 25km Ring */}
            <circle
              cx={baseStationScreen.x}
              cy={baseStationScreen.y}
              r={ring25kmPx}
              fill="none"
              stroke="rgba(6, 182, 212, 0.20)"
              strokeWidth="1"
              strokeDasharray="6 6"
            />
            {/* 50km Ring */}
            <circle
              cx={baseStationScreen.x}
              cy={baseStationScreen.y}
              r={ring50kmPx}
              fill="none"
              stroke="rgba(6, 182, 212, 0.15)"
              strokeWidth="1"
            />
            {/* Radar Crosshairs */}
            <line
              x1={baseStationScreen.x - ring50kmPx}
              y1={baseStationScreen.y}
              x2={baseStationScreen.x + ring50kmPx}
              y2={baseStationScreen.y}
              stroke="rgba(6, 182, 212, 0.15)"
              strokeWidth="1"
            />
            <line
              x1={baseStationScreen.x}
              y1={baseStationScreen.y - ring50kmPx}
              x2={baseStationScreen.x}
              y2={baseStationScreen.y + ring50kmPx}
              stroke="rgba(6, 182, 212, 0.15)"
              strokeWidth="1"
            />
            {/* Base Station Core Dot */}
            <circle
              cx={baseStationScreen.x}
              cy={baseStationScreen.y}
              r="3.5"
              fill="#06b6d4"
              className="shadow-hud-glow"
            />
          </g>
        )}

        {/* CORRELATION ARCS */}
        {showCorrelationArcs &&
          projectedEvents.map((evt) => {
            if (!evt.corroboratedBy || evt.corroboratedBy.length === 0) return null;

            return evt.corroboratedBy.map((corrId) => {
              const target = projectedEvents.find((e) => e.id === corrId);
              if (!target) return null;

              // Quadratic Bezier Arc Curve
              const midX = (evt.screenX + target.screenX) / 2;
              const midY = (evt.screenY + target.screenY) / 2 - 25;

              return (
                <path
                  key={`${evt.id}-${corrId}`}
                  d={`M ${evt.screenX} ${evt.screenY} Q ${midX} ${midY} ${target.screenX} ${target.screenY}`}
                  fill="none"
                  stroke={evt.isAnomaly ? 'rgba(244, 63, 94, 0.6)' : 'rgba(6, 182, 212, 0.55)'}
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  className="animate-pulse"
                />
              );
            });
          })}

        {/* HEADING VECTOR ARROWS */}
        {projectedEvents.map((evt) => {
          if (typeof evt.raw?.headingDegrees !== 'number') return null;
          const rad = ((evt.raw.headingDegrees - 90) * Math.PI) / 180;
          const len = 28;
          const x2 = evt.screenX + Math.cos(rad) * len;
          const y2 = evt.screenY + Math.sin(rad) * len;

          return (
            <g key={`head-${evt.id}`}>
              <line
                x1={evt.screenX}
                y1={evt.screenY}
                x2={x2}
                y2={y2}
                stroke={evt.severity === 'critical' ? '#f43f5e' : '#06b6d4'}
                strokeWidth="1.5"
              />
              <circle cx={x2} cy={y2} r="1.5" fill="#38bdf8" />
            </g>
          );
        })}
      </svg>

      {/* 4. REAL-TIME DATA ENTITY MARKERS */}
      <div className="absolute inset-0 pointer-events-none z-20">
        {/* FUSION CLUSTER BADGES — click to fly-to / zoom in */}
        {projectedClusters.map((cluster) => {
          const isSelected = aliveMemberId(cluster, selectedEventId);
          const clusterColor =
            cluster.peakSeverity === 'critical'
              ? 'bg-rose-950/80 border-rose-400 text-rose-300'
              : cluster.peakSeverity === 'high'
              ? 'bg-orange-950/80 border-orange-400 text-orange-300'
              : cluster.peakSeverity === 'medium'
              ? 'bg-yellow-950/80 border-yellow-400 text-yellow-300'
              : 'bg-violet-950/80 border-violet-400 text-violet-300';

          return (
            <div
              key={cluster.id}
              style={{
                position: 'absolute',
                left: `${cluster.screenX}px`,
                top: `${cluster.screenY}px`,
                transform: 'translate(-50%, -50%)'
              }}
              className="pointer-events-auto cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                flyToCluster(cluster);
              }}
              title={`Cluster ${cluster.id} — ${cluster.eventIds.length} events, peak ${cluster.peakSeverity}, ~${(cluster.radiusMeters / 1000).toFixed(1)} km radius (click to focus)`}
            >
              {/* Radius ring */}
              <div
                className={`absolute rounded-full border border-dashed pointer-events-none ${isSelected ? 'border-cyan-400 animate-pulse' : 'border-white/25'}`}
                style={{
                  width: `${Math.max(28, cluster.radiusPx * 2)}px`,
                  height: `${Math.max(28, cluster.radiusPx * 2)}px`,
                  left: `${-Math.max(14, cluster.radiusPx)}px`,
                  top: `${-Math.max(14, cluster.radiusPx)}px`,
                }}
              />
              {/* Badge */}
              <div
                className={`w-10 h-10 rounded-full border-2 ${clusterColor} bg-[#070b10] flex flex-col items-center justify-center shadow-xl transition-all group-hover:scale-110`}
              >
                <span className="text-[9px] font-bold leading-none">{cluster.eventIds.length}</span>
                <span className="text-[6px] uppercase leading-none opacity-80 mt-0.5">Linked</span>
              </div>
              {/* Label */}
              <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded bg-black/85 border border-white/10 text-[8px] text-slate-300 whitespace-nowrap shadow-lg pointer-events-none">
                {cluster.distinctSources.length} sources · {cluster.meanConfidence}% conf
              </div>
            </div>
          );
        })}

        {projectedEvents.map((evt) => {
          if (!evt.isVisible) return null;

          const isSelected = selectedEventId === evt.id;
          const Icon = getEntityIcon(evt);

          const beaconColor =
            evt.severity === 'critical'
              ? 'bg-rose-500 border-rose-300 text-rose-300 shadow-threat-red'
              : evt.severity === 'high'
              ? 'bg-orange-500 border-orange-300 text-orange-300'
              : evt.severity === 'medium'
              ? 'bg-yellow-500 border-yellow-300 text-yellow-300'
              : 'bg-cyan-500 border-cyan-300 text-cyan-300';

          const heading = typeof evt.raw?.headingDegrees === 'number' ? evt.raw.headingDegrees : 0;
          const speedKnots = evt.raw?.speedKnots;
          const altitude = evt.location?.altitudeMeters;

          return (
            <div
              key={evt.id}
              style={{
                position: 'absolute',
                left: `${evt.screenX}px`,
                top: `${evt.screenY}px`,
                transform: 'translate(-50%, -50%)'
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectEvent(evt);
              }}
              onMouseEnter={() => setActiveHoverEvent(evt)}
              onMouseLeave={() => setActiveHoverEvent(null)}
              className="pointer-events-auto cursor-pointer group transition-transform"
            >
              {/* Pulsing Outer Ring on Selected or Critical */}
              {(isSelected || evt.severity === 'critical') && (
                <div className="absolute -inset-3 rounded-full bg-rose-500/30 animate-ping pointer-events-none" />
              )}

              {/* Target Lock Reticle for Selected Entity */}
              {isSelected && (
                <div className="absolute -inset-2.5 border border-cyan-400 rounded-sm animate-pulse pointer-events-none">
                  <div className="absolute -top-1 -left-1 w-1.5 h-1.5 border-t-2 border-l-2 border-cyan-300" />
                  <div className="absolute -top-1 -right-1 w-1.5 h-1.5 border-t-2 border-r-2 border-cyan-300" />
                  <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 border-b-2 border-l-2 border-cyan-300" />
                  <div className="absolute -bottom-1 -right-1 w-1.5 h-1.5 border-b-2 border-r-2 border-cyan-300" />
                </div>
              )}

              {/* Entity Node with Rotation */}
              <div
                style={{ transform: `rotate(${heading}deg)` }}
                className={`w-6 h-6 rounded-full border-2 ${beaconColor} flex items-center justify-center bg-[#070b10] shadow-md transition-all group-hover:scale-125`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>

              {/* Compact Floating Label */}
              <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded bg-black/85 border border-white/10 text-[9px] text-slate-200 whitespace-nowrap shadow-lg flex items-center gap-1 pointer-events-none">
                <span className="font-bold text-cyan-300">{evt.id}</span>
                {speedKnots !== undefined && <span className="text-[8px] text-slate-400">{String(speedKnots)}kt</span>}
              </div>

              {/* INTERACTIVE HOVER TELEMETRY CARD */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-50 p-3 rounded-md bg-[#070b10]/95 border border-cyan-500/50 shadow-2xl text-[10px] whitespace-nowrap pointer-events-none space-y-1.5 backdrop-blur-md">
                <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-1">
                  <span className="font-bold text-cyan-300 text-xs flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" /> {evt.id}
                  </span>
                  <span className="text-emerald-400 font-bold px-1 rounded bg-emerald-950/80 border border-emerald-500/30">
                    {evt.confidence}% CONF
                  </span>
                </div>

                <div className="font-semibold text-slate-100">{evt.title}</div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-slate-300 text-[9px]">
                  <span>Source: <strong className="text-cyan-300">{evt.sourceType.toUpperCase()}</strong></span>
                  <span>Severity: <strong className={evt.severity === 'critical' ? 'text-rose-400' : 'text-slate-200'}>{evt.severity.toUpperCase()}</strong></span>
                  {speedKnots !== undefined && <span>Speed: <strong>{String(speedKnots)} knots</strong></span>}
                  {altitude !== undefined && <span>Altitude: <strong>{String(altitude)}m</strong></span>}
                  {evt.raw?.transponder && <span>Squawk: <strong>{String(evt.raw.transponder)}</strong></span>}
                  {evt.raw?.classification && <span>IFF: <strong>{String(evt.raw.classification).toUpperCase()}</strong></span>}
                </div>

                <div className="pt-1 text-[8px] text-slate-400 border-t border-white/5 font-mono">
                  GPS: {evt.lat.toFixed(4)}°N, {evt.lng.toFixed(4)}°E
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. BOTTOM TELEMETRY HUD BAR */}
      <div className="absolute bottom-2 left-2 right-2 z-30 flex items-center justify-between text-[10px] text-slate-400 bg-[#070b10]/90 border border-white/10 rounded px-3 py-1.5 backdrop-blur pointer-events-none">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-hud-glow animate-pulse" />
            <span className="text-slate-200 font-bold">FUSION RADAR MAP</span>
          </span>
          <span>
            CENTER: {center.lat.toFixed(4)}°N, {center.lng.toFixed(4)}°E (SECTOR 04)
          </span>
          {cursorCoords && (
            <span className="text-cyan-400 hidden sm:inline">
              CURSOR: {cursorCoords.lat.toFixed(4)}°N, {cursorCoords.lng.toFixed(4)}°E
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-300 font-bold">ZOOM: {zoom}x</span>
          <span className="text-cyan-400 font-bold">PROJECTION: MERCATOR WGS84</span>
        </div>
      </div>
    </div>
  );
}

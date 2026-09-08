import React, { useState } from 'react';
import { UnifiedEvent } from '../types/schema';
import {
  Globe,
  ShieldAlert,
  Navigation,
  Layers,
  Filter,
  Maximize2,
  ExternalLink,
  Radio,
  Eye,
  Crosshair,
  Compass,
  AlertTriangle
} from 'lucide-react';

interface TacticalMapProps {
  events: UnifiedEvent[];
  selectedEventId?: string;
  onSelectEvent: (event: UnifiedEvent) => void;
}

export default function TacticalMap({
  events,
  selectedEventId,
  onSelectEvent
}: TacticalMapProps) {
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [showAnomaliesOnly, setShowAnomaliesOnly] = useState<boolean>(false);
  const [showRangeRings, setShowRangeRings] = useState<boolean>(true);
  const [showCorrelationArcs, setShowCorrelationArcs] = useState<boolean>(true);
  const [activeHoverEvent, setActiveHoverEvent] = useState<UnifiedEvent | null>(null);

  // Filter events based on selection
  const filteredEvents = events.filter((evt) => {
    if (selectedSource !== 'all' && evt.sourceType !== selectedSource) return false;
    if (selectedSeverity !== 'all' && evt.severity !== selectedSeverity) return false;
    if (showAnomaliesOnly && !evt.isAnomaly) return false;
    return true;
  });

  // Calculate dynamic coordinate bounds
  const lats = filteredEvents.map((e) => e.location?.lat).filter(Boolean);
  const lngs = filteredEvents.map((e) => e.location?.lng).filter(Boolean);

  const minLat = lats.length ? Math.min(...lats) - 0.08 : 22.8;
  const maxLat = lats.length ? Math.max(...lats) + 0.08 : 23.4;
  const minLng = lngs.length ? Math.min(...lngs) - 0.08 : 72.3;
  const maxLng = lngs.length ? Math.max(...lngs) + 0.08 : 72.9;

  const getCanvasPos = (lat: number, lng: number) => {
    const latSpan = maxLat - minLat || 0.1;
    const lngSpan = maxLng - minLng || 0.1;

    const x = Math.min(94, Math.max(6, ((lng - minLng) / lngSpan) * 100));
    const y = Math.min(94, Math.max(6, (1 - (lat - minLat) / latSpan) * 100));
    return { x, y };
  };

  return (
    <div className="instrument-panel rounded-sm border border-white/10 corner-brackets font-mono select-none flex flex-col h-full overflow-hidden shadow-tactical">
      {/* 1. MAP TOP CONTROL BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 border-b border-white/10 bg-[#070b10]">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-cyan-400" />
          <span className="font-heading font-bold text-sm tracking-wider text-slate-100 uppercase">
            GEOSPATIAL COMMON OPERATING PICTURE
          </span>
          <span className="text-[10px] text-slate-400">| SECTOR 4 ({filteredEvents.length} TRACKS)</span>
        </div>

        {/* LAYER TOGGLES & FILTERS */}
        <div className="flex items-center gap-2 text-xs">
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="bg-[#05070a] border border-white/10 text-cyan-300 px-2 py-1 rounded text-xs outline-none focus:border-cyan-500/40"
          >
            <option value="all">All Feeds</option>
            <option value="radar">Radar Tracks</option>
            <option value="weather">Weather Hazards</option>
            <option value="personnel">Patrol Squads</option>
            <option value="log">Perimeter Sensors</option>
            <option value="incident">Dispatch</option>
          </select>

          <button
            onClick={() => setShowCorrelationArcs(!showCorrelationArcs)}
            className={`px-2 py-1 rounded text-xs border transition-all ${
              showCorrelationArcs
                ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                : 'bg-[#05070a] border-white/10 text-slate-400'
            }`}
            title="Toggle Union-Find Correlation Arcs"
          >
            ARCS
          </button>

          <button
            onClick={() => setShowAnomaliesOnly(!showAnomaliesOnly)}
            className={`px-2 py-1 rounded text-xs border transition-all ${
              showAnomaliesOnly
                ? 'bg-rose-950/80 border-rose-500/60 text-rose-300 font-bold'
                : 'bg-[#05070a] border-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            ANOMALIES
          </button>
        </div>
      </div>

      {/* 2. GEOSPATIAL VECTOR CANVAS CONTAINER */}
      <div className="relative flex-1 bg-[#05070a] tactical-grid-bg min-h-[380px] overflow-hidden">
        {/* ROTATING RADAR SWEEP CONE */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-[340px] h-[340px] rounded-full border border-cyan-500/15">
            {/* Range Rings */}
            {showRangeRings && (
              <>
                <div className="absolute inset-8 rounded-full border border-cyan-500/10" />
                <div className="absolute inset-20 rounded-full border border-cyan-500/10" />
                <div className="absolute inset-32 rounded-full border border-cyan-500/10" />
              </>
            )}
            {/* Center Crosshair */}
            <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-500/20" />
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-500/20" />
            {/* Sweep Line */}
            <div className="absolute top-1/2 left-1/2 w-1/2 h-0.5 bg-gradient-to-r from-transparent via-cyan-400/40 to-cyan-300 origin-left animate-sweep" />
          </div>
        </div>

        {/* CORRELATION ARCS BETWEEN CLUSTERED CONTACTS */}
        {showCorrelationArcs && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            {filteredEvents.map((evt) => {
              if (!evt.corroboratedBy || evt.corroboratedBy.length === 0) return null;
              const srcPos = getCanvasPos(evt.location.lat, evt.location.lng);

              return evt.corroboratedBy.map((corrId) => {
                const target = filteredEvents.find((e) => e.id === corrId);
                if (!target) return null;
                const tgtPos = getCanvasPos(target.location.lat, target.location.lng);

                return (
                  <line
                    key={`${evt.id}-${corrId}`}
                    x1={`${srcPos.x}%`}
                    y1={`${srcPos.y}%`}
                    x2={`${tgtPos.x}%`}
                    y2={`${tgtPos.y}%`}
                    stroke="rgba(6, 182, 212, 0.45)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                );
              });
            })}
          </svg>
        )}

        {/* PLOTTED TACTICAL EVENT BEACONS */}
        {filteredEvents.map((evt) => {
          const pos = getCanvasPos(evt.location.lat, evt.location.lng);
          const isSelected = selectedEventId === evt.id;

          const beaconColor =
            evt.severity === 'critical'
              ? 'bg-rose-500 shadow-threat-red border-rose-300'
              : evt.severity === 'high'
              ? 'bg-orange-500 border-orange-300'
              : evt.severity === 'medium'
              ? 'bg-yellow-500 border-yellow-300'
              : 'bg-cyan-500 border-cyan-300';

          return (
            <div
              key={evt.id}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              onClick={() => onSelectEvent(evt)}
              onMouseEnter={() => setActiveHoverEvent(evt)}
              onMouseLeave={() => setActiveHoverEvent(null)}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group transition-transform ${
                isSelected ? 'scale-125 z-30' : 'hover:scale-110'
              }`}
            >
              {/* Pulsing Outer Halo for Critical / Selected */}
              {(isSelected || evt.severity === 'critical') && (
                <div className="absolute -inset-2.5 rounded-full bg-cyan-400/25 animate-ping pointer-events-none" />
              )}

              {/* Pin Node */}
              <div
                className={`w-3.5 h-3.5 rounded-full border-2 ${beaconColor} flex items-center justify-center transition-all`}
              >
                {isSelected && <div className="w-1 h-1 rounded-full bg-white" />}
              </div>

              {/* Mini Label */}
              <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 px-1 py-0.2 rounded bg-black/80 border border-white/10 text-[9px] text-slate-300 whitespace-nowrap pointer-events-none">
                {evt.id}
              </div>

              {/* HOVER DETAILS CARD */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-40 p-2.5 rounded bg-[#070b10] border border-cyan-500/50 shadow-2xl text-[10px] whitespace-nowrap pointer-events-none space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-cyan-300">[{evt.id}]</span>
                  <span className="text-emerald-400 font-bold">{evt.confidence}% CONF</span>
                </div>
                <div className="text-slate-200 font-semibold">{evt.title}</div>
                <div className="text-slate-400 text-[9px]">
                  {evt.location.lat.toFixed(3)}°N, {evt.location.lng.toFixed(3)}°E • {evt.sourceType}
                </div>
              </div>
            </div>
          );
        })}

        {/* MAP BOTTOM TELEMETRY OVERLAY */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-slate-400 bg-[#070b10]/90 border border-white/10 rounded px-3 py-1.5 backdrop-blur pointer-events-none">
          <span>CENTER: 23.0225°N, 72.5714°E (RADAR AHMEDABAD WEST)</span>
          <span className="text-cyan-400">BEARING: 045° TAC-NORTH | GRID: MGRS-43R</span>
        </div>
      </div>
    </div>
  );
}

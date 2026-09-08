import React, { useState } from 'react';
import { UnifiedEvent } from '../types/schema';
import { Globe, ShieldAlert, Navigation, Layers, Filter, Maximize2, ExternalLink } from 'lucide-react';

interface TacticalMapProps {
  events: UnifiedEvent[];
  onSelectEvent: (event: UnifiedEvent) => void;
}

export default function TacticalMap({ events, onSelectEvent }: TacticalMapProps) {
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [showAnomaliesOnly, setShowAnomaliesOnly] = useState<boolean>(false);
  const [activeHoverEvent, setActiveHoverEvent] = useState<UnifiedEvent | null>(null);

  // Filter events based on user selection
  const filteredEvents = events.filter((evt) => {
    if (selectedSource !== 'all' && evt.sourceType !== selectedSource) return false;
    if (selectedSeverity !== 'all' && evt.severity !== selectedSeverity) return false;
    if (showAnomaliesOnly && !evt.isAnomaly) return false;
    return true;
  });

  // Compute map bounding box bounds for coordinate projection
  // Default centered around Sector Alpha (lat ~23.0, lng ~72.5 or 28.6 / 77.2)
  const lats = filteredEvents.map((e) => e.location?.lat).filter(Boolean);
  const lngs = filteredEvents.map((e) => e.location?.lng).filter(Boolean);

  const minLat = lats.length ? Math.min(...lats) - 0.1 : 22.0;
  const maxLat = lats.length ? Math.max(...lats) + 0.1 : 29.0;
  const minLng = lngs.length ? Math.min(...lngs) - 0.1 : 72.0;
  const maxLng = lngs.length ? Math.max(...lngs) + 0.1 : 78.0;

  const getCanvasPos = (lat: number, lng: number) => {
    const latSpan = maxLat - minLat || 1;
    const lngSpan = maxLng - minLng || 1;

    // Projected X (0 to 100%) and Y (0 to 100%, flipped Y axis)
    const x = Math.min(95, Math.max(5, ((lng - minLng) / lngSpan) * 100));
    const y = Math.min(95, Math.max(5, (1 - (lat - minLat) / latSpan) * 100));
    return { x, y };
  };

  return (
    <div className="hud-card p-6 rounded-2xl border border-cyan-500/30 bg-slate-900/80 font-mono shadow-2xl flex flex-col gap-4">
      {/* MAP HEADER CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="font-hud font-bold text-xl text-slate-100 flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400 animate-pulse" /> COMMAND TACTICAL GEOSPATIAL MAP
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Plotting {filteredEvents.length} active multi-source tactical events across Sector Alpha & Beta coordinates.
          </p>
        </div>

        {/* FILTERS */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Source Filter */}
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-cyan-300 px-3 py-1.5 rounded-lg focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Stream Sources</option>
            <option value="radar">Radar Tracks</option>
            <option value="weather">Weather Hazards</option>
            <option value="personnel">Personnel Units</option>
            <option value="log">Cyber Logs</option>
            <option value="incident">Incidents</option>
          </select>

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-cyan-300 px-3 py-1.5 rounded-lg focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical Only</option>
            <option value="high">High & Critical</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Anomaly Toggle */}
          <button
            onClick={() => setShowAnomaliesOnly(!showAnomaliesOnly)}
            className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all ${
              showAnomaliesOnly
                ? 'bg-rose-950 border-rose-600 text-rose-300 font-bold'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{showAnomaliesOnly ? 'Anomalies Only (Active)' : 'Filter Anomalies'}</span>
          </button>
        </div>
      </div>

      {/* TACTICAL MAP DISPLAY */}
      <div className="relative w-full h-[520px] bg-[#070b14] rounded-xl border border-slate-800 overflow-hidden shadow-inner flex items-center justify-center">
        {/* RADAR SWEEP ANIMATION OVERLAY */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.15)_0%,transparent_70%)]"></div>

        {/* GEOSPATIAL TACTICAL GRID LINES */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-cyan-500/10 stroke-[1]">
          {/* Horizontal Grid */}
          <line x1="0" y1="20%" x2="100%" y2="20%" />
          <line x1="0" y1="40%" x2="100%" y2="40%" />
          <line x1="0" y1="60%" x2="100%" y2="60%" />
          <line x1="0" y1="80%" x2="100%" y2="80%" />
          {/* Vertical Grid */}
          <line x1="20%" y1="0" x2="20%" y2="100%" />
          <line x1="40%" y1="0" x2="40%" y2="100%" />
          <line x1="60%" y1="0" x2="60%" y2="100%" />
          <line x1="80%" y1="0" x2="80%" y2="100%" />
          {/* Concentric Radar Rings */}
          <circle cx="50%" cy="50%" r="15%" fill="none" strokeDasharray="4 4" />
          <circle cx="50%" cy="50%" r="30%" fill="none" strokeDasharray="4 4" />
          <circle cx="50%" cy="50%" r="45%" fill="none" strokeDasharray="4 4" />
        </svg>

        {/* RADAR SWEEP CONE */}
        <div className="absolute w-[500px] h-[500px] rounded-full border border-cyan-500/20 pointer-events-none animate-spin [animation-duration:12s]">
          <div className="w-1/2 h-1/2 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-tl-full"></div>
        </div>

        {/* MAP HUD OVERLAYS */}
        <div className="absolute top-3 left-3 bg-slate-950/90 border border-slate-800 p-2.5 rounded-lg text-[10px] text-slate-400 space-y-1 backdrop-blur-md">
          <div className="text-cyan-400 font-bold flex items-center gap-1">
            <Navigation className="w-3 h-3" /> AO BOUNDS
          </div>
          <div>LAT: {minLat.toFixed(2)}°N ➔ {maxLat.toFixed(2)}°N</div>
          <div>LNG: {minLng.toFixed(2)}°E ➔ {maxLng.toFixed(2)}°E</div>
          <div className="text-emerald-400 font-bold">MODE: REAL-TIME TELEMETRY</div>
        </div>

        {/* MAP MARKERS */}
        {filteredEvents.map((evt) => {
          if (!evt.location?.lat || !evt.location?.lng) return null;
          const { x, y } = getCanvasPos(evt.location.lat, evt.location.lng);

          const isCritical = evt.severity === 'critical';
          const isHigh = evt.severity === 'high';
          const isSelected = activeHoverEvent?.id === evt.id;

          const colorClass = isCritical
            ? 'bg-rose-500 border-rose-300 shadow-rose-500/50'
            : isHigh
            ? 'bg-amber-500 border-amber-300 shadow-amber-500/50'
            : 'bg-cyan-500 border-cyan-300 shadow-cyan-500/50';

          return (
            <div
              key={evt.id}
              style={{ left: `${x}%`, top: `${y}%` }}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 group"
              onClick={() => onSelectEvent(evt)}
              onMouseEnter={() => setActiveHoverEvent(evt)}
              onMouseLeave={() => setActiveHoverEvent(null)}
            >
              {/* Pulsating Ring for Critical/High Events */}
              {(isCritical || isHigh || evt.isAnomaly) && (
                <div
                  className={`absolute inset-0 rounded-full animate-ping opacity-75 ${
                    isCritical ? 'bg-rose-500' : 'bg-amber-500'
                  }`}
                ></div>
              )}

              {/* Marker Pin */}
              <div
                className={`relative w-4 h-4 rounded-full border-2 shadow-lg transition-transform group-hover:scale-150 ${colorClass}`}
              ></div>

              {/* Tooltip Hover Overlay */}
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 hidden group-hover:flex flex-col bg-slate-950 border border-cyan-500/80 p-2.5 rounded-lg text-[11px] text-slate-200 whitespace-nowrap z-30 shadow-2xl backdrop-blur-md">
                <div className="font-hud font-bold text-cyan-400 mb-0.5">{evt.title}</div>
                <div className="text-slate-400">
                  {evt.id} • {evt.sourceType.toUpperCase()} • {evt.severity.toUpperCase()}
                </div>
                <div className="text-slate-300 font-bold">
                  {evt.location.lat.toFixed(4)}°, {evt.location.lng.toFixed(4)}°
                </div>
                <div className="text-emerald-400 text-[10px] mt-1 font-bold">CLICK TO EXPLAIN EVENT ➔</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER ACTIONS & EXTERNAL MAP LINK */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 border-t border-slate-800 pt-3 gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Critical Track</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> High Severity</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block"></span> Medium / Low</span>
        </div>

        {activeHoverEvent && (
          <a
            href={`https://www.openstreetmap.org/?mlat=${activeHoverEvent.location?.lat}&mlon=${activeHoverEvent.location?.lng}#map=13/${activeHoverEvent.location?.lat}/${activeHoverEvent.location?.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" /> View Coordinates in OpenStreetMap
          </a>
        )}
      </div>
    </div>
  );
}

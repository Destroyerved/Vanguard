import React, { useState } from 'react';

export interface RadarContact {
  id: string;
  code: string;
  name: string;
  source: 'radar' | 'patrol' | 'perimeter' | 'weather' | 'dispatch';
  angleDeg: number; // 0 - 360
  distancePct: number; // 0 - 100
  speedKt?: number;
  altitudeFt?: number;
  confidence: number;
  severity: 'nominal' | 'warning' | 'critical';
  details: string;
}

const DEFAULT_CONTACTS: RadarContact[] = [
  {
    id: 'TGT-892',
    code: 'RAD-01',
    name: 'Unidentified Kinematic Track',
    source: 'radar',
    angleDeg: 42,
    distancePct: 68,
    speedKt: 260,
    altitudeFt: 18400,
    confidence: 92,
    severity: 'critical',
    details: '23.02N 72.57E, 260 knots, transponder disabled, high-speed approach',
  },
  {
    id: 'GRIZZLY-1',
    code: 'PAT-04',
    name: 'Patrol GRIZZLY-1 Telemetry',
    source: 'patrol',
    angleDeg: 210,
    distancePct: 45,
    speedKt: 24,
    altitudeFt: 0,
    confidence: 88,
    severity: 'warning',
    details: 'Visual contact reported near Sector 04 perimeter coordinate',
  },
  {
    id: 'TRIP-S4',
    code: 'LOG-12',
    name: 'Perimeter IR Beam Trip',
    source: 'perimeter',
    angleDeg: 125,
    distancePct: 35,
    confidence: 80,
    severity: 'critical',
    details: 'Infrared trip active, amplitude 0.87, fence segment B',
  },
  {
    id: 'MET-FRONT',
    code: 'WTH-01',
    name: 'Open-Meteo Storm Front',
    source: 'weather',
    angleDeg: 315,
    distancePct: 82,
    speedKt: 35,
    confidence: 95,
    severity: 'nominal',
    details: 'Visibility 1.8km, squall line heading SE, radar attenuation factor 1.15',
  },
  {
    id: 'DISP-404',
    code: 'DSP-09',
    name: 'Field Dispatch Unit 02',
    source: 'dispatch',
    angleDeg: 80,
    distancePct: 52,
    confidence: 72,
    severity: 'warning',
    details: 'Unauthorized vehicle movement flagged by perimeter checkpoint',
  },
];

export interface LoadingRadarProps {
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showContacts?: boolean;
  contacts?: RadarContact[];
  onSelectContact?: (contact: RadarContact) => void;
  colorScheme?: 'olive' | 'lime' | 'amber';
  interactiveControls?: boolean;
  className?: string;
  theme?: 'dark' | 'light';
}

export const LoadingRadar: React.FC<LoadingRadarProps> = ({
  size = 'md',
  showContacts = true,
  contacts = DEFAULT_CONTACTS,
  onSelectContact,
  colorScheme = 'olive',
  interactiveControls = false,
  className = '',
  theme = 'dark',
}) => {
  const [activeTheme, setActiveTheme] = useState<'olive' | 'lime' | 'amber'>(colorScheme);
  const [sweepDuration, setSweepDuration] = useState<number>(2); // seconds
  const [hoveredContact, setHoveredContact] = useState<RadarContact | null>(null);
  const [selectedContact, setSelectedContact] = useState<RadarContact | null>(null);

  const isDark = theme === 'dark';

  const sizePixels =
    size === 'sm' ? 140 : size === 'md' ? 220 : size === 'lg' ? 300 : 380;

  const colorConfig = {
    olive: {
      sweepBg: '#526a27',
      glow: 'rgba(82, 106, 39, 0.85)',
      dropShadow: 'drop-shadow-[15px_15px_25px_rgba(82,106,39,0.85)]',
      borderRing: 'border-[#526a27]/60',
      activeText: 'text-[#a4c639]',
      badge: 'bg-[#33401c]/90 border-[#526a27] text-[#a4c639]',
    },
    lime: {
      sweepBg: '#a4c639',
      glow: 'rgba(164, 198, 57, 0.85)',
      dropShadow: 'drop-shadow-[15px_15px_25px_rgba(164,198,57,0.85)]',
      borderRing: 'border-[#a4c639]/60',
      activeText: 'text-[#c6ff00]',
      badge: 'bg-[#33401c]/90 border-[#526a27] text-[#a4c639]',
    },
    amber: {
      sweepBg: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.7)',
      dropShadow: 'drop-shadow-[15px_15px_25px_rgba(245,158,11,0.8)]',
      borderRing: 'border-amber-500/30',
      activeText: 'text-amber-400',
      badge: 'bg-amber-950/80 border-amber-500/50 text-amber-300',
    },
  }[activeTheme];

  const handleContactClick = (c: RadarContact) => {
    setSelectedContact(c);
    if (onSelectContact) onSelectContact(c);
  };

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* RADAR HARDWARE CONTAINER */}
      <div
        className={`relative flex items-center justify-center rounded-full border-2 overflow-hidden bg-[#03070d] ${
          isDark
            ? 'border-[#1e293b] shadow-[25px_25px_75px_rgba(0,0,0,0.85),inset_0_0_35px_rgba(0,0,0,0.9)]'
            : 'border-slate-300 shadow-[0_20px_50px_rgba(14,165,233,0.18),inset_0_0_35px_rgba(0,0,0,0.9)]'
        }`}
        style={{
          width: `${sizePixels}px`,
          height: `${sizePixels}px`,
        }}
      >
        {/* OUTER TACTICAL DEGREE MARKINGS & TICK RING */}
        <div className="absolute inset-0 rounded-full border border-white/10 pointer-events-none" />

        {/* 1. OUTER DASHED RANGE RING (15km) */}
        <div
          className={`absolute rounded-full border border-dashed ${colorConfig.borderRing} shadow-[inset_-5px_-5px_25px_rgba(0,0,0,0.4),inset_5px_5px_35px_rgba(0,0,0,0.4)] pointer-events-none`}
          style={{ inset: `${sizePixels * 0.1}px` }}
        />

        {/* 2. MID DASHED RANGE RING (10km) */}
        <div
          className={`absolute rounded-full border border-dashed ${colorConfig.borderRing} shadow-[inset_-5px_-5px_20px_rgba(0,0,0,0.3),inset_5px_5px_20px_rgba(0,0,0,0.3)] pointer-events-none`}
          style={{ inset: `${sizePixels * 0.25}px` }}
        />

        {/* 3. INNER DASHED RANGE RING (5km) */}
        <div
          className={`absolute rounded-full border border-dashed ${colorConfig.borderRing} shadow-[inset_-3px_-3px_15px_rgba(0,0,0,0.3),inset_3px_3px_15px_rgba(0,0,0,0.3)] pointer-events-none`}
          style={{ inset: `${sizePixels * 0.38}px` }}
        />

        {/* CENTER PIVOT RETICLE */}
        <div className="absolute w-2 h-2 rounded-full bg-white/70 shadow-[0_0_8px_white] z-20 pointer-events-none" />

        {/* CROSSHAIRS (N-S and E-W AXES) */}
        <div className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/15 to-transparent pointer-events-none" />
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

        {/* DEGREE LABELS (000°, 090°, 180°, 270°) */}
        {sizePixels >= 220 && (
          <>
            <span className="absolute top-2 text-[9px] font-mono tracking-widest text-slate-500 pointer-events-none">
              000° N
            </span>
            <span className="absolute right-2 text-[9px] font-mono tracking-widest text-slate-500 pointer-events-none">
              090° E
            </span>
            <span className="absolute bottom-2 text-[9px] font-mono tracking-widest text-slate-500 pointer-events-none">
              180° S
            </span>
            <span className="absolute left-2 text-[9px] font-mono tracking-widest text-slate-500 pointer-events-none">
              270° W
            </span>
          </>
        )}

        {/* RADAR SWEEP BEAM (ruhith369 keyframe radar81) */}
        <span
          className="absolute top-1/2 left-1/2 w-1/2 h-full bg-transparent origin-top-left border-t border-dashed border-white/60 pointer-events-none z-10"
          style={{
            animation: `radar81 ${sweepDuration}s linear infinite`,
          }}
        >
          <span
            className="absolute top-0 left-0 w-full h-full origin-top-left rotate-[-55deg] blur-[24px]"
            style={{
              backgroundColor: colorConfig.sweepBg,
              filter: `drop-shadow(20px 20px 25px ${colorConfig.sweepBg})`,
              opacity: 0.85,
            }}
          />
        </span>

        {/* TACTICAL RADAR CONTACT BLIPS */}
        {showContacts &&
          contacts.map((contact) => {
            const rad = (contact.angleDeg - 90) * (Math.PI / 180);
            const radiusPx = (sizePixels / 2 - 16) * (contact.distancePct / 100);
            const x = sizePixels / 2 + radiusPx * Math.cos(rad);
            const y = sizePixels / 2 + radiusPx * Math.sin(rad);

            const isCritical = contact.severity === 'critical';
            const isWarning = contact.severity === 'warning';
            const blipColor = isCritical
              ? 'bg-rose-500 shadow-[0_0_12px_#f43f5e]'
              : isWarning
              ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24]'
              : 'bg-[#a4c639] shadow-[0_0_10px_#a4c639]';

            return (
              <button
                key={contact.id}
                type="button"
                onClick={() => handleContactClick(contact)}
                onMouseEnter={() => setHoveredContact(contact)}
                onMouseLeave={() => setHoveredContact(null)}
                className="absolute -translate-x-1/2 -translate-y-1/2 group z-20 focus:outline-none cursor-pointer"
                style={{ left: `${x}px`, top: `${y}px` }}
                title={`${contact.name} (${contact.code})`}
              >
                {/* Blip Ping Ring */}
                <div
                  className={`absolute -inset-1.5 rounded-full ${blipColor} opacity-75 animate-ping`}
                />
                {/* Core Blip Dot */}
                <div className={`w-2.5 h-2.5 rounded-full ${blipColor} border border-white/80`} />

                {/* Blip Label on Hover */}
                {sizePixels >= 220 && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute left-3 top-[-8px] pointer-events-none bg-black/90 border border-white/20 text-[10px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap text-white z-30 shadow-lg">
                    {contact.code} • {contact.confidence}%
                  </div>
                )}
              </button>
            );
          })}
      </div>

      {/* KEYFRAME INJECTION FOR RADAR81 */}
      <style>{`
        @keyframes radar81 {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>

      {/* CONTACT INSPECTION OVERLAY (IF HOVERED OR SELECTED) */}
      {(hoveredContact || selectedContact) && sizePixels >= 220 && (
        <div className="mt-3 w-full max-w-[340px] bg-[#070d17]/95 border border-white/10 rounded p-2.5 text-xs font-mono shadow-xl backdrop-blur">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1.5">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {(hoveredContact || selectedContact)?.name}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                (hoveredContact || selectedContact)?.severity === 'critical'
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}
            >
              {(hoveredContact || selectedContact)?.confidence}% CONF
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mb-1.5">
            {(hoveredContact || selectedContact)?.details}
          </p>
          <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-500 pt-1 border-t border-white/5">
            <div>
              SPD:{' '}
              <span className="text-slate-300">
                {(hoveredContact || selectedContact)?.speedKt ?? 'N/A'} kt
              </span>
            </div>
            <div>
              BEARING:{' '}
              <span className="text-slate-300">
                {(hoveredContact || selectedContact)?.angleDeg}°
              </span>
            </div>
            <div>
              ALT:{' '}
              <span className="text-slate-300">
                {(hoveredContact || selectedContact)?.altitudeFt ?? '0'} ft
              </span>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE CONTROLS BAR (IF ENABLED) */}
      {interactiveControls && (
        <div className={`mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono rounded-lg p-2 max-w-full ${
          isDark ? 'text-slate-400 bg-[#070b10] border border-white/10' : 'text-slate-600 bg-white/95 border border-slate-200 shadow-sm'
        }`}>
          <span className={`${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase font-semibold`}>Phosphor:</span>
          {(['olive', 'lime', 'amber'] as const).map((thm) => (
            <button
              key={thm}
              type="button"
              onClick={() => setActiveTheme(thm)}
              className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold transition-colors cursor-pointer ${
                activeTheme === thm
                  ? isDark
                    ? 'bg-[#33401c] text-[#a4c639] border border-[#526a27] font-bold shadow-[0_0_8px_rgba(82,106,39,0.5)]'
                    : 'bg-slate-900 text-white shadow-sm'
                  : isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              {thm}
            </button>
          ))}

          <span className={`ml-2 ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase font-semibold`}>Sweep:</span>
          {[1, 2, 4].map((spd) => (
            <button
              key={spd}
              type="button"
              onClick={() => setSweepDuration(spd)}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                sweepDuration === spd
                  ? 'bg-[#33401c] text-[#a4c639] border border-[#526a27] font-bold shadow-[0_0_8px_rgba(82,106,39,0.5)]'
                  : isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              {spd}s
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LoadingRadar;

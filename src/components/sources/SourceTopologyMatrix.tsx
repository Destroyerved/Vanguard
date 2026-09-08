import React, { useState } from 'react';
import { Server, Activity, Radio, CloudSun, ShieldCheck, AlertTriangle, Zap, WifiOff, Layers } from 'lucide-react';
import { SourceHealthDetail } from '../../types/schema';

interface SourceTopologyMatrixProps {
  sourcesHealth: SourceHealthDetail[];
  onToggleDegradedComms?: (enabled: boolean) => void;
  isDegradedComms?: boolean;
}

const defaultFeeds: SourceHealthDetail[] = [
  {
    sourceType: 'weather',
    sourceName: 'Open-Meteo Meteorological API',
    status: 'live',
    lastUpdate: new Date().toISOString(),
    reliabilityScore: 0.95,
    nominalReliability: 0.95,
    activeCount: 0,
    totalIngested: 0,
    consecutiveFailures: 0,
    meanLatencyMs: 0,
    manuallyDegraded: false,
  },
  {
    sourceType: 'radar',
    sourceName: 'Sector 4 Air Surveillance Radar',
    status: 'live',
    lastUpdate: new Date().toISOString(),
    reliabilityScore: 0.92,
    nominalReliability: 0.92,
    activeCount: 0,
    totalIngested: 0,
    consecutiveFailures: 0,
    meanLatencyMs: 0,
    manuallyDegraded: false,
  },
  {
    sourceType: 'personnel',
    sourceName: 'Tactical Patrol GPS Telemetry',
    status: 'live',
    lastUpdate: new Date().toISOString(),
    reliabilityScore: 0.88,
    nominalReliability: 0.88,
    activeCount: 0,
    totalIngested: 0,
    consecutiveFailures: 0,
    meanLatencyMs: 0,
    manuallyDegraded: false,
  },
  {
    sourceType: 'log',
    sourceName: 'Perimeter Infrared Sensor Tripwires',
    status: 'live',
    lastUpdate: new Date().toISOString(),
    reliabilityScore: 0.8,
    nominalReliability: 0.8,
    activeCount: 0,
    totalIngested: 0,
    consecutiveFailures: 0,
    meanLatencyMs: 0,
    manuallyDegraded: false,
  },
  {
    sourceType: 'incident',
    sourceName: 'Emergency Dispatch & Field Reports',
    status: 'live',
    lastUpdate: new Date().toISOString(),
    reliabilityScore: 0.72,
    nominalReliability: 0.72,
    activeCount: 0,
    totalIngested: 0,
    consecutiveFailures: 0,
    meanLatencyMs: 0,
    manuallyDegraded: false,
  },
];

const feedDescriptions: Record<string, string> = {
  weather: 'Real atmospheric barometer, cloud ceiling, and optical visibility model.',
  radar: 'Primary 2D/3D kinematic tracks, squawk transponder verification, RCS profiling.',
  personnel: 'Ground patrol orbits, visual sighting confirmations, mobile biometric status.',
  log: 'Physical tripwire breaches, acoustic perimeter nodes, seismic ground sensors.',
  incident: 'Unstructured operator dispatch records, civilian distress calls, radio chatter.',
  social_media: 'Geotagged social posts and media artifacts routed into the forensic pipeline.',
  audio_recording: 'Acoustic capture streams analyzed for manipulation and temporal consistency.',
};

const sourceIcons: Record<string, any> = {
  weather: CloudSun,
  radar: Radio,
  personnel: Activity,
  log: ShieldCheck,
  incident: AlertTriangle,
  social_media: Layers,
  audio_recording: Zap,
};

export default function SourceTopologyMatrix({
  sourcesHealth,
  onToggleDegradedComms,
  isDegradedComms = false
}: SourceTopologyMatrixProps) {
  const [localDegraded, setLocalDegraded] = useState(isDegradedComms);

  const liveHealth = Array.isArray(sourcesHealth) ? sourcesHealth : [];
  const seenTypes = new Set(liveHealth.map((h) => h.sourceType));

  // Server health wins when present; static defaults represent the known feed
  // inventory so the topology stays legible even with the backend offline.
  const feeds = [...liveHealth, ...defaultFeeds.filter((d) => !seenTypes.has(d.sourceType))];

  const liveCount = feeds.filter((f) => f.status === 'live').length;
  const downCount = feeds.filter((f) => f.status === 'down').length;
  const degradedCount = feeds.length - liveCount - downCount;

  const handleToggle = () => {
    const next = !localDegraded;
    setLocalDegraded(next);
    if (onToggleDegradedComms) {
      onToggleDegradedComms(next);
    }
  };

  return (
    <div className="instrument-panel rounded-sm p-5 border border-white/10 corner-brackets space-y-4 select-none font-mono text-xs">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-cyan-400" />
          <span className="font-heading font-bold text-sm tracking-wider text-slate-100 uppercase">
            MULTI-SOURCE INGESTION TOPOLOGY & SENSOR HEALTH
          </span>
        </div>

        {/* DEGRADED COMMS TOGGLE BUTTON */}
        <button
          onClick={handleToggle}
          className={`flex items-center gap-2 px-3 py-1.5 rounded font-mono text-xs font-semibold border transition-all ${
            localDegraded
              ? 'bg-amber-950/80 border-amber-500/80 text-amber-300 shadow-hud-glow animate-pulse'
              : 'bg-[#05070a] border-white/10 text-slate-400 hover:text-slate-200'
          }`}
        >
          {localDegraded ? <WifiOff className="w-4 h-4 text-amber-400" /> : <Activity className="w-4 h-4 text-cyan-400" />}
          <span>{localDegraded ? 'DEGRADED COMMS ACTIVE' : 'SIMULATE DEGRADED COMMS'}</span>
        </button>
      </div>

      {/* LIVE FEED CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {feeds.map((feed, idx) => {
          const Icon = sourceIcons[feed.sourceType] || Radio;
          const isLive = feed.status === 'live';
          const isDegraded = feed.status === 'degraded' || feed.manuallyDegraded;
          const stateDot = isLive ? 'bg-emerald-400' : isDegraded ? 'bg-amber-400' : 'bg-rose-500';
          const stateLabel = isLive ? 'LIVE' : isDegraded ? 'DEGRADED' : 'DOWN';
          const netReliability = Math.round(feed.reliabilityScore * 100);

          return (
            <div
              key={feed.sourceType}
              className="p-3.5 rounded bg-[#070b10] border border-white/10 hover:border-cyan-500/40 transition-all space-y-2.5 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[10px] text-slate-500 uppercase">
                    <Icon className="w-3 h-3 text-cyan-400" />
                    {feed.sourceType.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${stateDot}`} />
                    <span className="text-[10px] uppercase font-bold text-slate-300">{stateLabel}</span>
                  </div>
                </div>

                <div className="font-bold text-slate-100 text-sm truncate">{feed.sourceName}</div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  {feedDescriptions[feed.sourceType] || 'Persistent feed into the fusion pipeline.'}
                </p>
                {feed.note && <p className="text-[10px] text-amber-300/90">{feed.note}</p>}
              </div>

              {/* METRIC STRIP */}
              <div className="grid grid-cols-3 gap-1 pt-2 border-t border-white/5 text-[10px]">
                <div className="p-1 rounded bg-[#05070a] text-center">
                  <div className="text-slate-500">NET REL</div>
                  <div className={`font-bold ${isLive ? 'text-emerald-400' : isDegraded ? 'text-amber-400' : 'text-rose-400'}`}>
                    {netReliability}%
                  </div>
                </div>
                <div className="p-1 rounded bg-[#05070a] text-center">
                  <div className="text-slate-500">ACTIVE</div>
                  <div className="font-bold text-slate-200">{feed.activeCount ?? '—'}</div>
                </div>
                <div className="p-1 rounded bg-[#05070a] text-center">
                  <div className="text-slate-500">LATENCY</div>
                  <div className="font-bold text-slate-200">
                    {typeof feed.meanLatencyMs === 'number' ? `${Math.round(feed.meanLatencyMs)}ms` : '—'}
                  </div>
                </div>
              </div>

              {(feed.consecutiveFailures > 0 || idx === 0) && (
                <div className="flex items-center gap-1 text-[9px] text-slate-500">
                  {feed.consecutiveFailures > 0 ? (
                    <>
                      <WifiOff className="w-2.5 h-2.5 text-amber-400" />
                      {feed.consecutiveFailures} CONSECUTIVE FAILURES
                    </>
                  ) : (
                    <>
                      <Activity className="w-2.5 h-2.5 text-emerald-400" />
                      INGESTED: {feed.totalIngested ?? '—'}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* TOPOLOGY SUMMARY BANNER */}
      <div className="p-3 rounded bg-[#05070a] border border-white/10 text-xs flex flex-wrap items-center justify-between gap-2">
        <span className="text-slate-400">
          Server health (Rs = Rnominal × H) drives the fusion confidence function in real time.
        </span>
        <span className={`font-bold ${downCount > 0 ? 'text-rose-400' : 'text-cyan-400'}`}>
          {liveCount} LIVE · {degradedCount} DEGRADED · {downCount} DOWN
        </span>
      </div>
    </div>
  );
}
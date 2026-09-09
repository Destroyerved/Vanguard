import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Server, Activity, Radio, CloudSun, ShieldCheck, AlertTriangle, Zap, WifiOff, Layers } from 'lucide-react';
import { SourceHealthDetail } from '../../types/schema';
import { ScreenHeading, StatTile, Chip, TacticalButton } from '../ui/tactical';

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
  // Mean Rs across the inventory — the single number that summarises how
  // much the confidence engine can currently trust its inputs.
  const fleetReliability = feeds.length
    ? Math.round((feeds.reduce((a, f) => a + f.reliabilityScore, 0) / feeds.length) * 100)
    : 0;

  const handleToggle = () => {
    const next = !localDegraded;
    setLocalDegraded(next);
    if (onToggleDegradedComms) {
      onToggleDegradedComms(next);
    }
  };

  return (
    <div className="space-y-4 select-none font-mono text-xs pb-2">
      <ScreenHeading
        eyebrow="Ingestion Topology"
        title="Multi-Source Sensor Health"
        icon={Server}
        description="Source reliability (Rs = R_nominal × H) feeds the confidence function directly — a degraded feed visibly lowers every track it touches."
        actions={
          <TacticalButton
            onClick={handleToggle}
            variant={localDegraded ? 'danger' : 'default'}
            icon={localDegraded ? WifiOff : Activity}
          >
            {localDegraded ? 'Degraded Comms Active' : 'Simulate Degraded Comms'}
          </TacticalButton>
        }
      />

      {/* FLEET SUMMARY STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <StatTile label="Feeds Online" value={liveCount} icon={Activity} tone="emerald" hint="Reporting nominally" />
        <StatTile label="Degraded" value={degradedCount} icon={WifiOff} tone="amber" hint="Reduced reliability weight" />
        <StatTile label="Offline" value={downCount} icon={AlertTriangle} tone={downCount > 0 ? 'rose' : 'slate'} hint="Excluded from fusion" />
        <StatTile
          label="Fleet Reliability"
          value={fleetReliability}
          unit="%"
          icon={ShieldCheck}
          tone="lime"
          hint="Mean Rs across feeds"
        />
      </div>

      {/* LIVE FEED CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {feeds.map((feed, idx) => {
          const Icon = sourceIcons[feed.sourceType] || Radio;
          const isLive = feed.status === 'live';
          const isDegraded = feed.status === 'degraded' || feed.manuallyDegraded;
          const stateTone = isLive ? '#34d399' : isDegraded ? '#fbbf24' : '#f43f5e';
          const stateLabel = isLive ? 'LIVE' : isDegraded ? 'DEGRADED' : 'DOWN';
          const netReliability = Math.round(feed.reliabilityScore * 100);

          return (
            <motion.div
              key={feed.sourceType}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="vg-panel vg-panel-interactive p-4 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 vg-label">
                    <Icon className="w-3.5 h-3.5 text-[#a4c639]" />
                    {feed.sourceType.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${isLive ? 'vg-pulse-ring' : ''}`}
                      style={{ background: stateTone, boxShadow: `0 0 8px ${stateTone}` }}
                    />
                    <span
                      className="vg-readout text-[10px] font-bold"
                      style={{ color: stateTone }}
                    >
                      {stateLabel}
                    </span>
                  </span>
                </div>

                <div className="font-bold text-slate-100 text-[13px] leading-snug">
                  {feed.sourceName}
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed font-sans">
                  {feedDescriptions[feed.sourceType] || 'Persistent feed into the fusion pipeline.'}
                </p>
                {feed.note && <p className="text-[10px] text-amber-300/90">{feed.note}</p>}

                {/* Reliability bar — the number that actually moves confidence */}
                <div className="space-y-1 pt-0.5">
                  <div className="flex items-center justify-between vg-label">
                    <span>Net reliability (Rs)</span>
                    <span style={{ color: stateTone }} className="vg-readout font-bold">
                      {netReliability}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${netReliability}%` }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full rounded-full"
                      style={{ background: stateTone, boxShadow: `0 0 8px ${stateTone}` }}
                    />
                  </div>
                  {feed.nominalReliability !== undefined &&
                    feed.nominalReliability !== feed.reliabilityScore && (
                      <div className="vg-label">
                        Nominal {Math.round(feed.nominalReliability * 100)}% · health-adjusted
                      </div>
                    )}
                </div>
              </div>

              {/* METRIC STRIP */}
              <div className="grid grid-cols-3 gap-1.5 pt-2.5 border-t border-white/8">
                <div className="vg-glass-inset p-1.5 text-center">
                  <div className="vg-label">Active</div>
                  <div className="vg-readout font-bold text-slate-100 text-xs mt-0.5">
                    {feed.activeCount ?? '—'}
                  </div>
                </div>
                <div className="vg-glass-inset p-1.5 text-center">
                  <div className="vg-label">Ingested</div>
                  <div className="vg-readout font-bold text-slate-100 text-xs mt-0.5">
                    {feed.totalIngested ?? '—'}
                  </div>
                </div>
                <div className="vg-glass-inset p-1.5 text-center">
                  <div className="vg-label">Latency</div>
                  <div className="vg-readout font-bold text-slate-100 text-xs mt-0.5">
                    {typeof feed.meanLatencyMs === 'number'
                      ? `${Math.round(feed.meanLatencyMs)}ms`
                      : '—'}
                  </div>
                </div>
              </div>

              {feed.consecutiveFailures > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] text-amber-300">
                  <WifiOff className="w-3 h-3" />
                  {feed.consecutiveFailures} consecutive failures
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* TOPOLOGY SUMMARY BANNER */}
      <div className="vg-panel p-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-slate-400 text-[11px] font-sans">
          Server health drives the fusion confidence function in real time — degrading a feed here
          immediately re-weights every track it contributes to.
        </span>
        <Chip active={downCount === 0} tone={downCount > 0 ? 'danger' : 'olive'}>
          {liveCount} live · {degradedCount} degraded · {downCount} down
        </Chip>
      </div>
    </div>
  );
}

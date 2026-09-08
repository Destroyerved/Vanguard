import React, { useState } from 'react';
import { Server, Activity, Radio, CloudSun, ShieldCheck, AlertTriangle, RefreshCw, Zap, WifiOff, Check } from 'lucide-react';

interface SourceTopologyMatrixProps {
  sourcesHealth: any[];
  onToggleDegradedComms?: (enabled: boolean) => void;
  isDegradedComms?: boolean;
}

export default function SourceTopologyMatrix({
  sourcesHealth,
  onToggleDegradedComms,
  isDegradedComms = false
}: SourceTopologyMatrixProps) {
  const [localDegraded, setLocalDegraded] = useState(isDegradedComms);

  const defaultFeeds = [
    {
      id: 'weather',
      name: 'Open-Meteo Meteorological API',
      type: 'Live External API',
      nominalRel: 0.95,
      pollSec: '120s',
      status: 'live',
      desc: 'Real atmospheric barometer, cloud ceiling, and optical visibility model.'
    },
    {
      id: 'radar',
      name: 'Sector 4 Air Surveillance Radar',
      type: 'Persistent Kinematic Stream',
      nominalRel: 0.92,
      pollSec: '3s',
      status: localDegraded ? 'degraded' : 'live',
      desc: 'Primary 2D/3D kinematic tracks, squawk transponder verification, RCS profiling.'
    },
    {
      id: 'personnel',
      name: 'Tactical Patrol GPS Telemetry',
      type: 'Troop & Unit Orbits',
      nominalRel: 0.88,
      pollSec: '6s',
      status: 'live',
      desc: 'Ground patrol orbits, visual sighting confirmations, mobile biometric status.'
    },
    {
      id: 'log',
      name: 'Perimeter Infrared Sensor Tripwires',
      type: 'Machine Log Events',
      nominalRel: 0.80,
      pollSec: '2s',
      status: 'live',
      desc: 'Physical tripwire breaches, acoustic perimeter nodes, seismic ground sensors.'
    },
    {
      id: 'incident',
      name: 'Emergency Dispatch & Field Reports',
      type: 'Human Incident Intake',
      nominalRel: 0.72,
      pollSec: '10s',
      status: 'live',
      desc: 'Unstructured operator dispatch records, civilian distress calls, radio chatter.'
    },
  ];

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
          <span>{localDegraded ? 'DEGRADED COMMS ACTIVE (0.75x)' : 'SIMULATE DEGRADED COMMS'}</span>
        </button>
      </div>

      {/* 5-FEED TOPOLOGY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {defaultFeeds.map((feed) => {
          const healthMultiplier = feed.status === 'live' ? 1.0 : feed.status === 'degraded' ? 0.75 : 0.4;
          const netReliability = Math.round(feed.nominalRel * healthMultiplier * 100);

          return (
            <div
              key={feed.id}
              className="p-3.5 rounded bg-[#070b10] border border-white/10 hover:border-cyan-500/40 transition-all space-y-2.5 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 uppercase">{feed.type}</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        feed.status === 'live' ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    />
                    <span className="text-[10px] uppercase font-bold text-slate-300">
                      {feed.status}
                    </span>
                  </div>
                </div>

                <div className="font-bold text-slate-100 text-sm truncate">{feed.name}</div>
                <p className="text-slate-400 text-xs leading-relaxed">{feed.desc}</p>
              </div>

              {/* METRIC STRIP */}
              <div className="grid grid-cols-3 gap-1 pt-2 border-t border-white/5 text-[10px]">
                <div className="p-1 rounded bg-[#05070a] text-center">
                  <div className="text-slate-500">NOMINAL</div>
                  <div className="font-bold text-cyan-400">{feed.nominalRel}</div>
                </div>
                <div className="p-1 rounded bg-[#05070a] text-center">
                  <div className="text-slate-500">POLL INT</div>
                  <div className="font-bold text-slate-200">{feed.pollSec}</div>
                </div>
                <div className="p-1 rounded bg-[#05070a] text-center">
                  <div className="text-slate-500">NET REL</div>
                  <div className="font-bold text-emerald-400">{netReliability}%</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* TOPOLOGY SUMMARY BANNER */}
      <div className="p-3 rounded bg-[#05070a] border border-white/10 text-xs flex items-center justify-between">
        <span className="text-slate-400">
          Source health directly modulates the confidence formula (Rs = Rnominal × H).
        </span>
        <span className="text-cyan-400 font-bold">5 / 5 CHANNELS POLLED</span>
      </div>
    </div>
  );
}

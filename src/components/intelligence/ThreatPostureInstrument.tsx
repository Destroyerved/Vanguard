import React from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, Activity, Zap, TrendingUp, Radio } from 'lucide-react';

interface ThreatPostureInstrumentProps {
  situation: any;
  eventsCount: number;
  criticalCount: number;
  anomalyCount: number;
}

export default function ThreatPostureInstrument({
  situation,
  eventsCount,
  criticalCount,
  anomalyCount
}: ThreatPostureInstrumentProps) {
  const threatLevel = situation?.threatLevel || 'green';
  const threatScore = situation?.threatScore ?? 45;
  const meanConfidence = situation?.meanConfidence ?? 82;

  const config =
    threatLevel === 'red'
      ? { color: '#ef4444', text: 'CRITICAL ESCALATION', desc: 'Hostile contact confirmed by multi-sensor telemetry.' }
      : threatLevel === 'orange'
      ? { color: '#f97316', text: 'UNSTABLE / ELEVATED', desc: 'Multi-source anomalies detected across perimeter sectors.' }
      : threatLevel === 'yellow'
      ? { color: '#eab308', text: 'GUARDED WATCH', desc: 'Isolated telemetry tracks under active correlation monitoring.' }
      : { color: '#10b981', text: 'ROUTINE STABLE', desc: 'All incoming surveillance feeds within nominal parameters.' };

  return (
    <div className="instrument-panel rounded-sm p-4 border border-white/10 corner-brackets space-y-4 select-none font-mono">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-cyan-400" />
          <span className="font-heading font-bold text-sm tracking-wider text-slate-100 uppercase">
            DEFENSE THREAT POSTURE
          </span>
        </div>
        <span className="text-[10px] text-slate-400">STATE: IDEMPOTENT FUSION</span>
      </div>

      {/* LIVING RADIAL INTENSITY GAUGE */}
      <div className="flex items-center gap-5">
        {/* RADIAL DIAL */}
        <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background Track */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="7"
              fill="transparent"
            />
            {/* Progress Arc */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke={config.color}
              strokeWidth="7"
              strokeDasharray={251.2}
              strokeDashoffset={251.2 - (Math.min(100, (threatScore / 300) * 100) / 100) * 251.2}
              strokeLinecap="round"
              fill="transparent"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-heading font-bold text-2xl text-slate-100 leading-none">
              {threatScore}
            </span>
            <span className="text-[8px] text-slate-400 uppercase tracking-widest">THREAT PTS</span>
          </div>
        </div>

        {/* STATUS BREAKDOWN */}
        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shadow-hud-glow"
              style={{ backgroundColor: config.color }}
            />
            <span className="font-heading font-bold text-base tracking-wider text-slate-100 truncate">
              {config.text}
            </span>
          </div>
          <p className="text-slate-400 text-xs leading-tight line-clamp-2">
            {situation?.headline || config.desc}
          </p>
          <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-300">
            <span>
              Mean Conf: <strong className="text-cyan-400">{meanConfidence}%</strong>
            </span>
            <span>
              Criticals: <strong className="text-rose-400">{criticalCount}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* QUICK STATUS METRIC STRIP */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center text-xs">
        <div className="p-2 rounded bg-[#05070a] border border-white/5">
          <div className="text-[10px] text-slate-500 uppercase">Active Tracks</div>
          <div className="font-bold text-slate-200 text-sm">{eventsCount}</div>
        </div>
        <div className="p-2 rounded bg-[#05070a] border border-white/5">
          <div className="text-[10px] text-slate-500 uppercase">Kinematic Anom</div>
          <div className="font-bold text-amber-400 text-sm">{anomalyCount}</div>
        </div>
        <div className="p-2 rounded bg-[#05070a] border border-white/5">
          <div className="text-[10px] text-slate-500 uppercase">Air-Gap Ready</div>
          <div className="font-bold text-emerald-400 text-sm">100%</div>
        </div>
      </div>
    </div>
  );
}

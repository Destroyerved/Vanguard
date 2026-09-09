import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, Radio, Crosshair, Lock } from 'lucide-react';
import { TacticalPanel, Chip } from '../ui/tactical';

interface ThreatPostureInstrumentProps {
  situation: any;
  eventsCount: number;
  criticalCount: number;
  anomalyCount: number;
}

const POSTURE = {
  red: {
    color: '#f43f5e',
    text: 'CRITICAL ESCALATION',
    desc: 'Hostile contact confirmed by multi-sensor telemetry.',
  },
  orange: {
    color: '#f97316',
    text: 'UNSTABLE / ELEVATED',
    desc: 'Multi-source anomalies detected across perimeter sectors.',
  },
  yellow: {
    color: '#eab308',
    text: 'GUARDED WATCH',
    desc: 'Isolated telemetry tracks under active correlation monitoring.',
  },
  green: {
    color: '#a4c639',
    text: 'ROUTINE STABLE',
    desc: 'All incoming surveillance feeds within nominal parameters.',
  },
} as const;

export default function ThreatPostureInstrument({
  situation,
  eventsCount,
  criticalCount,
  anomalyCount,
}: ThreatPostureInstrumentProps) {
  const threatLevel = (situation?.threatLevel || 'green') as keyof typeof POSTURE;
  const threatScore = situation?.threatScore ?? 45;
  const meanConfidence = situation?.meanConfidence ?? 82;
  const config = POSTURE[threatLevel] ?? POSTURE.green;

  // The dial is scaled against a 300-point escalation ceiling, matching the
  // backend's threat scoring band.
  const dialPct = Math.min(100, (threatScore / 300) * 100);
  const circumference = 2 * Math.PI * 40;

  return (
    <TacticalPanel
      title="Defense Threat Posture"
      subtitle="State: idempotent fusion"
      icon={ShieldAlert}
      glow
      className="h-full font-mono"
      bodyClassName="space-y-4"
      actions={
        <Chip active>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.color }} />
          {threatLevel.toUpperCase()}
        </Chip>
      }
    >
      {/* LIVING RADIAL INTENSITY GAUGE */}
      <div className="flex items-center gap-5">
        <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
          {/* Soft bloom behind the dial so it reads as a lit instrument */}
          <div
            className="absolute inset-3 rounded-full blur-xl opacity-25"
            style={{ background: config.color }}
          />
          <svg className="w-full h-full -rotate-90 relative" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="6"
              fill="transparent"
            />
            {/* Graduation ticks — hardware, not chart */}
            {Array.from({ length: 24 }).map((_, i) => (
              <line
                key={i}
                x1="50"
                y1="6"
                x2="50"
                y2="10"
                stroke="rgba(164,198,57,0.28)"
                strokeWidth="1"
                transform={`rotate(${i * 15} 50 50)`}
              />
            ))}
            <motion.circle
              cx="50"
              cy="50"
              r="40"
              stroke={config.color}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeLinecap="round"
              fill="transparent"
              initial={false}
              animate={{ strokeDashoffset: circumference - (dialPct / 100) * circumference }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              style={{ filter: `drop-shadow(0 0 6px ${config.color})` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="vg-readout font-black text-3xl leading-none text-slate-100">
              {threatScore}
            </span>
            <span className="vg-label mt-0.5">Threat pts</span>
          </div>
        </div>

        {/* STATUS BREAKDOWN */}
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: config.color, boxShadow: `0 0 12px ${config.color}` }}
            />
            <span className="vg-title text-base text-slate-100 truncate">{config.text}</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-400 font-sans line-clamp-3">
            {situation?.headline || config.desc}
          </p>
          <div className="flex items-center gap-2 pt-0.5">
            <Chip>
              Mean conf <b className="text-[#a4c639] ml-1">{meanConfidence}%</b>
            </Chip>
            <Chip tone={criticalCount > 0 ? 'danger' : 'neutral'}>
              Criticals <b className="ml-1">{criticalCount}</b>
            </Chip>
          </div>
        </div>
      </div>

      {/* QUICK STATUS METRIC STRIP */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/8">
        {[
          { label: 'Active Tracks', value: eventsCount, tone: 'text-slate-100', icon: Radio },
          { label: 'Kinematic Anom', value: anomalyCount, tone: 'text-amber-400', icon: Crosshair },
          { label: 'Air-Gap Ready', value: '100%', tone: 'text-[#a4c639]', icon: Lock },
        ].map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="vg-glass-inset p-2.5 text-center">
              <Icon className="w-3 h-3 mx-auto mb-1 text-[#526a27]" />
              <div className="vg-label">{m.label}</div>
              <div className={`vg-readout font-bold text-base mt-0.5 ${m.tone}`}>{m.value}</div>
            </div>
          );
        })}
      </div>
    </TacticalPanel>
  );
}

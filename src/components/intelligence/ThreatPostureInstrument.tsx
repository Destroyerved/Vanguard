import React from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, Activity, Zap, TrendingUp, Radio } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

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
  const { isDark } = useTheme();
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
      : { color: '#a4c639', text: 'ROUTINE STABLE', desc: 'All incoming surveillance feeds within nominal parameters.' };

  return (
    <div
      className={`rounded-sm p-4 border corner-brackets space-y-4 select-none font-mono transition-colors ${
        isDark ? 'instrument-panel border-white/10' : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      {/* HEADER */}
      <div className={`flex items-center justify-between border-b pb-2 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#a4c639]" />
          <span className={`font-heading font-bold text-sm tracking-wider uppercase ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            DEFENSE THREAT POSTURE
          </span>
        </div>
        <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>STATE: IDEMPOTENT FUSION</span>
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
              stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}
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
            <span className={`font-heading font-black text-2xl leading-none ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              {threatScore}
            </span>
            <span className={`text-[8px] uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>THREAT PTS</span>
          </div>
        </div>

        {/* STATUS BREAKDOWN */}
        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(164,198,57,0.4)]"
              style={{ backgroundColor: config.color }}
            />
            <span className={`font-heading font-bold text-base tracking-wider truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              {config.text}
            </span>
          </div>
          <p className={`text-xs leading-tight line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {situation?.headline || config.desc}
          </p>
          <div className={`flex items-center gap-3 pt-1 text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <span>
              Mean Conf: <strong className="text-[#a4c639]">{meanConfidence}%</strong>
            </span>
            <span>
              Criticals: <strong className="text-rose-400">{criticalCount}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* QUICK STATUS METRIC STRIP */}
      <div className={`grid grid-cols-3 gap-2 pt-2 border-t text-center text-xs ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
        <div className={`p-2 rounded border ${isDark ? 'bg-[#05070a] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
          <div className="text-[10px] text-slate-400 uppercase">Active Tracks</div>
          <div className={`font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{eventsCount}</div>
        </div>
        <div className={`p-2 rounded border ${isDark ? 'bg-[#05070a] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
          <div className="text-[10px] text-slate-400 uppercase">Kinematic Anom</div>
          <div className="font-bold text-amber-400 text-sm">{anomalyCount}</div>
        </div>
        <div className={`p-2 rounded border ${isDark ? 'bg-[#05070a] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
          <div className="text-[10px] text-slate-400 uppercase">Air-Gap Ready</div>
          <div className="font-bold text-[#a4c639] text-sm">100%</div>
        </div>
      </div>
    </div>
  );
}

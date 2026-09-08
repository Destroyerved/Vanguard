import React from 'react';
import {
  ShieldAlert,
  Radio,
  Search,
  RefreshCw,
  Sliders,
  Terminal,
  Activity,
  AlertTriangle,
  Zap,
  Clock,
  Sparkles,
  Wifi,
  WifiOff
} from 'lucide-react';
import { DemoScenarioMode } from '../../data/scenarioEngine';

interface TopTacticalHeaderProps {
  currentTime: string;
  situation: any;
  serverOnline: boolean;
  easyMode: boolean;
  onToggleEasyMode: () => void;
  activeScenario: DemoScenarioMode | null;
  onOpenCommandPalette: () => void;
  onManualRefresh: () => void;
  refreshing: boolean;
}

export default function TopTacticalHeader({
  currentTime,
  situation,
  serverOnline,
  easyMode,
  onToggleEasyMode,
  activeScenario,
  onOpenCommandPalette,
  onManualRefresh,
  refreshing
}: TopTacticalHeaderProps) {
  const threatLevel = situation?.threatLevel || 'green';
  const threatScore = situation?.threatScore ?? 0;

  const threatColor =
    threatLevel === 'red'
      ? { badge: 'bg-rose-950/70 border-rose-500/60 text-rose-400', glow: 'shadow-threat-red', label: 'CRITICAL ESCALATION' }
      : threatLevel === 'orange'
      ? { badge: 'bg-orange-950/70 border-orange-500/60 text-orange-400', glow: '', label: 'UNSTABLE / ELEVATED' }
      : threatLevel === 'yellow'
      ? { badge: 'bg-yellow-950/70 border-yellow-500/60 text-yellow-400', glow: '', label: 'GUARDED WATCH' }
      : { badge: 'bg-emerald-950/70 border-emerald-500/60 text-emerald-400', glow: '', label: 'ROUTINE PATROL' };

  return (
    <header className="relative z-20 flex flex-wrap items-center justify-between gap-4 px-5 py-2.5 bg-[#070b10]/95 border-b border-white/10 backdrop-blur-md">
      {/* 1. LEFT: SYSTEM CHRONOMETER & AREA IDENTIFIER */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#05070a] border border-white/10 font-mono text-xs">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400 text-[11px]">UTC:</span>
          <span className="font-semibold text-slate-200">{currentTime}</span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 text-xs font-mono text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-hud-glow" />
          <span>SECTOR 04-NW (AHMEDABAD AIR SPACE / WESTCOM)</span>
        </div>

        {activeScenario && (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/60 text-amber-300 font-mono text-xs animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>SIMULATION INJECTED: {activeScenario.toUpperCase()}</span>
          </div>
        )}
      </div>

      {/* 2. CENTER: QUICK COMMAND TRIGGER */}
      <button
        onClick={onOpenCommandPalette}
        className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded bg-[#05070a] border border-white/10 hover:border-cyan-500/40 text-slate-400 hover:text-slate-200 transition-all font-mono text-xs w-72 justify-between group shadow-tactical"
      >
        <span className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-cyan-400 group-hover:text-cyan-300" />
          <span className="text-slate-500 group-hover:text-slate-400">Search events, tracks, coordinates...</span>
        </span>
        <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-slate-400 font-mono">
          Ctrl K
        </kbd>
      </button>

      {/* 3. RIGHT: THREAT POSTURE INSTRUMENT & MODE TOGGLE */}
      <div className="flex items-center gap-3">
        {/* THREAT POSTURE PILL */}
        <div
          className={`flex items-center gap-2.5 px-3 py-1 rounded border font-mono text-xs ${threatColor.badge} ${threatColor.glow}`}
        >
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-widest leading-none text-slate-400">
              POSTURE ({threatScore} PTS)
            </span>
            <span className="font-heading font-bold text-xs tracking-wider leading-tight">
              {threatColor.label}
            </span>
          </div>
        </div>

        {/* EASY / EXPERT MODE TOGGLE */}
        <button
          onClick={onToggleEasyMode}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded font-mono text-xs border transition-all ${
            easyMode
              ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 shadow-hud-glow'
              : 'bg-[#05070a] border-white/10 text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Easy vs Expert Analytical View"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span className="text-[11px] uppercase tracking-wider font-semibold">
            {easyMode ? 'EASY COP' : 'EXPERT C2'}
          </span>
        </button>

        {/* SYNC / REFRESH */}
        <button
          onClick={onManualRefresh}
          disabled={refreshing}
          className="p-1.5 rounded bg-[#05070a] border border-white/10 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
          title="Force Telemetry Resync"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      </div>
    </header>
  );
}

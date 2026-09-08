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
  Clock,
  Globe,
  Newspaper,
  ShieldCheck,
  Server,
  Play
} from 'lucide-react';
import { DemoScenarioMode } from '../../data/scenarioEngine';

export type NavSection =
  | 'overview'
  | 'events'
  | 'news'
  | 'recon'
  | 'osint'
  | 'timeline'
  | 'sources'
  | 'simulation'
  | 'api_tester';

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
  activeTab?: NavSection;
  onTabChange?: (tab: NavSection) => void;
  eventCount?: number;
  anomalyCount?: number;
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
  refreshing,
  activeTab = 'overview',
  onTabChange,
  eventCount = 0,
  anomalyCount = 0
}: TopTacticalHeaderProps) {
  const threatLevel = situation?.threatLevel || 'green';
  const threatScore = situation?.threatScore ?? 0;

  const threatColor =
    threatLevel === 'red'
      ? { badge: 'bg-rose-950/80 border-rose-500/60 text-rose-300', glow: 'shadow-threat-red', label: 'CRITICAL ESCALATION' }
      : threatLevel === 'orange'
      ? { badge: 'bg-orange-950/80 border-orange-500/60 text-orange-300', glow: '', label: 'UNSTABLE' }
      : threatLevel === 'yellow'
      ? { badge: 'bg-yellow-950/80 border-yellow-500/60 text-yellow-300', glow: '', label: 'GUARDED' }
      : { badge: 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300', glow: '', label: 'ROUTINE' };

  const navTabs: Array<{
    id: NavSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number | string;
    tag?: string;
  }> = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'news', label: 'Verified News', icon: Newspaper, tag: 'LIVE' },
    { id: 'recon', label: 'Satellite Recon', icon: Globe },
    { id: 'events', label: 'Signal Stream', icon: Radio, count: eventCount },
    { id: 'osint', label: 'OSINT Verifier', icon: ShieldCheck, count: anomalyCount ? `${anomalyCount} Anom` : undefined },
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'sources', label: 'Sources', icon: Server },
    { id: 'simulation', label: 'Scenarios', icon: Play },
    { id: 'api_tester', label: 'API Console', icon: Terminal },
  ];

  return (
    <header className="relative z-30 flex flex-col bg-[#070b10]/95 border-b border-white/10 backdrop-blur-md select-none font-mono">
      {/* TOP ROW: BRAND, STATUS, CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2">
        {/* 1. BRAND & CORE STATUS */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded bg-cyan-950/80 border border-cyan-500/50 text-cyan-400 font-heading font-bold text-base tracking-widest shadow-hud-glow">
            V
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-heading text-base font-bold tracking-widest text-slate-100 flex items-center gap-1.5">
              VANGUARD
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                C2
              </span>
            </span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#05070a] border border-white/10 text-[10px]">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  serverOnline ? 'bg-emerald-400 shadow-hud-glow animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="text-slate-400 font-semibold uppercase">
                {serverOnline ? 'ONLINE' : 'FALLBACK'}
              </span>
            </div>
          </div>

          {activeScenario && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/60 text-amber-300 text-xs animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>SIMULATION: {activeScenario.toUpperCase()}</span>
            </div>
          )}
        </div>

        {/* 2. CENTER: QUICK COMMAND TRIGGER */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded bg-[#05070a] border border-white/10 hover:border-cyan-500/40 text-slate-400 hover:text-slate-200 transition-all text-xs w-64 justify-between group shadow-tactical"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-cyan-400 group-hover:text-cyan-300" />
            <span className="text-slate-400 group-hover:text-slate-300 text-[11px]">Search intelligence...</span>
          </span>
          <kbd className="px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-[10px] text-slate-400">
            Ctrl K
          </kbd>
        </button>

        {/* 3. RIGHT: THREAT POSTURE, MODE TOGGLE & TIME */}
        <div className="flex items-center gap-2.5">
          {/* THREAT POSTURE */}
          <div
            className={`flex items-center gap-2 px-2.5 py-1 rounded border text-xs font-semibold ${threatColor.badge} ${threatColor.glow}`}
          >
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span className="tracking-wider">{threatColor.label}</span>
            <span className="text-[10px] opacity-80">({threatScore})</span>
          </div>

          {/* EASY / EXPERT MODE TOGGLE */}
          <button
            onClick={onToggleEasyMode}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border transition-all ${
              easyMode
                ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 shadow-hud-glow'
                : 'bg-[#05070a] border-white/10 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle COP View Mode"
          >
            <Sliders className="w-3 h-3" />
            <span className="text-[11px]">{easyMode ? 'EASY COP' : 'EXPERT'}</span>
          </button>

          {/* SYNC / REFRESH */}
          <button
            onClick={onManualRefresh}
            disabled={refreshing}
            className="p-1.5 rounded bg-[#05070a] border border-white/10 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
            title="Force Resync"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* CHRONOMETER */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#05070a] border border-white/10 text-xs">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span className="font-semibold text-slate-300 text-[11px]">{currentTime}</span>
          </div>
        </div>
      </div>

      {/* SECONDARY ROW: TACTICAL NAVIGATION TABS */}
      {onTabChange && (
        <div className="w-full flex items-center gap-1 px-4 py-1.5 border-t border-white/5 overflow-x-auto text-xs scrollbar-none bg-[#05070a]/70">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-cyan-950/90 border border-cyan-500/60 text-cyan-300 shadow-hud-glow font-bold'
                    : 'bg-transparent border border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="px-1.5 py-0.2 rounded bg-cyan-900/60 text-[9px] text-cyan-200">
                    {tab.count}
                  </span>
                )}
                {tab.tag && (
                  <span className="px-1 py-0.2 rounded bg-emerald-950 border border-emerald-500/40 text-[9px] text-emerald-300">
                    {tab.tag}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}

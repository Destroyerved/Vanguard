import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
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
  Play,
  User,
  LogOut,
  LogIn,
  ChevronDown,
  Key
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
  onOpenAuthModal?: () => void;
  onNavigateToLanding?: () => void;
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
  anomalyCount = 0,
  onOpenAuthModal,
  onNavigateToLanding
}: TopTacticalHeaderProps) {
  const { operatorProfile, logout } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const threatLevel = situation?.threatLevel || 'green';
  const threatScore = situation?.threatScore ?? 0;

  const threatColor =
    threatLevel === 'red'
      ? { badge: 'bg-rose-950/80 border-rose-500/60 text-rose-300', glow: 'shadow-threat-red', label: 'CRITICAL ESCALATION' }
      : threatLevel === 'orange'
      ? { badge: 'bg-orange-950/80 border-orange-500/60 text-orange-300', glow: '', label: 'UNSTABLE' }
      : threatLevel === 'yellow'
      ? { badge: 'bg-yellow-950/80 border-yellow-500/60 text-yellow-300', glow: '', label: 'MODERATE' }
      : { badge: 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300', glow: '', label: 'NOMINAL' };

  const navTabs: Array<{ id: NavSection; label: string; icon: any; count?: number; tag?: string }> = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'events', label: 'Signal Stream', icon: Radio, count: eventCount },
    { id: 'news', label: 'Verified News', icon: Newspaper, tag: 'LIVE' },
    { id: 'recon', label: 'Satellite Recon', icon: Globe, tag: 'ESRI' },
    { id: 'osint', label: 'OSINT Veracity', icon: ShieldCheck, count: anomalyCount },
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'sources', label: 'Topology', icon: Server },
    { id: 'simulation', label: 'Scenario Injector', icon: Play },
    { id: 'api_tester', label: 'API Console', icon: Terminal },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#070b10]/95 backdrop-blur-md border-b border-white/10 select-none font-mono">
      {/* PRIMARY HEADER ROW */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-3">
        {/* 1. LEFT: SYSTEM IDENTITY & BACKEND STATUS */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-heading font-bold text-sm tracking-widest text-slate-100 uppercase">
              VANGUARD <span className="text-cyan-400 text-xs">C2</span>
            </span>
          </div>

          {onNavigateToLanding && (
            <button
              onClick={onNavigateToLanding}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#16200d] border border-[#526a27]/60 hover:border-[#a4c639] text-[#a4c639] hover:text-white text-xs font-semibold transition-all shadow-sm group"
              title="Return to Defense SaaS Landing Page"
            >
              <Globe className="w-3.5 h-3.5 text-[#a4c639] group-hover:rotate-45 transition-transform" />
              <span className="text-[11px] hidden sm:inline">Landing Page</span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-2 px-2 py-0.5 rounded bg-[#05070a] border border-white/10 text-[10px]">
            <span className={`w-1.5 h-1.5 rounded-full ${serverOnline ? 'bg-emerald-400' : 'bg-rose-500'}`} />
            <span className="text-slate-400">CORE:</span>
            <span className={`font-bold ${serverOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
              {serverOnline ? 'ONLINE' : 'FALLBACK'}
            </span>
          </div>

          {activeScenario && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/50 text-[10px] text-amber-300 font-bold animate-pulse">
              <span>SCENARIO ACTIVE</span>
            </div>
          )}
        </div>

        {/* 2. CENTER: GLOBAL SEARCH PALETTE BUTTON */}
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

        {/* 3. RIGHT: OPERATOR CLEARANCE BADGE, THREAT POSTURE & TIME */}
        <div className="flex items-center gap-2">
          {/* OPERATOR CLEARANCE PROFILE BADGE */}
          <div className="relative">
            {!operatorProfile ? (
              <button
                onClick={() => {
                  if (onOpenAuthModal) onOpenAuthModal();
                }}
                className="flex items-center gap-2 px-3 py-1 rounded bg-cyan-950/80 border border-cyan-500/60 hover:bg-cyan-900 text-cyan-300 text-xs font-bold transition-all shadow-hud-glow"
              >
                <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                <span>SIGN IN / REGISTER</span>
              </button>
            ) : (
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#05070a] border border-cyan-500/40 hover:border-cyan-500/70 text-slate-200 text-xs font-semibold transition-all shadow-sm group"
              >
                <div className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-500/60 flex items-center justify-center text-[10px] font-bold text-cyan-300 uppercase">
                  {operatorProfile.displayName ? operatorProfile.displayName.charAt(0) : 'OP'}
                </div>
                <div className="hidden lg:flex flex-col text-left leading-none">
                  <span className="text-[11px] font-bold text-cyan-300 group-hover:text-cyan-100 truncate max-w-[110px]">
                    {operatorProfile.displayName}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">
                    [{operatorProfile.clearanceLevel || 'TS-SCI'}]
                  </span>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            )}

            {/* OPERATOR DROPDOWN MENU - ONLY LOGOUT WHEN LOGGED IN */}
            {profileDropdownOpen && operatorProfile && (
              <div className="absolute right-0 mt-2 w-56 bg-[#070b10] border border-cyan-500/50 rounded-xl shadow-2xl p-2 z-50 space-y-2 font-mono text-xs animate-in fade-in duration-100">
                <div className="p-2 rounded bg-cyan-950/40 border border-cyan-500/30 space-y-1">
                  <div className="text-[10px] text-cyan-400 font-bold uppercase">
                    AUTHENTICATED OPERATOR
                  </div>
                  <div className="font-bold text-slate-100 text-xs truncate">
                    {operatorProfile.displayName}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {operatorProfile.email}
                  </div>
                </div>

                <button
                  onClick={async () => {
                    setProfileDropdownOpen(false);
                    await logout();
                    if (onOpenAuthModal) onOpenAuthModal();
                  }}
                  className="w-full text-left p-2.5 rounded hover:bg-rose-950/60 text-rose-300 flex items-center gap-2 text-xs font-bold transition-colors border border-rose-500/30"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  <span>SIGN OUT OPERATOR</span>
                </button>
              </div>
            )}
          </div>

          {/* THREAT POSTURE */}
          <div
            className={`flex items-center gap-2 px-2.5 py-1 rounded border text-xs font-semibold ${threatColor.badge} ${threatColor.glow}`}
          >
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span className="tracking-wider hidden sm:inline">{threatColor.label}</span>
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
            <span className="text-[11px] hidden sm:inline">{easyMode ? 'EASY COP' : 'EXPERT'}</span>
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

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
  wsLive?: boolean;
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
  wsLive = false,
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
  onNavigateToLanding,
}: TopTacticalHeaderProps) {
  const { operatorProfile, logout } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const isDark = true;

  const threatLevel = situation?.threatLevel || 'green';
  const threatScore = situation?.threatScore ?? 0;

  const threatColor =
    threatLevel === 'red'
      ? { badge: 'bg-rose-950/80 border-rose-500/60 text-rose-300', glow: 'shadow-threat-red', label: 'CRITICAL ESCALATION' }
      : threatLevel === 'orange'
      ? { badge: 'bg-orange-950/80 border-orange-500/60 text-orange-300', glow: '', label: 'UNSTABLE' }
      : threatLevel === 'yellow'
      ? { badge: 'bg-yellow-950/80 border-yellow-500/60 text-yellow-300', glow: '', label: 'MODERATE' }
      : { badge: 'bg-[#16200d] border-[#526a27]/70 text-[#a4c639]', glow: '', label: 'NOMINAL' };

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
    <header
      className={`sticky top-0 z-40 backdrop-blur-md border-b select-none font-mono transition-colors ${
        isDark
          ? 'bg-[#000000]/95 border-[#526a27]/30 text-slate-200'
          : 'bg-white/95 border-slate-200 text-slate-900 shadow-sm'
      }`}
    >
      {/* PRIMARY HEADER ROW */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-3">
        {/* 1. LEFT: SYSTEM IDENTITY & BACKEND STATUS */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#a4c639] animate-ping" />
            <span
              className={`font-heading font-black text-sm tracking-widest uppercase ${
                isDark ? 'text-slate-100' : 'text-slate-900'
              }`}
            >
              VANGUARD <span className="text-[#a4c639] text-xs">C2</span>
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

          <div
            className={`hidden sm:flex items-center gap-2 px-2 py-0.5 rounded border text-[10px] ${
              isDark ? 'bg-[#05070a] border-white/10' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${serverOnline ? 'bg-emerald-400' : 'bg-rose-500'}`} />
            <span className="text-slate-400">CORE:</span>
            <span className={`font-bold ${serverOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
              {serverOnline ? 'ONLINE' : 'FALLBACK'}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">PUSH:</span>
            <span className={`font-bold ${wsLive ? 'text-[#a4c639]' : 'text-amber-400'}`}>
              {wsLive ? 'LIVE' : 'POLL'}
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
          className={`hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded transition-all text-xs w-64 justify-between group shadow-tactical ${
            isDark
              ? 'bg-[#05070a] border border-white/10 hover:border-[#526a27]/80 text-slate-400 hover:text-slate-200'
              : 'bg-slate-100 border border-slate-300 hover:border-[#526a27] text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-[#a4c639] group-hover:text-white transition-colors" />
            <span className="text-[11px]">Search intelligence...</span>
          </span>
          <kbd
            className={`px-1.5 py-0.2 rounded text-[10px] ${
              isDark ? 'bg-white/5 border border-white/10 text-slate-400' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
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
                className="flex items-center gap-2 px-3 py-1 rounded bg-[#16200d] border border-[#526a27] hover:border-[#a4c639] text-[#a4c639] hover:text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(82,106,39,0.3)]"
              >
                <LogIn className="w-3.5 h-3.5 text-[#a4c639]" />
                <span>SIGN IN / REGISTER</span>
              </button>
            ) : (
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className={`flex items-center gap-2 px-2.5 py-1 rounded transition-all shadow-sm group ${
                  isDark
                    ? 'bg-[#05070a] border border-[#526a27]/50 hover:border-[#a4c639] text-slate-200'
                    : 'bg-slate-100 border border-slate-300 hover:border-[#526a27] text-slate-800'
                } text-xs font-semibold`}
              >
                <div className="w-5 h-5 rounded-full bg-[#16200d] border border-[#526a27] flex items-center justify-center text-[10px] font-bold text-[#a4c639] uppercase">
                  {operatorProfile.displayName ? operatorProfile.displayName.charAt(0) : 'OP'}
                </div>
                <div className="hidden lg:flex flex-col text-left leading-none">
                  <span className="text-[11px] font-bold text-[#a4c639] group-hover:text-white truncate max-w-[110px]">
                    {operatorProfile.displayName}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">
                    [{operatorProfile.clearanceLevel || 'TS-SCI'}]
                  </span>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            )}

            {/* OPERATOR DROPDOWN MENU */}
            {profileDropdownOpen && operatorProfile && (
              <div
                className={`absolute right-0 mt-2 w-56 rounded-xl shadow-2xl p-2 z-50 space-y-2 font-mono text-xs animate-in fade-in duration-100 border ${
                  isDark
                    ? 'bg-[#070b10] border-[#526a27]/60'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div className="p-2 rounded bg-[#16200d] border border-[#526a27]/40 space-y-1">
                  <div className="text-[10px] text-[#a4c639] font-bold uppercase">
                    AUTHENTICATED OPERATOR
                  </div>
                  <div className="font-bold text-slate-100 text-xs truncate">
                    {operatorProfile.displayName}
                  </div>
                  <div className="text-[10px] text-slate-300 truncate">
                    {operatorProfile.email}
                  </div>
                </div>

                <button
                  onClick={async () => {
                    setProfileDropdownOpen(false);
                    await logout();
                    if (onOpenAuthModal) onOpenAuthModal();
                  }}
                  className="w-full text-left p-2.5 rounded hover:bg-rose-950/60 text-rose-400 flex items-center gap-2 text-xs font-bold transition-colors border border-rose-500/30"
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
            <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-[#a4c639]" />
            <span className="tracking-wider hidden sm:inline">{threatColor.label}</span>
            <span className="text-[10px] opacity-80">({threatScore})</span>
          </div>

          {/* EASY / EXPERT MODE TOGGLE */}
          <button
            onClick={onToggleEasyMode}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border transition-all ${
              easyMode
                ? 'bg-[#16200d] border border-[#526a27] text-[#a4c639] shadow-[0_0_12px_rgba(82,106,39,0.3)]'
                : isDark
                ? 'bg-[#05070a] border-white/10 text-slate-400 hover:text-slate-200'
                : 'bg-slate-100 border-slate-300 text-slate-600 hover:text-slate-900'
            }`}
            title="Toggle COP View Mode"
          >
            <Sliders className="w-3 h-3 text-[#a4c639]" />
            <span className="text-[11px] hidden sm:inline">{easyMode ? 'EASY COP' : 'EXPERT'}</span>
          </button>

          {/* SYNC / REFRESH */}
          <button
            onClick={onManualRefresh}
            disabled={refreshing}
            className={`p-1.5 rounded transition-colors disabled:opacity-50 ${
              isDark
                ? 'bg-[#05070a] border border-white/10 hover:border-[#526a27] text-slate-400 hover:text-[#a4c639]'
                : 'bg-slate-100 border border-slate-300 hover:border-[#526a27] text-slate-600 hover:text-[#526a27]'
            }`}
            title="Force Resync"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#a4c639]' : ''}`} />
          </button>

          {/* CHRONOMETER */}
          <div
            className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border ${
              isDark ? 'bg-[#05070a] border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <Clock className="w-3 h-3 text-[#a4c639]" />
            <span className="font-semibold text-[11px]">{currentTime}</span>
          </div>
        </div>
      </div>

      {/* SECONDARY ROW: TACTICAL NAVIGATION TABS */}
      {onTabChange && (
        <div
          className={`w-full flex items-center gap-1 px-4 py-1.5 border-t overflow-x-auto text-xs scrollbar-none transition-colors ${
            isDark ? 'border-white/5 bg-[#000000]/80' : 'border-slate-200 bg-slate-50/90'
          }`}
        >
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-[#16200d] border border-[#526a27] text-[#a4c639] shadow-[0_0_12px_rgba(82,106,39,0.35)] font-bold'
                    : isDark
                    ? 'bg-transparent border border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    : 'bg-transparent border border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] ${
                      isSelected
                        ? 'bg-[#33401c] text-[#c6ff00] border border-[#526a27]/60'
                        : isDark
                        ? 'bg-white/10 text-slate-300'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {tab.tag && (
                  <span className="px-1 py-0.2 rounded bg-[#16200d] border border-[#526a27]/60 text-[9px] text-[#a4c639] font-bold">
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

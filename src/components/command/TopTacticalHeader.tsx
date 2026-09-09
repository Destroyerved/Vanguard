import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldAlert,
  Radio,
  Search,
  RefreshCw,
  Sliders,
  Terminal,
  Activity,
  Clock,
  Globe,
  Newspaper,
  ShieldCheck,
  Server,
  Play,
  Shield,
  LogOut,
  LogIn,
  ChevronDown,
  Cctv,
} from 'lucide-react';
import { DemoScenarioMode } from '../../data/scenarioEngine';
import { StatusDot } from '../ui/tactical';

export type NavSection =
  | 'overview'
  | 'events'
  | 'news'
  | 'recon'
  | 'osint'
  | 'vision'
  | 'timeline'
  | 'sources'
  | 'simulation'
  | 'api_tester';

interface TopTacticalHeaderProps {
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
  /** Running off the seeded dataset rather than a live fusion server. */
  demoMode?: boolean;
}

/** Threat posture vocabulary, shared with the landing page's escalation ladder. */
const THREAT_POSTURE: Record<
  string,
  { badge: string; label: string; bar: string }
> = {
  red: {
    badge: 'bg-rose-950/80 border-rose-500/60 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.35)]',
    label: 'CRITICAL ESCALATION',
    bar: 'from-rose-600 via-rose-400 to-rose-600',
  },
  orange: {
    badge: 'bg-orange-950/80 border-orange-500/60 text-orange-300',
    label: 'UNSTABLE',
    bar: 'from-orange-600 via-orange-400 to-orange-600',
  },
  yellow: {
    badge: 'bg-yellow-950/80 border-yellow-500/60 text-yellow-300',
    label: 'MODERATE',
    bar: 'from-yellow-600 via-yellow-400 to-yellow-600',
  },
  green: {
    badge: 'bg-[#a4c639]/10 backdrop-blur-md border-[#526a27]/70 text-[#a4c639]',
    label: 'NOMINAL',
    bar: 'from-[#526a27] via-[#a4c639] to-[#526a27]',
  },
};


/**
 * The UTC chronometer ticks once a second. Keeping its state here — rather
 * than in App, which owns every screen's data — means that tick repaints a
 * timestamp instead of the whole console.
 */
const Chronometer = React.memo(function Chronometer() {
  const [now, setNow] = useState(() => new Date().toUTCString());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date().toUTCString()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="vg-readout text-[10px] font-semibold">{now}</span>;
});

export default function TopTacticalHeader({
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
  demoMode = false,
}: TopTacticalHeaderProps) {
  const { operatorProfile, logout } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Dismiss the operator menu on any outside click — a stuck menu over a live
  // COP is worse than an extra click to reopen it.
  useEffect(() => {
    if (!profileDropdownOpen) return;
    const onDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [profileDropdownOpen]);

  const threatLevel = situation?.threatLevel || 'green';
  const threatScore = situation?.threatScore ?? 0;
  const posture = THREAT_POSTURE[threatLevel] ?? THREAT_POSTURE.green;

  const navTabs: Array<{
    id: NavSection;
    label: string;
    icon: any;
    key: string;
    count?: number;
    tag?: string;
  }> = [
    { id: 'overview', label: 'Overview', icon: Activity, key: 'O' },
    { id: 'events', label: 'Signal Stream', icon: Radio, key: 'E', count: eventCount },
    { id: 'news', label: 'Verified News', icon: Newspaper, key: 'N', tag: 'LIVE' },
    { id: 'recon', label: 'Satellite Recon', icon: Globe, key: 'R', tag: 'ESRI' },
    { id: 'osint', label: 'OSINT Veracity', icon: ShieldCheck, key: 'V', count: anomalyCount },
    { id: 'vision', label: 'Visual Intel', icon: Cctv, key: 'W', tag: 'CCTV' },
    { id: 'timeline', label: 'Timeline', icon: Clock, key: 'T' },
    { id: 'sources', label: 'Topology', icon: Server, key: 'S' },
    { id: 'simulation', label: 'Scenario Injector', icon: Play, key: 'X' },
    { id: 'api_tester', label: 'API Console', icon: Terminal, key: 'D' },
  ];

  return (
    <header className="sticky top-0 z-40 select-none font-mono bg-black/92 backdrop-blur-xl border-b border-[#526a27]/30 text-slate-200">
      {/* THREAT POSTURE IGNITION BAR — the console's top-line state indicator */}
      <div className={`h-[2px] w-full bg-gradient-to-r ${posture.bar} opacity-80`} />

      {/* PRIMARY HEADER ROW */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-3">
        {/* 1. LEFT: SYSTEM IDENTITY & BACKEND STATUS */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onNavigateToLanding}
            className="flex items-center gap-2.5 group shrink-0"
            title="Return to the VANGUARD overview site"
          >
            <span className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-[#a4c639]/10 backdrop-blur-md border border-[#526a27]/70 group-hover:border-[#a4c639] transition-colors">
              <Shield className="w-3.5 h-3.5 text-[#a4c639]" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#a4c639] vg-pulse-ring" />
            </span>
            <span className="font-heading font-black text-sm tracking-[0.18em] uppercase text-slate-100 group-hover:text-white transition-colors">
              VANGUARD <span className="text-[#a4c639] text-[11px] tracking-widest">C2</span>
            </span>
          </button>

          {/* Feed health readout. Says plainly which dataset is driving the
              console — a demo that pretends to be live is worse than one that
              is honest about it. */}
          <div className="hidden sm:flex items-center gap-2.5 px-2.5 py-1 rounded-lg bg-white/[0.04] backdrop-blur-md border border-[#526a27]/25 text-[10px]">
            {demoMode ? (
              <StatusDot online label="SEEDED DATASET" />
            ) : (
              <>
                <StatusDot online={serverOnline} label={serverOnline ? 'CORE' : 'FALLBACK'} />
                <span className="w-px h-3 bg-[#526a27]/40" />
                <StatusDot online={wsLive} label={wsLive ? 'PUSH' : 'POLL'} />
              </>
            )}
          </div>

          {activeScenario && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="vg-chip border-amber-500/60 bg-amber-950/80 text-amber-300"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              Scenario Active
            </motion.div>
          )}
        </div>

        {/* 2. CENTER: GLOBAL SEARCH PALETTE BUTTON */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-lg w-72 justify-between group bg-white/[0.04] backdrop-blur-md border border-[#526a27]/25 hover:border-[#a4c639]/70 hover:bg-[#a4c639]/10 text-slate-400 hover:text-slate-100 transition-all"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-[#a4c639]" />
            <span className="text-[11px]">Search events, sectors, scenarios…</span>
          </span>
          <kbd className="px-1.5 py-0.5 rounded-lg bg-[#a4c639]/10 backdrop-blur-md border border-[#526a27]/50 text-[9px] text-[#a4c639] font-bold">
            CTRL K
          </kbd>
        </button>

        {/* 3. RIGHT: OPERATOR CLEARANCE, THREAT POSTURE & CHRONOMETER */}
        <div className="flex items-center gap-2">
          <div className="relative" ref={dropdownRef}>
            {!operatorProfile ? (
              <button
                onClick={() => onOpenAuthModal?.()}
                className="vg-btn vg-btn-primary !py-1 !text-[10px]"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            ) : (
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/[0.04] backdrop-blur-md border border-[#526a27]/45 hover:border-[#a4c639] text-slate-200 transition-all group"
              >
                <span className="w-5 h-5 rounded-md bg-[#a4c639]/10 backdrop-blur-md border border-[#526a27] flex items-center justify-center text-[10px] font-bold text-[#a4c639] uppercase">
                  {operatorProfile.displayName ? operatorProfile.displayName.charAt(0) : 'OP'}
                </span>
                <span className="hidden lg:flex flex-col text-left leading-none gap-0.5">
                  <span className="text-[11px] font-bold text-[#a4c639] group-hover:text-white truncate max-w-[110px]">
                    {operatorProfile.displayName}
                  </span>
                  <span className="text-[9px] text-slate-500">
                    [{operatorProfile.clearanceLevel || 'TS-SCI'}]
                  </span>
                </span>
                <ChevronDown
                  className={`w-3 h-3 text-slate-500 transition-transform ${
                    profileDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            )}

            {profileDropdownOpen && operatorProfile && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 mt-2 w-60 vg-panel vg-panel-glow p-2 z-50 space-y-2 text-xs"
              >
                <div className="p-2.5 rounded-lg bg-[#a4c639]/10 backdrop-blur-md border border-[#526a27]/40 space-y-1">
                  <div className="vg-label text-[#a4c639]">Authenticated Operator</div>
                  <div className="font-bold text-slate-100 text-xs truncate">
                    {operatorProfile.displayName}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{operatorProfile.email}</div>
                </div>
                <button
                  onClick={async () => {
                    setProfileDropdownOpen(false);
                    await logout();
                    onOpenAuthModal?.();
                  }}
                  className="vg-btn vg-btn-danger w-full"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out Operator
                </button>
              </motion.div>
            )}
          </div>

          {/* THREAT POSTURE */}
          <div
            className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${posture.badge}`}
          >
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span className="tracking-wider hidden sm:inline">{posture.label}</span>
            <span className="vg-readout text-[10px] opacity-75">({threatScore})</span>
          </div>

          {/* EASY / EXPERT MODE TOGGLE */}
          <button
            onClick={onToggleEasyMode}
            title="Toggle plain-language explanations across the console"
            className={`vg-btn !px-2.5 !py-1 !text-[10px] ${
              easyMode ? '!border-[#a4c639]/70 !bg-[#a4c639]/10 backdrop-blur-md !text-[#a4c639]' : ''
            }`}
          >
            <Sliders className="w-3 h-3" />
            <span className="hidden sm:inline">{easyMode ? 'Easy COP' : 'Expert'}</span>
          </button>

          {/* SYNC / REFRESH */}
          <button
            onClick={onManualRefresh}
            disabled={refreshing}
            className="vg-btn !px-2 !py-1.5"
            title="Force resync with the fusion core"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#a4c639]' : ''}`} />
          </button>

          {/* CHRONOMETER */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] backdrop-blur-md border border-[#526a27]/25 text-slate-300">
            <Clock className="w-3 h-3 text-[#a4c639]" />
            <Chronometer />
          </div>
        </div>
      </div>

      {/* SECONDARY ROW: TACTICAL NAVIGATION TABS */}
      {onTabChange && (
        <nav className="w-full flex items-center gap-1 px-4 border-t border-[#526a27]/20 bg-black/60 overflow-x-auto scrollbar-none">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                title={`${tab.label}  ·  shortcut ${tab.key}`}
                className={`relative flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'text-[#c6ff00]'
                    : 'text-slate-500 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 rounded-lg text-[9px] vg-readout ${
                      isSelected
                        ? 'bg-[#33401c] text-[#c6ff00] border border-[#526a27]/70'
                        : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {tab.tag && (
                  <span className="px-1 rounded-lg bg-[#a4c639]/10 backdrop-blur-md border border-[#526a27]/50 text-[9px] text-[#a4c639] font-bold">
                    {tab.tag}
                  </span>
                )}
                {/* Shared layout indicator — the active rail slides between tabs */}
                {isSelected && (
                  <motion.span
                    layoutId="vg-nav-indicator"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="absolute inset-x-1 -bottom-px h-[2px] rounded-full bg-[#c6ff00] shadow-[0_0_10px_rgba(198,255,0,0.9)]"
                  />
                )}
              </button>
            );
          })}
        </nav>
      )}
    </header>
  );
}

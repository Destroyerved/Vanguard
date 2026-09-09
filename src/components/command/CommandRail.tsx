import React from 'react';
import {
  Activity,
  Map as MapIcon,
  Radio,
  Clock,
  Newspaper,
  ShieldCheck,
  Server,
  Terminal,
  Play,
  Layers,
  ChevronLeft,
  ChevronRight,
  Zap,
  Globe,
  Sliders,
  Cpu
} from 'lucide-react';

export type NavSection = 'overview' | 'events' | 'news' | 'recon' | 'osint' | 'timeline' | 'sources' | 'simulation' | 'api_tester';

interface CommandRailProps {
  activeTab: NavSection;
  onTabChange: (tab: NavSection) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  serverOnline: boolean;
  eventCount: number;
  anomalyCount: number;
}

export default function CommandRail({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  serverOnline,
  eventCount,
  anomalyCount
}: CommandRailProps) {
  const navItems: Array<{
    id: NavSection;
    label: string;
    category: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
    badgeColor?: string;
    shortcut?: string;
  }> = [
    // COMMAND
    { id: 'overview', label: 'Command Overview', category: 'COMMAND', icon: Activity, shortcut: 'O' },

    // INTELLIGENCE
    { id: 'news', label: 'Verified News Hub', category: 'INTELLIGENCE', icon: Newspaper, badge: 'REUTERS/AP', badgeColor: 'bg-[#a4c639]/10 backdrop-blur-md text-[#bcd94f] border-[#526a27]/30', shortcut: 'N' },
    { id: 'recon', label: 'Satellite Recon', category: 'INTELLIGENCE', icon: Globe, badge: 'ESRI HD', badgeColor: 'bg-[#a4c639]/10 backdrop-blur-md text-[#bcd94f] border-[#526a27]/30', shortcut: 'R' },
    { id: 'events', label: 'Signal Stream', category: 'INTELLIGENCE', icon: Radio, badge: eventCount > 0 ? eventCount : undefined, shortcut: 'E' },
    { id: 'osint', label: 'OSINT Veracity', category: 'INTELLIGENCE', icon: ShieldCheck, badge: anomalyCount > 0 ? `${anomalyCount} Anom` : undefined, badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/40', shortcut: 'V' },
    { id: 'timeline', label: 'Threat Timeline', category: 'INTELLIGENCE', icon: Clock, shortcut: 'T' },

    // SOURCES & SYSTEM
    { id: 'sources', label: 'Source Topology', category: 'SOURCES', icon: Server, badge: serverOnline ? 'ONLINE' : 'OFFLINE', badgeColor: serverOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400', shortcut: 'S' },
    { id: 'simulation', label: 'Scenario Injector', category: 'SYSTEM', icon: Play, shortcut: 'X' },
    { id: 'api_tester', label: 'API Diagnostics', category: 'SYSTEM', icon: Terminal, shortcut: 'D' },
  ];

  // Group by Category
  const categories = ['COMMAND', 'INTELLIGENCE', 'SOURCES', 'SYSTEM'];

  return (
    <aside
      className={`relative z-30 flex flex-col justify-between border-r border-white/10 bg-white/[0.04] backdrop-blur-md backdrop-blur-xl transition-all duration-300 select-none ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* RAIL TOP: LOGO & IDENTIFIER */}
      <div>
        <div className="flex items-center gap-3 px-3.5 py-4 border-b border-white/10">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-[#a4c639]/10 backdrop-blur-md border border-[#526a27]/50 text-[#a4c639] font-heading font-bold text-lg tracking-widest shadow-hud-glow">
            V
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#a4c639] animate-pulse" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-heading text-base font-bold tracking-widest text-slate-100 flex items-center gap-1.5">
                VANGUARD
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-lg bg-[#a4c639]/10 backdrop-blur-md text-[#bcd94f] border border-[#526a27]/30">
                  C2
                </span>
              </span>
              <span className="text-[10px] font-mono text-slate-500 tracking-wider uppercase truncate">
                Def Situational COP
              </span>
            </div>
          )}
        </div>

        {/* NAVIGATION ITEMS */}
        <div className="py-3 px-2 space-y-4 overflow-y-auto max-h-[calc(100vh-140px)]">
          {categories.map((cat) => {
            const items = navItems.filter((i) => i.category === cat);
            if (!items.length) return null;

            return (
              <div key={cat} className="space-y-1">
                {!collapsed && (
                  <div className="px-2 pb-1 text-[10px] font-mono tracking-widest text-slate-400 font-semibold uppercase flex items-center justify-between">
                    <span>{cat}</span>
                    <span className="text-[9px] text-slate-500">[{cat.slice(0, 3)}]</span>
                  </div>
                )}
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      title={collapsed ? `${item.label} (${item.shortcut})` : undefined}
                      className={`w-full group relative flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-all duration-150 ${
                        isActive
                          ? 'bg-[#a4c639]/10 backdrop-blur-md text-[#bcd94f] border border-[#526a27]/40 shadow-tactical'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
                      }`}
                    >
                      {/* Active Indicator Line */}
                      {isActive && (
                        <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-[#a4c639] shadow-hud-glow" />
                      )}

                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? 'text-[#a4c639]' : 'text-slate-400 group-hover:text-slate-300'
                        }`}
                      />

                      {!collapsed && (
                        <div className="flex items-center justify-between flex-1 min-w-0">
                          <span className="text-xs font-sans font-medium tracking-wide truncate">
                            {item.label}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {item.badge !== undefined && (
                              <span
                                className={`text-[10px] font-mono px-1.5 py-[1px] rounded-lg border ${
                                  item.badgeColor || 'bg-[#a4c639]/10 backdrop-blur-md text-[#bcd94f] border-[#526a27]/30'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                            {item.shortcut && (
                              <kbd className="hidden group-hover:inline-block text-[9px] font-mono text-slate-500 bg-black/40 px-1 py-0.5 rounded-lg border border-white/5">
                                {item.shortcut}
                              </kbd>
                            )}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* RAIL FOOTER */}
      <div className="p-2 border-t border-white/10 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2 px-2">
            <div
              className={`w-2 h-2 rounded-full ${
                serverOnline ? 'bg-emerald-400 shadow-hud-glow animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-[10px] font-mono text-slate-400 uppercase">
              {serverOnline ? 'FUSION CORE LIVE' : 'SYNTHETIC FALLBACK'}
            </span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-xl hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors ml-auto"
          title={collapsed ? 'Expand Rail (Ctrl+B)' : 'Collapse Rail'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}

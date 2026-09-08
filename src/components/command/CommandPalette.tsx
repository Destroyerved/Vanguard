import React, { useState, useEffect } from 'react';
import {
  Search,
  Map as MapIcon,
  Radio,
  Clock,
  Newspaper,
  ShieldCheck,
  Server,
  Play,
  Terminal,
  X,
  ChevronRight,
  AlertTriangle,
  Zap,
  Globe
} from 'lucide-react';
import { NavSection } from './TopTacticalHeader';
import { UnifiedEvent } from '../../types/schema';
import { DemoScenarioMode } from '../../data/scenarioEngine';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavSection) => void;
  events: UnifiedEvent[];
  onSelectEvent: (event: UnifiedEvent) => void;
  onInjectScenario: (scenario: DemoScenarioMode) => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  events,
  onSelectEvent,
  onInjectScenario
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        isOpen ? onClose() : null;
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredEvents = events
    .filter(
      (e) =>
        e.id.toLowerCase().includes(query.toLowerCase()) ||
        e.title.toLowerCase().includes(query.toLowerCase()) ||
        e.sourceType.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 6);

  const quickNavs: Array<{ id: NavSection; label: string; icon: any }> = [
    { id: 'overview', label: 'Command Overview (O)', icon: Zap },
    { id: 'news', label: 'Verified Signals & News (N)', icon: Newspaper },
    { id: 'recon', label: 'Satellite Recon Media (R)', icon: Globe },
    { id: 'events', label: 'Signal Stream (E)', icon: Radio },
    { id: 'osint', label: 'OSINT Veracity Forensics (V)', icon: ShieldCheck },
    { id: 'timeline', label: 'Threat Timeline (T)', icon: Clock },
    { id: 'sources', label: 'Source Topology (S)', icon: Server },
    { id: 'simulation', label: 'Scenario Injector (X)', icon: Play },
  ];

  const scenarios: Array<{ id: DemoScenarioMode; label: string; desc: string }> = [
    { id: 'COORDINATED_ATTACK', label: 'Inject: Coordinated Multi-Axis Attack', desc: 'Critical radar + perimeter tripwire surge' },
    { id: 'AIR_COMBAT_INTERCEPT', label: 'Inject: Air Combat Intercept', desc: 'Covert infiltration with communication dropouts' },
    { id: 'OSINT_AI_VERIFICATION', label: 'Inject: OSINT AI Deepfake Surge', desc: 'PRNU & acoustic spectral analysis test' },
    { id: 'SEVERE_WEATHER', label: 'Inject: Severe Meteorological Storm', desc: 'Weather degradation & sensor clutter test' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-[#070b10] border border-cyan-500/40 rounded-sm shadow-2xl overflow-hidden font-mono text-xs flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* INPUT HEADER */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 bg-[#0a0f15]">
          <Search className="w-4 h-4 text-cyan-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search operational commands, events, scenarios, coordinates..."
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 outline-none font-mono text-sm"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* RESULTS BODY */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {/* 1. MATCHING EVENTS */}
          {query.trim() && (
            <div className="space-y-1">
              <div className="text-[10px] text-slate-500 uppercase font-semibold px-2">
                Matching Events ({filteredEvents.length})
              </div>
              {filteredEvents.length === 0 ? (
                <div className="px-3 py-2 text-slate-500 text-xs italic">
                  No active events matching "{query}"
                </div>
              ) : (
                filteredEvents.map((evt) => (
                  <button
                    key={evt.id}
                    onClick={() => {
                      onSelectEvent(evt);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-cyan-950/40 hover:border-cyan-500/40 border border-transparent text-left group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-cyan-300 group-hover:text-cyan-200">
                        [{evt.id}]
                      </span>
                      <span className="text-slate-200 truncate max-w-sm">{evt.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
                        {evt.sourceType}
                      </span>
                    </div>
                    <span className="text-[10px] text-cyan-400 font-semibold">
                      CONF: {evt.confidence}%
                    </span>
                  </button>
                ))
              )}
            </div>
          )}

          {/* 2. QUICK NAVIGATION */}
          <div className="space-y-1">
            <div className="text-[10px] text-slate-500 uppercase font-semibold px-2">
              Operational Views
            </div>
            <div className="grid grid-cols-2 gap-1">
              {quickNavs.map((nav) => {
                const Icon = nav.icon;
                return (
                  <button
                    key={nav.id}
                    onClick={() => {
                      onNavigate(nav.id);
                      onClose();
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded hover:bg-white/5 border border-transparent text-left text-slate-300 hover:text-white"
                  >
                    <Icon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{nav.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. SIMULATION PRESETS */}
          <div className="space-y-1">
            <div className="text-[10px] text-slate-500 uppercase font-semibold px-2">
              Scenario Injections
            </div>
            {scenarios.map((sc) => (
              <button
                key={sc.id}
                onClick={() => {
                  onInjectScenario(sc.id);
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-amber-950/40 hover:border-amber-500/40 border border-transparent text-left group"
              >
                <div className="flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-300 font-medium">{sc.label}</span>
                </div>
                <span className="text-[10px] text-slate-500 truncate">{sc.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* PALETTE FOOTER */}
        <div className="px-4 py-2 border-t border-white/10 bg-[#05070a] flex items-center justify-between text-[10px] text-slate-500">
          <span>Navigate with mouse or arrow keys</span>
          <span>Press ESC to dismiss</span>
        </div>
      </div>
    </div>
  );
}

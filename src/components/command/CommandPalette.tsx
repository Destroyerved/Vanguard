import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Radio,
  Clock,
  Newspaper,
  ShieldCheck,
  Server,
  Play,
  X,
  Zap,
  Globe,
  CornerDownLeft,
} from 'lucide-react';
import { NavSection } from './TopTacticalHeader';
import { UnifiedEvent } from '../../types/schema';
import { DemoScenarioMode } from '../../data/scenarioEngine';
import { Chip } from '../ui/tactical';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavSection) => void;
  events: UnifiedEvent[];
  onSelectEvent: (event: UnifiedEvent) => void;
  onInjectScenario: (scenario: DemoScenarioMode) => void;
}

const QUICK_NAVS: Array<{ id: NavSection; label: string; icon: any; hint: string }> = [
  { id: 'overview', label: 'Command Overview', icon: Zap, hint: 'O' },
  { id: 'events', label: 'Signal Stream', icon: Radio, hint: 'E' },
  { id: 'news', label: 'Verified Signals & News', icon: Newspaper, hint: 'N' },
  { id: 'recon', label: 'Satellite Recon Media', icon: Globe, hint: 'R' },
  { id: 'osint', label: 'OSINT Veracity Forensics', icon: ShieldCheck, hint: 'V' },
  { id: 'timeline', label: 'Threat Timeline', icon: Clock, hint: 'T' },
  { id: 'sources', label: 'Source Topology', icon: Server, hint: 'S' },
  { id: 'simulation', label: 'Scenario Injector', icon: Play, hint: 'X' },
];

const SCENARIOS: Array<{ id: DemoScenarioMode; label: string; desc: string }> = [
  {
    id: 'COORDINATED_ATTACK',
    label: 'Inject: Coordinated Multi-Axis Attack',
    desc: 'Critical radar + perimeter tripwire surge',
  },
  {
    id: 'AIR_COMBAT_INTERCEPT',
    label: 'Inject: Air Combat Intercept',
    desc: 'Covert infiltration with comms dropouts',
  },
  {
    id: 'OSINT_AI_VERIFICATION',
    label: 'Inject: OSINT AI Deepfake Surge',
    desc: 'PRNU & acoustic spectral analysis test',
  },
  {
    id: 'SEVERE_WEATHER',
    label: 'Inject: Severe Meteorological Storm',
    desc: 'Weather degradation & sensor clutter test',
  },
];

/** One flat, ordered list of everything selectable — arrow keys walk this. */
type Row =
  | { kind: 'event'; key: string; event: UnifiedEvent }
  | { kind: 'nav'; key: string; nav: (typeof QUICK_NAVS)[number] }
  | { kind: 'scenario'; key: string; scenario: (typeof SCENARIOS)[number] };

export default function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  events,
  onSelectEvent,
  onInjectScenario,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();

  const filteredEvents = useMemo(
    () =>
      q
        ? events
            .filter(
              (e) =>
                e.id.toLowerCase().includes(q) ||
                e.title.toLowerCase().includes(q) ||
                e.sourceType.toLowerCase().includes(q)
            )
            .slice(0, 6)
        : [],
    [events, q]
  );

  const filteredNavs = useMemo(
    () => (q ? QUICK_NAVS.filter((n) => n.label.toLowerCase().includes(q)) : QUICK_NAVS),
    [q]
  );

  const filteredScenarios = useMemo(
    () =>
      q
        ? SCENARIOS.filter(
            (s) => s.label.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q)
          )
        : SCENARIOS,
    [q]
  );

  const rows: Row[] = useMemo(
    () => [
      ...filteredEvents.map((e) => ({ kind: 'event' as const, key: `e:${e.id}`, event: e })),
      ...filteredNavs.map((n) => ({ kind: 'nav' as const, key: `n:${n.id}`, nav: n })),
      ...filteredScenarios.map((s) => ({
        kind: 'scenario' as const,
        key: `s:${s.id}`,
        scenario: s,
      })),
    ],
    [filteredEvents, filteredNavs, filteredScenarios]
  );

  // Reset the highlight whenever the result set changes under the operator.
  useEffect(() => setCursor(0), [q]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setCursor(0);
    }
  }, [isOpen]);

  const run = (row: Row | undefined) => {
    if (!row) return;
    if (row.kind === 'event') onSelectEvent(row.event);
    if (row.kind === 'nav') onNavigate(row.nav.id);
    if (row.kind === 'scenario') onInjectScenario(row.scenario.id);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCursor((c) => (rows.length ? (c + 1) % rows.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCursor((c) => (rows.length ? (c - 1 + rows.length) % rows.length : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        run(rows[cursor]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, rows, cursor, onClose]);

  // Keep the highlighted row in view as the cursor walks past the fold.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const rowClass = (i: number) =>
    `w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border text-left transition-colors ${
      cursor === i
        ? 'bg-[#a4c639]/12 border-[#a4c639]/50'
        : 'border-transparent hover:bg-white/5'
    }`;

  let rowIndex = -1;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/75 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl vg-panel vg-panel-glow font-mono text-xs flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* INPUT HEADER */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 relative">
              <Search className="w-4 h-4 text-[#a4c639]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search commands, events, scenarios…"
                className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 outline-none font-mono text-sm"
                autoFocus
              />
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
              <span className="absolute left-0 bottom-0 h-px w-16 bg-gradient-to-r from-[#c6ff00] to-transparent shadow-[0_0_8px_rgba(164,198,57,0.8)]" />
            </div>

            {/* RESULTS BODY */}
            <div ref={listRef} className="max-h-[58vh] overflow-y-auto p-3 space-y-4">
              {rows.length === 0 && (
                <div className="px-3 py-8 text-center text-slate-500">
                  Nothing matches “{query}”.
                </div>
              )}

              {filteredEvents.length > 0 && (
                <div className="space-y-1">
                  <div className="vg-label px-2">Matching events ({filteredEvents.length})</div>
                  {filteredEvents.map((evt) => {
                    rowIndex += 1;
                    const i = rowIndex;
                    return (
                      <button
                        key={evt.id}
                        data-active={cursor === i}
                        onMouseEnter={() => setCursor(i)}
                        onClick={() => run(rows[i])}
                        className={rowClass(i)}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <span className="vg-readout font-bold text-[#bcd94f]">[{evt.id}]</span>
                          <span className="text-slate-200 truncate">{evt.title}</span>
                          <Chip className="!py-0 !text-[9px] shrink-0">{evt.sourceType}</Chip>
                        </span>
                        <span className="vg-readout text-[10px] text-[#a4c639] font-bold shrink-0">
                          {evt.confidence}%
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {filteredNavs.length > 0 && (
                <div className="space-y-1">
                  <div className="vg-label px-2">Operational views</div>
                  {filteredNavs.map((nav) => {
                    rowIndex += 1;
                    const i = rowIndex;
                    const Icon = nav.icon;
                    return (
                      <button
                        key={nav.id}
                        data-active={cursor === i}
                        onMouseEnter={() => setCursor(i)}
                        onClick={() => run(rows[i])}
                        className={rowClass(i)}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon className="w-3.5 h-3.5 text-[#a4c639]" />
                          <span className="text-slate-200">{nav.label}</span>
                        </span>
                        <kbd className="px-1.5 rounded bg-white/5 border border-white/10 text-[9px] text-slate-400">
                          {nav.hint}
                        </kbd>
                      </button>
                    );
                  })}
                </div>
              )}

              {filteredScenarios.length > 0 && (
                <div className="space-y-1">
                  <div className="vg-label px-2">Scenario injections</div>
                  {filteredScenarios.map((sc) => {
                    rowIndex += 1;
                    const i = rowIndex;
                    return (
                      <button
                        key={sc.id}
                        data-active={cursor === i}
                        onMouseEnter={() => setCursor(i)}
                        onClick={() => run(rows[i])}
                        className={rowClass(i)}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <Play className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="text-amber-300 font-medium truncate">{sc.label}</span>
                        </span>
                        <span className="text-[10px] text-slate-500 truncate hidden sm:block">
                          {sc.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PALETTE FOOTER */}
            <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between vg-label">
              <span className="flex items-center gap-3">
                <span>↑ ↓ navigate</span>
                <span className="flex items-center gap-1">
                  <CornerDownLeft className="w-3 h-3" /> select
                </span>
              </span>
              <span>ESC to dismiss</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

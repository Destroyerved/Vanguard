import React, { useState } from 'react';
import { UnifiedEvent } from '../../types/schema';
import { explainEvent } from '../../data/eventExplainer';
import { Radio, Search, Filter, AlertTriangle, ChevronRight, Activity, Clock, ShieldAlert } from 'lucide-react';

interface SignalHorizonStreamProps {
  events: UnifiedEvent[];
  selectedEventId?: string;
  onSelectEvent: (event: UnifiedEvent) => void;
  easyMode: boolean;
}

export default function SignalHorizonStream({
  events,
  selectedEventId,
  onSelectEvent,
  easyMode
}: SignalHorizonStreamProps) {
  const [filterSource, setFilterSource] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = events.filter((e) => {
    if (filterSource !== 'ALL' && e.sourceType !== filterSource) return false;
    if (filterSeverity !== 'ALL' && e.severity !== filterSeverity) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        e.id.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q) ||
        e.sourceType.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="instrument-panel rounded-sm p-4 border border-white/10 corner-brackets space-y-3 select-none font-mono text-xs flex flex-col h-full">
      {/* HEADER & FILTERS */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400" />
          <span className="font-heading font-bold text-sm tracking-wider text-slate-100 uppercase">
            SIGNAL HORIZON ({filtered.length})
          </span>
        </div>

        {/* QUICK SOURCE FILTER PILLS */}
        <div className="flex items-center gap-1">
          {['ALL', 'radar', 'personnel', 'log', 'incident', 'weather', 'social_media', 'audio_recording'].map((src) => (
            <button
              key={src}
              onClick={() => setFilterSource(src)}
              className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold transition-all ${
                filterSource === src
                  ? 'bg-cyan-950/80 border border-cyan-500/50 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              {src === 'log' ? 'PERIM' : src}
            </button>
          ))}
        </div>
      </div>

      {/* SEARCH INPUT */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter signals by ID, source, title..."
          className="w-full bg-[#05070a] border border-white/10 rounded pl-8 pr-3 py-1.5 text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500/40 text-xs"
        />
      </div>

      {/* EVENT STREAM LIST */}
      <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[460px] pr-1">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500 italic">
            No telemetry signals match the active filter criteria.
          </div>
        ) : (
          filtered.map((evt) => {
            const isSelected = selectedEventId === evt.id;
            const severityColor =
              evt.severity === 'critical'
                ? 'border-l-rose-500 text-rose-300'
                : evt.severity === 'high'
                ? 'border-l-orange-500 text-orange-300'
                : evt.severity === 'medium'
                ? 'border-l-yellow-500 text-yellow-300'
                : 'border-l-cyan-500 text-cyan-300';

            return (
              <button
                key={evt.id}
                onClick={() => onSelectEvent(evt)}
                className={`w-full flex items-center justify-between p-2.5 rounded border transition-all text-left ${
                  isSelected
                    ? 'bg-cyan-950/50 border-cyan-500/60 shadow-hud-glow'
                    : 'bg-[#070b10] border-white/5 hover:border-white/20 hover:bg-white/[0.02]'
                } border-l-4 ${severityColor}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100 text-xs">[{evt.id}]</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/50 text-slate-400 uppercase">
                        {evt.sourceType}
                      </span>
                      {evt.isAnomaly && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-rose-950/80 text-rose-300 border border-rose-500/40 font-bold">
                          ANOMALY
                        </span>
                      )}
                    </div>
                    <span className="text-slate-300 text-xs truncate max-w-sm">{evt.title}</span>
                    {evt.isAnomaly && evt.anomalyReason && (
                      <span className="text-[10px] text-rose-300/90 truncate max-w-md">
                        ⚠ {evt.anomalyReason}
                      </span>
                    )}
                    {evt.mediaAudit && (
                      <span className="text-[10px] text-violet-300/90 truncate max-w-md">
                        ◉ MEDIA AUDIT ·{' '}
                        {evt.mediaAudit.manipulationCategory === 'NONE_DETECTED'
                          ? 'authentic'
                          : evt.mediaAudit.manipulationCategory === 'EVENT_FABRICATING'
                          ? 'fabrication risk'
                          : evt.mediaAudit.manipulationCategory.toLowerCase().replace(/_/g, ' ')}{' '}
                        · auth {evt.mediaAudit.authenticityScore}
                      </span>
                    )}
                    {easyMode && (
                      <span className="text-[11px] text-amber-300/90 italic truncate max-w-md font-sans">
                        💡 {explainEvent(evt).easy.simpleDescription}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 uppercase">CONFIDENCE</div>
                    <div className="font-bold text-cyan-400 text-xs">{evt.confidence}%</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300" />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { UnifiedEvent } from '../../types/schema';
import { explainEvent } from '../../data/eventExplainer';
import { Radio, Search, ChevronRight, ShieldCheck, Lightbulb, SignalHigh } from 'lucide-react';
import { TacticalPanel, Chip, ChipButton, ConfidenceMeter, EmptyState, severityStyle } from '../ui/tactical';

interface SignalHorizonStreamProps {
  events: UnifiedEvent[];
  selectedEventId?: string;
  onSelectEvent: (event: UnifiedEvent) => void;
  easyMode: boolean;
}

const SOURCE_FILTERS = [
  'ALL',
  'radar',
  'personnel',
  'log',
  'incident',
  'weather',
  'social_media',
  'audio_recording',
];

const SEVERITY_FILTERS = ['ALL', 'critical', 'high', 'medium', 'low'];

// Persistent explanation cache: explainEvent() does heavy text generation, so
// only recompute for events whose content actually changed across 3s ticks.
const explanationCache = new Map<string, ReturnType<typeof explainEvent>>();

function getExplanation(evt: UnifiedEvent) {
  const key = `${evt.id}:${evt.timestamp}:${evt.confidence}`;
  let exp = explanationCache.get(key);
  if (!exp) {
    exp = explainEvent(evt);
    explanationCache.set(key, exp);
    if (explanationCache.size > 800) explanationCache.clear();
  }
  return exp;
}

export default function SignalHorizonStream({
  events,
  selectedEventId,
  onSelectEvent,
  easyMode,
}: SignalHorizonStreamProps) {
  const [filterSource, setFilterSource] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(
    () =>
      events.filter((e) => {
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
      }),
    [events, filterSource, filterSeverity, searchQuery]
  );

  return (
    <TacticalPanel
      title={`Signal Horizon`}
      subtitle="Live multi-source telemetry stream"
      icon={Radio}
      glow
      className="h-full font-mono text-xs"
      bodyClassName="flex flex-col gap-3 min-h-0"
      actions={
        <>
          <Chip active>
            <SignalHigh className="w-3 h-3" />
            {filtered.length} / {events.length}
          </Chip>
        </>
      }
    >
      {/* FILTER RAIL */}
      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        <span className="vg-label mr-0.5">Feed</span>
        {SOURCE_FILTERS.map((src) => (
          <ChipButton
            key={src}
            active={filterSource === src}
            onClick={() => setFilterSource(src)}
          >
            {src === 'log' ? 'perim' : src.replace('_', ' ')}
          </ChipButton>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        <span className="vg-label mr-0.5">Sev</span>
        {SEVERITY_FILTERS.map((sev) => (
          <ChipButton
            key={sev}
            active={filterSeverity === sev}
            onClick={() => setFilterSeverity(sev)}
          >
            {sev}
          </ChipButton>
        ))}
      </div>

      {/* SEARCH INPUT */}
      <div className="relative shrink-0">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#526a27]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter signals by ID, source, title…"
          className="vg-input !pl-9"
        />
      </div>

      {/* EVENT STREAM LIST */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Radio}
            title="No signals match the active filter"
            hint="Relax the feed or severity filter, or clear the search box to restore the full horizon."
          />
        ) : (
          filtered.map((evt, i) => {
            const isSelected = selectedEventId === evt.id;
            const sev = severityStyle(evt.severity);

            return (
              <motion.button
                key={evt.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.015, 0.3), duration: 0.3 }}
                onClick={() => onSelectEvent(evt)}
                className={`group w-full flex items-center justify-between gap-3 p-2.5 pl-3 text-left vg-glass-inset relative overflow-hidden ${
                  isSelected ? 'vg-glass-inset-active' : ''
                }`}
              >
                {/* Severity spine */}
                <span
                  className="absolute left-0 top-0 bottom-0 w-[3px]"
                  style={{ background: sev.hex, boxShadow: `0 0 10px ${sev.hex}` }}
                />

                <div className="flex flex-col min-w-0 gap-0.5 pl-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="vg-readout font-bold text-slate-100 text-[11px]">
                      [{evt.id}]
                    </span>
                    <Chip className="!py-0 !text-[9px]">{evt.sourceType.replace('_', ' ')}</Chip>
                    <Chip tone={sev === severityStyle('low') ? 'olive' : 'neutral'} className={`!py-0 !text-[9px] ${sev.text}`}>
                      {evt.severity}
                    </Chip>
                    {evt.isAnomaly && (
                      <Chip tone="danger" className="!py-0 !text-[9px] font-bold">
                        anomaly
                      </Chip>
                    )}
                    {(evt.corroboratedBy?.length ?? 0) > 0 && (
                      <Chip tone="good" className="!py-0 !text-[9px]">
                        <ShieldCheck className="w-2.5 h-2.5" />×{evt.corroboratedBy.length}
                      </Chip>
                    )}
                  </div>

                  <span className="text-slate-200 text-[12px] truncate font-sans">{evt.title}</span>

                  {evt.isAnomaly && evt.anomalyReason && (
                    <span className="text-[10px] text-rose-300/90 truncate">⚠ {evt.anomalyReason}</span>
                  )}

                  {evt.mediaAudit && (
                    <span className="text-[10px] text-emerald-300/90 truncate">
                      ◉ Media audit ·{' '}
                      {evt.mediaAudit.manipulationCategory === 'NONE_DETECTED'
                        ? 'authentic'
                        : evt.mediaAudit.manipulationCategory === 'EVENT_FABRICATING'
                        ? 'fabrication risk'
                        : evt.mediaAudit.manipulationCategory.toLowerCase().replace(/_/g, ' ')}{' '}
                      · auth {evt.mediaAudit.authenticityScore}
                    </span>
                  )}

                  {easyMode && (
                    <span className="flex items-start gap-1 text-[11px] text-amber-300/85 font-sans leading-snug line-clamp-1">
                      <Lightbulb className="w-3 h-3 mt-px shrink-0" />
                      {getExplanation(evt).easy.simpleDescription}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-28 hidden sm:block">
                    <div className="vg-label text-right mb-1">Confidence</div>
                    <ConfidenceMeter value={evt.confidence} />
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#526a27] group-hover:text-[#a4c639] group-hover:translate-x-0.5 transition-all" />
                </div>
              </motion.button>
            );
          })
        )}
      </div>
    </TacticalPanel>
  );
}

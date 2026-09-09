import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { UnifiedEvent } from '../../types/schema';
import { Clock, Play, Pause, RotateCcw, Activity, ChevronRight } from 'lucide-react';
import {
  TacticalPanel,
  ScreenHeading,
  Chip,
  EmptyState,
  severityStyle,
  TacticalButton,
} from '../ui/tactical';

interface TemporalIntelligenceTimelineProps {
  timeline: any[];
  events: UnifiedEvent[];
  selectedEventId?: string;
  onSelectEvent: (event: UnifiedEvent) => void;
}

export default function TemporalIntelligenceTimeline({
  timeline,
  events,
  selectedEventId,
  onSelectEvent,
}: TemporalIntelligenceTimelineProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrubIndex, setScrubIndex] = useState(0);

  // Fall back to synthesising a track from live events when the escalation
  // audit log is empty, so the scrubber is never a blank rail.
  const activeTimeline = useMemo(
    () =>
      timeline && timeline.length > 0
        ? timeline
        : events.map((e) => ({
            timestamp: e.timestamp,
            eventId: e.id,
            event: e,
            title: e.title,
            severity: e.severity,
            confidence: e.confidence,
            threatScore: e.severity === 'critical' ? 240 : e.severity === 'high' ? 120 : 40,
          })),
    [timeline, events]
  );

  const histogram = activeTimeline.slice(0, 40);
  const peak = Math.max(60, ...histogram.map((i) => i.threatScore || 30));

  return (
    <div className="space-y-4 select-none font-mono text-xs pb-2">
      <ScreenHeading
        eyebrow="4D Audit Trail"
        title="Temporal Intelligence & Causal Progression"
        icon={Clock}
        description="Every escalation the fusion core recorded, in order, with the raw events behind each step one click away."
        actions={
          <Chip active>
            {activeTimeline.length} recorded steps
          </Chip>
        }
      />

      {/* THREAT DENSITY HISTOGRAM + SCRUBBER */}
      <TacticalPanel
        title="Threat Escalation Density"
        subtitle="T-60:00 historical → T-00:00 live"
        icon={Activity}
        glow
        actions={
          <div className="flex items-center gap-1.5">
            <TacticalButton
              onClick={() => setIsPlaying(!isPlaying)}
              className="!px-2 !py-1"
              title={isPlaying ? 'Pause replay' : 'Play timeline progression'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </TacticalButton>
            <TacticalButton
              onClick={() => setScrubIndex(0)}
              className="!px-2 !py-1"
              title="Reset to earliest step"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </TacticalButton>
            <Chip active>
              Step {scrubIndex + 1} / {Math.max(1, activeTimeline.length)}
            </Chip>
          </div>
        }
      >
        {histogram.length === 0 ? (
          <EmptyState icon={Clock} title="No escalation history yet" hint="Steps appear as the fusion core records posture changes." />
        ) : (
          <div className="space-y-2">
            {/* Bars are width-capped so a three-step log reads as three ticks
                on a rail, not three billboards. */}
            <div className="flex items-end gap-1 h-28 px-0.5 justify-start">
              {histogram.map((item, idx) => {
                const height = Math.max(10, ((item.threatScore || 30) / peak) * 100);
                const isSelected = selectedEventId === item.eventId || scrubIndex === idx;
                const sev = severityStyle(item.severity || 'low');

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setScrubIndex(idx);
                      if (item.event) onSelectEvent(item.event);
                    }}
                    className="flex-1 group relative flex items-end h-full min-w-[4px] max-w-[34px]"
                    title={`[${item.eventId || 'STEP'}] ${item.title || ''} — ${item.severity || 'nominal'}`}
                  >
                    <motion.span
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: idx * 0.012, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                      className={`w-full rounded-t-sm transition-all ${
                        isSelected ? 'opacity-100' : 'opacity-55 group-hover:opacity-95'
                      }`}
                      style={{
                        background: `linear-gradient(to top, ${sev.hex}, ${sev.hex}88)`,
                        boxShadow: isSelected ? `0 0 14px ${sev.hex}` : 'none',
                      }}
                    />
                    {/* Hover readout */}
                    <span className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block z-30 px-2 py-1 rounded-lg bg-black/90 backdrop-blur-md border border-[#526a27]/60 text-[9px] text-slate-100 whitespace-nowrap shadow-xl pointer-events-none">
                      <span className="block vg-readout">[{item.eventId}]</span>
                      <span className="block text-[#a4c639]">conf {item.confidence ?? 85}%</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between vg-label pt-1 border-t border-white/8">
              <span>T-00:60:00 historical</span>
              <span>Peak {peak} pts</span>
              <span className="text-[#a4c639]">T-00:00:00 live</span>
            </div>
          </div>
        )}
      </TacticalPanel>

      {/* CHRONOLOGICAL PROGRESSION FEED */}
      <TacticalPanel title="Chronological Progression" subtitle="Immutable escalation record" icon={Clock}>
        <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
          {activeTimeline.length === 0 ? (
            <EmptyState icon={Clock} title="Audit log is empty" />
          ) : (
            activeTimeline.map((item, idx) => {
              const matchedEvent = events.find((e) => e.id === item.eventId) || item.event;
              const isSelected = selectedEventId === item.eventId;
              const sev = severityStyle(item.severity || 'low');

              return (
                <button
                  key={idx}
                  onClick={() => matchedEvent && onSelectEvent(matchedEvent)}
                  className={`w-full text-left flex items-start justify-between gap-3 p-3 vg-glass-inset relative ${
                    isSelected ? 'vg-glass-inset-active' : ''
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Step marker on a continuous rail */}
                    <span className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-black/40 border border-[#526a27]/40 shrink-0">
                      <Activity className="w-3.5 h-3.5" style={{ color: sev.hex }} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="vg-readout font-bold text-slate-100 text-[11px]">
                          [{item.eventId || `EVT-00${idx}`}]
                        </span>
                        <span className="vg-label">
                          {new Date(item.timestamp || Date.now()).toLocaleTimeString()}
                        </span>
                        {item.severity && (
                          <span
                            className={`vg-chip !py-0 !text-[9px] ${sev.text} ${sev.border}`}
                          >
                            {item.severity}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-300 text-xs mt-1 font-sans leading-snug">
                        {item.title || item.description || 'Routine telemetry contact update'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#526a27] mt-1 shrink-0" />
                </button>
              );
            })
          )}
        </div>
      </TacticalPanel>
    </div>
  );
}

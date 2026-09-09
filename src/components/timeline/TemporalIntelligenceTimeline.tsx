import React, { useEffect, useMemo, useState } from 'react';
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

/** Normalised timeline row — an escalation record or a raw event. */
interface TimelineRow {
  timestamp: string;
  eventId?: string;
  event?: UnifiedEvent;
  title: string;
  severity: string;
  confidence?: number;
  threatScore: number;
  from?: string;
  to?: string;
}

/** Posture level a record escalated *to*, mapped onto the severity palette. */
const THREAT_TO_SEVERITY: Record<string, string> = {
  red: 'critical',
  orange: 'high',
  yellow: 'medium',
  green: 'low',
};

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

  // Escalation records and raw events have different shapes; normalise both
  // into one row type so the histogram and the feed read the same fields.
  // Records are stored newest-first, so reverse them into reading order.
  const activeTimeline = useMemo<TimelineRow[]>(() => {
    if (timeline && timeline.length > 0) {
      return [...timeline]
        .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
        .map((rec) => {
          const triggerId: string | undefined = rec.triggerEventIds?.[0] ?? rec.eventId;
          return {
            timestamp: rec.timestamp,
            eventId: triggerId,
            event: triggerId ? events.find((e) => e.id === triggerId) : undefined,
            title: rec.reason ?? rec.title ?? 'Posture record',
            severity: THREAT_TO_SEVERITY[rec.to] ?? 'low',
            confidence: rec.confidence,
            threatScore: rec.score ?? rec.threatScore ?? 30,
            from: rec.from,
            to: rec.to,
          };
        });
    }
    return events
      .slice()
      .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
      .map((e) => ({
        timestamp: e.timestamp,
        eventId: e.id,
        event: e,
        title: e.title,
        severity: e.severity,
        confidence: e.confidence,
        threatScore: e.severity === 'critical' ? 240 : e.severity === 'high' ? 120 : 40,
      }));
  }, [timeline, events]);

  const histogram = activeTimeline.slice(0, 40);
  const peak = Math.max(60, ...histogram.map((i) => i.threatScore || 30));

  // Replay: step through the record once per second and select the event
  // behind each step, so Play actually walks the incident.
  useEffect(() => {
    if (!isPlaying || activeTimeline.length === 0) return;
    const id = setInterval(() => {
      setScrubIndex((i) => {
        const next = i + 1;
        if (next >= activeTimeline.length) {
          setIsPlaying(false);
          return i;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isPlaying, activeTimeline.length]);

  // Selecting follows the scrubber so the drawer tracks the replay.
  useEffect(() => {
    const row = activeTimeline[scrubIndex];
    if (isPlaying && row?.event) onSelectEvent(row.event);
  }, [scrubIndex, isPlaying, activeTimeline, onSelectEvent]);

  return (
    <div className="space-y-6 select-none font-mono text-xs">
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
              onClick={() => {
                if (!isPlaying && scrubIndex >= activeTimeline.length - 1) setScrubIndex(0);
                setIsPlaying(!isPlaying);
              }}
              className="!px-2 !py-1"
              title={isPlaying ? 'Pause replay' : 'Play timeline progression'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </TacticalButton>
            <TacticalButton
              onClick={() => {
                setIsPlaying(false);
                setScrubIndex(0);
              }}
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
                    <span
                      className={`w-full rounded-t-sm transition-[height,opacity] duration-500 ${
                        isSelected ? 'opacity-100' : 'opacity-60 group-hover:opacity-95'
                      }`}
                      style={{
                        height: `${height}%`,
                        background: `linear-gradient(to top, ${sev.hex}, ${sev.hex}99)`,
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
                        {item.title}
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

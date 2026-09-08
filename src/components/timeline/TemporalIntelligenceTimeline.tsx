import React, { useState } from 'react';
import { UnifiedEvent } from '../../types/schema';
import { Clock, Play, Pause, RotateCcw, AlertTriangle, ShieldAlert, Activity, ChevronRight } from 'lucide-react';

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
  onSelectEvent
}: TemporalIntelligenceTimelineProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrubIndex, setScrubIndex] = useState(0);

  // Group events into rolling time slices if timeline empty
  const activeTimeline = timeline && timeline.length > 0 ? timeline : events.map((e, idx) => ({
    timestamp: e.timestamp,
    eventId: e.id,
    event: e,
    title: e.title,
    severity: e.severity,
    confidence: e.confidence,
    threatScore: e.severity === 'critical' ? 240 : e.severity === 'high' ? 120 : 40,
  }));

  return (
    <div className="instrument-panel rounded-sm p-5 border border-white/10 corner-brackets space-y-4 select-none font-mono text-xs">
      {/* HEADER & PLAYBACK CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="font-heading font-bold text-sm tracking-wider text-slate-100 uppercase">
            TEMPORAL INTELLIGENCE & CAUSAL PROGRESSION
          </span>
        </div>

        {/* SCRUBBER CONTROLS */}
        <div className="flex items-center gap-2 bg-[#05070a] border border-white/10 rounded px-2 py-1">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1 rounded hover:bg-white/10 text-cyan-400 hover:text-cyan-300"
            title={isPlaying ? 'Pause Replay' : 'Play Timeline Progression'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setScrubIndex(0)}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200"
            title="Reset Timeline to Earliest"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] text-slate-400 px-1">
            STEP {scrubIndex + 1} / {Math.max(1, activeTimeline.length)}
          </span>
        </div>
      </div>

      {/* TIMELINE HISTOGRAM & THREAT DENSITY GRAPH */}
      <div className="space-y-2 p-3 rounded bg-[#05070a] border border-white/5">
        <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase">
          <span>T-00:60:00 (HISTORICAL)</span>
          <span>TEMPORAL EVENT DENSITY & THREAT ESCALATION</span>
          <span>T-00:00:00 (LIVE NOW)</span>
        </div>

        {/* BARS */}
        <div className="flex items-end gap-1.5 h-20 pt-2 px-1">
          {activeTimeline.slice(0, 30).map((item, idx) => {
            const height = Math.min(100, Math.max(15, (item.threatScore || 30) / 3));
            const isSelected = selectedEventId === item.eventId;
            const barColor =
              item.severity === 'critical'
                ? 'bg-rose-500 hover:bg-rose-400 shadow-threat-red'
                : item.severity === 'high'
                ? 'bg-orange-500 hover:bg-orange-400'
                : item.severity === 'medium'
                ? 'bg-yellow-500 hover:bg-yellow-400'
                : 'bg-cyan-500 hover:bg-cyan-400';

            return (
              <button
                key={idx}
                onClick={() => {
                  setScrubIndex(idx);
                  if (item.event) onSelectEvent(item.event);
                }}
                className={`flex-1 rounded-t transition-all group relative ${barColor} ${
                  isSelected ? 'ring-2 ring-white scale-105' : 'opacity-80 hover:opacity-100'
                }`}
                style={{ height: `${height}%` }}
                title={`[${item.eventId || 'STEP'}] ${item.title || ''} - Severity: ${item.severity || 'nominal'}`}
              >
                {/* TOOLTIP ON HOVER */}
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-30 p-1.5 rounded bg-[#070b10] border border-white/20 text-[9px] text-white whitespace-nowrap shadow-xl pointer-events-none">
                  <div>[{item.eventId}]</div>
                  <div>CONF: {item.confidence || 85}%</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CHRONOLOGICAL EVENT PROGRESSION FEED */}
      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {activeTimeline.map((item, idx) => {
          const matchedEvent = events.find((e) => e.id === item.eventId) || item.event;
          const isSelected = selectedEventId === item.eventId;

          return (
            <div
              key={idx}
              onClick={() => matchedEvent && onSelectEvent(matchedEvent)}
              className={`flex items-start justify-between p-3 rounded border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-cyan-950/40 border-cyan-500/50 shadow-hud-glow'
                  : 'bg-[#070b10] border-white/5 hover:border-white/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-1 rounded bg-[#05070a] border border-white/10 text-cyan-400 mt-0.5">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100">[{item.eventId || `EVT-00${idx}`}]</span>
                    <span className="text-[10px] text-slate-500">{new Date(item.timestamp || Date.now()).toLocaleTimeString()}</span>
                    {item.severity && (
                      <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold ${
                        item.severity === 'critical' ? 'bg-rose-950 text-rose-300' : 'bg-cyan-950 text-cyan-300'
                      }`}>
                        {item.severity}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300 text-xs mt-0.5">{item.title || item.description || 'Routine telemetry contact update'}</p>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-600 mt-1" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

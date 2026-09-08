import React from 'react';
import { UnifiedEvent } from '../../types/schema';
import TacticalMap from '../TacticalMap';
import ThreatPostureInstrument from '../intelligence/ThreatPostureInstrument';
import SituationBriefingCard from '../intelligence/SituationBriefingCard';
import SignalHorizonStream from '../intelligence/SignalHorizonStream';

interface OverviewCanvasProps {
  situation: any;
  events: UnifiedEvent[];
  selectedEventId?: string;
  onSelectEvent: (event: UnifiedEvent) => void;
  onSelectEventId: (eventId: string) => void;
  easyMode: boolean;
}

export default function OverviewCanvas({
  situation,
  events,
  selectedEventId,
  onSelectEvent,
  onSelectEventId,
  easyMode
}: OverviewCanvasProps) {
  const criticalEvents = events.filter((e) => e.severity === 'critical');
  const anomalyEvents = events.filter((e) => e.isAnomaly);

  return (
    <div className="space-y-4 select-none">
      {/* 1. PRIMARY OPERATIONAL HORIZON (MAP + THREAT POSTURE & BRIEFING) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT / CENTER (7 COLS): TACTICAL MAP ENVIRONMENT */}
        <div className="lg:col-span-7 h-[540px] flex flex-col">
          <TacticalMap
            events={events}
            onSelectEvent={onSelectEvent}
            selectedEventId={selectedEventId}
          />
        </div>

        {/* RIGHT (5 COLS): THREAT POSTURE INSTRUMENT & GROUNDED BRIEFING */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <ThreatPostureInstrument
            situation={situation}
            eventsCount={events.length}
            criticalCount={criticalEvents.length}
            anomalyCount={anomalyEvents.length}
          />

          <SituationBriefingCard
            situation={situation}
            onSelectEventId={onSelectEventId}
            easyMode={easyMode}
          />
        </div>
      </div>

      {/* 2. BOTTOM HIGH-DENSITY SIGNAL STREAM HORIZON */}
      <div className="w-full">
        <SignalHorizonStream
          events={events}
          selectedEventId={selectedEventId}
          onSelectEvent={onSelectEvent}
          easyMode={easyMode}
        />
      </div>
    </div>
  );
}

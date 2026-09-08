import React from 'react';
import { UnifiedEvent, AISummary, CorrelationCluster } from '../../types/schema';
import TacticalMap from '../TacticalMap';
import ThreatPostureInstrument from '../intelligence/ThreatPostureInstrument';
import SituationBriefingCard from '../intelligence/SituationBriefingCard';

interface OverviewCanvasProps {
  situation: any;
  events: UnifiedEvent[];
  briefing?: AISummary | null;
  briefingMeta?: { ageMs: number; generating: boolean; groundingVerified: boolean };
  clusters?: CorrelationCluster[];
  selectedEventId?: string;
  onSelectEvent: (event: UnifiedEvent) => void;
  onSelectEventId: (eventId: string) => void;
  easyMode: boolean;
  onNavigateToTab?: (tab: any) => void;
}

export default function OverviewCanvas({
  situation,
  events,
  briefing,
  briefingMeta,
  clusters = [],
  selectedEventId,
  onSelectEvent,
  onSelectEventId,
  easyMode
}: OverviewCanvasProps) {
  const criticalEvents = events.filter((e) => e.severity === 'critical');
  const anomalyEvents = events.filter((e) => e.isAnomaly);

  return (
    <div className="space-y-4 select-none font-mono">
      {/* 1. TOP: FULL LANDSCAPE GEOSPATIAL COMMON OPERATING PICTURE */}
      <div className="w-full h-[480px]">
        <TacticalMap
          events={events}
          clusters={clusters}
          onSelectEvent={onSelectEvent}
          selectedEventId={selectedEventId}
        />
      </div>

      {/* 2. BOTTOM: TWO SQUARES / CARDS (DEFENSE THREAT POSTURE & SITUATION SUMMARY) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SQUARE 1: DEFENSE THREAT POSTURE */}
        <div className="h-full">
          <ThreatPostureInstrument
            situation={situation}
            eventsCount={events.length}
            criticalCount={criticalEvents.length}
            anomalyCount={anomalyEvents.length}
          />
        </div>

        {/* SQUARE 2: SITUATION SUMMARY */}
        <div className="h-full">
          <SituationBriefingCard
            situation={situation}
            briefing={briefing}
            briefingMeta={briefingMeta}
            onSelectEventId={onSelectEventId}
            easyMode={easyMode}
          />
        </div>
      </div>
    </div>
  );
}
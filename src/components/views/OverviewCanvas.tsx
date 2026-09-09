import React from 'react';
import {
  Activity,
  AlertTriangle,
  Crosshair,
  Gauge,
  Map as MapIcon,
  Radio,
} from 'lucide-react';
import { UnifiedEvent, AISummary, CorrelationCluster } from '../../types/schema';
import TacticalMap from '../TacticalMap';
import ThreatPostureInstrument from '../intelligence/ThreatPostureInstrument';
import SituationBriefingCard from '../intelligence/SituationBriefingCard';
import { StatTile, ScreenHeading, Chip } from '../ui/tactical';

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
  easyMode,
}: OverviewCanvasProps) {
  const criticalEvents = events.filter((e) => e.severity === 'critical');
  const anomalyEvents = events.filter((e) => e.isAnomaly);
  const corroborated = events.filter((e) => (e.corroboratedBy?.length ?? 0) > 0);

  const meanConfidence = events.length
    ? Math.round(events.reduce((acc, e) => acc + e.confidence, 0) / events.length)
    : situation?.meanConfidence ?? 0;

  // Distinct feeds currently contributing to the picture — the single number
  // that tells an operator whether fusion actually has multi-source coverage.
  const activeFeeds = new Set(events.map((e) => e.sourceType)).size;

  const kpis = [
    { label: 'Active tracks', value: events.length, icon: Radio, tone: 'lime' as const },
    { label: 'Critical', value: criticalEvents.length, icon: AlertTriangle, tone: 'rose' as const },
    { label: 'Anomalies', value: anomalyEvents.length, icon: Crosshair, tone: 'amber' as const },
    { label: 'Mean confidence', value: meanConfidence, unit: '%', icon: Gauge, tone: 'lime' as const },
  ];

  return (
    <div className="space-y-6 select-none font-mono">
      <ScreenHeading
        eyebrow="Common Operating Picture"
        title="Sector Situational Overview"
        icon={Activity}
        description="Every sensor feed fused into one geospatial picture, with the confidence arithmetic behind each track kept visible."
        actions={
          <Chip active>
            <span className="w-1.5 h-1.5 rounded-full bg-[#c6ff00] animate-pulse" />
            {activeFeeds} feeds live
          </Chip>
        }
      />

      {/* 1. KPI INSTRUMENT STRIP — the fusion picture in four numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <StatTile key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* 2. FULL-WIDTH GEOSPATIAL COMMON OPERATING PICTURE */}
      <div className="vg-panel p-1.5 w-full h-[520px]">
        <div className="w-full h-full rounded-xl overflow-hidden relative">
          <TacticalMap
            events={events}
            clusters={clusters}
            onSelectEvent={onSelectEvent}
            selectedEventId={selectedEventId}
          />
        </div>
      </div>

      {/* 3. THREAT POSTURE & GROUNDED SITUATION BRIEFING */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="h-full">
          <ThreatPostureInstrument
            situation={situation}
            eventsCount={events.length}
            criticalCount={criticalEvents.length}
            anomalyCount={anomalyEvents.length}
          />
        </div>

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

      {/* Footer readout — quiet provenance line, same idiom as the landing page */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-1 pt-1 vg-label">
        <span className="flex items-center gap-1.5">
          <MapIcon className="w-3 h-3 text-[#526a27]" />
          Projection: Leaflet / WGS-84
        </span>
        <span>Fusion window: ΔR ≤ 2.1 km · ΔT ≤ 18 s</span>
        <span>
          {corroborated.length} corroborated · {clusters.length} fused clusters
        </span>
        <span>
          Grounding:{' '}
          <span className={briefingMeta?.groundingVerified ? 'text-emerald-400' : 'text-amber-400'}>
            {briefingMeta?.groundingVerified ? 'verified' : 'pending'}
          </span>
        </span>
      </div>
    </div>
  );
}

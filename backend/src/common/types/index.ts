export type SourceType = 'radar' | 'weather' | 'personnel' | 'log' | 'incident';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export type ThreatLevel = 'green' | 'yellow' | 'orange' | 'red';

export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical';

export type SourceHealthStatus = 'live' | 'degraded' | 'down';

export interface GeoLocation {
  lat: number;
  lng: number;
  altitudeMeters?: number;
  headingDegrees?: number;
  speedKnots?: number;
}

export interface ConfidenceBreakdown {
  overall: number;
  sourceAgreement: number;
  spatialAgreement: number;
  temporalAgreement: number;
  sourceReliability: number;
  dataFreshness: number;
}

export interface UnifiedEvent {
  id: string;
  sourceType: SourceType;
  timestamp: string;
  location: GeoLocation;
  severity: SeverityLevel;
  title: string;
  description: string;
  confidence: number;
  confidenceBreakdown?: ConfidenceBreakdown;
  corroboratedBy: string[];
  isAnomaly: boolean;
  raw: Record<string, unknown>;
}

export interface CourseOfAction {
  id: string;
  title: string;
  description: string;
  pros: string[];
  tradeoffs: string[];
  recommendedUrgency: number;
}

export interface KeyDevelopment {
  point: string;
  supportingEventIds: string[];
}

export interface PrioritizedAction {
  action: string;
  urgency: number;
  supportingEventIds: string[];
}

export interface AISummary {
  generatedAt: string;
  threatLevel: ThreatLevel;
  headline: string;
  executiveSummary: string;
  keyDevelopments: KeyDevelopment[];
  prioritizedActions: PrioritizedAction[];
  coursesOfAction: CourseOfAction[];
}

export interface SourceHealth {
  sourceType: SourceType;
  sourceName: string;
  status: SourceHealthStatus;
  lastUpdate: string;
  reliabilityScore: number;
  activeCount: number;
}

export interface Alert {
  id: string;
  eventId: string;
  priority: PriorityLevel;
  title: string;
  createdAt: string;
  severity: SeverityLevel;
  confidence: number;
  location: GeoLocation;
}

export interface SituationState {
  threatLevel: ThreatLevel;
  summary: string;
  activeAlertsCount: number;
  generatedAt: string;
  confidence?: ConfidenceBreakdown;
}

export interface SituationTimelineEntry {
  timestamp: string;
  threatLevel: ThreatLevel;
  triggerEventId?: string;
}

export interface Zone {
  id: string;
  type: string;
  name: string;
  geojson: Record<string, unknown>;
}

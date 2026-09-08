/**
 * Vanguard Multi-Source Defence Situational Awareness System
 * Authoritative Data Schemas (PRD §7.1)
 */

export type SourceType = 'radar' | 'weather' | 'personnel' | 'log' | 'incident';
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export type ThreatLevel = 'green' | 'yellow' | 'orange' | 'red';
export type IffTag = 'FRIENDLY' | 'HOSTILE' | 'NEUTRAL' | 'UNKNOWN';

export interface GeoLocation {
  lat: number;
  lng: number;
  altitudeMeters?: number;
  headingDegrees?: number;
  speedKnots?: number;
}

export interface ConfidenceBreakdown {
  overall: number;              // 0-100
  sourceAgreement: number;       // 0-100
  spatialAgreement: number;      // 0-100
  temporalAgreement: number;     // 0-100
  sourceReliability: number;     // 0-100
  dataFreshness: number;         // 0-100
}

export interface UnifiedEvent {
  id: string;
  sourceType: SourceType;
  timestamp: string;            // ISO 8601 string
  location: GeoLocation;
  severity: SeverityLevel;
  title: string;
  description: string;
  confidence: number;           // 0-100
  confidenceBreakdown?: ConfidenceBreakdown;
  corroboratedBy: string[];     // Array of linked event IDs
  isAnomaly: boolean;
  raw: Record<string, unknown>;
}

export interface SourceHealth {
  sourceType: SourceType;
  sourceName: string;
  status: 'live' | 'degraded' | 'down';
  lastUpdate: string;
  reliabilityScore: number;     // 0.0 - 1.0
  activeCount: number;
}

export interface AssetUnit {
  id: string;
  callsign: string;
  branch: 'ARMY' | 'NAVY' | 'AIRFORCE' | 'CIVIL';
  status: 'READY' | 'ENGAGED' | 'MAINTENANCE' | 'OFFLINE';
  location: GeoLocation;
  fuelLevel: number;            // 0-100%
  batteryPercent: number;        // 0-100%
  commIntegrity: number;        // 0-100%
  lastBeacon: string;
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  threatLevel: ThreatLevel;
  events: UnifiedEvent[];
  assets: AssetUnit[];
  sourcesHealth: SourceHealth[];
}

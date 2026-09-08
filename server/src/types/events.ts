/**
 * VANGUARD — Unified Event Model v1.1 (authoritative)
 *
 * Every heterogeneous feed (radar, weather, personnel, log, incident) is
 * normalized into `UnifiedEvent` BEFORE it is allowed into the fusion pipeline.
 * Nothing downstream — fusion, AI synthesis, API, WebSocket — is ever permitted
 * to see a raw source payload except through `UnifiedEvent.raw`.
 *
 * Contract source of truth: Vanguard_PRD.md §7.1
 */

/** The five heterogeneous ingestion streams VANGUARD fuses. */
export type SourceType = 'radar' | 'weather' | 'personnel' | 'log' | 'incident';

/** Operational severity tiers, ascending. */
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

/** Aggregate command threat posture, ascending. */
export type ThreatLevel = 'green' | 'yellow' | 'orange' | 'red';

/** Liveness of an ingestion feed. */
export type SourceStatus = 'live' | 'degraded' | 'down';

/** Ordered severity tiers — index is the ordinal rank. */
export const SEVERITY_ORDER: readonly SeverityLevel[] = [
  'low',
  'medium',
  'high',
  'critical',
] as const;

/** Ordered threat levels — index is the ordinal rank. */
export const THREAT_ORDER: readonly ThreatLevel[] = [
  'green',
  'yellow',
  'orange',
  'red',
] as const;

/** All five source types, in canonical display order. */
export const SOURCE_TYPES: readonly SourceType[] = [
  'radar',
  'weather',
  'personnel',
  'log',
  'incident',
] as const;

/**
 * A geospatial fix with optional kinematics.
 * `lat`/`lng` are WGS-84 decimal degrees — never `latitude`/`longitude`,
 * never `[lng, lat]` tuples outside of GeoJSON serialization boundaries.
 */
export interface GeoLocation {
  /** WGS-84 latitude, -90 .. +90 */
  lat: number;
  /** WGS-84 longitude, -180 .. +180 */
  lng: number;
  /** Contact altitude above mean sea level, metres. */
  altitudeMeters?: number;
  /** True heading, 0 .. 360 degrees (0 = north, clockwise). */
  headingDegrees?: number;
  /** Ground/air speed in knots. */
  speedKnots?: number;
}

/**
 * Transparent, per-factor decomposition of a confidence score.
 * Every field is an integer 0-100 so the UI can render it directly
 * without unit conversion, and so judges can verify the arithmetic by hand.
 */
export interface ConfidenceBreakdown {
  /** Final fused score, 0-100. Equal to `UnifiedEvent.confidence`. */
  overall: number;
  /** How many DISTINCT source types agree on this contact, 0-100. */
  sourceAgreement: number;
  /** How tightly corroborators cluster in space, 0-100. */
  spatialAgreement: number;
  /** How tightly corroborators cluster in time, 0-100. */
  temporalAgreement: number;
  /** Static/dynamic trust weight of the originating feed, 0-100. */
  sourceReliability: number;
  /** Exponential recency decay of the observation, 0-100. */
  dataFreshness: number;
}

/**
 * The single normalized record type that flows through the entire system.
 */
export interface UnifiedEvent {
  /** Stable unique identifier, e.g. "EV-RAD-004091". */
  id: string;
  /** Which of the five feeds produced this observation. */
  sourceType: SourceType;
  /** Human-readable feed instance, e.g. "RADAR-PRIMARY". */
  sourceName: string;
  /** ISO 8601 UTC timestamp of the MOST RECENT observation. */
  timestamp: string;
  /**
   * ISO 8601 UTC timestamp of the FIRST observation of this entity.
   *
   * For a discrete occurrence this equals `timestamp`. For a persistent entity
   * (a radar track, a unit) `timestamp` advances with every update while this
   * stays fixed, which is what lets the time-scrubber answer "did this contact
   * exist yet at 11:42?" correctly.
   */
  firstSeen?: string;
  /** Where the observation occurred. */
  location: GeoLocation;
  /** Operational severity after fusion escalation. */
  severity: SeverityLevel;
  /** Severity as originally reported by the source, before fusion escalation. */
  baseSeverity: SeverityLevel;
  /** Concise tactical title (<= 80 chars). */
  title: string;
  /** Operational context, one or two sentences. */
  description: string;
  /** Fused confidence, integer 0-100. */
  confidence: number;
  /** Per-factor confidence decomposition, populated by the fusion engine. */
  confidenceBreakdown?: ConfidenceBreakdown;
  /** IDs of independent events that corroborate this one. */
  corroboratedBy: string[];
  /** Correlation cluster this event was assigned to, if any. */
  clusterId?: string;
  /** True when statistical outlier detection flagged this event. */
  isAnomaly: boolean;
  /** Why the anomaly detector fired, for explainability. */
  anomalyReason?: string;
  /** Untouched original source payload — the audit trail. */
  raw: Record<string, unknown>;
}

/**
 * A spatiotemporal correlation cluster: a set of events judged by the fusion
 * engine to be observations of the same developing real-world situation.
 */
export interface CorrelationCluster {
  id: string;
  /** Member event IDs. */
  eventIds: string[];
  /** Distinct source types represented in the cluster. */
  distinctSources: SourceType[];
  /** Area-weighted cluster centroid. */
  centroid: { lat: number; lng: number };
  /** Greatest pairwise distance from centroid, metres. */
  radiusMeters: number;
  /** ISO timestamp of the earliest member. */
  firstSeen: string;
  /** ISO timestamp of the latest member. */
  lastSeen: string;
  /** Highest severity present in the cluster. */
  peakSeverity: SeverityLevel;
  /** Mean confidence across members, 0-100. */
  meanConfidence: number;
}

/** A live operational unit rendered on the Assets map layer. */
export interface TacticalAsset {
  id: string;
  callsign: string;
  kind: 'ground' | 'air' | 'naval' | 'static';
  location: GeoLocation;
  status: 'ready' | 'engaged' | 'refit' | 'offline';
  readinessPercent: number;
  lastUpdate: string;
}

/** An operational zone rendered on the Zones map layer. */
export interface OperationalZone {
  id: string;
  name: string;
  kind: 'sector' | 'restricted_airspace' | 'patrol_perimeter' | 'geofence';
  /** Closed polygon ring in [lng, lat] GeoJSON order. */
  polygon: [number, number][];
  severityBias: SeverityLevel;
}

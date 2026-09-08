/**
 * VANGUARD — Unified Event Model v1.1 (authoritative)
 *
 * Every heterogeneous feed (radar, weather, personnel, log, incident,
 * social_media, audio_recording) is normalized into `UnifiedEvent` BEFORE it is
 * allowed into the fusion pipeline. Nothing downstream — fusion, AI synthesis,
 * API, WebSocket — is ever permitted to see a raw source payload except through
 * `UnifiedEvent.raw`.
 *
 * Contract source of truth: Vanguard_PRD.md §7.1
 */

/** The heterogeneous ingestion streams VANGUARD fuses. */
export type SourceType =
  | 'radar'
  | 'weather'
  | 'personnel'
  | 'log'
  | 'incident'
  | 'social_media'
  | 'audio_recording';

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

/** All source types, in canonical display order. */
export const SOURCE_TYPES: readonly SourceType[] = [
  'radar',
  'weather',
  'personnel',
  'log',
  'incident',
  'social_media',
  'audio_recording',
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
  /**
   * Media authenticity discount applied to social-media and audio-recording
   * events, 0-100. Absent (or 100) when the event carries no media audit.
   */
  mediaAuthenticity?: number;
}

/**
 * How VANGUARD reads a piece of media after forensic analysis.
 *
 * Deliberately NOT a binary "real/fake" verdict. Per the media authenticity
 * flow, the honest question is "how trustworthy is this media as evidence?",
 * and that has two degrees of freedom: how much the media itself was
 * manipulated (authenticityScore) and whether the UNDERLYING EVENT is real
 * (corroborationScore). The two can disagree — a deepfake video of an event
 * that happened is possible, and a pristine video of an event that never
 * happened is easier to make than ever.
 */
export type ManipulationCategory =
  /** No manipulation detected across any check. */
  | 'NONE_DETECTED'
  /** Edited/compressed/cropped/stabilized/enhanced, but not fabricated. */
  | 'LEGITIMATE_ENHANCEMENT'
  /**
   * AI-generated or AI-packaged media whose EVENT is nevertheless independently
   * corroborated by other VANGUARD intelligence. The media is still weak
   * evidence; the corroboration is what bears the weight.
   */
  | 'HYBRID_CORROBORATED'
  /** AI-generated content describing an event nothing else corroborates. */
  | 'EVENT_FABRICATING'
  /** Cannot be determined from the available evidence. */
  | 'AUTHENTICITY_UNVERIFIED';

/** One forensic check VANGUARD runs. `id` keys the tuning weights. */
export type MediaCheckId =
  | 'provenance-c2pa'
  | 'bitstream-container'
  | 'visual-frame'
  | 'temporal-consistency'
  | 'acoustic-spectrum'
  | 'sensor-prnu'
  | 'edit-origin';

/** A concrete artifact or indicator found by a check, with the detector's owns confidence. */
export interface MediaFinding {
  code: string;
  detail: string;
  /** Detector confidence, 0-100 — NOT the system's belief about the event. */
  confidence: number;
}

/** Result of one forensic check. `score` is 0-100, HIGHER = more genuine. */
export interface MediaCheckResult {
  id: MediaCheckId;
  name: string;
  /** 0-100; 100 = no manipulation evidence in this dimension. */
  score: number;
  /** Relative weight in the aggregate scores. Sums to 1 over the 3 + 4 groups. */
  weight: number;
  /** False when the check has nothing to analyze (e.g. no audio track). */
  applicable: boolean;
  findings: MediaFinding[];
}

/** Bitstream and container-level metadata extracted from the media. */
export interface MediaForensicMetadata {
  container: string;
  videoCodec: string;
  audioCodec: string;
  resolution: string;
  frameRateFps: number;
  bitrateKbps: number;
  durationSec: number;
  /** ISO timestamp recorded in the container's metadata atom. */
  creationTimestamp: string;
  /** Software that last muxed the container, e.g. "Lavf58.76.100". */
  softwareMuxer: string;
  /** Ordered processing history, most recent last. */
  reEncodingHistory: string[];
  /** C2PA cryptographic signature state. Absent when edited or AI-generated. */
  c2paManifestIntact: boolean;
  /** Hardware device / sensor identifier, when one exists. */
  deviceFingerprint?: string;
  captureDevice?: string;
}

/** Frame-level facial and rendering analysis across sampled keyframes. */
export interface VisualFrameAnalysis {
  faceConsistencyScore: number;
  edgeBoundaryBlurScore: number;
  lightingShadowScore: number;
  pupilReflectionScore: number;
  keyframeArtifacts: { frameIndex: number; timestampSec: number; anomalyType: string; confidence: number }[];
}

/** Inter-frame motion and object-persistence consistency. */
export interface TemporalConsistencyAnalysis {
  interFrameWarpingScore: number;
  morphingDeltaVariance: number;
  objectPersistenceScore: number;
  frameJitterPattern: 'NATURAL_CAMERA_SHAKE' | 'AI_GENERATIVE_WARP' | 'STABLE_TRIPOD';
}

/** Acoustic spectrum and audio/video sync analysis. */
export interface AcousticSpectrumAnalysis {
  noiseFloorDbfs: number;
  harmonicPhaseEnvelopeScore: number;
  highFrequencyCutoffKhz: number;
  avSyncOffsetMs: number;
  voiceCloningProbability: number;
}

/** Sensor-level characteristics: the camera that "took" the media. */
export interface CameraSensorCharacteristics {
  estimatedSensorType: string;
  prnuSensorFingerprintMatch: number;
  chromaticAberrationConsistency: number;
  compressionPattern: string;
}

/** One link in the preserved provenance chain. */
export interface ProvenanceEntry {
  step: string;
  tool?: string;
  /** True when this step originated from a physical hardware capture. */
  hardwareCapture: boolean;
  /** True when this step introduced synthetic content (AI generation/voice). */
  syntheticGeneration: boolean;
  /** True when this step is ordinary legitimate editing (cut, crop, grade). */
  legitimateEditing: boolean;
}

/**
 * The full media authenticity assessment attached to a media event.
 * Populated by the media engine at normalization time and refreshed by the
 * fusion pipeline whenever corroboration changes — the classification depends
 * on it, so it is a live quantity, not a forensic archive.
 */
export interface MediaAuthenticityAudit {
  /** ISO when the media engine evaluated this item. */
  evaluatedAt: string;
  /** How trustworthy this media is AS EVIDENCE, 0-100. */
  authenticityScore: number;
  /** How much manipulation the checks believe is present, 0-100. */
  manipulationRisk: number;
  manipulationCategory: ManipulationCategory;
  /** Probability the content itself is AI-synthesized, 0-100. */
  aiSyntheticScore: number;
  /** Container/bitstream/provenance-chain integrity, 0-100. */
  provenanceScore: number;
  /** Intrinsic (content-level) consistency, 0-100. */
  intrinsicConsistency: number;
  /** Cross-source agreement computed by the fusion pipeline, 0-100. */
  corroborationScore: number;
  /** Artifacts found across all applicable checks, for the operator. */
  deepfakeArtifacts: MediaFinding[];
  /** The ground truth that survives the media regardless of manipulation. */
  factualCoreExtracted: string;
  /** Provenance chain as structured data for the evidence registry. */
  provenanceChain: ProvenanceEntry[];
  /** Source reliability used when evaluating, 0..1. */
  sourceReliability: number;
  /** Every check that ran, with its score, weight and findings. */
  checks: MediaCheckResult[];
  metadata?: MediaForensicMetadata;
  visualFrames?: VisualFrameAnalysis;
  temporalConsistency?: TemporalConsistencyAnalysis;
  acousticSpectrum?: AcousticSpectrumAnalysis;
  cameraCharacteristics?: CameraSensorCharacteristics;
}

/**
 * The single normalized record type that flows through the entire system.
 */
export interface UnifiedEvent {
  /** Stable unique identifier, e.g. "EV-RAD-004091". */
  id: string;
  /** Which of the feeds produced this observation. */
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
  /**
   * Media authenticity assessment, present on every social-media and
   * audio-recording event. Never an auto-discard trigger — it discounts how
   * much the media is worth as evidence, while independent corroboration can
   * still carry the event.
   */
  mediaAudit?: MediaAuthenticityAudit;
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

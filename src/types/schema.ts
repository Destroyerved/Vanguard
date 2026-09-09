/**
 * Vanguard Multi-Source Defence Situational Awareness System
 * Authoritative Data Schemas (PRD §7.1)
 */

export type SourceType = 'radar' | 'weather' | 'personnel' | 'log' | 'incident' | 'submarine' | 'ground_conflict' | 'social_media' | 'audio_recording' | 'video';
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

export interface MediaForensicMetadata {
  container: string;                 // e.g. 'QuickTime / MP4', 'Matroska / WebM'
  videoCodec: string;                // e.g. 'H.264 / AVC', 'HEVC / H.265', 'AV1', 'VP9'
  audioCodec: string;                // e.g. 'AAC-LC', 'Opus', 'MP3', 'PCM'
  resolution: string;                // e.g. '1920x1080 (FHD)', '3840x2160 (4K)'
  frameRateFps: number;              // e.g. 29.97, 30.0, 59.94, 60.0
  bitrateKbps: number;               // e.g. 8500
  durationSec: number;               // e.g. 42.5
  creationTimestamp: string;         // ISO timestamp in metadata atom
  softwareMuxer: string;             // e.g. 'Lavf58.76.100', 'Adobe Premiere Pro 2024', 'CapCut iOS 12.1'
  reEncodingHistory: string[];       // e.g. ['Captured: Sony ILCE-7M4', 'Muxed: CapCut v12.1', 'Transcoded: Instagram CDN H.264 High@L4.1']
  c2paManifestIntact: boolean;       // C2PA cryptographic signature state
  exifDeviceFingerprint?: string;    // Device / camera serial / sensor ID
}

export interface VisualFrameAnalysis {
  faceConsistencyScore: number;       // 0-100 (Lower = synthetic face artifact)
  edgeBoundaryBlurScore: number;      // 0-100 (Lower = mask blending blur detected)
  lightingShadowScore: number;        // 0-100 (Lower = inconsistent shadow vectors)
  pupilReflectionScore: number;       // 0-100 (Lower = corneal highlight asymmetry)
  keyframeArtifacts: {
    frameIndex: number;
    timestampSec: number;
    anomalyType: string;
    confidence: number;
    boundingRegion?: string;
  }[];
}

export interface TemporalConsistencyAnalysis {
  interFrameWarpingScore: number;     // 0-100 (Higher = unstable optical flow / AI warping)
  morphingDeltaVariance: number;      // 0-100
  objectPersistenceScore: number;     // 0-100
  frameJitterPattern: 'NATURAL_CAMERA_SHAKE' | 'AI_GENERATIVE_WARP' | 'STABLE_TRIPOD';
}

export interface AcousticSpectrumAnalysis {
  noiseFloorDbfs: number;             // e.g. -54 dB (Authentic ambient) vs -96 dB (Synthetic zero-noise)
  harmonicPhaseEnvelopeScore: number; // 0-100 (Lower = synthetic constant-phase TTS)
  highFrequencyCutoffKhz: number;     // e.g. 22.05 kHz (Authentic) vs 16.0 kHz (Neural Vocoder cap)
  avSyncOffsetMs: number;             // Audio/Video offset in ms (e.g. +12ms authentic vs +180ms desync)
  voiceCloningProbability: number;    // 0-100%
  frequencySpectrumBins?: number[];   // 16 or 32-band FFT amplitudes for visualizer
}

export interface CameraSensorCharacteristics {
  estimatedSensorType: string;        // e.g. '1/2.3" CMOS Rolling Shutter' or 'Full-Frame Global Shutter'
  prnuSensorFingerprintMatch: number;// 0-100%
  chromaticAberrationConsistency: number; // 0-100%
  compressionPattern: string;        // e.g. 'H.264 4:2:0 8-bit CABAC Quant-Matrix Q=22'
}

export interface AuthenticityAudit {
  overallAuthenticityScore: number;       // 0-100%
  veracityClassification: 'VERIFIED_AUTHENTIC' | 'HYBRID_AI_AUTHENTIC_FACT' | 'SYNTHETIC_DISINFORMATION' | 'UNVERIFIED_AMBIGUOUS';
  aiSyntheticScore: number;              // 0-100% (Higher = More AI/Deepfake detected)
  deepfakeArtifacts: string[];           // e.g., ["AI Voice Synthesis Detected", "Facial Warp Artifact"]
  acousticSpectrumScore: number;         // 0-100%
  provenanceScore: number;               // 0-100% (EXIF / C2PA integrity)
  crossSensorCorroborationScore: number; // 0-100% (Matches satellite/radar/seismic)
  factualCoreExtracted: string;          // Extracted ground truth fact despite AI wrapping
  
  // Extended multi-parameter forensic extractions
  metadata?: MediaForensicMetadata;
  visualFrames?: VisualFrameAnalysis;
  temporalConsistency?: TemporalConsistencyAnalysis;
  acousticSpectrum?: AcousticSpectrumAnalysis;
  cameraCharacteristics?: CameraSensorCharacteristics;
}

export interface UnifiedEvent {
  id: string;
  sourceType: SourceType;
  sourceName?: string;
  timestamp: string;            // ISO 8601 string
  firstSeen?: string;
  location: GeoLocation;
  severity: SeverityLevel;
  baseSeverity?: SeverityLevel;
  title: string;
  description: string;
  confidence: number;           // 0-100
  confidenceBreakdown?: ConfidenceBreakdown;
  authenticityAudit?: AuthenticityAudit;
  mediaAudit?: MediaAuthenticityAudit;
  /**
   * Structured visual evidence bundle, present on every CCTV (`video`) event:
   * detections, persistent tracks, temporal/forensic reads and validated claims.
   */
  visualEvidence?: VisualEvidence;
  corroboratedBy: string[];     // Array of linked event IDs
  clusterId?: string;
  isAnomaly: boolean;
  anomalyReason?: string;
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

// ─── Server UnifiedEvent v1.1 additions (server/src/types/events.ts) ────────────

/** How VANGUARD reads media after forensic analysis. Not a binary real/fake verdict. */
export type ManipulationCategory =
  | 'NONE_DETECTED'
  | 'LEGITIMATE_ENHANCEMENT'
  | 'HYBRID_CORROBORATED'
  | 'EVENT_FABRICATING'
  | 'AUTHENTICITY_UNVERIFIED';

export type MediaCheckId =
  | 'provenance-c2pa'
  | 'bitstream-container'
  | 'visual-frame'
  | 'temporal-consistency'
  | 'acoustic-spectrum'
  | 'sensor-prnu'
  | 'edit-origin';

export interface MediaFinding {
  code: string;
  detail: string;
  confidence: number;
}

export interface MediaCheckResult {
  id: MediaCheckId;
  name: string;
  /** 0-100; 100 = no manipulation evidence in this dimension. */
  score: number;
  weight: number;
  applicable: boolean;
  findings: MediaFinding[];
}

export interface ProvenanceEntry {
  step: string;
  tool?: string;
  hardwareCapture: boolean;
  syntheticGeneration: boolean;
  legitimateEditing: boolean;
}

/**
 * The server media authenticity assessment attached to social_media /
 * audio_recording events. Distinct from the local `AuthenticityAudit` used by
 * the OSINT verifier.
 */
export interface MediaAuthenticityAudit {
  evaluatedAt: string;
  authenticityScore: number;
  manipulationRisk: number;
  manipulationCategory: ManipulationCategory;
  aiSyntheticScore: number;
  provenanceScore: number;
  intrinsicConsistency: number;
  corroborationScore: number;
  deepfakeArtifacts: MediaFinding[];
  factualCoreExtracted: string;
  provenanceChain: ProvenanceEntry[];
  sourceReliability: number;
  checks: MediaCheckResult[];
  metadata?: MediaForensicMetadata;
  visualFrames?: VisualFrameAnalysis;
  temporalConsistency?: TemporalConsistencyAnalysis;
  acousticSpectrum?: AcousticSpectrumAnalysis;
  cameraCharacteristics?: CameraSensorCharacteristics;
}

// ─── Visual evidence engine (server/src/types/events.ts §24–§33) ─────────────

/** Axis-aligned bounding box, normalized 0..1 relative to the frame. */
export interface VisualBoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** One object the CV engine detected and linked to a persistent track. */
export interface VisualDetection {
  id: string;
  classId: string;
  label: string;
  /** Detector confidence, 0..1 — NOT the system's belief about the event. */
  confidence: number;
  bbox: VisualBoundingBox;
  trackId?: string;
}

/** A persistent object identity produced by the tracker across frames. */
export interface ObjectTrack {
  trackId: string;
  classId: string;
  label: string;
  cameraId: string;
  framesObserved: number;
  firstSeen: string;
  lastSeen: string;
  avgConfidence: number;
  bboxHistory: VisualBoundingBox[];
  latestPosition: { lat: number; lng: number };
  latestSpeedKnots: number;
  latestHeadingDegrees: number;
  status: 'active' | 'closed';
  restrictedEntry: boolean;
}

/**
 * Visual manipulation classification — deliberately not binary. Enhancement,
 * editing and fabrication are different degrees of distrust, and none of them
 * authorize an auto-delete.
 */
export type VisualManipulationClass =
  | 'AUTHENTIC'
  | 'EDITED'
  | 'ENHANCED'
  | 'SUSPICIOUS_MANIPULATION'
  | 'POTENTIAL_SYNTHETIC'
  | 'UNKNOWN';

/** The multi-signal forensic read of a clip, each 0..1 (1 = anomaly present). */
export interface VisualForensicSignals {
  compressionAnomaly: number;
  frameAnomaly: number;
  lightingAnomaly: number;
  temporalAnomaly: number;
  metadataAnomaly: number;
  syntheticMediaSignal: number;
  manipulationRisk: number;
}

/** Clip-level forensic assessment produced by the deterministic engine. */
export interface VisualForensicAnalysis {
  signals: VisualForensicSignals;
  classification: VisualManipulationClass;
  /** Weighted authenticity score, 0..100. */
  authenticityScore: number;
  /** Human-readable artifact indicators, surfaced to the operator. */
  indicators: string[];
  /** Whether the manipulation reads as benign enhancement (stabilize/upscale). */
  upliftConfidence: number;
}

/** Schema status of a claim checked against structured visual evidence. */
export type VisualClaimStatus =
  | 'SUPPORTED'
  | 'PARTIALLY_SUPPORTED'
  | 'CONTRADICTED'
  | 'UNCERTAIN'
  | 'UNVERIFIABLE';

/** A grounded or refuted claim, with the evidence that decided it. */
export interface VisualClaim {
  id: string;
  text: string;
  claimConfidence: number;
  status: VisualClaimStatus;
  supportingEvidence: string[];
  contradictingEvidence: string[];
  basis: string;
}

/**
 * An operator/intelligence statement that conflicts with what the visual
 * evidence shows. VANGUARD surfaces the conflict and keeps BOTH sides (§15/§28).
 */
export interface VisualContradiction {
  id: string;
  operatorStatement: string;
  claimId: string;
  status: Extract<VisualClaimStatus, 'CONTRADICTED' | 'PARTIALLY_SUPPORTED' | 'SUPPORTED' | 'UNCERTAIN'>;
  visualEvidenceId: string;
  contradictionBasis: string[];
  evidenceConfidence: number;
  createdAt: string;
}

/**
 * The structured visual evidence bundle the CV engine attaches to a video event:
 * what was detected, how it was tracked, whether the footage is trustworthy, and
 * which claims survive validation. Never raw frames.
 */
export interface VisualEvidence {
  evidenceId: string;
  cameraId: string;
  cameraName: string;
  clipId: string;
  framesAnalyzed: number;
  scene: {
    durationSec: number;
    framesAnalyzed: number;
    objectCounts: Record<string, number>;
  };
  objects: VisualDetection[];
  tracks: ObjectTrack[];
  trackingConsistency: number;
  temporalConfidence: number;
  forensics: VisualForensicAnalysis;
  claims: VisualClaim[];
  contradictions?: VisualContradiction[];
  corroboration: {
    corroboratedBy: string[];
    distinctSources: string[];
    sourceAgreement: number;
    spatialAgreement: number;
    temporalAgreement: number;
  };
  behaviorFlags: string[];
  manipulated: boolean;
  /** Structural guarantee: the item is presented, never auto-discarded. */
  surfaced: boolean;
}

/** §33 panel rollup — derived from the same VisualEvidence bundles the engine uses. */
export interface VisionSummary {
  generatedAt: string;
  counts: {
    clips: number;
    cameras: number;
    activeTracks: number;
    contradictions: number;
  };
  means: {
    authenticityScore: number;
    manipulationRisk: number;
    trackingConsistency: number;
    temporalConfidence: number;
  };
  claims: Record<VisualClaimStatus, number>;
  classification: Record<VisualManipulationClass, number>;
  byCamera: CameraRollup[];
}

export interface CameraRollup {
  cameraId: string;
  cameraName: string;
  clips: number;
  restrictedEntries: number;
  meanAuthenticity: number;
  meanManipulationRisk: number;
  meanTrackingConsistency: number;
}

/** A spatiotemporal correlation cluster produced by the fusion engine. */
export interface CorrelationCluster {
  id: string;
  eventIds: string[];
  distinctSources: SourceType[];
  centroid: { lat: number; lng: number };
  radiusMeters: number;
  firstSeen: string;
  lastSeen: string;
  peakSeverity: SeverityLevel;
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

/** Operational zone rendered on the Zones map layer. */
export interface OperationalZone {
  id: string;
  name: string;
  kind: 'sector' | 'restricted_airspace' | 'patrol_perimeter' | 'geofence';
  polygon: [number, number][];
  severityBias: SeverityLevel;
}

// ─── Source health / situation (server/src/types/health.ts) ─────────────────────

export interface SourceHealthDetail extends SourceHealth {
  nominalReliability: number;
  totalIngested: number;
  consecutiveFailures: number;
  meanLatencyMs: number;
  manuallyDegraded: boolean;
  note?: string;
}

export interface EscalationRecord {
  id: string;
  timestamp: string;
  from: ThreatLevel;
  to: ThreatLevel;
  score: number;
  reason: string;
  triggerEventIds: string[];
}

/** Top-of-screen situational rollup from GET /situation/current. */
export interface SituationSnapshot {
  timestamp: string;
  threatLevel: ThreatLevel;
  threatScore: number;
  activeAlertsCount: number;
  criticalCount: number;
  highCount: number;
  totalEvents: number;
  anomalyCount: number;
  correlatedClusters: number;
  meanConfidence: number;
  degradedMode: boolean;
  headline: string;
}

export interface SystemMetrics {
  uptimeSeconds: number;
  ticks: number;
  eventsIngested: number;
  eventsDeduplicated: number;
  clustersFormed: number;
  meanTickDurationMs: number;
  lastTickDurationMs: number;
  wsClients: number;
  storeSize: number;
  storeCapacity: number;
}

// ─── AI synthesis contracts (server/src/types/ai.ts) ────────────────────────────

export interface GroundedClaim {
  point: string;
  supportingEventIds: string[];
}

export interface PrioritizedAction {
  action: string;
  /** 1 (routine) .. 5 (immediate). */
  urgency: number;
  supportingEventIds: string[];
}

export interface CourseOfAction {
  id: string;
  title: string;
  description: string;
  pros: string[];
  tradeoffs: string[];
  recommendedUrgency: number;
  supportingEventIds: string[];
}

export interface BriefingProvenance {
  engine: 'gemini' | 'deterministic';
  model?: string;
  latencyMs: number;
  eventsConsidered: number;
  citationsStripped: number;
  claimsDiscarded: number;
  degradedReason?: string;
}

export interface AISummary {
  generatedAt: string;
  threatLevel: ThreatLevel;
  headline: string;
  executiveSummary: string;
  keyDevelopments: GroundedClaim[];
  prioritizedActions: PrioritizedAction[];
  coursesOfAction: CourseOfAction[];
  overallConfidence: number;
  provenance: BriefingProvenance;
}

export interface NLQueryFilter {
  sourceTypes?: SourceType[];
  severities?: SeverityLevel[];
  minConfidence?: number;
  withinMinutes?: number;
  nearPoint?: { lat: number; lng: number; radiusKm: number };
  zoneName?: string;
  anomaliesOnly?: boolean;
  minCorroborations?: number;
  textContains?: string;
}

export interface NLQueryResult {
  query: string;
  filter: NLQueryFilter;
  interpretation: string;
  matchedEventIds: string[];
  matchCount: number;
  parser: 'gemini' | 'heuristic';
  latencyMs: number;
}

// ─── REST response envelopes (server/src/api/routes) ────────────────────────────

export interface SituationCurrentResponse {
  situation: SituationSnapshot;
  sources: SourceHealthDetail[];
  clusters: number;
  lastEscalation: EscalationRecord | null;
}

export interface SituationTimelineResponse {
  timeline: EscalationRecord[];
  count: number;
  currentLevel: ThreatLevel;
  currentScore: number;
  lastChangeAt: string | null;
}

export interface EventsResponse {
  events: UnifiedEvent[];
  count: number;
  total: number;
  limit: number;
  offset: number;
}

export interface CorrelationsResponse {
  eventId: string;
  event: UnifiedEvent;
  confidence: {
    overall: number;
    band: 'high' | 'medium' | 'low';
    breakdown: ConfidenceBreakdown;
    factors: Record<string, unknown>;
    formula: string;
    explanation: string;
  };
  counterfactual: {
    confidenceWithoutCorroboration: number;
    confidenceGain: number;
    note: string;
  };
  corroboration: {
    count: number;
    distinctSources: SourceType[];
    links: Array<{
      event: UnifiedEvent;
      strength: number;
      distanceMeters: number;
      deltaSeconds: number;
      rationale: string;
    }>;
  };
  correlationWindows: { radiusMeters: number; windowSeconds: number };
  cluster: CorrelationCluster | null;
}

export interface CandidatesResponse {
  eventId: string;
  considered: number;
  candidates: Array<{
    eventId: string;
    sourceType: SourceType;
    title: string;
    distanceMeters: number;
    deltaSeconds: number;
    strength: number;
    rejectedBecause: string;
  }>;
}

export interface BriefingLatestResponse {
  summary: AISummary | null;
  ageMs: number;
  generating: boolean;
  groundingVerified: boolean;
}

export interface BriefingPostResponse {
  summary: AISummary;
  groundingVerified: boolean;
}

export interface NLQueryResponse extends NLQueryResult {
  events: UnifiedEvent[];
}

export interface SourceHealthResponse {
  sources: SourceHealthDetail[];
  aggregate: string;
  degradedMode: boolean;
  liveCount: number;
  degradedCount: number;
  downCount: number;
}

export interface ClustersResponse {
  count: number;
  clusters: Array<
    CorrelationCluster & {
      events: UnifiedEvent[];
      multiSource: boolean;
      triggeredEscalation: boolean;
    }
  >;
  escalationThreshold: number;
}

export interface AnomaliesResponse {
  count: number;
  threshold: number;
  byDetector: { rate: number; kinematic: number; spatial: number };
  anomalies: Array<{
    eventId: string;
    detector: 'rate' | 'kinematic' | 'spatial';
    zScore: number;
    reason?: string;
    event: UnifiedEvent | null;
  }>;
}

// ─── Vision REST envelopes (server/src/api/routes/vision.ts) ──────────────────

export interface VisionClipRow {
  event: UnifiedEvent;
  confidenceBand: 'high' | 'medium' | 'low';
  age: string;
}

export interface VisionClipsResponse {
  count: number;
  total: number;
  classificationOrder: VisualManipulationClass[];
  videos: VisionClipRow[];
}

export interface VisionContradictionRow {
  contradiction: VisualContradiction;
  event: {
    id: string;
    title: string;
    cameraId: string;
    cameraName: string;
    severity: SeverityLevel;
    confidence: number;
    clusterId?: string;
  };
  age: string;
}

export interface VisionContradictionsResponse {
  count: number;
  contradictions: VisionContradictionRow[];
}

export interface CameraSnapshot {
  cameraId: string;
  cameraName: string;
  activeTracks: number;
  closedTracks: number;
  restrictedEntries: number;
}

export interface VisionDiagnosticsResponse {
  cameras: CameraSnapshot[];
  summary: VisionSummary;
}

export interface VisionClipDetailResponse {
  event: UnifiedEvent;
  visualEvidence: VisualEvidence;
  mediaAudit: MediaAuthenticityAudit | null;
  age: string;
  confidenceBand: 'high' | 'medium' | 'low';
  corroboration: {
    count: number;
    distinctSources: SourceType[];
    events: UnifiedEvent[];
  };
  cluster: CorrelationCluster | null;
}

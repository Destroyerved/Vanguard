/**
 * Vanguard Multi-Source Defence Situational Awareness System
 * Authoritative Data Schemas (PRD §7.1)
 */

export type SourceType = 'radar' | 'weather' | 'personnel' | 'log' | 'incident' | 'submarine' | 'ground_conflict' | 'social_media' | 'audio_recording';
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
  timestamp: string;            // ISO 8601 string
  location: GeoLocation;
  severity: SeverityLevel;
  title: string;
  description: string;
  confidence: number;           // 0-100
  confidenceBreakdown?: ConfidenceBreakdown;
  authenticityAudit?: AuthenticityAudit;
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

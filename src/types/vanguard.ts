export type SourceType = 'radar' | 'weather' | 'personnel' | 'log' | 'incident';
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export type ThreatLevel = 'green' | 'yellow' | 'orange' | 'red';
export type UnitAffiliation = 'friendly' | 'hostile' | 'neutral' | 'unknown';

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
  timestamp: string;            // ISO 8601
  location: GeoLocation;
  severity: SeverityLevel;
  title: string;
  description: string;
  confidence: number;           // 0-100
  confidenceBreakdown?: ConfidenceBreakdown;
  corroboratedBy: string[];     // IDs of linked corroborating events
  isAnomaly: boolean;
  affiliation?: UnitAffiliation;
  callsign?: string;
  classification?: string;
  raw: Record<string, unknown>;
}

export interface CourseOfAction {
  id: string;
  title: string;
  codename: string;
  description: string;
  pros: string[];
  tradeoffs: string[];
  recommendedUrgency: number;   // 1-5
  successProbability: number;   // 0-100%
  collateralRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
}

export interface KeyDevelopment {
  point: string;
  supportingEventIds: string[];
}

export interface PrioritizedAction {
  action: string;
  urgency: number;            // 1-5
  supportingEventIds: string[];
  department: string;
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
  status: 'live' | 'degraded' | 'down';
  lastUpdate: string;
  reliabilityScore: number;     // 0.0 - 1.0
  activeCount: number;
  latencyMs: number;
}

export interface RadarTarget {
  id: string;
  callsign: string;
  distanceNm: number;
  bearingDeg: number;
  headingDeg: number;
  speedKnots: number;
  altitudeFt: number;
  affiliation: UnitAffiliation;
  dopplerShiftKhz: number;
  lat: number;
  lng: number;
  lastPingMs: number;
}

export type NukeStrikePhase = 
  | 'IDLE' 
  | 'TARGET_DESIGNATION' 
  | 'PAL_AUTHENTICATION' 
  | 'SYSTEMS_ARMED' 
  | 'COUNTDOWN' 
  | 'MISSILE_RELEASE' 
  | 'HYPERSONIC_CRUISE' 
  | 'DETONATION' 
  | 'BDA_ASSESSMENT';

export interface RafaleState {
  callsign: string;
  tailNumber: string;
  squadron: string;
  speedMach: number;
  altitudeFt: number;
  gLoad: number;
  headingDeg: number;
  pitchDeg: number;
  rollDeg: number;
  fuelPercent: number;
  masterArm: boolean;
  radarMode: 'RBE2-AESA TWS' | 'SPECTRA EW' | 'FSO OSF' | 'TERRAIN FOLLOW';
  weaponStations: {
    station: string;
    weapon: string;
    status: 'READY' | 'ARMED' | 'EXPENDED' | 'STANDBY';
    yieldKt?: number;
  }[];
  currentLocation: GeoLocation;
  targetLocation?: GeoLocation;
  targetCallsign?: string;
  strikePhase: NukeStrikePhase;
  countdownSeconds: number;
  hypersonicProgress: number; // 0 to 100%
  palCodeEntered: string;
  palCodeRequired: string;
}

export interface NuclearBlastEffect {
  groundZero: GeoLocation;
  yieldKt: number;
  fireballRadiusM: number;
  promptRadiationRadiusM: number;
  heavyBlast5PsiRadiusM: number;
  thermalRadiationRadiusM: number;
  falloutPlumeBearingDeg: number;
  falloutPlumeLengthKm: number;
  estimatedCasualties: number;
  electromagneticPulseRadiusKm: number;
}

/**
 * VANGUARD demo dataset — the Sector 04 intercept.
 *
 * A small, hand-authored operating picture that exercises every console
 * feature without touching the network. It deliberately mirrors the four-act
 * story the landing page tells, so a walkthrough moves from the marketing site
 * into the console without the narrative changing underneath the operator.
 *
 * Why seeded rather than live: the fusion core accumulates thousands of events
 * within minutes of running, which is the right behaviour for a real watch
 * floor and the wrong one for a demo — the map turns into confetti and nothing
 * on screen is stable enough to point at. 26 events is enough to show
 * multi-source correlation, the confidence arithmetic, anomaly flagging, media
 * forensics and the grounding gate, and few enough that every screen stays
 * legible.
 */

import {
  AISummary,
  CorrelationCluster,
  EscalationRecord,
  SituationSnapshot,
  SourceHealthDetail,
  UnifiedEvent,
} from '../types/schema';

/** Sector 04 area of operations (Gujarat). */
const AO = { lat: 23.0225, lng: 72.5714 };

/** Events are seeded relative to load time so timestamps always read as "now". */
const T0 = Date.now();
const at = (secondsAgo: number) => new Date(T0 - secondsAgo * 1000).toISOString();

/** Small deterministic jitter so markers don't stack on one pixel. */
const near = (dLat: number, dLng: number) => ({
  lat: +(AO.lat + dLat).toFixed(4),
  lng: +(AO.lng + dLng).toFixed(4),
});

// ─── Act 1-3: the correlated intercept cluster ───────────────────────────────
// Five independent feeds reporting the same physical event within ΔR 2.1km /
// ΔT 18s. This is the cluster the briefing cites and the drawer explains.

const INTERCEPT: UnifiedEvent[] = [
  {
    id: 'EV-RAD-4471',
    sourceType: 'radar',
    sourceName: 'RADAR-PRIMARY',
    timestamp: at(42),
    location: near(0.041, 0.062),
    severity: 'critical',
    title: 'Unidentified fast track inbound — transponder silent',
    description:
      'Primary surveillance radar holds an unidentified contact at 260 knots, 18,400 ft, bearing 042°, closing on the Sector 04 perimeter. No Mode-S transponder reply on three interrogations.',
    confidence: 96,
    confidenceBreakdown: {
      overall: 96,
      sourceAgreement: 95,
      spatialAgreement: 93,
      temporalAgreement: 97,
      sourceReliability: 92,
      dataFreshness: 99,
    },
    corroboratedBy: ['EV-LOG-8820', 'EV-PER-2210', 'EV-INC-5514', 'EV-WX-1180'],
    clusterId: 'CL-SECTOR04-01',
    isAnomaly: true,
    anomalyReason: 'Kinematic profile 3.4σ beyond civil corridor baseline; transponder inactive.',
    raw: {
      trackId: 'UNID-TRACK-892',
      speedKnots: 260,
      altitudeFt: 18400,
      bearingDeg: 42,
      squawk: null,
      rcsSqM: 4.2,
    },
  },
  {
    id: 'EV-LOG-8820',
    sourceType: 'log',
    sourceName: 'PERIMETER-C2',
    timestamp: at(30),
    location: near(0.028, 0.049),
    severity: 'high',
    title: 'Infrared tripwire breach — perimeter fence segment 7',
    description:
      'Sector 04 north-east perimeter infrared beam broken twice in eight seconds. Seismic ground sensor on the same post registered a matching disturbance.',
    confidence: 91,
    confidenceBreakdown: {
      overall: 91,
      sourceAgreement: 94,
      spatialAgreement: 90,
      temporalAgreement: 96,
      sourceReliability: 80,
      dataFreshness: 98,
    },
    corroboratedBy: ['EV-RAD-4471', 'EV-PER-2210', 'EV-INC-5514'],
    clusterId: 'CL-SECTOR04-01',
    isAnomaly: false,
    raw: { segment: 7, beamBreaks: 2, seismicMatch: true, sensorId: 'IR-NE-07' },
  },
  {
    id: 'EV-PER-2210',
    sourceType: 'personnel',
    sourceName: 'UNIT-TELEMETRY',
    timestamp: at(26),
    location: near(0.033, 0.055),
    severity: 'high',
    title: 'Patrol GRIZZLY-1 reports visual movement north-east',
    description:
      'Ground patrol GRIZZLY-1 confirms visual on low-flying aircraft transiting north-east to south-west. Patrol reports no navigation lights.',
    confidence: 89,
    confidenceBreakdown: {
      overall: 89,
      sourceAgreement: 93,
      spatialAgreement: 88,
      temporalAgreement: 94,
      sourceReliability: 88,
      dataFreshness: 97,
    },
    corroboratedBy: ['EV-RAD-4471', 'EV-LOG-8820'],
    clusterId: 'CL-SECTOR04-01',
    isAnomaly: false,
    raw: { callsign: 'GRIZZLY-1', personnel: 4, visualRange: 'clear', navLights: false },
  },
  {
    id: 'EV-INC-5514',
    sourceType: 'incident',
    sourceName: 'FIELD-DISPATCH',
    timestamp: at(21),
    location: near(0.024, 0.043),
    severity: 'high',
    title: 'Dispatch: unauthorised vehicle at checkpoint CP-3',
    description:
      'Field dispatch logged an unauthorised light vehicle attempting the Sector 04 checkpoint during the perimeter alert window. Occupants departed before challenge.',
    confidence: 84,
    confidenceBreakdown: {
      overall: 84,
      sourceAgreement: 88,
      spatialAgreement: 85,
      temporalAgreement: 90,
      sourceReliability: 72,
      dataFreshness: 96,
    },
    corroboratedBy: ['EV-RAD-4471', 'EV-LOG-8820'],
    clusterId: 'CL-SECTOR04-01',
    isAnomaly: false,
    raw: { checkpoint: 'CP-3', vehicleType: 'light utility', plateCaptured: false },
  },
  {
    id: 'EV-WX-1180',
    sourceType: 'weather',
    sourceName: 'OPEN-METEO',
    timestamp: at(18),
    location: near(0.036, 0.058),
    severity: 'medium',
    title: 'Squall line reducing optical visibility over Sector 04',
    description:
      'Sudden turbulence and a visibility drop to 3.2 km across the north-east approach. Degrades optical confirmation but does not affect primary radar returns.',
    confidence: 78,
    confidenceBreakdown: {
      overall: 78,
      sourceAgreement: 70,
      spatialAgreement: 82,
      temporalAgreement: 88,
      sourceReliability: 95,
      dataFreshness: 99,
    },
    corroboratedBy: ['EV-RAD-4471'],
    clusterId: 'CL-SECTOR04-01',
    isAnomaly: false,
    raw: { visibilityKm: 3.2, windKts: 24, gustKts: 38, cloudBaseFt: 2400 },
  },
];

// ─── A second, quieter cluster: coastal ASW contact ─────────────────────────

const COASTAL: UnifiedEvent[] = [
  {
    id: 'EV-AUD-3301',
    sourceType: 'audio_recording',
    sourceName: 'HYDROPHONE-ARRAY',
    timestamp: at(160),
    location: { lat: 21.6412, lng: 71.9033 },
    severity: 'high',
    title: 'Hydrophone array: 120 Hz cavitation signature',
    description:
      'Sub-surface acoustic array recorded a sustained 120 Hz cavitation band consistent with a submerged displacement hull. Natural acoustic floor verified — no synthetic waveform signature.',
    confidence: 93,
    corroboratedBy: ['EV-RAD-4490'],
    clusterId: 'CL-COAST-02',
    isAnomaly: true,
    anomalyReason: 'Cavitation band with no surface contact on radar within 12 km.',
    raw: { channel: 'HYDROPHONE_CH_4', bandHz: 120, syntheticWaveform: false },
    mediaAudit: {
      evaluatedAt: at(150),
      authenticityScore: 94,
      manipulationRisk: 6,
      manipulationCategory: 'NONE_DETECTED',
      aiSyntheticScore: 8,
      provenanceScore: 92,
      intrinsicConsistency: 96,
      corroborationScore: 93,
      deepfakeArtifacts: [],
      factualCoreExtracted:
        'Authentic hydrophone capture. Acoustic spectrum matches physical cavitation; corroborated by surface radar track.',
      provenanceChain: [],
      sourceReliability: 90,
      checks: [],
    },
  },
  {
    id: 'EV-RAD-4490',
    sourceType: 'radar',
    sourceName: 'RADAR-PRIMARY',
    timestamp: at(148),
    location: { lat: 21.6688, lng: 71.9401 },
    severity: 'medium',
    title: 'Intermittent surface return, coastal approach',
    description:
      'Low-RCS intermittent surface contact on the coastal approach, consistent with a small craft operating without AIS.',
    confidence: 71,
    corroboratedBy: ['EV-AUD-3301'],
    clusterId: 'CL-COAST-02',
    isAnomaly: false,
    raw: { trackId: 'SURF-114', rcsSqM: 0.8, ais: false },
  },
];

// ─── OSINT: the media-forensics showcase ────────────────────────────────────

const OSINT: UnifiedEvent[] = [
  {
    id: 'EV-SOC-7702',
    sourceType: 'social_media',
    sourceName: 'OSINT-SOCIAL-GRID',
    timestamp: at(95),
    location: near(0.052, 0.071),
    severity: 'high',
    title: 'Viral reel claims "airstrike on Sector 04" — AI narration detected',
    description:
      'A widely shared reel narrates an airstrike over Sector 04. Forensics find a synthetic text-to-speech narrator, but the underlying footage geolocates correctly and the aircraft transit is corroborated by primary radar.',
    confidence: 74,
    corroboratedBy: ['EV-RAD-4471'],
    isAnomaly: false,
    raw: { platform: 'Instagram', handle: '@aero_watcher', shares: 41200 },
    mediaAudit: {
      evaluatedAt: at(90),
      authenticityScore: 72,
      manipulationRisk: 46,
      manipulationCategory: 'HYBRID_CORROBORATED',
      aiSyntheticScore: 75,
      provenanceScore: 78,
      intrinsicConsistency: 81,
      corroborationScore: 95,
      deepfakeArtifacts: [],
      factualCoreExtracted:
        'Narration is AI-synthesised and the "airstrike" claim is unsupported. The physical aircraft transit shown in the footage IS corroborated by primary radar and patrol visual.',
      provenanceChain: [],
      sourceReliability: 48,
      checks: [],
    },
    authenticityAudit: {
      overallAuthenticityScore: 72,
      veracityClassification: 'HYBRID_AI_AUTHENTIC_FACT',
      aiSyntheticScore: 75,
      deepfakeArtifacts: ['Neural text-to-speech harmonics in narration track'],
      acousticSpectrumScore: 40,
      provenanceScore: 78,
      crossSensorCorroborationScore: 95,
      factualCoreExtracted:
        'Voiceover synthetic; aircraft transit corroborated by radar and patrol. "Airstrike" claim rejected — no ordnance signature on any feed.',
    },
  },
  {
    id: 'EV-SOC-7715',
    sourceType: 'social_media',
    sourceName: 'OSINT-SOCIAL-GRID',
    timestamp: at(72),
    location: near(-0.061, 0.088),
    severity: 'medium',
    title: 'Fabricated "perimeter breach" image — recycled from 2019 archive',
    description:
      'Image circulating as tonight\'s perimeter breach. Reverse provenance matches a 2019 news archive frame; EXIF stripped and re-encoded twice.',
    confidence: 38,
    corroboratedBy: [],
    isAnomaly: true,
    anomalyReason: 'Zero cross-sensor corroboration; provenance chain broken.',
    raw: { platform: 'X', reposts: 8800 },
    mediaAudit: {
      evaluatedAt: at(68),
      authenticityScore: 21,
      manipulationRisk: 88,
      manipulationCategory: 'EVENT_FABRICATING',
      aiSyntheticScore: 34,
      provenanceScore: 12,
      intrinsicConsistency: 44,
      corroborationScore: 4,
      deepfakeArtifacts: [],
      factualCoreExtracted:
        'No factual core. Image predates the incident by six years and is contradicted by every live perimeter feed.',
      provenanceChain: [],
      sourceReliability: 22,
      checks: [],
    },
    authenticityAudit: {
      overallAuthenticityScore: 21,
      veracityClassification: 'SYNTHETIC_DISINFORMATION',
      aiSyntheticScore: 34,
      deepfakeArtifacts: ['EXIF stripped', 'Double JPEG compression signature'],
      acousticSpectrumScore: 0,
      provenanceScore: 12,
      crossSensorCorroborationScore: 4,
      factualCoreExtracted: 'Recycled 2019 archive frame. Rejected by the grounding gate.',
    },
  },
];

// ─── Routine background traffic ─────────────────────────────────────────────
// Enough nominal activity that the correlated cluster reads as a signal rising
// out of noise, rather than the only thing on the map.

const ROUTINE: UnifiedEvent[] = [
  ['EV-RAD-4402', 'radar', 'RADAR-PRIMARY', 'Civil flight AI-2231 squawking normally', 0.09, -0.11, 'low', 97],
  ['EV-RAD-4418', 'radar', 'RADAR-PRIMARY', 'Civil flight 6E-885 on corridor centreline', -0.12, 0.07, 'low', 96],
  ['EV-RAD-4425', 'radar', 'RADAR-PRIMARY', 'Rotary transport inbound, IFF friendly', 0.06, 0.13, 'low', 94],
  ['EV-RAD-4433', 'radar', 'RADAR-PRIMARY', 'Survey aircraft on filed flight plan', -0.08, -0.14, 'low', 95],
  ['EV-PER-2180', 'personnel', 'UNIT-TELEMETRY', 'Patrol FALCON-2 checkpoint sweep complete', 0.11, 0.02, 'low', 92],
  ['EV-PER-2195', 'personnel', 'UNIT-TELEMETRY', 'Patrol GRIZZLY-1 nominal beacon, sector north', 0.03, -0.09, 'low', 93],
  ['EV-PER-2204', 'personnel', 'UNIT-TELEMETRY', 'Relief shift handover logged, post 4', -0.05, 0.11, 'low', 91],
  ['EV-LOG-8790', 'log', 'PERIMETER-C2', 'Perimeter segment 3 self-test passed', -0.09, 0.04, 'low', 88],
  ['EV-LOG-8801', 'log', 'PERIMETER-C2', 'Gate 2 authorised entry, contractor convoy', 0.07, -0.06, 'low', 89],
  ['EV-LOG-8812', 'log', 'PERIMETER-C2', 'Seismic post 9 calibration cycle', -0.13, -0.03, 'low', 87],
  ['EV-WX-1150', 'weather', 'OPEN-METEO', 'Barometric trend steady, ceiling 8,000 ft', 0.14, 0.09, 'low', 96],
  ['EV-WX-1166', 'weather', 'OPEN-METEO', 'Surface wind 12 kt, visibility 9 km', -0.06, -0.12, 'low', 95],
  ['EV-INC-5480', 'incident', 'FIELD-DISPATCH', 'Routine medical callout, base clinic', 0.02, 0.15, 'low', 90],
  ['EV-INC-5495', 'incident', 'FIELD-DISPATCH', 'Vehicle maintenance report, motor pool', -0.11, -0.08, 'low', 88],
  ['EV-INC-5502', 'incident', 'FIELD-DISPATCH', 'Radio check completed, all posts', 0.12, -0.02, 'low', 91],
  ['EV-RAD-4448', 'radar', 'RADAR-PRIMARY', 'Weather return cluster, no discrete track', -0.03, 0.16, 'medium', 68],
  ['EV-LOG-8834', 'log', 'PERIMETER-C2', 'Wildlife trigger, segment 12 (auto-dismissed)', 0.16, 0.05, 'low', 74],
  ['EV-PER-2218', 'personnel', 'UNIT-TELEMETRY', 'Patrol FALCON-2 fuel state amber', -0.14, 0.12, 'medium', 86],
  ['EV-WX-1172', 'weather', 'OPEN-METEO', 'Humidity spike ahead of squall line', 0.05, 0.17, 'low', 93],
].map(([id, sourceType, sourceName, title, dLat, dLng, severity, confidence], i) => ({
  id: id as string,
  sourceType: sourceType as UnifiedEvent['sourceType'],
  sourceName: sourceName as string,
  timestamp: at(200 + i * 37),
  location: near(dLat as number, dLng as number),
  severity: severity as UnifiedEvent['severity'],
  title: title as string,
  description: 'Routine feed activity inside nominal parameters. No correlation with the active cluster.',
  confidence: confidence as number,
  corroboratedBy: [],
  isAnomaly: false,
  raw: { routine: true },
}));

export const DEMO_EVENTS: UnifiedEvent[] = [...INTERCEPT, ...COASTAL, ...OSINT, ...ROUTINE];

// ─── Clusters ────────────────────────────────────────────────────────────────

export const DEMO_CLUSTERS: CorrelationCluster[] = [
  {
    id: 'CL-SECTOR04-01',
    eventIds: INTERCEPT.map((e) => e.id),
    distinctSources: ['radar', 'log', 'personnel', 'incident', 'weather'],
    centroid: near(0.032, 0.053),
    radiusMeters: 2100,
    firstSeen: at(42),
    lastSeen: at(18),
    peakSeverity: 'critical',
    meanConfidence: 88,
  },
  {
    id: 'CL-COAST-02',
    eventIds: COASTAL.map((e) => e.id),
    distinctSources: ['audio_recording', 'radar'],
    centroid: { lat: 21.655, lng: 71.9217 },
    radiusMeters: 4300,
    firstSeen: at(160),
    lastSeen: at(148),
    peakSeverity: 'high',
    meanConfidence: 82,
  },
];

// ─── Situation snapshot ──────────────────────────────────────────────────────

const criticalCount = DEMO_EVENTS.filter((e) => e.severity === 'critical').length;
const highCount = DEMO_EVENTS.filter((e) => e.severity === 'high').length;
const anomalyCount = DEMO_EVENTS.filter((e) => e.isAnomaly).length;

export const DEMO_SITUATION: SituationSnapshot = {
  timestamp: at(0),
  threatLevel: 'orange',
  threatScore: 214,
  activeAlertsCount: criticalCount + highCount,
  criticalCount,
  highCount,
  totalEvents: DEMO_EVENTS.length,
  anomalyCount,
  correlatedClusters: DEMO_CLUSTERS.length,
  meanConfidence: Math.round(
    DEMO_EVENTS.reduce((a, e) => a + e.confidence, 0) / DEMO_EVENTS.length
  ),
  degradedMode: false,
  headline:
    'Unidentified inbound track over Sector 04 corroborated by five independent feeds — perimeter breach confirmed, intercept recommended.',
};

// ─── Escalation timeline ─────────────────────────────────────────────────────

export const DEMO_TIMELINE: EscalationRecord[] = [
  {
    id: 'ESC-006',
    timestamp: at(16),
    from: 'yellow',
    to: 'orange',
    score: 214,
    reason: 'Five-source correlation confirmed on cluster CL-SECTOR04-01; confidence 96%.',
    triggerEventIds: ['EV-RAD-4471', 'EV-LOG-8820'],
  },
  {
    id: 'ESC-005',
    timestamp: at(29),
    from: 'yellow',
    to: 'yellow',
    score: 168,
    reason: 'Perimeter infrared tripwire breach on segment 7 joined the active cluster.',
    triggerEventIds: ['EV-LOG-8820'],
  },
  {
    id: 'ESC-004',
    timestamp: at(44),
    from: 'green',
    to: 'yellow',
    score: 121,
    reason: 'Unidentified fast track detected with no transponder reply.',
    triggerEventIds: ['EV-RAD-4471'],
  },
  {
    id: 'ESC-003',
    timestamp: at(146),
    from: 'green',
    to: 'green',
    score: 74,
    reason: 'Coastal acoustic anomaly logged; single-source, held below escalation threshold.',
    triggerEventIds: ['EV-AUD-3301'],
  },
  {
    id: 'ESC-002',
    timestamp: at(70),
    from: 'green',
    to: 'green',
    score: 68,
    reason: 'Fabricated OSINT image rejected by the grounding gate — no posture change.',
    triggerEventIds: ['EV-SOC-7715'],
  },
  {
    id: 'ESC-001',
    timestamp: at(600),
    from: 'green',
    to: 'green',
    score: 31,
    reason: 'Watch opened. All feeds nominal.',
    triggerEventIds: [],
  },
];

// ─── Source health ───────────────────────────────────────────────────────────

export const DEMO_SOURCES: SourceHealthDetail[] = [
  {
    sourceType: 'radar',
    sourceName: 'Sector 04 Air Surveillance Radar',
    status: 'live',
    lastUpdate: at(2),
    reliabilityScore: 0.92,
    nominalReliability: 0.92,
    activeCount: 8,
    totalIngested: 412,
    consecutiveFailures: 0,
    meanLatencyMs: 34,
    manuallyDegraded: false,
  },
  {
    sourceType: 'weather',
    sourceName: 'Open-Meteo Meteorological API',
    status: 'live',
    lastUpdate: at(4),
    reliabilityScore: 0.95,
    nominalReliability: 0.95,
    activeCount: 4,
    totalIngested: 188,
    consecutiveFailures: 0,
    meanLatencyMs: 88,
    manuallyDegraded: false,
  },
  {
    sourceType: 'personnel',
    sourceName: 'Tactical Patrol GPS Telemetry',
    status: 'live',
    lastUpdate: at(3),
    reliabilityScore: 0.88,
    nominalReliability: 0.88,
    activeCount: 5,
    totalIngested: 264,
    consecutiveFailures: 0,
    meanLatencyMs: 41,
    manuallyDegraded: false,
  },
  {
    sourceType: 'log',
    sourceName: 'Perimeter Infrared Sensor Tripwires',
    status: 'live',
    lastUpdate: at(5),
    reliabilityScore: 0.8,
    nominalReliability: 0.8,
    activeCount: 5,
    totalIngested: 301,
    consecutiveFailures: 0,
    meanLatencyMs: 22,
    manuallyDegraded: false,
  },
  {
    sourceType: 'incident',
    sourceName: 'Emergency Dispatch & Field Reports',
    status: 'degraded',
    lastUpdate: at(38),
    reliabilityScore: 0.54,
    nominalReliability: 0.72,
    activeCount: 4,
    totalIngested: 96,
    consecutiveFailures: 2,
    meanLatencyMs: 260,
    manuallyDegraded: false,
    note: 'Dispatch relay retrying — reliability weight reduced for affected tracks.',
  },
  {
    sourceType: 'social_media',
    sourceName: 'OSINT Social Grid',
    status: 'live',
    lastUpdate: at(9),
    reliabilityScore: 0.41,
    nominalReliability: 0.45,
    activeCount: 2,
    totalIngested: 58,
    consecutiveFailures: 0,
    meanLatencyMs: 410,
    manuallyDegraded: false,
    note: 'Low nominal reliability by design — every claim must clear the grounding gate.',
  },
  {
    sourceType: 'audio_recording',
    sourceName: 'Coastal Hydrophone Array',
    status: 'live',
    lastUpdate: at(12),
    reliabilityScore: 0.9,
    nominalReliability: 0.9,
    activeCount: 1,
    totalIngested: 34,
    consecutiveFailures: 0,
    meanLatencyMs: 64,
    manuallyDegraded: false,
  },
];

// ─── Grounded AI briefing ────────────────────────────────────────────────────
// Every claim carries [EV-…] citations, which the console renders as clickable
// chips that open the cited event — the grounding gate made visible.

export const DEMO_BRIEFING: AISummary = {
  generatedAt: at(10),
  threatLevel: 'orange',
  headline: 'Confirmed perimeter incursion, Sector 04 — five-source correlation at 96% confidence',
  executiveSummary:
    'An unidentified aircraft entered the Sector 04 approach at 260 knots with its transponder disabled [EV-RAD-4471]. Within eighteen seconds, four independent feeds corroborated the track: a perimeter infrared tripwire breach [EV-LOG-8820], a patrol visual with no navigation lights [EV-PER-2210], an unauthorised vehicle at checkpoint CP-3 [EV-INC-5514], and a squall line that degraded optical confirmation without affecting radar [EV-WX-1180]. Isolated radar gave 62% confidence; multi-source fusion raised it to 96%. A separate viral claim of an airstrike was traced to AI-synthesised narration and is not supported by any sensor [EV-SOC-7702].',
  keyDevelopments: [
    {
      point:
        'Unidentified fast track inbound to Sector 04 at 260 knots, transponder silent across three interrogations [EV-RAD-4471].',
      supportingEventIds: ['EV-RAD-4471'],
    },
    {
      point:
        'Perimeter infrared segment 7 breached twice in eight seconds, with a matching seismic disturbance [EV-LOG-8820].',
      supportingEventIds: ['EV-LOG-8820'],
    },
    {
      point:
        'Patrol GRIZZLY-1 visually confirmed a low-flying aircraft running without navigation lights [EV-PER-2210].',
      supportingEventIds: ['EV-PER-2210'],
    },
    {
      point:
        'Reported airstrike footage is AI-narrated; the aircraft transit is real but the ordnance claim is unsupported [EV-SOC-7702].',
      supportingEventIds: ['EV-SOC-7702'],
    },
    {
      point:
        'A second image claiming a perimeter breach was rejected outright — recycled 2019 archive frame with a broken provenance chain [EV-SOC-7715].',
      supportingEventIds: ['EV-SOC-7715'],
    },
  ],
  prioritizedActions: [
    {
      action: 'Vector patrol GRIZZLY-1 to perimeter segment 7 and hold for visual confirmation [EV-LOG-8820].',
      urgency: 5,
      supportingEventIds: ['EV-LOG-8820', 'EV-PER-2210'],
    },
    {
      action: 'Launch reconnaissance UAV along the 042° bearing to reacquire the unidentified track [EV-RAD-4471].',
      urgency: 5,
      supportingEventIds: ['EV-RAD-4471'],
    },
    {
      action: 'Alert the perimeter quick-reaction force and seal checkpoint CP-3 pending identification [EV-INC-5514].',
      urgency: 4,
      supportingEventIds: ['EV-INC-5514'],
    },
    {
      action: 'Issue a public correction on the fabricated breach image to limit onward amplification [EV-SOC-7715].',
      urgency: 2,
      supportingEventIds: ['EV-SOC-7715'],
    },
  ],
  coursesOfAction: [
    {
      id: 'COA-1',
      title: 'Ground intercept — vector patrol to segment 7',
      description:
        'Move GRIZZLY-1 to the breach point and establish visual on the perimeter before the track reaches the inner cordon.',
      pros: ['Fastest asset already in sector', 'No airspace deconfliction required'],
      tradeoffs: ['Leaves the north approach unwatched', 'Squall line limits patrol visibility'],
      recommendedUrgency: 5,
      supportingEventIds: ['EV-LOG-8820', 'EV-PER-2210'],
    },
    {
      id: 'COA-2',
      title: 'Air reconnaissance — UAV along the inbound bearing',
      description:
        'Launch the recon UAV on 042° to reacquire the contact and classify it before it clears the perimeter.',
      pros: ['Reacquires the track independent of ground visibility', 'Produces imagery for the audit trail'],
      tradeoffs: ['Nine-minute launch-to-station delay', 'Squall turbulence at low altitude'],
      recommendedUrgency: 4,
      supportingEventIds: ['EV-RAD-4471', 'EV-WX-1180'],
    },
    {
      id: 'COA-3',
      title: 'Hold and observe',
      description:
        'Maintain current posture, continue passive collection, and escalate only on a second corroborated breach.',
      pros: ['No asset commitment', 'Avoids escalation on an unidentified civil aircraft'],
      tradeoffs: ['Cedes reaction time if the contact is hostile', 'Perimeter already breached once'],
      recommendedUrgency: 2,
      supportingEventIds: ['EV-RAD-4471'],
    },
  ],
  overallConfidence: 96,
  provenance: {
    engine: 'deterministic',
    latencyMs: 37,
    eventsConsidered: DEMO_EVENTS.length,
    citationsStripped: 0,
    claimsDiscarded: 2,
  },
};

/** Everything a console screen needs, with no network involved. */
export const DEMO_DATASET = {
  events: DEMO_EVENTS,
  clusters: DEMO_CLUSTERS,
  situation: DEMO_SITUATION,
  timeline: DEMO_TIMELINE,
  sources: DEMO_SOURCES,
  briefing: DEMO_BRIEFING,
};

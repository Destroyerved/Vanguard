/**
 * VANGUARD — Normalization layer.
 *
 * The single choke point where seven incompatible feed shapes become one
 * `UnifiedEvent`. Every downstream module — fusion, AI, API, WebSocket — is
 * written against that one type and has no knowledge of radar payloads or WMO
 * codes. Adding another feed means adding one normalizer here.
 *
 * Normalizers assign a BASE severity from what the source reported. They never
 * assign confidence: that is the fusion engine's job, and every event leaves
 * this layer with a provisional score that stage 4 overwrites. Keeping those
 * responsibilities apart is what stops "the sensor said it was important" from
 * being silently laundered into "the system is confident".
 */

import { decodeWmo, type WeatherPayload } from '../ingestion/weather.openMeteo.js';
import { evaluateMediaAuthenticity } from '../media/authenticity.js';
import type { RawObservation } from '../ingestion/SourceAdapter.js';
import type {
  GeoLocation,
  SeverityLevel,
  UnifiedEvent,
  VisualBoundingBox,
  VisualClaim,
  VisualEvidence,
} from '../types/events.js';
import { nextEventId, stableEventId } from '../util/ids.js';
import { createLogger } from '../util/logger.js';
import { nowIso } from '../util/time.js';
import {
  type ClaimSeed,
  type DetectionFrame,
  type VisionEngine,
} from '../vision/engine.js';

const log = createLogger('normalize');

/** Provisional confidence before fusion scoring overwrites it in stage 4. */
const PROVISIONAL_CONFIDENCE = 50;

/** Safely read a number from an untyped payload. */
function num(payload: Record<string, unknown>, key: string, fallback: number): number {
  const v = payload[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/** Safely read a string from an untyped payload. */
function str(payload: Record<string, unknown>, key: string, fallback: string): string {
  const v = payload[key];
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}

/** Coerce an arbitrary value to a valid severity tier. */
function severityOf(value: unknown, fallback: SeverityLevel): SeverityLevel {
  return value === 'low' || value === 'medium' || value === 'high' || value === 'critical'
    ? value
    : fallback;
}

/**
 * Build the shared skeleton every normalizer fills in.
 *
 * `entityKey` distinguishes the two kinds of observation:
 *   - supplied  -> ENTITY STATE (a track, a unit, a station). The ID is derived
 *                  from the key, so re-observation updates one event in place.
 *   - omitted   -> DISCRETE OCCURRENCE (a trip, a report). Sequential ID.
 */
function base(
  observation: RawObservation,
  location: GeoLocation,
  severity: SeverityLevel,
  title: string,
  description: string,
  entityKey?: string,
): UnifiedEvent {
  const timestamp = observation.timestamp || nowIso();

  return {
    id:
      entityKey === undefined
        ? nextEventId(observation.sourceType)
        : stableEventId(observation.sourceType, entityKey),
    sourceType: observation.sourceType,
    sourceName: observation.sourceName,
    timestamp,
    // The store preserves the original value across updates; this is only the
    // seed for the first observation of an entity.
    firstSeen: timestamp,
    location,
    severity,
    baseSeverity: severity,
    title: title.slice(0, 80),
    description,
    confidence: PROVISIONAL_CONFIDENCE,
    corroboratedBy: [],
    isAnomaly: false,
    raw: observation.payload,
  };
}

/* ------------------------------------------------------------------ *
 * RADAR
 * ------------------------------------------------------------------ */

/**
 * Radar severity is driven by NON-COOPERATION, not by speed alone.
 * A fast airliner squawking a valid code is routine; a slow drone with no
 * transponder inside a restricted sector is not. The rules below encode that
 * judgement explicitly rather than burying it in a threshold.
 */
export function normalizeRadar(observation: RawObservation): UnifiedEvent {
  const p = observation.payload;

  const classification = str(p, 'classification', 'unknown');
  const transponder = p['transponder'];
  const squawking = typeof transponder === 'string' && transponder.length > 0;
  const speedKnots = num(p, 'speedKnots', 0);
  const altitudeMeters = num(p, 'altitudeMeters', 0);
  const rcs = num(p, 'radarCrossSectionM2', 5);

  let severity: SeverityLevel = 'low';
  if (classification === 'suspect') severity = 'high';
  else if (classification === 'unknown') severity = 'medium';

  // A non-squawking contact is one tier more serious than a cooperative one.
  if (!squawking && severity !== 'high') {
    severity = severity === 'low' ? 'medium' : 'high';
  }
  // Low, fast and small: the classic penetrating-threat profile.
  if (!squawking && speedKnots > 180 && altitudeMeters < 1_000 && rcs < 2) {
    severity = 'critical';
  }

  const kind = str(p, 'kind', 'contact');
  const trackId = str(p, 'trackId', 'UNKNOWN');

  const title = squawking
    ? `${capitalize(classification)} ${kind} track ${trackId}`
    : `Uncorrelated ${kind} contact ${trackId}`;

  const description =
    `Primary radar holds ${kind} track ${trackId} at ${Math.round(speedKnots)}kt, ` +
    `heading ${Math.round(num(p, 'headingDegrees', 0))}, altitude ${Math.round(altitudeMeters)}m. ` +
    (squawking
      ? `Transponder squawking ${transponder}.`
      : 'No transponder response — contact is non-cooperative.');

  return base(
    observation,
    {
      lat: num(p, 'lat', 0),
      lng: num(p, 'lng', 0),
      altitudeMeters,
      headingDegrees: num(p, 'headingDegrees', 0),
      speedKnots,
    },
    severity,
    title,
    description,
    // A radar track is one persistent contact, re-observed every sweep.
    trackId,
  );
}

/* ------------------------------------------------------------------ *
 * WEATHER
 * ------------------------------------------------------------------ */

/**
 * Weather severity reflects OPERATIONAL IMPACT, not meteorological drama.
 * The question is never "is this bad weather" but "does this degrade sensors,
 * ground aircraft, or mask an approach".
 */
export function normalizeWeather(observation: RawObservation): UnifiedEvent {
  const p = observation.payload as unknown as WeatherPayload;

  const decoded = decodeWmo(p.weatherCode ?? 0);
  const visibility = p.visibilityMeters ?? 20_000;
  const gust = p.windGustKnots ?? 0;
  const precipitation = p.precipitationMm ?? 0;

  let severity: SeverityLevel = 'low';
  const impacts: string[] = [];

  if (visibility < 2_000) {
    severity = 'high';
    impacts.push('optical and IR surveillance severely degraded');
  } else if (visibility < 6_000) {
    severity = 'medium';
    impacts.push('reduced optical surveillance range');
  }

  if (gust >= 35) {
    severity = 'high';
    impacts.push('rotary and UAV operations at or beyond limits');
  } else if (gust >= 22 && severity === 'low') {
    severity = 'medium';
    impacts.push('UAV launch conditions marginal');
  }

  if (precipitation >= 5) {
    severity = severity === 'high' ? 'critical' : 'high';
    impacts.push('heavy precipitation attenuating radar returns');
  } else if (precipitation > 0.5 && severity === 'low') {
    severity = 'medium';
    impacts.push('light precipitation present');
  }

  if (decoded.severe && severity === 'low') severity = 'medium';

  const station = p.stationName ?? 'AO';
  const title = `${decoded.label} at ${station}`;

  const description =
    `${decoded.label}. ${Math.round(p.temperatureC ?? 0)}C, wind ` +
    `${Math.round(p.windSpeedKnots ?? 0)}kt gusting ${Math.round(gust)}kt from ` +
    `${Math.round(p.windDirectionDeg ?? 0)}, visibility ${(visibility / 1000).toFixed(1)}km, ` +
    `precipitation ${precipitation.toFixed(1)}mm.` +
    (impacts.length > 0 ? ` Operational impact: ${impacts.join('; ')}.` : ' No operational impact.') +
    (p.synthetic ? ' [CACHED/SYNTHETIC — live feed unavailable]' : '');

  return base(
    observation,
    { lat: p.lat ?? 0, lng: p.lng ?? 0 },
    severity,
    title,
    description,
    // One event per station holding its CURRENT conditions, not one per poll.
    station,
  );
}

/* ------------------------------------------------------------------ *
 * PERSONNEL
 * ------------------------------------------------------------------ */

export function normalizePersonnel(observation: RawObservation): UnifiedEvent {
  const p = observation.payload;
  const kind = str(p, 'kind', 'unit_telemetry');
  const callsign = str(p, 'callsign', 'UNIT');

  if (kind === 'visual_sighting') {
    const range = num(p, 'rangeMeters', 0);
    return base(
      observation,
      { lat: num(p, 'lat', 0), lng: num(p, 'lng', 0) },
      // MEDIUM, not high. A patrol reporting "I see something" is an
      // observation, not yet a threat. If it is real, the radar or sensor
      // return it coincides with will corroborate it and the fusion rules will
      // escalate it on evidence. Filing every sighting as HIGH pre-empts that
      // judgement and floods the priority queue with unconfirmed reports.
      'medium',
      `Visual contact reported by ${callsign}`,
      `${callsign} reports visual contact at ${Math.round(range)}m in ${str(p, 'sector', 'the AO')}. ` +
        `Reporter confidence ${num(p, 'confidenceReported', 0)}%.`,
    );
  }

  const status = str(p, 'status', 'ready');
  const readiness = num(p, 'readinessPercent', 100);
  const fuel = num(p, 'fuelPercent', 100);

  // Unit telemetry is routine unless the unit is in trouble.
  let severity: SeverityLevel = 'low';
  if (status === 'offline') severity = 'high';
  else if (status === 'engaged') severity = 'medium';
  else if (readiness < 50 || fuel < 15) severity = 'medium';

  const description =
    `${callsign} (${str(p, 'unitKind', 'ground')}) in ${str(p, 'sector', 'the AO')} — ` +
    `status ${status.toUpperCase()}, readiness ${Math.round(readiness)}%, fuel ${Math.round(fuel)}%, ` +
    `${num(p, 'personnelCount', 0)} personnel.` +
    (status === 'offline' ? ' Unit is not reporting on primary or alternate nets.' : '');

  return base(
    observation,
    { lat: num(p, 'lat', 0), lng: num(p, 'lng', 0) },
    severity,
    `${callsign} ${status === 'offline' ? 'comms loss' : 'status ' + status}`,
    description,
    // A unit is a persistent entity; its telemetry updates one event.
    // Note the visual-sighting branch above deliberately omits a key — a
    // sighting is a discrete report, not the unit's state.
    str(p, 'unitId', callsign),
  );
}

/* ------------------------------------------------------------------ *
 * LOG
 * ------------------------------------------------------------------ */

export function normalizeLog(observation: RawObservation): UnifiedEvent {
  const p = observation.payload;
  const kind = str(p, 'kind', 'system_log');

  if (kind === 'perimeter_trip') {
    const amplitude = num(p, 'signalAmplitude', 0.5);
    const suspectedFalse = p['suspectedFalseAlarm'] === true;

    // Signal amplitude is the discriminator a real operator would use.
    // Weak returns are still reported — they are simply not treated as strong
    // evidence, and corroboration is what can later promote them.
    const severity: SeverityLevel = suspectedFalse
      ? 'low'
      : amplitude > 0.8
        ? 'high'
        : amplitude > 0.55
          ? 'medium'
          : 'low';

    return base(
      observation,
      { lat: num(p, 'lat', 0), lng: num(p, 'lng', 0) },
      severity,
      `Perimeter trip — ${str(p, 'sensorId', 'sensor')}`,
      `${str(p, 'message', 'Perimeter sensor activation')}. Signal amplitude ${amplitude.toFixed(2)}.` +
        (suspectedFalse ? ' Amplitude profile is consistent with a false alarm.' : ''),
    );
  }

  if (kind === 'sensor_fault') {
    return base(
      observation,
      { lat: num(p, 'lat', 0), lng: num(p, 'lng', 0) },
      'medium',
      `Sensor offline — ${str(p, 'sensorId', 'sensor')}`,
      `${str(p, 'message', 'Sensor fault')} Coverage gap until the emplacement is restored.`,
    );
  }

  return base(
    observation,
    { lat: num(p, 'lat', 0), lng: num(p, 'lng', 0) },
    severityOf(p['reportedSeverity'], 'low'),
    `${str(p, 'code', 'LOG')} — ${str(p, 'message', 'System log entry')}`,
    `${str(p, 'message', 'System log entry')} Subsystem ${str(p, 'subsystem', 'SYS')} in ${str(p, 'sector', 'the AO')}.`,
  );
}

/* ------------------------------------------------------------------ *
 * INCIDENT
 * ------------------------------------------------------------------ */

/**
 * An incident's reported severity is a claim by a human of known credibility.
 * A high-severity report from an unverified source is downgraded one tier —
 * VANGUARD does not let an anonymous tip set command posture on its own. If
 * the report is real, corroboration from another feed will escalate it back up
 * through the fusion rules, which is exactly the behaviour you want.
 */
export function normalizeIncident(observation: RawObservation): UnifiedEvent {
  const p = observation.payload;

  const reported = severityOf(p['reportedSeverity'], 'medium');
  const credibility = num(p, 'reporterCredibility', 0.7);
  const verified = p['verified'] === true;

  let severity = reported;
  if (credibility < 0.5 && !verified) {
    const order: SeverityLevel[] = ['low', 'medium', 'high', 'critical'];
    severity = order[Math.max(0, order.indexOf(reported) - 1)]!;
  }

  const casualties = num(p, 'casualties', 0);
  if (casualties >= 3) severity = 'critical';

  const description =
    `${str(p, 'detail', 'Field report received.')} ` +
    `Reported by ${str(p, 'reporterName', 'unknown source')} (credibility ${(credibility * 100).toFixed(0)}%) ` +
    `in ${str(p, 'sector', 'the AO')}.` +
    (verified ? ' Report has been independently verified.' : ' Report is unverified.') +
    (casualties > 0 ? ` ${casualties} casualties reported.` : '');

  return base(
    observation,
    { lat: num(p, 'lat', 0), lng: num(p, 'lng', 0) },
    severity,
    str(p, 'title', 'Field incident reported'),
    description,
  );
}

/* ------------------------------------------------------------------ *
 * SOCIAL MEDIA
 * ------------------------------------------------------------------ */

/**
 * The least-trusted feed. Every claim here is a claim, so reported severity is
 * discounted by the account's reputation and never by the drama of the subject:
 *
 *   - a low-reputation account's high claim is downgraded one tier — if the
 *     event is real, radar or personnel intelligence will corroborate it and
 *     the fusion rules promote it back on evidence;
 *   - a neural-generated clip claiming the most dramatic thing is capped at
 *     MEDIUM — a deepfake telling a scary story must not set command posture,
 *     and no amount of "looking threatening" is itself proof.
 *
 * Crucially this normalizer does NOT discard anything. Every post is surfaced,
 * with a full media-authenticity audit attached, so the operator sees WHY it is
 * weak — and the gold rule of the flow holds: uncertain media is presented,
 * never silently dropped.
 */
export function normalizeSocialMedia(observation: RawObservation): UnifiedEvent {
  const p = observation.payload;

  const reported = severityOf(p['claimedSeverity'], 'medium');
  const credibility = num(p, 'accountReputation', 0.5);

  let severity = reported;
  if (credibility < 0.5) {
    const order: SeverityLevel[] = ['low', 'medium', 'high', 'critical'];
    severity = order[Math.max(0, order.indexOf(reported) - 1)]!;
  }
  const synthetic = p['deepfakeVideo'] === true || p['syntheticVideo'] === true;
  if (synthetic && (severity === 'critical' || severity === 'high')) {
    severity = 'medium';
  }

  const handle = str(p, 'handle', 'unknown account');
  const subject = str(p, 'subject', 'Unattributed social media report');

  const event = base(
    observation,
    { lat: num(p, 'lat', 0), lng: num(p, 'lng', 0) },
    severity,
    `${handle} — ${subject}`,
    `${subject}. Posted to ${str(p, 'platform', 'unknown platform')} ` +
      `(account credibility ${(credibility * 100).toFixed(0)}%). ` +
      'Media authenticity assessment attached; treat as unverified until corroborated.',
  );

  event.mediaAudit = evaluateMediaAuthenticity(event);

  event.description =
    `${event.description} Forensic read: authenticity ${event.mediaAudit.authenticityScore}/100, ` +
    `category ${event.mediaAudit.manipulationCategory}.`;

  return event;
}

/* ------------------------------------------------------------------ *
 * AUDIO RECORDING
 * ------------------------------------------------------------------ */

/**
 * Instrumented acoustic capture (hydrophone array). More credible than any
 * social post — the sim's teleryphony gives these genuine sensor provenance —
 * but still subject to the same rules: a synthetic waveform is a fabricated
 * transmission, and the audit is attached exactly as it is for video.
 */
export function normalizeAudioRecording(observation: RawObservation): UnifiedEvent {
  const p = observation.payload;

  const reported = severityOf(p['claimedSeverity'], 'low');
  const synthetic = p['syntheticWaveform'] === true;
  let severity = reported;
  if (synthetic && (severity === 'critical' || severity === 'high')) severity = 'medium';

  const subject = str(p, 'subject', 'Unattributed acoustic recording');

  const event = base(
    observation,
    { lat: num(p, 'lat', 0), lng: num(p, 'lng', 0) },
    severity,
    subject,
    `${subject}. ${str(p, 'recordingKind', 'acoustic')} capture received. ` +
      'Media authenticity assessment attached.',
  );

  event.mediaAudit = evaluateMediaAuthenticity(event);

  event.description =
    `${event.description} Forensic read: authenticity ${event.mediaAudit.authenticityScore}/100, ` +
    `category ${event.mediaAudit.manipulationCategory}.`;

  return event;
}

/* ------------------------------------------------------------------ *
 * VIDEO (CCTV)
 * ------------------------------------------------------------------ */

/**
 * VIDEO -> FRAME EXTRACTION -> CV DETECTIONS/TRACKS -> VISUAL FORENSICS ->
 * VISUAL EVIDENCE: a CCTV clip is run through the deterministic visual engine
 * at the normalization boundary, so the `visualEvidence` bundle exists BEFORE
 * the event ever enters fusion. The engine is stateful — its per-camera
 * trackers carry object identities across clips — so the caller owns the one
 * shared instance and passes it in.
 *
 * The generic media audit is attached too: the payload carries bitstream and
 * provenance fields, so the clip must earn the same corroboration terms as any
 * other media feed. The two reads are complementary — the visual engine reads
 * the structured evidence, the media audit reads the container — and both are
 * attached to the event, never used to discard it (§15).
 */
export function normalizeVideo(
  observation: RawObservation,
  engine: VisionEngine,
): UnifiedEvent {
  const p = observation.payload;

  const cameraId = str(p, 'cameraId', 'CAM-UNKNOWN');
  const cameraName = str(p, 'cameraName', 'Unidentified CCTV camera');
  const clipId = str(p, 'clipId', `CLIP-${cameraId}`);
  const location: GeoLocation = {
    lat: num(p, 'cameraLat', num(p, 'lat', 0)),
    lng: num(p, 'cameraLng', num(p, 'lng', 0)),
  };

  const result = engine.processClip({
    camera: { cameraId, cameraName, location },
    clipId,
    durationSec: num(p, 'durationSec', 0),
    framesAnalyzed: num(p, 'framesAnalyzed', 0),
    startFrameIndex: num(p, 'startFrameIndex', 0),
    frames: toDetectionFrames(p),
    forensicsPayload: p,
    claims: toClaimSeeds(p),
  });

  const forensics = result.evidence.forensics;

  // Severity starts from what the clip claimed and never rises above it under
  // its own influence: a synthetic/fabricated clip is capped at medium, exactly
  // as with the social and audio normalizers. A restricted-zone entry is what
  // the camera actually observed, so it reports itself at no less than medium.
  const reported = severityOf(p['claimedSeverity'], 'low');
  const synthetic =
    p['contentProfile'] === 'fabricated' ||
    p['deepfakeVideo'] === true ||
    p['syntheticVideo'] === true;
  let severity = reported;
  if (synthetic && (severity === 'critical' || severity === 'high')) severity = 'medium';
  if (result.alerts.length > 0 && severity === 'low') severity = 'medium';

  const zoneNote = result.alerts
    .map((a) => `${a.zoneName} entry by ${a.label} track ${a.trackId}`)
    .join('; ');

  let description =
    `${cameraName} clip ${clipId}: ${objectSummary(result.evidence)}. ` +
    `Visual read: ${forensics.classification}, authenticity ${forensics.authenticityScore}/100, ` +
    `manipulation risk ${Math.round(forensics.signals.manipulationRisk * 100)}%. ` +
    `${claimSummary(result.evidence.claims)}`;
  if (zoneNote) description += ` Camera tracked ${zoneNote}.`;
  if (result.evidence.manipulated) {
    description +=
      ' Footage is treated as fabrication until independently corroborated — surfaced, not discarded.';
  }

  const event = base(
    observation,
    location,
    severity,
    `${cameraName} — CCTV ${clipId}`,
    description,
  );

  // Attach both evidence reads. The generic media audit mirrors the social and
  // audio normalizers so the video feed earns the same confidence terms.
  event.mediaAudit = evaluateMediaAuthenticity(event);
  event.visualEvidence = result.evidence;

  event.description =
    `${event.description} Media audit: authenticity ${event.mediaAudit.authenticityScore}/100, ` +
    `category ${event.mediaAudit.manipulationCategory}.`;

  return event;
}

/** Translate a raw clip's frame payload into engine detection frames. */
function toDetectionFrames(payload: Record<string, unknown>): DetectionFrame[] {
  const raw = payload['frames'];
  if (!Array.isArray(raw)) return [];

  const frames: DetectionFrame[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const frame = item as Record<string, unknown>;
    const frameIndex = typeof frame['frameIndex'] === 'number' ? frame['frameIndex'] : 0;
    const timestampSec = typeof frame['timestampSec'] === 'number' ? frame['timestampSec'] : 0;

    const detections: DetectionFrame['detections'] = [];
    const rawDets = frame['detections'];
    if (Array.isArray(rawDets)) {
      for (const det of rawDets) {
        if (typeof det !== 'object' || det === null) continue;
        const d = det as Record<string, unknown>;
        detections.push({
          detectionId: str(d, 'detectionId', `DET-${frameIndex}`),
          classId: str(d, 'classId', 'object'),
          label: str(d, 'label', 'object'),
          confidence: num(d, 'confidence', 0),
          bbox: bboxOf(d['bbox']),
          world: { lat: num(d, 'lat', 0), lng: num(d, 'lng', 0) },
          speedKnots: num(d, 'speedKnots', 0),
          headingDegrees: num(d, 'headingDegrees', 0),
        });
      }
    }
    frames.push({ frameIndex, timestampSec, detections });
  }

  return frames.sort((a, b) => a.frameIndex - b.frameIndex);
}

/** Read a normalized bounding box from an untyped payload value. */
function bboxOf(value: unknown): VisualBoundingBox {
  if (typeof value !== 'object' || value === null) return { x: 0.5, y: 0.5, w: 0.1, h: 0.2 };
  const b = value as Record<string, unknown>;
  return {
    x: num(b, 'x', 0.5),
    y: num(b, 'y', 0.5),
    w: num(b, 'w', 0.1),
    h: num(b, 'h', 0.2),
  };
}

/** Translate raw claim records into engine claim seeds. */
function toClaimSeeds(payload: Record<string, unknown>): ClaimSeed[] {
  const raw = payload['claims'];
  if (!Array.isArray(raw)) return [];

  const seeds: ClaimSeed[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const c = item as Record<string, unknown>;

    const requiresRaw = c['requires'];
    const requires =
      typeof requiresRaw === 'object' && requiresRaw !== null
        ? (requiresRaw as Record<string, unknown>)
        : undefined;

    seeds.push({
      id: str(c, 'id', `CL-VIDEO-${seeds.length + 1}`),
      text: str(c, 'text', 'Unstated claim'),
      claimConfidence: clamp01(num(c, 'claimConfidence', 0.6)),
      ...(requires
        ? {
            requires: {
              ...(typeof requires['label'] === 'string' ? { label: requires['label'] } : {}),
              ...(typeof requires['minCount'] === 'number'
                ? { minCount: requires['minCount'] }
                : {}),
              ...(typeof requires['behavior'] === 'string'
                ? { behavior: requires['behavior'] }
                : {}),
            },
          }
        : {}),
    });
  }
  return seeds;
}

/** One-line tally of what the camera kept on screen. */
function objectSummary(evidence: VisualEvidence): string {
  const entries = Object.entries(evidence.scene.objectCounts);
  if (entries.length === 0) return 'no objects tracked';
  return entries.map(([label, n]) => `${n} ${label}${n === 1 ? '' : 's'}`).join(', ');
}

/** One-line tally of how the engine ruled on the attached claims. */
function claimSummary(claims: VisualClaim[]): string {
  if (claims.length === 0) return 'No claims attached.';
  const counts = new Map<string, number>();
  for (const c of claims) counts.set(c.status, (counts.get(c.status) ?? 0) + 1);
  const parts = [...counts.entries()].map(([s, n]) => `${n} ${s}`.toLowerCase());
  return `Claims: ${parts.join(', ')}.`;
}

/** Clamp a probability-ish number into 0..1. */
function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/* ------------------------------------------------------------------ *
 * Dispatch
 * ------------------------------------------------------------------ */

/** Route one raw observation to its source-specific normalizer. */
export function normalizeObservation(
  observation: RawObservation,
  engine?: VisionEngine,
): UnifiedEvent | null {
  try {
    switch (observation.sourceType) {
      case 'radar':
        return normalizeRadar(observation);
      case 'weather':
        return normalizeWeather(observation);
      case 'personnel':
        return normalizePersonnel(observation);
      case 'log':
        return normalizeLog(observation);
      case 'incident':
        return normalizeIncident(observation);
      case 'social_media':
        return normalizeSocialMedia(observation);
      case 'audio_recording':
        return normalizeAudioRecording(observation);
      case 'video': {
        if (!engine) {
          // A `video` observation without the shared engine has no CV pipeline to
          // read it. Rather than fabricate evidence, the clip is dropped with a
          // clear warning — the orchestrator that owns the engine always passes it.
          log.warn('Video observation dropped: no VisionEngine supplied to normalization.');
          return null;
        }
        return normalizeVideo(observation, engine);
      }
      default: {
        // Exhaustiveness guard: adding a SourceType without a normalizer
        // becomes a compile error here rather than a silent data loss.
        const unreachable: never = observation.sourceType;
        log.warn(`No normalizer for source type: ${String(unreachable)}`);
        return null;
      }
    }
  } catch (error) {
    log.error(
      `Normalization failed for ${observation.sourceType}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}

/** Normalize a batch, discarding anything that fails validation. */
export function normalizeBatch(
  observations: RawObservation[],
  engine?: VisionEngine,
): UnifiedEvent[] {
  const events: UnifiedEvent[] = [];
  for (const observation of observations) {
    const event = normalizeObservation(observation, engine);
    if (event) events.push(event);
  }
  return events;
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1);
}

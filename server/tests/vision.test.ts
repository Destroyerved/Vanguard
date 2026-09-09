/**
 * VANGUARD — Visual evidence engine coverage.
 *
 * Exercises the deterministic CV chain end to end: per-camera persistent
 * tracking, multi-signal forensics, claim validation, contradiction surfacing,
 * restricted-zone alarms, normalization wiring, and the fusion-stage
 * corroboration refresh. Payloads are built by hand (not drawn from the sim)
 * so thresholds are asserted against exact numbers rather than sampling noise.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { VisionEngine } from '../src/vision/engine.js';
import { __resetContradictionSeq } from '../src/vision/claims.js';
import { CctvVisionSimAdapter } from '../src/ingestion/vision.sim.js';
import { destinationPoint } from '../src/util/geo.js';
import { normalizeBatch, normalizeObservation } from '../src/normalization/normalize.js';
import { validateEvent } from '../src/normalization/validate.js';
import { runFusionPipeline } from '../src/fusion/pipeline.js';
import type { PollContext } from '../src/ingestion/SourceAdapter.js';

const CAMERA = {
  cameraId: 'NC-01',
  cameraName: 'North Gate Perimeter Cam 01',
  location: { lat: 23.148, lng: 72.588 },
} as const;

const CONTEXT: PollContext = { nowMs: Date.now(), tick: 1, degradedMode: false };

/** A single detection dict as the sim would emit inside a frame. */
function det(
  id: string,
  classId: string,
  label: string,
  lat: number,
  lng: number,
  confidence = 0.85,
  speedKnots = 2,
  headingDegrees = 90,
): Record<string, unknown> {
  return {
    detectionId: id,
    classId,
    label,
    confidence,
    bbox: { x: 0.4, y: 0.4, w: 0.2, h: 0.4 },
    lat,
    lng,
    speedKnots,
    headingDegrees,
  };
}

interface ClipSpec {
  clipId: string;
  startFrame: number;
  frames: Record<string, unknown>[];
  claims?: Record<string, unknown>[];
  profile?: 'authentic' | 'edited' | 'fabricated';
  claimedSeverity?: string;
}

const CLEAN_SIGNALS = {
  compressionAnomaly: 0,
  frameAnomaly: 0,
  lightingAnomaly: 0,
  temporalAnomaly: 0,
  metadataAnomaly: 0,
  syntheticMediaSignal: false,
};

/** Raw CCTV observation the way the sim feed, an operator, or upstream media
 * ingestion would hand it to normalization. */
function clipObservation(spec: ClipSpec) {
  const profile = spec.profile ?? 'authentic';

  const bitstream =
    profile === 'fabricated'
      ? {
          reEncodingHistory: [
            'AI Generation: Runway Gen-3 / Sora Neural Synthesis Model',
            'Muxing: FFmpeg v5.1.2 (Lavf59.27.100) — Custom MP4 Atom Structure',
          ],
          c2paManifestIntact: false,
          deviceFingerprint: 'SYNTHETIC_CONTAINER_NO_PHYSICAL_SENSOR_ID',
          compressionPattern: 'FFmpeg Synthetic Transcode / Lossy Neural Interpolation',
          deepfakeVideo: true,
          forensicSignals: {
            compressionAnomaly: 0.6,
            frameAnomaly: 0.45,
            lightingAnomaly: 0.3,
            temporalAnomaly: 0.55,
            metadataAnomaly: 0.5,
            syntheticMediaSignal: true,
          },
        }
      : profile === 'edited'
        ? {
            reEncodingHistory: [
              'Hardware Capture: Axis Q1645-LE SN-77321 (4mm Varifocal)',
              'Edit / Crop: DaVinci Resolve 19',
              'AI Enhancement: Perceptual Super-Resolution Upscale to 4K',
            ],
            c2paManifestIntact: false,
            deviceFingerprint: 'Axis Q1645-LE SN-77321 (4mm Varifocal)',
            compressionPattern: 'H.264 High@L4.0 CABAC (Re-encoded)',
            aiUpscaled: true,
            forensicSignals: {
              compressionAnomaly: 0.2,
              frameAnomaly: 0.15,
              lightingAnomaly: 0.1,
              temporalAnomaly: 0.1,
              metadataAnomaly: 0.25,
              syntheticMediaSignal: false,
            },
          }
        : {
            reEncodingHistory: [
              'Hardware Capture: Axis Q1645-LE SN-77321 (4mm Varifocal)',
              'Direct DVR Archive Write (H.264 High)',
            ],
            c2paManifestIntact: true,
            deviceFingerprint: 'Axis Q1645-LE SN-77321 (4mm Varifocal)',
            compressionPattern: 'H.264 High@L4.1 CABAC Bitstream (Compliant ISO/IEC 14496-10)',
            forensicSignals: CLEAN_SIGNALS,
          };

  return {
    sourceType: 'video' as const,
    sourceName: 'CCTV-VISION-GRID',
    timestamp: new Date().toISOString(),
    payload: {
      cameraId: CAMERA.cameraId,
      cameraName: CAMERA.cameraName,
      cameraLat: CAMERA.location.lat,
      cameraLng: CAMERA.location.lng,
      clipId: spec.clipId,
      durationSec: spec.frames.length * 0.55,
      framesAnalyzed: spec.frames.length,
      startFrameIndex: spec.startFrame,
      contentProfile: profile,
      frames: spec.frames,
      claims: spec.claims ?? [],
      claimedSeverity: spec.claimedSeverity ?? 'low',
      mediaId: `V-${spec.clipId}`,
      mediaKind: 'video',
      ...bitstream,
      lat: CAMERA.location.lat,
      lng: CAMERA.location.lng,
      sourceName: 'CCTV-VISION-GRID',
    },
  };
}

/** A clean clip showing ONE person walking east across 5 frames. The path is a
 * continuous straight line in WORLD space: `base` derives from `startFrame`, so
 * back-to-back clips of the same subject remain one identity. The line sits
 * south of NC-01, well outside every restricted zone. */
function walkingPersonClip(clipId: string, startFrame: number): ReturnType<typeof clipObservation> {
  const frames = [];
  const base = {
    lat: CAMERA.location.lat - 0.004,
    lng: CAMERA.location.lng + 0.0004 + startFrame * 0.0004,
  };
  for (let i = 0; i < 5; i++) {
    frames.push({
      frameIndex: startFrame + i,
      timestampSec: i * 0.55,
      detections: [det('P-1', 'person', 'person', base.lat, base.lng + i * 0.0004)],
    });
  }
  return clipObservation({ clipId, startFrame, frames });
}

/** A fabricated clip: a synthetic UAV that lands on a NEW ground point every
 * frame (8 distinct points on a ~600m ring), so no identity can ever be
 * associated — exactly what a spliced object does to an unsuspecting tracker. */
function fakeUavClip(clipId: string, startFrame: number): ReturnType<typeof clipObservation> {
  const frames = [];
  for (let i = 0; i < 8; i++) {
    const world = destinationPoint(CAMERA.location, i * 45, 600);
    frames.push({
      frameIndex: startFrame + i,
      timestampSec: i * 0.55,
      detections: [
        det(
          `FAKE-UAV-${i}`,
          'uav',
          'uav',
          world.lat,
          world.lng,
          0.85,
          20,
          (i * 40) % 360,
        ),
      ],
    });
  }
  return clipObservation({
    clipId,
    startFrame,
    frames,
    profile: 'fabricated',
    claimedSeverity: 'high',
    claims: [
      {
        id: 'CL-FAB-100',
        text: 'Unmanned aerial incursion over the restricted perimeter',
        claimConfidence: 0.9,
        requires: { label: 'uav', minCount: 1 },
      },
    ],
  });
}

/** A clip of a person inside RZ-1 (North Gate Restricted Perimeter). */
function restrictedEntryClip(clipId: string, startFrame: number): ReturnType<typeof clipObservation> {
  const frames = [];
  // RZ-1 centre is 23.154/72.588, radius 600m; 23.152 is ~222m inside.
  const inside = { lat: 23.152, lng: 72.588 };
  for (let i = 0; i < 5; i++) {
    frames.push({
      frameIndex: startFrame + i,
      timestampSec: i * 0.55,
      detections: [det('X-1', 'person', 'person', inside.lat, inside.lng + i * 0.0001)],
    });
  }
  return clipObservation({
    clipId,
    startFrame,
    frames,
    claims: [
      {
        id: 'CL-RZ-100',
        text: 'Unauthorized entry into RZ-1 by foot',
        claimConfidence: 0.8,
        requires: { behavior: 'RESTRICTED_ZONE_ENTRY' },
      },
    ],
  });
}

describe('VisionEngine tracking', () => {
  let engine: VisionEngine;
  beforeEach(() => {
    __resetContradictionSeq();
    engine = new VisionEngine();
  });

  it('keeps ONE identity across sequential clips of the same subject', () => {
    const clipA = walkingPersonClip('CLIP-A', 0);
    const clipB = walkingPersonClip('CLIP-B', 5);

    const a = engine.processClip({
      camera: CAMERA,
      clipId: 'CLIP-A',
      durationSec: 2.75,
      framesAnalyzed: 5,
      startFrameIndex: 0,
      frames: toFrames(clipA),
      forensicsPayload: clipA.payload,
    });

    const b = engine.processClip({
      camera: CAMERA,
      clipId: 'CLIP-B',
      durationSec: 2.75,
      framesAnalyzed: 5,
      startFrameIndex: 5,
      frames: toFrames(clipB),
      forensicsPayload: clipB.payload,
    });

    const firstId = a.evidence.tracks[0]!.trackId;
    expect(a.evidence.tracks).toHaveLength(1);
    expect(b.evidence.tracks[0]!.trackId).toBe(firstId);
    expect(b.evidence.scene.objectCounts.person).toBe(1);
    expect(b.evidence.trackingConsistency).toBeGreaterThanOrEqual(0.9);
    expect(b.evidence.forensics.classification).toBe('AUTHENTIC');
  });

  it('cannot hold an identity for a subject that teleports every frame', () => {
    const result = engine.processClip({
      camera: CAMERA,
      clipId: 'CLIP-TP',
      durationSec: 4.4,
      framesAnalyzed: 8,
      startFrameIndex: 0,
      frames: toFrames(fakeUavClip('CLIP-TP', 0)),
      forensicsPayload: fakeUavClip('CLIP-TP', 0).payload,
    });

    expect(result.evidence.trackingConsistency).toBeLessThan(0.35);
    expect(result.evidence.tracks.length).toBeGreaterThanOrEqual(5);
  });
});

describe('VisionEngine forensics + claim validation', () => {
  let engine: VisionEngine;
  beforeEach(() => {
    __resetContradictionSeq();
    engine = new VisionEngine();
  });

  it('classifies a synthetic clip and REFUTES its claim (§28)', () => {
    const clip = fakeUavClip('CLIP-FAB', 0);
    const result = engine.processClip({
      camera: CAMERA,
      clipId: 'CLIP-FAB',
      durationSec: 4.4,
      framesAnalyzed: 8,
      startFrameIndex: 0,
      frames: toFrames(clip),
      forensicsPayload: clip.payload,
      claims: [
        {
          id: 'CL-FAB-100',
          text: 'Unmanned aerial incursion over the restricted perimeter',
          claimConfidence: 0.9,
          requires: { label: 'uav', minCount: 1 },
        },
      ],
    });

    const ev = result.evidence;
    expect(ev.forensics.classification).toBe('POTENTIAL_SYNTHETIC');
    expect(ev.forensics.signals.manipulationRisk).toBeGreaterThanOrEqual(0.55);
    expect(ev.manipulated).toBe(true);
    expect(ev.surfaced).toBe(true);

    const claim = ev.claims[0]!;
    expect(claim.status).toBe('CONTRADICTED');

    // Both sides stay visible: the operator's statement AND the evidence.
    expect(ev.contradictions).toHaveLength(1);
    const contradiction = ev.contradictions![0]!;
    expect(contradiction.operatorStatement).toBe(claim.text);
    expect(contradiction.visualEvidenceId).toBe(ev.evidenceId);
    expect(contradiction.evidenceConfidence).toBeGreaterThanOrEqual(0.45);
    expect(contradiction.contradictionBasis.length).toBeGreaterThanOrEqual(2);

    // The hard rule's basis + at least one forensic indicator.
    expect(contradiction.contradictionBasis.join(' ')).toMatch(/POTENTIAL_SYNTHETIC/);
  });

  it('SUPPORTS a claim the camera actually observed', () => {
    const clip = walkingPersonClip('CLIP-OK', 0);
    const result = engine.processClip({
      camera: CAMERA,
      clipId: 'CLIP-OK',
      durationSec: 2.75,
      framesAnalyzed: 5,
      startFrameIndex: 0,
      frames: toFrames(clip),
      forensicsPayload: clip.payload,
      claims: [
        {
          id: 'CL-OK-1',
          text: 'Persons are present in the monitored area',
          claimConfidence: 0.8,
          requires: { label: 'person', minCount: 1 },
        },
      ],
    });

    expect(result.evidence.claims[0]!.status).toBe('SUPPORTED');
    expect(result.evidence.claims[0]!.supportingEvidence).toContain(
      result.evidence.tracks[0]!.trackId,
    );
    expect(result.evidence.contradictions).toBeUndefined();
  });

  it('CONTRADICTS a claim about an object the camera provably did not see', () => {
    const clip = walkingPersonClip('CLIP-NO', 0);
    const result = engine.processClip({
      camera: CAMERA,
      clipId: 'CLIP-NO',
      durationSec: 2.75,
      framesAnalyzed: 5,
      startFrameIndex: 0,
      frames: toFrames(clip),
      forensicsPayload: clip.payload,
      claims: [
        {
          id: 'CL-NO-1',
          text: 'Maritime traffic in view of the camera',
          claimConfidence: 0.8,
          requires: { label: 'vessel', minCount: 1 },
        },
      ],
    });

    const claim = result.evidence.claims[0]!;
    expect(claim.status).toBe('CONTRADICTED');
    expect(result.evidence.contradictions).toHaveLength(1);
    expect(claim.basis).toMatch(/none matched 'vessel'/);
  });

  it('raises a restricted-zone entry alarm and SUPPORTS the behavior claim', () => {
    const clip = restrictedEntryClip('CLIP-RZ', 0);
    const result = engine.processClip({
      camera: CAMERA,
      clipId: 'CLIP-RZ',
      durationSec: 2.75,
      framesAnalyzed: 5,
      startFrameIndex: 0,
      frames: toFrames(clip),
      forensicsPayload: clip.payload,
      claims: [
        {
          id: 'CL-RZ-100',
          text: 'Unauthorized entry into RZ-1 by foot',
          claimConfidence: 0.8,
          requires: { behavior: 'RESTRICTED_ZONE_ENTRY' },
        },
      ],
    });

    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0]!.zoneId).toBe('RZ-1');
    expect(result.evidence.behaviorFlags).toContain('RESTRICTED_ZONE_ENTRY');
    expect(result.evidence.claims[0]!.status).toBe('SUPPORTED');

    // One alarm per track+zone: a second frame inside does not re-fire.
    const again = engine.processClip({
      camera: CAMERA,
      clipId: 'CLIP-RZ',
      durationSec: 2.75,
      framesAnalyzed: 5,
      startFrameIndex: 5,
      frames: toFrames(clip),
      forensicsPayload: clip.payload,
    });
    expect(again.alerts).toHaveLength(0);
  });
});

describe('normalization wiring', () => {
  let engine: VisionEngine;
  beforeEach(() => {
    __resetContradictionSeq();
    engine = new VisionEngine();
  });

  it('cross-normalizes a raw CCTV clip into a validated video event', () => {
    const event = normalizeObservation(walkingPersonClip('CLIP-N1', 0), engine);
    expect(event).not.toBeNull();
    expect(event!.sourceType).toBe('video');
    expect(event!.id).toMatch(/^EV-VID-\d{6}$/);
    expect(event!.baseSeverity).toBe('low');
    expect(event!.severity).toBe('low');

    expect(event!.visualEvidence).toBeDefined();
    expect(event!.visualEvidence!.forensics.classification).toBe('AUTHENTIC');
    expect(event!.mediaAudit).toBeDefined();
    expect(event!.title).toContain('CCTV');

    expect(validateEvent(event!).valid).toBe(true);
  });

  it('drops a video observation when no engine is supplied, rather than inventing evidence', () => {
    expect(normalizeObservation(walkingPersonClip('CLIP-N2', 0))).toBeNull();
  });

  it('caps a fabricated clip at medium and says it is treated as fabrication', () => {
    const event = normalizeObservation(fakeUavClip('CLIP-N3', 0), engine)!;
    expect(event.severity).toBe('medium'); // claimed HIGH, capped
    expect(event.baseSeverity).toBe('medium');
    expect(event.visualEvidence!.manipulated).toBe(true);
    expect(event.description).toMatch(/POTENTIAL_SYNTHETIC/);
    expect(event.description).toMatch(/treated as fabrication/);
  });

  it('runs the whole CCTV simulator through the same normalization boundary', () => {
    const adapter = new CctvVisionSimAdapter(42);
    adapter.init();
    const observations = adapter.poll(CONTEXT).observations;
    expect(observations.length).toBeGreaterThan(0);

    const events = normalizeBatch(observations, engine);
    expect(events.length).toBeGreaterThan(0);

    for (const event of events) {
      expect(event.sourceType).toBe('video');
      expect(event.visualEvidence).toBeDefined();
      expect(event.mediaAudit).toBeDefined();
      expect(validateEvent(event).valid).toBe(true);
      expect(
        [
          'AUTHENTIC',
          'EDITED',
          'ENHANCED',
          'SUSPICIOUS_MANIPULATION',
          'POTENTIAL_SYNTHETIC',
          'UNKNOWN',
        ],
      ).toContain(event.visualEvidence!.forensics.classification);
    }
  });
});

describe('fusion pipeline visual corroboration', () => {
  let engine: VisionEngine;
  beforeEach(() => {
    __resetContradictionSeq();
    engine = new VisionEngine();
  });

  it('refreshes the evidence bundle with live cross-source agreement during scoring (stage 4)', () => {
    const video = normalizeObservation(walkingPersonClip('CLIP-F', 0), engine)!;

    const base = new Date(video.timestamp).getTime();
    const around = (lat: number, lng: number, service: string) => ({
      sourceType: service as 'radar' | 'log' | 'incident',
      sourceName: `TEST-${service}`,
      timestamp: new Date(base).toISOString(),
      payload:
        service === 'radar'
          ? {
              trackId: 'R-777',
              kind: 'uav',
              classification: 'unknown',
              lat,
              lng,
              speedKnots: 12,
              altitudeMeters: 200,
              transponder: null,
              radarCrossSectionM2: 2,
            }
          : service === 'log'
            ? {
                kind: 'perimeter_trip',
                message: 'Perimeter sensor activation',
                signalAmplitude: 0.8,
                lat,
                lng,
                sensorId: 'S-1',
              }
            : {
                title: 'Suspicious activity near the perimeter',
                detail: 'Field report received.',
                reportedSeverity: 'medium',
                lat,
                lng,
                reporterCredibility: 0.7,
                verified: false,
              },
    });

    const others = [
      around(23.1482, 72.5882, 'radar'),
      around(23.1478, 72.5881, 'log'),
      around(23.1481, 72.5878, 'incident'),
    ];
    const [radar, log, incident] = normalizeBatch(others).map((e) => e!);

    expect(video.visualEvidence!.corroboration.corroboratedBy).toEqual([]);

    const result = runFusionPipeline({ events: [video, radar, log, incident] });

    // All four events correlate into one cluster.
    expect(result.clusters.length).toBe(1);
    expect(video.corroboratedBy.length).toBe(3);

    // The bundle served to Gemini/operator now shows LIVE corroboration.
    const corroboration = video.visualEvidence!.corroboration;
    expect(corroboration.corroboratedBy).toEqual(video.corroboratedBy);
    expect(corroboration.distinctSources.sort()).toEqual(['incident', 'log', 'radar']);
    expect(corroboration.sourceAgreement).toBeCloseTo(1, 2);
    expect(corroboration.spatialAgreement).toBeGreaterThan(0.9);
    expect(corroboration.temporalAgreement).toBeCloseTo(1, 2);
  });

  it('reconciles the corroboration independently of any corroborators (both agree)', () => {
    const a = walkingPersonClip('CLIP-G1', 0);
    const b = walkingPersonClip('CLIP-G2', 5);
    const ra = engine.processClip({
      camera: CAMERA,
      clipId: a.payload.clipId as string,
      durationSec: 2.75,
      framesAnalyzed: 5,
      startFrameIndex: 0,
      frames: toFrames(a),
      forensicsPayload: a.payload,
    });
    const rb = engine.processClip({
      camera: CAMERA,
      clipId: b.payload.clipId as string,
      durationSec: 2.75,
      framesAnalyzed: 5,
      startFrameIndex: 5,
      frames: toFrames(b),
      forensicsPayload: b.payload,
    });
    expect(ra.evidence.tracks[0]!.trackId).toBe(rb.evidence.tracks[0]!.trackId);
  });
});

/** Translate a raw clip payload's frame dicts into engine detection frames. */
function toFrames(clip: ReturnType<typeof clipObservation>) {
  const raw = clip.payload.frames as Record<string, unknown>[];
  return raw.map((f) => {
    const detections = (f['detections'] as Record<string, unknown>[]).map((d) => ({
      detectionId: d['detectionId'] as string,
      classId: d['classId'] as string,
      label: d['label'] as string,
      confidence: d['confidence'] as number,
      bbox: d['bbox'] as { x: number; y: number; w: number; h: number },
      world: { lat: d['lat'] as number, lng: d['lng'] as number },
      speedKnots: d['speedKnots'] as number,
      headingDegrees: d['headingDegrees'] as number,
    }));
    return {
      frameIndex: f['frameIndex'] as number,
      timestampSec: f['timestampSec'] as number,
      detections,
    };
  });
}
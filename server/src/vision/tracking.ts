/**
 * VANGUARD — Deterministic visual tracker.
 *
 * Turns raw per-frame detections into PERSISTENT object identities. The spec
 * demands that tracking be deterministic and auditable: a sighting is linked to
 * the nearest ACTIVE track of the same class within a fixed association radius
 * (VISION_ASSOCIATION_RADIUS_METERS); beyond that radius a new identity opens.
 * Identities close after VISION_TRACK_LOST_FRAMES without an update, loitering
 * is declared after VISION_LOITERING_THRESHOLD_FRAMES of near-stationary drift,
 * and entry into a VISION_RESTRICTED_ZONES zone raises exactly one alarm per
 * track+zone.
 *
 * The tracker holds cross-clip state (the way the radar sim holds contact
 * state): a person who walks across one camera keeps ONE track identity across
 * the clips that captured them. That continuity is what makes
 * `trackingConsistency` — the proportion of detections the tracker could keep
 * addressing to an existing identity — a real probe of clip integrity rather
 * than a per-clip coincidence counter.
 */

import {
  VISION_ASSOCIATION_RADIUS_METERS,
  VISION_DETECTION_MIN_SCORE,
  VISION_LOITERING_THRESHOLD_FRAMES,
  VISION_RESTRICTED_ZONES,
  VISION_TRACK_LOST_FRAMES,
} from '../config/constants.js';
import type { ObjectTrack, VisualBoundingBox } from '../types/events.js';
import { haversineMeters, mpsToKnots, type LatLng } from '../util/geo.js';
import { clamp, mean, round } from '../util/stats.js';

/** Seconds of near-stationary drift that count as "not moving". */
const STATIC_DISPLACEMENT_METERS = 5;

export interface FrameDetection {
  detectionId: string;
  classId: string;
  label: string;
  /** Detector confidence, 0..1 — NOT the system's belief about the event. */
  confidence: number;
  bbox: VisualBoundingBox;
  /** World-space position of the sighting, from the camera homography. */
  world: LatLng;
  speedKnots?: number;
  headingDegrees?: number;
}

export interface DetectionFrame {
  frameIndex: number;
  timestampSec: number;
  detections: FrameDetection[];
}

export interface ZoneAlert {
  trackId: string;
  zoneId: string;
  zoneName: string;
  label: string;
  position: LatLng;
}

export interface TrackObservation {
  track: ObjectTrack;
  framesObservedInClip: number;
  positions: LatLng[];
}

export interface ClipTrackingResult {
  /** Tracks observed during this clip, with their full current state. */
  tracks: ObjectTrack[];
  observations: TrackObservation[];
  alerts: ZoneAlert[];
  /** Union of behavior flags raised across the clip's tracks. */
  behaviorFlags: string[];
  /** Distinct track identities per class label seen in this clip. */
  objectCounts: Record<string, number>;
  /** Object persistence across frames, 0..1. */
  trackingConsistency: number;
  /** Inter-frame motion coherence, 0..1. */
  temporalConfidence: number;
  /** Diagnostics for the evidence drawer. */
  totalDetections: number;
  associationRate: number;
}

interface InternalTrack extends ObjectTrack {
  lastSeenFrameIndex: number;
  lastPosition: LatLng;
  staticFrames: number;
  behaviors: Set<string>;
  lastObservationSec: number;
}

export class CameraTracker {
  private readonly tracks: InternalTrack[] = [];
  private readonly trackSeqByClass = new Map<string, number>();
  private readonly emittedAlerts = new Set<string>();

  constructor(
    readonly cameraId: string,
    readonly cameraName: string,
    readonly cameraLocation: LatLng,
  ) {}

  /** All identities currently held for this camera. */
  getTracks(): ObjectTrack[] {
    return this.tracks.map(toPublicTrack);
  }

  /** Process one clip's frame detections through the persistent tracker. */
  processClip(
    frames: DetectionFrame[],
    clipStartFrameIndex: number,
    clipTimestamp: string,
  ): ClipTrackingResult {
    // Close any identity that has been silent since before this clip began.
    for (const t of this.tracks) {
      if (
        t.status === 'active' &&
        t.lastSeenFrameIndex + VISION_TRACK_LOST_FRAMES < clipStartFrameIndex
      ) {
        t.status = 'closed';
      }
    }

    const alerts: ZoneAlert[] = [];
    const clipCount = Math.max(1, frames.length);
    const framesObserved = new Map<string, number>();
    const positionSeq = new Map<string, LatLng[]>();
    let totalDetections = 0;
    let associated = 0;

    for (const frame of frames) {
      for (const det of frame.detections) {
        // A sub-threshold detection is present but not trustworthy enough to
        // drive an identity; it does not cost the association rate.
        if (det.confidence < VISION_DETECTION_MIN_SCORE) continue;
        totalDetections++;

        const { track, matchedExisting } = this.associate(det, frame, clipTimestamp);
        if (matchedExisting) associated++;

        framesObserved.set(track.trackId, (framesObserved.get(track.trackId) ?? 0) + 1);
        const seq = positionSeq.get(track.trackId) ?? [];
        seq.push({ lat: det.world.lat, lng: det.world.lng });
        positionSeq.set(track.trackId, seq);

        // Restricted-zone entry: exactly one alarm per track+zone, forever.
        for (const zone of VISION_RESTRICTED_ZONES) {
          if (haversineMeters(det.world, zone.center) > zone.radiusMeters) continue;
          track.restrictedEntry = true;
          const key = `${track.trackId}:${zone.id}`;
          if (this.emittedAlerts.has(key)) continue;
          this.emittedAlerts.add(key);
          track.behaviors.add('RESTRICTED_ZONE_ENTRY');
          alerts.push({
            trackId: track.trackId,
            zoneId: zone.id,
            zoneName: zone.name,
            label: track.label,
            position: { lat: det.world.lat, lng: det.world.lng },
          });
        }

        // Loitering: near-stationary drift for a sustained number of frames.
        const moved = haversineMeters(track.lastPosition!, det.world);
        track.staticFrames = moved >= STATIC_DISPLACEMENT_METERS ? 0 : track.staticFrames + 1;
        track.lastPosition = { lat: det.world.lat, lng: det.world.lng };
        if (track.staticFrames >= VISION_LOITERING_THRESHOLD_FRAMES) {
          track.behaviors.add('LOITERING');
        }
      }
    }

    const observations: TrackObservation[] = [];
    for (const t of this.tracks) {
      const obsN = framesObserved.get(t.trackId);
      if (obsN === undefined) continue;
      observations.push({
        track: toPublicTrack(t),
        framesObservedInClip: obsN,
        positions: positionSeq.get(t.trackId) ?? [],
      });
    }

    const behaviorFlags = [
      ...new Set(observations.flatMap((o) => behaviorsOf(this.tracks, o.track.trackId))),
    ];

    const objectCounts: Record<string, number> = {};
    for (const o of observations) {
      objectCounts[o.track.label] = (objectCounts[o.track.label] ?? 0) + 1;
    }

    const meanPersistence = mean(
      observations.map((o) => Math.min(1, o.framesObservedInClip / clipCount)),
    );
    const associationRate = totalDetections === 0 ? 1 : associated / totalDetections;
    const trackingConsistency = clamp(0.85 * meanPersistence + 0.15 * associationRate, 0, 1);

    return {
      tracks: observations.map((o) => o.track),
      observations,
      alerts,
      behaviorFlags,
      objectCounts,
      trackingConsistency: round(trackingConsistency, 3),
      temporalConfidence: temporalConfidenceOf(observations),
      totalDetections,
      associationRate: round(associationRate, 3),
    };
  }

  /**
   * Link a detection to the nearest active same-class track, or open a new one.
   * Returns whether the sighting was addressed to a pre-existing identity
   * (`matchedExisting`) — objects that keep one identity across the clip are
   * what `trackingConsistency` rewards; a spliced object that must re-open a
   * fresh identity every frame drags it down.
   */
  private associate(
    det: FrameDetection,
    frame: DetectionFrame,
    timestamp: string,
  ): { track: InternalTrack; matchedExisting: boolean } {
    let best: InternalTrack | null = null;
    let bestD = VISION_ASSOCIATION_RADIUS_METERS;
    for (const t of this.tracks) {
      if (t.status !== 'active' || t.classId !== det.classId) continue;
      const d = haversineMeters(t.latestPosition, det.world);
      if (d <= bestD) {
        bestD = d;
        best = t;
      }
    }

    if (best) {
      const dT = frame.timestampSec - best.lastObservationSec;
      const distance = haversineMeters(best.latestPosition, det.world);
      const speedKnots =
        det.speedKnots ??
        (dT > 0 ? round(mpsToKnots(distance / dT), 1) : best.latestSpeedKnots);

      best.framesObserved++;
      best.lastSeenFrameIndex = frame.frameIndex;
      best.lastSeen = timestamp;
      best.lastObservationSec = frame.timestampSec;
      best.avgConfidence = round(
        (best.avgConfidence * (best.framesObserved - 1) + det.confidence) / best.framesObserved,
        3,
      );
      best.bboxHistory.push({ ...det.bbox });
      if (best.bboxHistory.length > 48) best.bboxHistory.shift();
      best.latestPosition = { lat: det.world.lat, lng: det.world.lng };
      best.latestHeadingDegrees = round(det.headingDegrees ?? best.latestHeadingDegrees, 1);
      best.latestSpeedKnots = speedKnots;
      return { track: best, matchedExisting: true };
    }

    const n = (this.trackSeqByClass.get(det.classId) ?? 0) + 1;
    this.trackSeqByClass.set(det.classId, n);
    const track: InternalTrack = {
      trackId: `${this.cameraId}-${det.classId.toUpperCase()}-${String(n).padStart(4, '0')}`,
      classId: det.classId,
      label: det.label,
      cameraId: this.cameraId,
      framesObserved: 1,
      firstSeen: timestamp,
      lastSeen: timestamp,
      avgConfidence: round(det.confidence, 3),
      bboxHistory: [{ ...det.bbox }],
      latestPosition: { lat: det.world.lat, lng: det.world.lng },
      latestSpeedKnots: round(det.speedKnots ?? 0, 1),
      latestHeadingDegrees: round(det.headingDegrees ?? 0, 1),
      status: 'active',
      restrictedEntry: false,
      lastSeenFrameIndex: frame.frameIndex,
      lastPosition: { lat: det.world.lat, lng: det.world.lng },
      staticFrames: 0,
      behaviors: new Set(),
      lastObservationSec: frame.timestampSec,
    };
    this.tracks.push(track);
    return { track, matchedExisting: false };
  }
}

/** Behavior flags belonging to one identity. */
function behaviorsOf(tracks: InternalTrack[], trackId: string): string[] {
  const t = tracks.find((c) => c.trackId === trackId);
  return t ? [...t.behaviors] : [];
}

/**
 * Motion-coherence score, 0..1. For every observed track the per-frame step
 * lengths should follow a physical distribution; a spliced object that
 * teleports registers a high coefficient of variation and drags the score
 * down. A stationary object is perfectly coherent (no jitter to explain).
 */
function temporalConfidenceOf(observations: TrackObservation[]): number {
  if (observations.length === 0) return 1;
  const perTrack: number[] = [];
  for (const obs of observations) {
    const pts = obs.positions;
    if (pts.length < 2) continue;
    const steps: number[] = [];
    for (let i = 1; i < pts.length; i++) steps.push(haversineMeters(pts[i - 1]!, pts[i]!));
    const mu = mean(steps);
    if (mu === 0) {
      perTrack.push(1);
      continue;
    }
    const sigma = Math.sqrt(mean(steps.map((s) => (s - mu) ** 2)));
    perTrack.push(clamp(1 - sigma / mu, 0, 1));
  }
  if (perTrack.length === 0) return 1;
  return round(mean(perTrack), 3);
}

/** Strip internal tracker bookkeeping when exposing an identity. */
function toPublicTrack(t: InternalTrack): ObjectTrack {
  return {
    trackId: t.trackId,
    classId: t.classId,
    label: t.label,
    cameraId: t.cameraId,
    framesObserved: t.framesObserved,
    firstSeen: t.firstSeen,
    lastSeen: t.lastSeen,
    avgConfidence: t.avgConfidence,
    bboxHistory: [...t.bboxHistory],
    latestPosition: { ...t.latestPosition },
    latestSpeedKnots: t.latestSpeedKnots,
    latestHeadingDegrees: t.latestHeadingDegrees,
    status: t.status,
    restrictedEntry: t.restrictedEntry,
  };
}
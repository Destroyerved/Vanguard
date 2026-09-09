/**
 * VANGUARD — Visual evidence engine (deterministic CV pipeline in-process).
 *
 * SPEC §3 architecture: the engine is the "CV" step of
 *
 *   VIDEO -> FRAME EXTRACTION -> CV DETECTIONS/TRACKS -> VISUAL FORENSICS
 *   -> VISUAL EVIDENCE -> FUSION -> EVIDENCE VALIDATION -> GEMINI
 *
 * One `VisionEngine` instance processes every CCTV clip the pipeline ingests.
 * It owns a per-camera tracker (cross-clip persistent identities), runs the
 * multi-signal forensics on the clip payload, validates any attached claims
 * into SUPPORTED/…/UNVERIFIABLE statuses, and surfaces refuted claims as
 * contradictions. The result is a `VisualEvidence` bundle attached to the
 * `video` event and handed to Gemini — never the raw frames.
 *
 * Deterministic by construction: the same camera payloads in the same order
 * always yield the same evidence, and the whole chain is seeded from SIM_SEED.
 */

import {
  VISION_MANIPULATION_THRESHOLDS,
} from '../config/constants.js';
import { sourceAgreement, spatialAgreement, temporalAgreement } from '../fusion/confidence.js';
import type {
  SourceType,
  UnifiedEvent,
  VisualClaim,
  VisualDetection,
  VisualEvidence,
} from '../types/events.js';
import { nowIso } from '../util/time.js';
import { type ClaimSeed, detectContradictions, validateClaim } from './claims.js';
import { buildForensicAnalysis } from './forensics.js';
import { CameraTracker, type DetectionFrame } from './tracking.js';
import { round } from '../util/stats.js';
import type { LatLng } from '../util/geo.js';

export type { ClaimSeed, DetectionFrame };

/**
 * Recompute the corroboration-dependent half of an evidence bundle once the
 * fusion pipeline has resolved the corroborators. Stateless (no engine access
 * needed) and mutates the bundle in place, mirroring the media engine's
 * `refreshAuditCorroboration`. Reuses the canonical confidence agreement
 * functions so the number seen here and the number in the confidence badge can
 * never diverge.
 */
export function refreshVisualCorroboration(
  evidence: VisualEvidence,
  event: UnifiedEvent,
  corroborators: UnifiedEvent[],
): void {
  evidence.corroboration.corroboratedBy = [...corroborators.map((c) => c.id)];
  evidence.corroboration.distinctSources = [
    ...new Set<SourceType>(corroborators.map((c) => c.sourceType)),
  ];
  evidence.corroboration.sourceAgreement = sourceAgreement(event.sourceType, corroborators);
  evidence.corroboration.spatialAgreement = spatialAgreement(event, corroborators);
  evidence.corroboration.temporalAgreement = temporalAgreement(event, corroborators);
}

/** One clip handed to the engine for analysis. */
export interface VisionClipInput {
  camera: { cameraId: string; cameraName: string; location: LatLng };
  clipId: string;
  durationSec: number;
  framesAnalyzed: number;
  /** Camera-wide frame clock the clip starts at (contributes track closing). */
  startFrameIndex: number;
  frames: DetectionFrame[];
  /** The untouched raw payload feeding the forensic read. */
  forensicsPayload: Record<string, unknown>;
  claims?: ClaimSeed[];
}

/** Restricted-zone entry alarm served to the API layer. */
export interface ZoneAlertDTO {
  trackId: string;
  zoneId: string;
  zoneName: string;
  label: string;
  position: LatLng;
}

export interface VisionClipResult {
  evidence: VisualEvidence;
  /** Restricted-zone entry alarms raised by THIS clip (once per track+zone). */
  alerts: ZoneAlertDTO[];
}

/** Per-camera runtime state, exposed for the diagnostics drawer. */
export interface CameraSnapshot {
  cameraId: string;
  cameraName: string;
  activeTracks: number;
  closedTracks: number;
  restrictedEntries: number;
}

export class VisionEngine {
  private readonly trackers = new Map<string, CameraTracker>();

  /** Process one clip through tracking -> forensics -> claims -> evidence. */
  processClip(input: VisionClipInput): VisionClipResult {
    const tracker = this.trackerFor(input.camera);
    const tracking = tracker.processClip(input.frames, input.startFrameIndex, nowIso());

    const forensics = buildForensicAnalysis({
      payload: input.forensicsPayload,
      trackingConsistency: tracking.trackingConsistency,
      temporalConfidence: tracking.temporalConfidence,
    });

    const evidenceId = `VE-${input.camera.cameraId}-${input.clipId}`;

    const claims: VisualClaim[] = (input.claims ?? []).map((seed) =>
      validateClaim(seed, {
        evidenceId,
        objectCounts: tracking.objectCounts,
        behaviorFlags: tracking.behaviorFlags,
        tracks: tracking.tracks,
        forensics,
      }),
    );
    const contradictions = detectContradictions(claims, evidenceId, forensics);

    // Last-seen detection per observed track, for the evidence bundle.
    const objects: VisualDetection[] = [];
    for (const obs of tracking.observations) {
      const track = obs.track;
      const lastBbox = track.bboxHistory[track.bboxHistory.length - 1] ?? {
        x: 0.5,
        y: 0.5,
        w: 0.1,
        h: 0.2,
      };
      objects.push({
        id: `DET-${track.trackId}-${input.framesAnalyzed}`,
        classId: track.classId,
        label: track.label,
        confidence: track.avgConfidence,
        bbox: lastBbox,
        trackId: track.trackId,
      });
    }

    const manipulated = forensics.signals.manipulationRisk >= VISION_MANIPULATION_THRESHOLDS.suspicious;

    const evidence: VisualEvidence = {
      evidenceId,
      cameraId: input.camera.cameraId,
      cameraName: input.camera.cameraName,
      clipId: input.clipId,
      framesAnalyzed: input.framesAnalyzed,
      scene: {
        durationSec: round(input.durationSec, 1),
        framesAnalyzed: input.framesAnalyzed,
        objectCounts: tracking.objectCounts,
      },
      objects,
      tracks: tracking.tracks,
      trackingConsistency: tracking.trackingConsistency,
      temporalConfidence: tracking.temporalConfidence,
      forensics,
      claims,
      contradictions: contradictions.length > 0 ? contradictions : undefined,
      corroboration: {
        corroboratedBy: [],
        distinctSources: [],
        sourceAgreement: 0,
        spatialAgreement: 0,
        temporalAgreement: 0,
      },
      behaviorFlags: tracking.behaviorFlags,
      manipulated,
      surfaced: true,
    };

    return {
      evidence,
      alerts: tracking.alerts.map((a) => ({
        trackId: a.trackId,
        zoneId: a.zoneId,
        zoneName: a.zoneName,
        label: a.label,
        position: a.position,
      })),
    };
  }

  /**
   * Recompute the corroboration-dependent half of an evidence bundle. The
   * fusion pipeline calls this during scoring once the corroborators are
   * resolved, mutating the bundle in place — mirroring the media engine's
   * `refreshAuditCorroboration`. Delegates to the standalone
   * `refreshVisualCorroboration` so the pipeline itself never needs an engine
   * instance. Reuses the canonical confidence agreement functions so the number
   * seen here and the number in the confidence badge can never diverge.
   */
  refreshCorroboration(
    evidence: VisualEvidence,
    event: UnifiedEvent,
    corroborators: UnifiedEvent[],
  ): void {
    refreshVisualCorroboration(evidence, event, corroborators);
  }

  /** Per-camera tracker state for the diagnostics drawer. */
  snapshots(): CameraSnapshot[] {
    return [...this.trackers.values()].map((t) => ({
      cameraId: t.cameraId,
      cameraName: t.cameraName,
      activeTracks: t.getTracks().filter((x) => x.status === 'active').length,
      closedTracks: t.getTracks().filter((x) => x.status === 'closed').length,
      restrictedEntries: t.getTracks().filter((x) => x.restrictedEntry).length,
    }));
  }

  private trackerFor(camera: VisionClipInput['camera']): CameraTracker {
    let t = this.trackers.get(camera.cameraId);
    if (!t) {
      t = new CameraTracker(camera.cameraId, camera.cameraName, camera.location);
      this.trackers.set(camera.cameraId, t);
    }
    return t;
  }
}
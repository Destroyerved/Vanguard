/**
 * VANGUARD — Visual clip forensics (deterministic, multi-signal).
 *
 * SPEC §13-§14: a video clip is not read as one binary "real/fake" verdict.
 * Six independent signals are computed from the raw payload — compression,
 * frame-level, lighting, temporal, metadata, and synthetic-media — and blended
 * by fixed weights into a manipulation risk. The risk is then classified into
 * the §14 taxonomy (AUTHENTIC / EDITED / ENHANCED /
 * SUSPICIOUS_MANIPULATION / POTENTIAL_SYNTHETIC / UNKNOWN).
 *
 * Like the media authenticity engine, this module is PURE: the same payload
 * always produces the same read. The tracker's `trackingConsistency` and
 * `temporalConfidence` feed one authenticity component (§18 detector
 * consistency), which is what lets a spliced clip that loots a clean bitstream
 * still be caught by the tracker disagreeing with itself across frames.
 *
 * Everything is deterministic; a judge can recompute any score by hand from
 * the constants table and the payload.
 */

import {
  VISION_AUTHENTICITY_WEIGHTS,
  VISION_FORENSIC_SIGNAL_WEIGHTS,
  VISION_MANIPULATION_THRESHOLDS,
} from '../config/constants.js';
import type {
  VisualForensicAnalysis,
  VisualForensicSignals,
  VisualManipulationClass,
} from '../types/events.js';
import { clamp, round } from '../util/stats.js';

/** The tracker-derived inputs that contribute one authenticity component. */
export interface ForensicInput {
  /** Untouched raw payload of the clip observation. */
  payload: Record<string, unknown>;
  /** Object-persistence across frames, 0..1, from the tracker. */
  trackingConsistency: number;
  /** Inter-frame motion coherence, 0..1, from the tracker. */
  temporalConfidence: number;
}

/**
 * Read one normalized signal, 0..1, from either the structured
 * `forensicSignals` block the camera feed attaches or an explicit payload flag.
 */
function signal01(
  payload: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  const block = payload['forensicSignals'];
  if (typeof block === 'object' && block !== null) {
    const raw = (block as Record<string, unknown>)[key];
    if (typeof raw === 'number' && Number.isFinite(raw)) return clamp(raw, 0, 1);
    if (typeof raw === 'boolean') return raw ? 1 : 0;
  }
  return fallback;
}

/** Read an array-of-strings payload key safely. */
function strList(payload: Record<string, unknown>, key: string): string[] {
  const v = payload[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function str(payload: Record<string, unknown>, key: string, fallback: string): string {
  const v = payload[key];
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}

/** True when the payload declares an AI-generated or neural-packaged subject. */
function isSynthetic(payload: Record<string, unknown>): boolean {
  return (
    payload['deepfakeVideo'] === true ||
    payload['syntheticVideo'] === true ||
    payload['aiVideoGenerator'] === true
  );
}

/** True when the payload declares a benign enhancement (stabilize/upscale/grade). */
function hasBenignEdit(payload: Record<string, unknown>): boolean {
  return (
    payload['aiUpscaled'] === true ||
    payload['stabilized'] === true ||
    payload['denoised'] === true ||
    str(payload, 'compressionPattern', '').toLowerCase().includes('ppt') === false &&
      strList(payload, 'reEncodingHistory').some((line) =>
        /edit|crop|stabilize|denoise|upscale|color|grade/.test(line.toLowerCase()),
      )
  );
}

/**
 * §13 multi-signal read. Each signal is 0..1 where 1 means "anomaly strongly
 * present in this dimension". Raw payload signals win; the media payload
 * fields (deepfake flag, re-encode depth, synthetic compression fingerprint)
 * serve as fallbacks when the feed did not attach a structured block.
 */
export function analyzeForensicSignals(input: ForensicInput): VisualForensicSignals {
  const p = input.payload;

  const reencodes = strList(p, 'reEncodingHistory').length;
  const compressionPattern = str(p, 'compressionPattern', '').toLowerCase();
  const syntheticCompression =
    compressionPattern.includes('synthetic') || compressionPattern.includes('neural');

  const temporalAnomaly = signal01(p, 'temporalAnomaly', 0);
  const syntheticMediaSignal = signal01(p, 'syntheticMediaSignal', isSynthetic(p) ? 1 : 0);

  const signals: VisualForensicSignals = {
    compressionAnomaly: signal01(
      p,
      'compressionAnomaly',
      syntheticCompression ? 0.8 : reencodes >= 3 ? 0.45 : 0,
    ),
    frameAnomaly: signal01(
      p,
      'frameAnomaly',
      p['spliceDetected'] === true ? 0.8 : isSynthetic(p) ? 0.6 : 0,
    ),
    lightingAnomaly: signal01(p, 'lightingAnomaly', 0),
    temporalAnomaly,
    metadataAnomaly: signal01(p, 'metadataAnomaly', 0),
    syntheticMediaSignal,
    manipulationRisk: 0, // filled below
  };

  const w = VISION_FORENSIC_SIGNAL_WEIGHTS;
  signals.manipulationRisk = round(
    signals.compressionAnomaly * w.compression +
      signals.frameAnomaly * w.frame +
      signals.lightingAnomaly * w.lighting +
      temporalAnomaly * w.temporal +
      signals.metadataAnomaly * w.metadata +
      syntheticMediaSignal * w.synthetic,
    3,
  );

  return signals;
}

/**
 * §14 classification on `manipulationRisk` (0..1).
 *
 *   risk >= 0.55                                  -> POTENTIAL_SYNTHETIC
 *   risk >= 0.40                                  -> ENHANCED when the uplift
 *                                                      hypothesis dominates,
 *                                                      else SUSPICIOUS_MANIPULATION
 *   risk >= 0.20                                  -> SUSPICIOUS_MANIPULATION
 *   risk <  0.20 with a benign edit trace         -> EDITED
 *   risk <  0.20 otherwise                        -> AUTHENTIC
 *   no signals to assess at all                   -> UNKNOWN
 */
export function classifyVisualManipulation(
  risk: number,
  upliftConfidence: number,
  hasSignals: boolean,
  benignEdit: boolean,
): VisualManipulationClass {
  const t = VISION_MANIPULATION_THRESHOLDS;
  if (!hasSignals) return 'UNKNOWN';
  if (risk >= t.suspicious) return 'POTENTIAL_SYNTHETIC';
  if (risk >= t.enhanced) return upliftConfidence >= 0.5 ? 'ENHANCED' : 'SUSPICIOUS_MANIPULATION';
  if (risk >= t.authentic) return 'SUSPICIOUS_MANIPULATION';
  return benignEdit ? 'EDITED' : 'AUTHENTIC';
}

/**
 * §18 weighted authenticity score, 0..100. The weights table sums to 1.0:
 *
 *   technicalIntegrity  from the compression signal
 *   frameForensics      from the frame-level signal
 *   temporalConsistency from the media-level temporal signal
 *   detectorConsistency from the TRACKER's trackingConsistency (independent of
 *                        the bitstream — a spliced clip cannot hide from its
 *                        own object addressing)
 *   provenance          from the C2PA/device fingerprint state
 *   metadata            from the metadata signal
 */
export function computeVisualAuthenticity(
  signals: VisualForensicSignals,
  payload: Record<string, unknown>,
  trackingConsistency: number,
  temporalConfidence: number,
): number {
  const deviceFingerprint = str(payload, 'deviceFingerprint', '');
  const c2pa = payload['c2paManifestIntact'] === true;
  const provenance =
    c2pa
      ? 1
      : deviceFingerprint.includes('SYNTHETIC')
        ? 0.1
        : deviceFingerprint.length > 0
          ? 0.75
          : 0.55;

  const w = VISION_AUTHENTICITY_WEIGHTS;
  const authentic = round(
    (1 - signals.compressionAnomaly) * w.technicalIntegrity +
      (1 - signals.frameAnomaly) * w.frameForensics +
      (1 - signals.temporalAnomaly) * w.temporalConsistency +
      trackingConsistency * w.detectorConsistency +
      provenance * w.provenance +
      (1 - signals.metadataAnomaly) * w.metadata,
    3,
  );

  return round(clamp(authentic, 0, 1) * 100);
}

/** Human-readable artifact lines for the operator drawer. */
function buildIndicators(
  signals: VisualForensicSignals,
  trackingConsistency: number,
  temporalConfidence: number,
): string[] {
  const out: string[] = [];
  if (signals.syntheticMediaSignal >= 0.5) {
    out.push('Neural-generation packaging detected (no physical sensor chain)');
  }
  if (signals.compressionAnomaly >= 0.4) {
    out.push('Compression profile inconsistent with a single camera transcode');
  }
  if (signals.frameAnomaly >= 0.4) {
    out.push('Frame-level anomalies across the clip (nature check)');
  }
  if (signals.temporalAnomaly >= 0.4) {
    out.push('Inter-frame temporal incoherence consistent with splicing');
  }
  if (signals.lightingAnomaly >= 0.4) {
    out.push('Lighting vectors inconsistent across segments');
  }
  if (signals.metadataAnomaly >= 0.4) {
    out.push('Camera metadata (gains/timecode) inconsistent with the visuals');
  }
  if (trackingConsistency < 0.6) {
    out.push('Object addressing loses or gains identities across frames');
  }
  if (temporalConfidence < 0.6) {
    out.push('Object motion is not physically coherent frame to frame');
  }
  return out.slice(0, 6);
}

/** Full clip-level forensic read: signals + classification + authenticity. */
export function buildForensicAnalysis(input: ForensicInput): VisualForensicAnalysis {
  const signals = analyzeForensicSignals(input);

  const benignEdit =
    hasBenignEdit(input.payload) ||
    strList(input.payload, 'reEncodingHistory').some((line) => /edit/i.test(line));

  const hasSignals =
    signal01(input.payload, 'compressionAnomaly', -1) >= 0 ||
    signal01(input.payload, 'frameAnomaly', -1) >= 0 ||
    signal01(input.payload, 'lightingAnomaly', -1) >= 0 ||
    signal01(input.payload, 'temporalAnomaly', -1) >= 0 ||
    signal01(input.payload, 'metadataAnomaly', -1) >= 0 ||
    signal01(input.payload, 'syntheticMediaSignal', -1) >= 0;

  // Uplift = "the manipulation reads as benign enhancement" (stabilize, upscale,
  // grade). Clean authentic clips carry ~0; a heavily-tampered clip that still
  // claims enhancement is discounted by its own risk.
  const upliftConfidence = round(clamp(benignEdit ? 0.95 - signals.manipulationRisk : 0.08, 0, 1), 2);

  return {
    signals,
    classification: classifyVisualManipulation(
      signals.manipulationRisk,
      upliftConfidence,
      // A clip with no explicit signals AND no synthetic declaration is
      // genuinely unassessable, which the §14 taxonomy calls UNKNOWN.
      hasSignals || isSynthetic(input.payload),
      benignEdit,
    ),
    authenticityScore: computeVisualAuthenticity(
      signals,
      input.payload,
      input.trackingConsistency,
      input.temporalConfidence,
    ),
    indicators: buildIndicators(signals, input.trackingConsistency, input.temporalConfidence),
    upliftConfidence,
  };
}
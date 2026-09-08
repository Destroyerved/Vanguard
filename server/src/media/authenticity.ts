/**
 * VANGUARD — Media authenticity scoring engine.
 *
 * Implements the Golden Rule of the media authenticity flow:
 *
 *   NOT: "is this media AI-generated?"
 *   BUT: "How trustworthy is this media as evidence?" -> authenticityScore
 *        "Does the manipulation affect the evidentiary value?" -> category
 *        "Does other intelligence corroborate the event?" -> corroborationScore
 *
 * Three quantities are computed:
 *
 *   authenticityScore   how usable the media is as evidence, 0-100
 *   manipulationRisk    how much the checks believe it was manipulated, 0-100
 *   manipulationCategory the four-way verdict, refreshed by the fusion pipeline
 *
 * The category is deliberately NOT a binary real/fake. A deepfake video of an
 * event that really happened is HYBRID_CORROBORATED once radar or incident
 * intelligence places the same event at the same place and time — the media is
 * still weak evidence, but it stops being disinformation. Only the fusion
 * pipeline may change `corroborationScore` and hence the category, so the
 * verdict reacts to the full evidence picture, not to the clip alone.
 */

import {
  CORRELATION_RADIUS_METERS,
  MEDIA_AUTHENTICITY_TERM,
  MEDIA_CATEGORY_THRESHOLDS,
  MEDIA_SCORE_BLEND,
  SOURCE_RELIABILITY,
} from '../config/constants.js';
import type {
  ManipulationCategory,
  MediaAuthenticityAudit,
  MediaCheckId,
  MediaCheckResult,
  MediaFinding,
  UnifiedEvent,
} from '../types/events.js';
import { haversineMeters } from '../util/geo.js';
import { clamp, round } from '../util/stats.js';
import { nowIso } from '../util/time.js';
import {
  buildProvenanceChain,
  extractForensicMetadata,
  payloadFindings,
} from './metadata.js';
import {
  analyzeAcousticSpectrum,
  analyzeCameraCharacteristics,
  analyzeTemporalConsistency,
  analyzeVisualFrames,
  runMediaChecks,
} from './forensics.js';

/** Checks that speak to PROVENANCE (can the chain be trusted at all). */
const PROVENANCE_CHECK_IDS: readonly MediaCheckId[] = [
  'provenance-c2pa',
  'bitstream-container',
  'edit-origin',
];

/** Checks that speak to CONTENT (was the subject itself synthesized). */
const CONTENT_CHECK_IDS: readonly MediaCheckId[] = [
  'visual-frame',
  'temporal-consistency',
  'acoustic-spectrum',
  'sensor-prnu',
];

/** Weighted mean over the given checks, normalized over applicable ones. */
function weightedMean(checks: MediaCheckResult[], ids: readonly MediaCheckId[]): number {
  const applicable = checks.filter((c) => ids.includes(c.id) && c.applicable);
  if (applicable.length === 0) return 100; // nothing to see: no evidence of tampering
  const totalW = applicable.reduce((s, c) => s + c.weight, 0);
  if (totalW === 0) return 100;
  return applicable.reduce((s, c) => s + c.score * c.weight, 0) / totalW;
}

/** Aggregate the seven per-check scores into the three headline metrics. */
export function aggregateMediaScores(checks: MediaCheckResult[]): {
  provenanceScore: number;
  contentScore: number;
  aiSyntheticScore: number;
} {
  const provenanceScore = weightedMean(checks, PROVENANCE_CHECK_IDS);
  const contentScore = weightedMean(checks, CONTENT_CHECK_IDS);

  // AI-synthetic evidence is the CONTENT group's inverted score: perfect
  // content consistency means zero synthetic evidence.
  const applicableContent = checks.filter((c) => CONTENT_CHECK_IDS.includes(c.id) && c.applicable);
  const totalW = applicableContent.reduce((s, c) => s + c.weight, 0);
  const meanSynthetic =
    totalW === 0
      ? 0
      : applicableContent.reduce((s, c) => s + (100 - c.score) * c.weight, 0) / totalW;

  // "Several independent detectors, not one classifier": the strongest SINGLE
  // detector carries weight too, so one baseline-certain signal (a 91%
  // voice-clone probability, a PRNU chain with no physical sensor) is not
  // drowned out by the clean dimensions of the same clip. Without this, a
  // cloned-voice-over-real-footage clip would read as a benign edit because
  // its faces and motion are genuine.
  const strongestSignal = applicableContent.reduce(
    (best, c) => Math.max(best, 100 - c.score),
    0,
  );
  const aiSyntheticScore = Math.max(meanSynthetic, (meanSynthetic + strongestSignal) / 2);

  return { provenanceScore, contentScore, aiSyntheticScore };
}

/**
 * Four-way classification. The `aiSynthetic` and `provenance` halves are fixed
 * by forensics; `corroboration` is the live quantity the fusion pipeline feeds
 * in, which is why this is a pure function of its inputs.
 *
 * The rules encode the flow's core discriminator: legitimate editing of a real
 * capture is a DIFFERENT beast from content that fabricates an event. Anything
 * strongly synthetic is fabrication unless the underlying event is corroborated;
 * detected-but-legitimate editing (cut, crop, grade, stabilize, upscale) is
 * LEGITIMATE_ENHANCEMENT; stripped provenance with nothing else is honest
 * uncertainty, never a silent discard.
 */
export function classifyManipulation(
  aiSyntheticScore: number,
  provenanceScore: number,
  corroborationScore: number,
  hasLegitimateEditing = false,
): ManipulationCategory {
  const { syntheticHigh, syntheticModerate, provenanceBroken, corroborationStrong, corroborationWeak } =
    MEDIA_CATEGORY_THRESHOLDS;

  // Strong AI-synthetic evidence: the media can depict a non-event. The only
  // thing that saves it is independent corroboration of the underlying event.
  if (aiSyntheticScore >= syntheticHigh) {
    return corroborationScore >= corroborationStrong
      ? 'HYBRID_CORROBORATED'
      : 'EVENT_FABRICATING';
  }

  // Moderate synthetic evidence — the strongest-single-detector rule means this
  // is already real fabrication (a cloned voice, a PRNU chain with no sensor),
  // not a re-encode artefact. Same hostage takes.
  if (aiSyntheticScore >= syntheticModerate) {
    return corroborationScore >= corroborationStrong
      ? 'HYBRID_CORROBORATED'
      : 'EVENT_FABRICATING';
  }

  // Provenance broken AND nothing corroborates: honestly cannot tell. If a
  // legitimate edit was detected the chain is explained, so uncertainty applies
  // only to genuinely unexplained provenance.
  if (provenanceScore < provenanceBroken && corroborationScore < corroborationWeak) {
    return 'AUTHENTICITY_UNVERIFIED';
  }

  // Legitimate editing found, or provenance weakened by editing/hosting while
  // the content itself is clean.
  if (hasLegitimateEditing || provenanceScore < 60) {
    return 'LEGITIMATE_ENHANCEMENT';
  }

  return 'NONE_DETECTED';
}

/**
 * How strongly other VANGUARD intelligence corroborates a media event, 0-100.
 *
 * Purposefully coarse: the count of DISTINCT source types beyond the media's
 * own (0 -> 0, 1 -> 25, 2 -> 50, 3 -> 75, 4+ -> 100) blended with the mean
 * spatial proximity of those corroborators. Distance matters because a sensor
 * return 4.9km away barely confirms a clip "near" a sector centre. This is the
 * quantity the classification and the briefing both consume, so it must not be
 * any easier to inflate than the confidence formula itself.
 */
export function mediaCorroborationScore(
  event: UnifiedEvent,
  corroborators: UnifiedEvent[],
): number {
  if (corroborators.length === 0) return 0;

  const distinct = new Set<UnifiedEvent['sourceType']>([event.sourceType]);
  for (const c of corroborators) distinct.add(c.sourceType);
  const countScore = Math.min(100, (distinct.size - 1) * 25);

  let proximity = 0;
  for (const c of corroborators) {
    const d = haversineMeters(event.location, c.location);
    proximity += clamp(1 - d / CORRELATION_RADIUS_METERS, 0, 1);
  }
  proximity /= corroborators.length;

  return Math.round(countScore * (0.6 + 0.4 * proximity));
}

/**
 * The Golden-Rule confidence term for a media event, 0..1. At or below the
 * risk floor the factor is exactly 1 (no penalty). Above it, manipulation risk
 * is projected linearly into [MEDIA_AUTHENTICITY_TERM.capFactor, 1] — a fully
 * fabricated item is discounted but NEVER zeroed or discarded.
 */
export function mediaAuthenticityFactor(audit: MediaAuthenticityAudit): number {
  const risk = audit.manipulationRisk / 100;
  const { windowFloor, capFactor } = MEDIA_AUTHENTICITY_TERM;
  if (risk <= windowFloor) return 1;
  const t = (risk - windowFloor) / (1 - windowFloor);
  return round(1 - (1 - capFactor) * t, 4);
}

/** Flatten every finding across the applicable checks into the artifact list. */
function collectFindings(checks: MediaCheckResult[]): MediaFinding[] {
  return checks.filter((c) => c.applicable).flatMap((c) => c.findings);
}

/** Human-readable statement of what survives the media regardless of tampering. */
function factualCore(aiSyntheticScore: number, provenanceScore: number): string {
  if (aiSyntheticScore >= MEDIA_CATEGORY_THRESHOLDS.syntheticHigh) {
    return 'Synthetic packaging: the media itself cannot establish the event. Only independent corroboration can place the described event in reality.';
  }
  if (aiSyntheticScore >= MEDIA_CATEGORY_THRESHOLDS.syntheticModerate) {
    return 'Partially synthetic packaging (synthesized audio/enhancement over captured footage). The underlying capture, if any, is a candidate fact awaiting corroboration.';
  }
  if (provenanceScore < MEDIA_CATEGORY_THRESHOLDS.provenanceBroken) {
    return 'Provenance is broken or stripped. Treat any specific factual claim with caution until a second source confirms it.';
  }
  return 'Hardware-captured media with intact provenance; treat as authentic evidence until contradicted.';
}

/**
 * Evaluate one media event end to end: metadata -> forensics -> aggregate ->
 * classification. Called by the normalizers. Corroboration starts at 0; the
 * fusion pipeline refreshes it and reclassifies via `refreshAuditCorroboration`.
 */
export function evaluateMediaAuthenticity(
  event: UnifiedEvent,
  effectiveReliability?: number,
): MediaAuthenticityAudit {
  const metadata = extractForensicMetadata(event);
  const provenanceChain = buildProvenanceChain(metadata.reEncodingHistory);
  const checks = runMediaChecks(event, metadata, provenanceChain);

  const { provenanceScore, contentScore, aiSyntheticScore } = aggregateMediaScores(checks);
  const blend = MEDIA_SCORE_BLEND;

  const authenticityScore = round(
    provenanceScore * blend.provenanceWeight + contentScore * blend.contentWeight,
  );
  const manipulationRisk = round(
    aiSyntheticScore * blend.syntheticWeight + (100 - provenanceScore) * blend.provenanceLossWeight,
  );

  const mediaKind = typeof event.raw.mediaKind === 'string' ? event.raw.mediaKind : 'video';
  const hasAudio =
    mediaKind === 'audio' || event.raw.audioTrack === true || metadata.audioCodec !== 'N/A';

  const legitEditingDetected = checks.some(
    (c) => c.id === 'edit-origin' && c.findings.some((f) => f.code === 'LEGIT_EDIT_PRESENT'),
  );

  const audit: MediaAuthenticityAudit = {
    evaluatedAt: nowIso(),
    authenticityScore,
    manipulationRisk,
    manipulationCategory: classifyManipulation(aiSyntheticScore, provenanceScore, 0, legitEditingDetected),
    aiSyntheticScore: round(aiSyntheticScore),
    provenanceScore: round(provenanceScore),
    intrinsicConsistency: round(100 - aiSyntheticScore),
    corroborationScore: 0,
    deepfakeArtifacts: [
      ...collectFindings(checks),
      ...payloadFindings(event, 'visualArtifacts', 'acousticArtifacts'),
    ],
    factualCoreExtracted: factualCore(aiSyntheticScore, provenanceScore),
    provenanceChain,
    sourceReliability: effectiveReliability ?? SOURCE_RELIABILITY[event.sourceType] ?? 0.5,
    checks,
    metadata,
    visualFrames: mediaKind === 'video' ? analyzeVisualFrames(event) : undefined,
    temporalConsistency: mediaKind === 'video' ? analyzeTemporalConsistency(event) : undefined,
    acousticSpectrum: hasAudio ? analyzeAcousticSpectrum(event) : undefined,
    cameraCharacteristics: mediaKind === 'video' ? analyzeCameraCharacteristics(event) : undefined,
  };

  return audit;
}

/**
 * Recompute the corroboration-dependent half of an audit. The fusion pipeline
 * calls this during scoring, where the resolved corroborators are known. It
 * mutates the audit in place because the same audit object is exposed across
 * every API surface.
 */
export function refreshAuditCorroboration(
  audit: MediaAuthenticityAudit,
  event: UnifiedEvent,
  corroborators: UnifiedEvent[],
): MediaAuthenticityAudit {
  audit.corroborationScore = mediaCorroborationScore(event, corroborators);
  const legitEditingDetected = audit.checks.some(
    (c) => c.id === 'edit-origin' && c.findings.some((f) => f.code === 'LEGIT_EDIT_PRESENT'),
  );
  audit.manipulationCategory = classifyManipulation(
    audit.aiSyntheticScore,
    audit.provenanceScore,
    audit.corroborationScore,
    legitEditingDetected,
  );
  return audit;
}
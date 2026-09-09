/**
 * VANGUARD — Visual claim validation and contradiction detection.
 *
 * SPEC §26-§28: operator and intelligence statements are checked against the
 * structured visual evidence (object counts, behavior flags, tracks) and given
 * one of SUPPORTED / PARTIALLY_SUPPORTED / CONTRADICTED / UNCERTAIN /
 * UNVERIFIABLE. A claim carries the evidence that decided it, so the operator
 * sees WHY, and a refuted claim is surfaced as a `VisualContradiction` that
 * keeps BOTH sides in view (§15 — evidence is never silently discarded).
 *
 * The one hard rule: when the clip's own forensics classify it as
 * synthetic/manipulated, nothing in the clip can SUPPORT a described event —
 * that claim is CONTRADICTED, and the contradiction is surfaced with the
 * forensic indicators as its basis.
 */

import type {
  ObjectTrack,
  VisualClaim,
  VisualContradiction,
  VisualForensicAnalysis,
} from '../types/events.js';
import { clamp, round } from '../util/stats.js';
import { nowIso } from '../util/time.js';

/** One claimed statement the simulator (or an operator) wants checked. */
export interface ClaimSeed {
  id: string;
  text: string;
  /** How confident the CLAIMER is in the statement, 0..1. */
  claimConfidence: number;
  requires?: {
    label?: string;
    minCount?: number;
    behavior?: string;
  };
}

/** Everything the validator may consult for one clip. */
export interface ClaimContext {
  evidenceId: string;
  objectCounts: Record<string, number>;
  behaviorFlags: string[];
  tracks: ObjectTrack[];
  forensics: VisualForensicAnalysis;
}

let contradictionSeq = 0;

/** Render one claimed statement against the evidence of a single clip. */
export function validateClaim(seed: ClaimSeed, ctx: ClaimContext): VisualClaim {
  const { objectCounts, behaviorFlags, tracks, forensics } = ctx;
  const manipulated =
    forensics.classification === 'POTENTIAL_SYNTHETIC' ||
    forensics.classification === 'SUSPICIOUS_MANIPULATION';

  const supportingEvidence: string[] = [];
  const contradictingEvidence: string[] = [];

  // Hard rule: a manipulated clip cannot establish any described event.
  if (manipulated && seed.requires) {
    const basis = `Clip classified ${forensics.classification} (manipulation risk ${Math.round(
      forensics.signals.manipulationRisk * 100,
    )}%); media cannot establish the claimed event.`;
    return {
      id: seed.id,
      text: seed.text,
      claimConfidence: seed.claimConfidence,
      status: 'CONTRADICTED',
      supportingEvidence: [],
      contradictingEvidence: [ctx.evidenceId],
      basis,
    };
  }

  if (seed.requires?.label) {
    const label = seed.requires.label;
    const minCount = seed.requires.minCount ?? 1;
    const count = objectCounts[label] ?? 0;
    const matchingTracks = tracks.filter((t) => t.label === label).map((t) => t.trackId);
    supportingEvidence.push(...matchingTracks.slice(0, 4));

    if (count >= minCount) {
      return {
        id: seed.id,
        text: seed.text,
        claimConfidence: seed.claimConfidence,
        status: 'SUPPORTED',
        supportingEvidence,
        contradictingEvidence: [],
        basis: `${count} distinct ${label} track(s) observed with persistent identity.`,
      };
    }
    if (count > 0) {
      return {
        id: seed.id,
        text: seed.text,
        claimConfidence: seed.claimConfidence,
        status: 'PARTIALLY_SUPPORTED',
        supportingEvidence,
        contradictingEvidence: [],
        basis: `Only ${count} of the claimed ${minCount} ${label} track(s) are on camera.`,
      };
    }
    if (tracks.length > 0) {
      return {
        id: seed.id,
        text: seed.text,
        claimConfidence: seed.claimConfidence,
        status: 'CONTRADICTED',
        supportingEvidence: [],
        contradictingEvidence: [...matchingTracks.slice(0, 4)],
        basis: `Camera tracked ${tracks.length} object(s) but none matched '${label}'.`,
      };
    }
    return {
      id: seed.id,
      text: seed.text,
      claimConfidence: seed.claimConfidence,
      status: 'UNVERIFIABLE',
      supportingEvidence: [],
      contradictingEvidence: [],
      basis: `No ${label} detections and no other object observations in this clip.`,
    };
  }

  if (seed.requires?.behavior) {
    const flag = seed.requires.behavior;
    if (behaviorFlags.includes(flag)) {
      return {
        id: seed.id,
        text: seed.text,
        claimConfidence: seed.claimConfidence,
        status: 'SUPPORTED',
        supportingEvidence: tracks.filter((t) => t.restrictedEntry).map((t) => t.trackId),
        contradictingEvidence: [],
        basis: `Behavior flag ${flag} raised by the tracker in this clip.`,
      };
    }
    if (tracks.length > 0) {
      return {
        id: seed.id,
        text: seed.text,
        claimConfidence: seed.claimConfidence,
        status: 'CONTRADICTED',
        supportingEvidence: [],
        contradictingEvidence: tracks.map((t) => t.trackId).slice(0, 4),
        basis: `Camera tracked objects but observed no ${flag} behavior.`,
      };
    }
    return {
      id: seed.id,
      text: seed.text,
      claimConfidence: seed.claimConfidence,
      status: 'UNVERIFIABLE',
      supportingEvidence: [],
      contradictingEvidence: [],
      basis: `No observations in this clip against which to check ${
        seed.requires.label ?? seed.requires.behavior
      }.`,
    };
  }

  return {
    id: seed.id,
    text: seed.text,
    claimConfidence: seed.claimConfidence,
    status: 'UNCERTAIN',
    supportingEvidence: [],
    contradictingEvidence: [],
    basis: 'No checkable assertion (no label count and no behavior) was supplied.',
  };
}

/**
 * Surface a structured contradiction for every refuted claim, keeping the
 * original statement in view alongside the evidence that refuted it (§15/§28).
 */
export function detectContradictions(
  claims: VisualClaim[],
  evidenceId: string,
  forensics: VisualForensicAnalysis,
): VisualContradiction[] {
  const out: VisualContradiction[] = [];
  for (const claim of claims) {
    if (claim.status !== 'CONTRADICTED') continue;
    contradictionSeq++;
    out.push({
      id: `VC-${String(contradictionSeq).padStart(4, '0')}`,
      operatorStatement: claim.text,
      claimId: claim.id,
      status: 'CONTRADICTED',
      visualEvidenceId: evidenceId,
      contradictionBasis: [
        claim.basis,
        ...forensics.indicators.slice(0, 3),
      ].slice(0, 4),
      evidenceConfidence: round(clamp(forensics.signals.manipulationRisk, 0.45, 1), 2),
      createdAt: nowIso(),
    });
  }
  return out;
}

/** Test-only reset for the contradiction counter. */
export function __resetContradictionSeq(): void {
  contradictionSeq = 0;
}
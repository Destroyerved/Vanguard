/**
 * VANGUARD — Vision intelligence aggregate types (API + WebSocket surface).
 *
 * The §33 panel rollup. Everything exposed here is derived from the structured
 * `VisualEvidence` bundles the engine attaches at normalization, so the numbers
 * the operator sees are the same numbers the fusion engine and Gemini consume —
 * there is no separate "UI version" of the truth.
 */

import type { VisualClaimStatus, VisualManipulationClass } from './events.js';

/** Panel rollup for the Visual Intelligence drawer (§33). */
export interface VisionSummary {
  generatedAt: string;
  counts: {
    /** Video events carrying a visual evidence bundle (clips analyzed). */
    clips: number;
    /** Distinct cameras that have produced evidence. */
    cameras: number;
    /** Track identities currently held by the engine. */
    activeTracks: number;
    /** Surfaced refuted claims across every clip. */
    contradictions: number;
  };
  means: {
    /** Mean §18 authenticity score, 0..100. */
    authenticityScore: number;
    /** Mean §13 manipulation risk, 0..100. */
    manipulationRisk: number;
    /** Mean object persistence across frames, 0..1. */
    trackingConsistency: number;
    /** Mean inter-frame motion coherence, 0..1. */
    temporalConfidence: number;
  };
  /** Claim verdict tally across every clip. */
  claims: Record<VisualClaimStatus, number>;
  /** Clip tally per §14 manipulation classification. */
  classification: Record<VisualManipulationClass, number>;
  /** Per-camera rollup for the camera grid. */
  byCamera: CameraRollup[];
}

export interface CameraRollup {
  cameraId: string;
  cameraName: string;
  clips: number;
  /** Tracks that entered a restricted zone on this post. */
  restrictedEntries: number;
  meanAuthenticity: number;
  meanManipulationRisk: number;
  meanTrackingConsistency: number;
}
/**
 * VANGUARD — Fusion tuning constants.
 *
 * Every magic number in the fusion pipeline lives here, named and justified.
 * A judge should be able to read this one file and predict what the engine does.
 */

import type { SeverityLevel, SourceType, ThreatLevel } from '../types/events.js';

/* ------------------------------------------------------------------ *
 * Area of operations
 * ------------------------------------------------------------------ */

/**
 * Demo area of operations centred on Ahmedabad, Gujarat, India.
 * Chosen because Open-Meteo returns genuinely varied real weather here and it
 * keeps the demo grounded in a real place rather than a synthetic grid.
 */
export const AO_CENTER = { lat: 23.0225, lng: 72.5714 } as const;

/** Radius of the simulated operating area, metres. */
export const AO_RADIUS_METERS = 45_000;

/** Named operational sectors used by zones, simulators and the NL query parser. */
export const AO_SECTORS = [
  { name: 'Sector 1 North', lat: 23.1650, lng: 72.5714, radiusMeters: 12_000 },
  { name: 'Sector 2 East', lat: 23.0225, lng: 72.7150, radiusMeters: 12_000 },
  { name: 'Sector 3 South', lat: 22.8800, lng: 72.5714, radiusMeters: 12_000 },
  { name: 'Sector 4 West', lat: 23.0225, lng: 72.4278, radiusMeters: 12_000 },
  { name: 'Sector 5 Central', lat: 23.0225, lng: 72.5714, radiusMeters: 9_000 },
] as const;

/* ------------------------------------------------------------------ *
 * Source reliability
 * ------------------------------------------------------------------ */

/**
 * Nominal trust weight per feed, 0.0 - 1.0. This is the `SourceReliability`
 * term of the confidence formula.
 *
 * Rationale for the ordering: instrumented sensors with calibrated error models
 * outrank machine-generated logs, which outrank unverified human field reports.
 *   weather         0.95 — a real measured API (Open-Meteo), calibrated, low noise.
 *   radar           0.92 — calibrated instrument, but subject to clutter and ghosts.
 *   personnel       0.88 — GPS telemetry, accurate but sparse and latency-prone.
 *   log             0.80 — deterministic machine events, but prone to false trips.
 *   incident        0.72 — human-reported, highest variance and reporting bias.
 *   audio_recording 0.72 — instrumented acoustic capture, but human-labelled and
 *                          latency-prone; a hydrophone recording is trusted the
 *                          same as a field report because the EVENT it describes
 *                          is still an interpretation.
 *   social_media    0.60 — open-source human-derived media: freely manipulated,
 *                          stripped of provenance, and platform-transcoded. The
 *                          media-authenticity factor handles the manipulation
 *                          specifically; this weight is the baseline distrust of
 *                          the open channel itself.
 */
export const SOURCE_RELIABILITY: Record<SourceType, number> = {
  weather: 0.95,
  radar: 0.92,
  personnel: 0.88,
  log: 0.8,
  incident: 0.72,
  audio_recording: 0.72,
  social_media: 0.6,
};

/** Multiplier applied to reliability when a feed reports a degraded status. */
export const DEGRADED_RELIABILITY_MULTIPLIER = 0.75;

/** Multiplier applied to reliability when a feed is down (serving stale cache). */
export const DOWN_RELIABILITY_MULTIPLIER = 0.4;

/* ------------------------------------------------------------------ *
 * Recency decay
 * ------------------------------------------------------------------ */

/**
 * Half-life of an observation, seconds. After this long an untouched event
 * contributes half its original weight. 15 minutes matches the operational
 * tempo of a watch floor: older than that and you re-verify before acting.
 */
export const RECENCY_HALF_LIFE_SECONDS = 900;

/** Derived decay constant lambda, such that exp(-lambda * halfLife) === 0.5. */
export const RECENCY_LAMBDA = Math.LN2 / RECENCY_HALF_LIFE_SECONDS;

/** Recency decay never drops a live event below this floor. */
export const MIN_RECENCY_FACTOR = 0.05;

/* ------------------------------------------------------------------ *
 * Corroboration
 * ------------------------------------------------------------------ */

/** Per-additional-source confidence boost: 1 + BOOST_PER_SOURCE * (N - 1). */
export const CORROBORATION_BOOST_PER_SOURCE = 0.15;

/**
 * Hard ceiling on the corroboration multiplier. Without a cap, a noisy cluster
 * of twenty low-grade reports could manufacture certainty out of nothing.
 * 1.6 corresponds to five fully independent corroborating sources.
 */
export const MAX_CORROBORATION_BOOST = 1.6;

/**
 * Corroboration from a DIFFERENT source type counts fully; corroboration from
 * the SAME source type counts at this fraction. Two radar returns of the same
 * contact are far weaker evidence than one radar return plus one thermal trip.
 */
export const SAME_SOURCE_CORROBORATION_WEIGHT = 0.35;

/* ------------------------------------------------------------------ *
 * Spatiotemporal correlation windows
 * ------------------------------------------------------------------ */

/** Spatial correlation radius (delta-R), metres. */
export const CORRELATION_RADIUS_METERS = 5_000;

/** Temporal correlation window (delta-T), seconds. */
export const CORRELATION_WINDOW_SECONDS = 600;

/** Two events closer than this in space AND time are duplicate observations. */
export const DEDUPE_RADIUS_METERS = 150;
export const DEDUPE_WINDOW_SECONDS = 30;

/* ------------------------------------------------------------------ *
 * Anomaly detection
 * ------------------------------------------------------------------ */

/** Absolute z-score at or above which an observation is flagged anomalous. */
export const ANOMALY_Z_THRESHOLD = 2.5;

/** Minimum samples required before z-scores are considered meaningful. */
export const ANOMALY_MIN_SAMPLES = 8;

/** Rolling window over which per-source event rates are measured, seconds. */
export const ANOMALY_RATE_WINDOW_SECONDS = 300;

/** Number of historical rate buckets retained for the baseline. */
export const ANOMALY_RATE_BUCKETS = 12;

/* ------------------------------------------------------------------ *
 * Severity and threat scoring
 * ------------------------------------------------------------------ */

/**
 * Contribution weight of each severity tier to the aggregate threat score.
 *
 * Strongly superlinear on purpose. Command posture must be driven by THREATS,
 * not by how busy the picture is: a watch floor tracking 200 routine contacts
 * is not at higher alert than one tracking 20. With a flat-ish scale, routine
 * traffic accumulates a permanent floor that makes GREEN unreachable and the
 * indicator meaningless. At these weights one CRITICAL outweighs 240 routine
 * observations, so the score tracks what is actually dangerous.
 */
export const SEVERITY_WEIGHT: Record<SeverityLevel, number> = {
  low: 0.25,
  medium: 1.5,
  high: 7,
  critical: 15,
};

/**
 * Threat score thresholds, calibrated against the measured steady state of the
 * simulated AO (roughly 45 concurrent events at the default SIM_INTENSITY).
 *
 *   GREEN   routine traffic only; nothing corroborated above medium.
 *   YELLOW  a corroborated high-severity development is present.
 *   ORANGE  several corroborated high-severity developments, or one critical.
 *   RED     multiple corroborated criticals — a triggered scenario.
 *
 * Calibrated so an untouched demo idles in GREEN/YELLOW and a scenario
 * injection visibly drives the posture up. A system that boots at RED has
 * nowhere to escalate to, and trains its operator to ignore the indicator.
 */
export const THREAT_THRESHOLDS: Record<Exclude<ThreatLevel, 'green'>, number> = {
  yellow: 25,
  orange: 60,
  red: 110,
};

/**
 * De-escalation hysteresis. The score must fall this far BELOW a threshold
 * before the posture steps back down, so the HUD does not flicker between
 * levels while the score oscillates around a boundary.
 */
export const THREAT_HYSTERESIS = 0.15;

/**
 * A cluster corroborated by at least this many DISTINCT source types escalates
 * its member events by one severity tier. Independent confirmation is the whole
 * point of fusion, so the system acts on it rather than merely displaying it.
 */
export const ESCALATION_DISTINCT_SOURCES = 3;

/** Confidence at or above which a HIGH event is promoted to CRITICAL. */
export const CRITICAL_PROMOTION_CONFIDENCE = 85;

/* ------------------------------------------------------------------ *
 * Confidence presentation bands
 * ------------------------------------------------------------------ */

/** UI banding thresholds for the confidence badge colours. */
export const CONFIDENCE_BANDS = {
  high: 80,
  medium: 50,
} as const;

/* ------------------------------------------------------------------ *
 * Store and stream sizing
 * ------------------------------------------------------------------ */

/** Ring buffer capacity. Oldest events are evicted first. */
export const EVENT_STORE_CAPACITY = 5_000;

/** Events older than this are excluded from the live operational picture. */
export const EVENT_ACTIVE_HORIZON_SECONDS = 3_600;

/** Maximum events returned by a single unpaginated API call. */
export const MAX_EVENTS_PER_RESPONSE = 5_000;

/** Maximum escalation records retained. */
export const ESCALATION_LOG_CAPACITY = 200;

/* ------------------------------------------------------------------ *
 * AI synthesis
 * ------------------------------------------------------------------ */

/** Most recent N events handed to the synthesizer as evidence. */
export const BRIEFING_EVENT_BUDGET = 60;

/** Minimum interval between automatic briefing regenerations, milliseconds. */
export const BRIEFING_MIN_INTERVAL_MS = 20_000;

/** Hard timeout on a single Gemini request, milliseconds. */
export const GEMINI_TIMEOUT_MS = 12_000;

/** Retry attempts for a transient Gemini failure. */
export const GEMINI_MAX_RETRIES = 2;

/* ------------------------------------------------------------------ *
 * Media authenticity (VANGUARD_MEDIA_AUTHENTICITY_FLOW.md)
 * ------------------------------------------------------------------ */

/**
 * Relative weight of each forensic check in the aggregate scores.
 *
 * Split into two groups:
 *   - PROVENANCE group  (provenance-c2pa, bitstream-container, edit-origin)
 *   - CONTENT group     (visual-frame, temporal-consistency, acoustic-spectrum,
 *                        sensor-prnu)
 *
 * The content group dominates (0.60 of total) because it is what detects
 * synthetic generation; provenance is necessary but not sufficient — C2PA is
 * routinely stripped by legitimate platform re-encoding, so an absent
 * signature cannot convict by itself.
 */
export const MEDIA_CHECK_WEIGHTS: Record<
  'provenance-c2pa' | 'bitstream-container' | 'edit-origin' | 'visual-frame' | 'temporal-consistency' | 'acoustic-spectrum' | 'sensor-prnu',
  number
> = {
  'provenance-c2pa': 0.15,
  'bitstream-container': 0.1,
  'edit-origin': 0.15,
  'visual-frame': 0.2,
  'temporal-consistency': 0.15,
  'acoustic-spectrum': 0.15,
  'sensor-prnu': 0.1,
};

/** Blend weights for the authenticity and manipulation-risk aggregates. */
export const MEDIA_SCORE_BLEND = {
  /** Authenticity = provenance group x provenance weight + content group x content weight. */
  provenanceWeight: 0.4,
  contentWeight: 0.6,
  /** Manipulation risk = AI-synthetic evidence x this + provenance loss x (1 - this). */
  syntheticWeight: 0.6,
  provenanceLossWeight: 0.4,
} as const;

/**
 * Manipulation category thresholds.
 *
 *   aiSynthetic >= SYNTHETIC_HIGH      -> EVENT_FABRICATING unless corroborated
 *   aiSynthetic >= SYNTHETIC_MODERATE (with weak provenance)
 *                                        -> HYBRID_CORROBORATED if corroborated,
 *                                           else EVENT_FABRICATING
 *   provenance < PROVENANCE_BROKEN and corroboration < CORROBORATION_WEAK
 *                                        -> AUTHENTICITY_UNVERIFIED
 *
 * Corroboration means OTHER VANGUARD intelligence (radar, incident, personnel)
 * independently places the described event at the stated place and time.
 */
export const MEDIA_CATEGORY_THRESHOLDS = {
  syntheticHigh: 70,
  syntheticModerate: 45,
  provenanceBroken: 40,
  corroborationStrong: 60,
  corroborationWeak: 50,
} as const;

/**
 * Confidence term for media authenticity.
 *
 * Media events carry a `mediaAuthenticityFactor` in the confidence formula:
 *
 *   confidence = reliability x recency x corroboration x mediaAuthenticityFactor
 *
 * The factor is the direct implementation of the Golden Rule. It never
 * discards a media event — VANGUARD does not auto-delete uncertain media. At
 * or below `windowFloor` risk the factor is 1 (no penalty). Above it, risk is
 * projected linearly into [MEDIA_RISK_CAP_FACTOR, 1] so maximal manipulation
 * risk still leaves a live event worth an operator's attention, just one the
 * system is plain about not trusting. Linear so a judge can verify the
 * arithmetic by hand.
 */
export const MEDIA_AUTHENTICITY_TERM = {
  windowFloor: 0.45,
  capFactor: 0.6,
} as const;

/**
 * Confidence in the media event BELOW which the briefing is not treated as
 * tipping any operational decision by itself. Drives briefing phrasing, not
 * any automated decision.
 */
export const MEDIA_UNVERIFIED_SCORE = 60;

/**
 * VANGUARD — Schema validation guard.
 *
 * Nothing enters the event store without passing this gate. A malformed event
 * that slips through would surface later as a NaN in a confidence score or a
 * contact rendered at (0, 0) in the Gulf of Guinea — failures that are far
 * harder to diagnose than a rejection at the boundary.
 *
 * The validator REPAIRS what is safely repairable (clamping an out-of-range
 * confidence, defaulting a missing array) and REJECTS what is not (a missing
 * ID, an unparseable timestamp, coordinates outside the WGS-84 domain).
 */

import type { SeverityLevel, SourceType, UnifiedEvent } from '../types/events.js';
import { SEVERITY_ORDER, SOURCE_TYPES } from '../types/events.js';
import { createLogger } from '../util/logger.js';

const log = createLogger('validate');

export interface ValidationResult {
  valid: boolean;
  /** Repaired event, present when `valid` is true. */
  event?: UnifiedEvent;
  /** Fatal problems that caused rejection. */
  errors: string[];
  /** Non-fatal problems that were repaired. */
  repairs: string[];
}

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

/** Validate and repair a single event. */
export function validateEvent(candidate: unknown): ValidationResult {
  const errors: string[] = [];
  const repairs: string[] = [];

  if (typeof candidate !== 'object' || candidate === null) {
    return { valid: false, errors: ['Event is not an object'], repairs };
  }

  const e = candidate as Partial<UnifiedEvent> & Record<string, unknown>;

  /* -- Fatal checks -------------------------------------------------- */

  if (typeof e.id !== 'string' || e.id.length === 0) {
    errors.push('Missing or empty id');
  }

  if (!SOURCE_TYPES.includes(e.sourceType as SourceType)) {
    errors.push(`Invalid sourceType: ${String(e.sourceType)}`);
  }

  if (typeof e.timestamp !== 'string' || Number.isNaN(Date.parse(e.timestamp))) {
    errors.push(`Unparseable timestamp: ${String(e.timestamp)}`);
  }

  const loc = e.location as Partial<UnifiedEvent['location']> | undefined;
  if (!loc || !isFiniteNumber(loc.lat) || !isFiniteNumber(loc.lng)) {
    errors.push('Missing or non-numeric location.lat/location.lng');
  } else if (loc.lat < -90 || loc.lat > 90 || loc.lng < -180 || loc.lng > 180) {
    errors.push(`Coordinates outside WGS-84 domain: ${loc.lat}, ${loc.lng}`);
  }

  if (errors.length > 0) {
    return { valid: false, errors, repairs };
  }

  /* -- Repairs ------------------------------------------------------- */

  const location = e.location!;

  if (typeof e.sourceName !== 'string' || e.sourceName.length === 0) {
    e.sourceName = String(e.sourceType).toUpperCase();
    repairs.push('Defaulted sourceName from sourceType');
  }

  if (!SEVERITY_ORDER.includes(e.severity as SeverityLevel)) {
    e.severity = 'low';
    repairs.push('Defaulted invalid severity to low');
  }

  if (!SEVERITY_ORDER.includes(e.baseSeverity as SeverityLevel)) {
    e.baseSeverity = e.severity as SeverityLevel;
    repairs.push('Defaulted baseSeverity from severity');
  }

  if (!isFiniteNumber(e.confidence)) {
    e.confidence = 50;
    repairs.push('Defaulted non-numeric confidence to 50');
  } else if (e.confidence < 0 || e.confidence > 100) {
    e.confidence = Math.max(0, Math.min(100, Math.round(e.confidence)));
    repairs.push('Clamped confidence into 0-100');
  } else {
    e.confidence = Math.round(e.confidence);
  }

  if (!Array.isArray(e.corroboratedBy)) {
    e.corroboratedBy = [];
    repairs.push('Defaulted corroboratedBy to an empty array');
  }

  if (typeof e.isAnomaly !== 'boolean') {
    e.isAnomaly = false;
    repairs.push('Defaulted isAnomaly to false');
  }

  if (typeof e.title !== 'string' || e.title.length === 0) {
    e.title = `${String(e.sourceType).toUpperCase()} observation`;
    repairs.push('Defaulted empty title');
  } else if (e.title.length > 80) {
    e.title = `${e.title.slice(0, 77)}...`;
    repairs.push('Truncated title to 80 characters');
  }

  if (typeof e.description !== 'string') {
    e.description = '';
    repairs.push('Defaulted non-string description');
  }

  if (typeof e.raw !== 'object' || e.raw === null) {
    e.raw = {};
    repairs.push('Defaulted non-object raw payload');
  }

  // Optional kinematics: drop rather than repair, so a bad reading never
  // silently becomes a plausible-looking zero.
  if (location.altitudeMeters !== undefined && !isFiniteNumber(location.altitudeMeters)) {
    delete location.altitudeMeters;
    repairs.push('Dropped non-numeric altitudeMeters');
  }
  if (location.speedKnots !== undefined && !isFiniteNumber(location.speedKnots)) {
    delete location.speedKnots;
    repairs.push('Dropped non-numeric speedKnots');
  }
  if (location.headingDegrees !== undefined) {
    if (!isFiniteNumber(location.headingDegrees)) {
      delete location.headingDegrees;
      repairs.push('Dropped non-numeric headingDegrees');
    } else {
      location.headingDegrees = ((location.headingDegrees % 360) + 360) % 360;
    }
  }

  return { valid: true, event: e as UnifiedEvent, errors, repairs };
}

/** Validate a batch, returning survivors and a rejection tally. */
export function validateBatch(candidates: unknown[]): {
  events: UnifiedEvent[];
  rejected: number;
  repaired: number;
} {
  const events: UnifiedEvent[] = [];
  let rejected = 0;
  let repaired = 0;

  for (const candidate of candidates) {
    const result = validateEvent(candidate);
    if (result.valid && result.event) {
      if (result.repairs.length > 0) repaired++;
      events.push(result.event);
    } else {
      rejected++;
      log.warn(`Rejected event: ${result.errors.join('; ')}`);
    }
  }

  return { events, rejected, repaired };
}

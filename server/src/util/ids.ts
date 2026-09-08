/**
 * VANGUARD — identifier generation.
 *
 * Event IDs are human-legible on purpose. A judge reading a briefing citation
 * of "EV-RAD-004091" can tell at a glance that it came from radar, and can find
 * it in the feed without a lookup table. Opaque UUIDs would destroy that.
 */

import type { SourceType } from '../types/events.js';

/** Three-letter mnemonic per source type, used in event IDs. */
const SOURCE_PREFIX: Record<SourceType, string> = {
  radar: 'RAD',
  weather: 'WXR',
  personnel: 'PER',
  log: 'LOG',
  incident: 'INC',
  social_media: 'SMS',
  audio_recording: 'AUD',
};

let eventCounter = 0;

/**
 * Sequential, source-tagged event ID: `EV-RAD-000123`.
 * Monotonic within a process, so ID order equals ingestion order.
 */
export function nextEventId(sourceType: SourceType): string {
  eventCounter += 1;
  return `EV-${SOURCE_PREFIX[sourceType]}-${String(eventCounter).padStart(6, '0')}`;
}

/**
 * Stable, entity-derived event ID: `EV-RAD-T-R-1042`.
 *
 * Used for ENTITY-STATE observations — a radar track, a unit's telemetry, a
 * weather station's current conditions. These are persistent objects that are
 * re-observed continuously, not discrete occurrences.
 *
 * Deriving the ID from the entity key means every subsequent observation of the
 * same track updates ONE event in place rather than appending a new one. A COP
 * holding ten contacts must show ten contacts, not ten per radar sweep.
 * Without this, near-identical re-reports correlate with each other and
 * manufacture the exact false corroboration the fusion engine exists to avoid.
 *
 * Discrete occurrences — a perimeter trip, an incident report, a visual
 * sighting — keep sequential IDs from `nextEventId`, because each really is a
 * new thing that happened.
 */
export function stableEventId(sourceType: SourceType, entityKey: string): string {
  const key = entityKey
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '-')
    .slice(0, 24);
  return `EV-${SOURCE_PREFIX[sourceType]}-T-${key}`;
}

/** Current value of the event counter, for metrics. */
export const eventsIssued = (): number => eventCounter;

/** Reset the counter. Test-only; never called by the running server. */
export function __resetEventCounter(): void {
  eventCounter = 0;
}

let clusterCounter = 0;

/** Sequential correlation cluster ID: `CL-000042`. */
export function nextClusterId(): string {
  clusterCounter += 1;
  return `CL-${String(clusterCounter).padStart(6, '0')}`;
}

let escalationCounter = 0;

/** Sequential escalation record ID: `ESC-000007`. */
export function nextEscalationId(): string {
  escalationCounter += 1;
  return `ESC-${String(escalationCounter).padStart(6, '0')}`;
}

let coaCounter = 0;

/** Sequential course-of-action ID: `COA-0003`. */
export function nextCoaId(): string {
  coaCounter += 1;
  return `COA-${String(coaCounter).padStart(4, '0')}`;
}

let connectionCounter = 0;

/** Sequential WebSocket connection ID: `WS-0012`. */
export function nextConnectionId(): string {
  connectionCounter += 1;
  return `WS-${String(connectionCounter).padStart(4, '0')}`;
}

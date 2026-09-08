/**
 * VANGUARD — Corroboration linking.
 *
 * Correlation says "these events belong to the same situation".
 * Corroboration says "these events CONFIRM each other" — a stricter claim, and
 * the one that is allowed to raise confidence.
 *
 * The distinction matters. A weather observation and a radar contact in the
 * same 5 km box are correlated (same situation) but a rain reading does not
 * confirm the existence of an aircraft. Corroboration therefore ranks candidate
 * links by evidential strength and keeps only the ones that genuinely add
 * information.
 */

import { CORRELATION_RADIUS_METERS, CORRELATION_WINDOW_SECONDS } from '../config/constants.js';
import type { SourceType, UnifiedEvent } from '../types/events.js';
import { haversineMeters } from '../util/geo.js';
import { clamp } from '../util/stats.js';
import { deltaSeconds } from '../util/time.js';

/** Maximum corroborating links retained per event, strongest first. */
export const MAX_CORROBORATORS_PER_EVENT = 6;

/**
 * Evidential compatibility between two source types, 0..1.
 *
 * Read this as: "if feed A reports something, how much does a report from
 * feed B increase my belief in it?"
 *
 *  - Personnel sightings strongly confirm both.
 *  - Weather corroborates weakly and asymmetrically: it EXPLAINS conditions
 *    around a contact (sensor masking, degraded optics) rather than confirming
 *    the contact exists. It is kept in the graph because that context is what
 *    lets the briefing say "storm cell is masking optical surveillance", but it
 *    is weighted low so it cannot inflate a contact's confidence on its own.
 *  - Social media is open-source, platform-transcoded, and freely manipulable —
 *    it corroborates strongly (0.85) toward official incident reporting and
 *    personnel sightings, because footage of a real event is genuine, useful
 *    evidence, but weakly toward its own kind (0.35: one repost does not confirm
 *    another) and moderately toward radar (a clip of "something in the sky" is
 *    consistent with but not proof of a contact). It corroborates WEATHER the
 *    least (0.3): a scenic storm video proves the video exists, not the weather.
 *  - Audio recordings (hydrophone) are instrumented: they corroborate incidents
 *    strongly (0.85), radar moderately (0.6), and each other weakly (0.35).
 */
const AFFINITY: Record<SourceType, Record<SourceType, number>> = {
  radar: {
    radar: 0.35, log: 0.95, personnel: 0.85, incident: 0.8, weather: 0.3,
    social_media: 0.6, audio_recording: 0.6,
  },
  log: {
    log: 0.35, radar: 0.95, personnel: 0.9, incident: 0.85, weather: 0.25,
    social_media: 0.55, audio_recording: 0.5,
  },
  personnel: {
    personnel: 0.35, radar: 0.85, log: 0.9, incident: 0.9, weather: 0.3,
    social_media: 0.8, audio_recording: 0.7,
  },
  incident: {
    incident: 0.35, radar: 0.8, log: 0.85, personnel: 0.9, weather: 0.45,
    social_media: 0.85, audio_recording: 0.85,
  },
  weather: {
    weather: 0.35, radar: 0.3, log: 0.25, personnel: 0.3, incident: 0.45,
    social_media: 0.3, audio_recording: 0.3,
  },
  social_media: {
    social_media: 0.35, radar: 0.6, log: 0.55, personnel: 0.8, incident: 0.85,
    weather: 0.3, audio_recording: 0.5,
  },
  audio_recording: {
    audio_recording: 0.35, radar: 0.6, log: 0.5, personnel: 0.7, incident: 0.85,
    weather: 0.3, social_media: 0.5,
  },
};

/** Links weaker than this are discarded as non-informative. */
export const MIN_CORROBORATION_STRENGTH = 0.2;

/** A scored candidate corroboration link. */
export interface CorroborationLink {
  eventId: string;
  strength: number;
  distanceMeters: number;
  deltaSeconds: number;
  sourceType: SourceType;
  /** Human-readable justification, surfaced in the explainability drawer. */
  rationale: string;
}

/** Evidential compatibility lookup between two feeds, 0..1. */
export function sourceAffinity(a: SourceType, b: SourceType): number {
  return AFFINITY[a]?.[b] ?? 0.3;
}

/**
 * Strength of the corroboration `candidate` provides to `event`, 0..1.
 *
 *   strength = affinity x proximity x simultaneity
 *
 * Each term decays linearly to zero at the edge of its correlation window, so a
 * link at the very limit of both windows contributes essentially nothing.
 */
export function corroborationStrength(
  event: UnifiedEvent,
  candidate: UnifiedEvent,
): CorroborationLink {
  const distance = haversineMeters(event.location, candidate.location);
  const dt = deltaSeconds(event.timestamp, candidate.timestamp);

  const affinity = sourceAffinity(event.sourceType, candidate.sourceType);
  const proximity = clamp(1 - distance / CORRELATION_RADIUS_METERS, 0, 1);
  const simultaneity = clamp(1 - dt / CORRELATION_WINDOW_SECONDS, 0, 1);

  const strength = affinity * proximity * simultaneity;

  return {
    eventId: candidate.id,
    strength: Math.round(strength * 1000) / 1000,
    distanceMeters: Math.round(distance),
    deltaSeconds: Math.round(dt),
    sourceType: candidate.sourceType,
    rationale:
      `${candidate.sourceType.toUpperCase()} observation ${Math.round(distance)}m away, ` +
      `${Math.round(dt)}s apart (affinity ${affinity.toFixed(2)})`,
  };
}

/**
 * Choose the corroborating links for one event from its scored candidates.
 *
 * Selection policy, in order:
 *   1. Drop links below MIN_CORROBORATION_STRENGTH.
 *   2. Sort by strength descending.
 *   3. Prefer BREADTH over depth: take the strongest link from each distinct
 *      source type first, then backfill with the remaining strongest links.
 *
 * Step 3 is the important one. Without it, an event sitting in a dense radar
 * cluster fills all six slots with radar and the confidence engine sees no
 * cross-source independence — the system would look corroborated while
 * actually being one instrument's opinion repeated six times.
 */
export function selectFromScored(
  scored: CorroborationLink[],
  limit: number = MAX_CORROBORATORS_PER_EVENT,
): CorroborationLink[] {
  const ordered = scored
    .filter((l) => l.strength >= MIN_CORROBORATION_STRENGTH)
    .sort((a, b) => b.strength - a.strength);

  const chosen: CorroborationLink[] = [];
  const usedTypes = new Set<SourceType>();

  // Pass 1 — breadth: strongest link per distinct source type.
  for (const link of ordered) {
    if (chosen.length >= limit) break;
    if (usedTypes.has(link.sourceType)) continue;
    usedTypes.add(link.sourceType);
    chosen.push(link);
  }

  // Pass 2 — depth: backfill remaining slots with the next strongest links.
  for (const link of ordered) {
    if (chosen.length >= limit) break;
    if (chosen.some((c) => c.eventId === link.eventId)) continue;
    chosen.push(link);
  }

  return chosen;
}

/**
 * Choose the corroborating links for one event from its cluster neighbours.
 */
export function selectCorroborators(
  event: UnifiedEvent,
  neighbors: UnifiedEvent[],
  limit: number = MAX_CORROBORATORS_PER_EVENT,
): CorroborationLink[] {
  const scored = neighbors
    .filter((n) => n.id !== event.id)
    .map((n) => corroborationStrength(event, n));
  return selectFromScored(scored, limit);
}

/**
 * Apply corroboration across a whole cluster, mutating each member's
 * `corroboratedBy` array in place and returning the link detail for the API.
 *
 * When `neighborsById` (the direct correlation neighbours produced by the
 * correlate stage) is supplied, only in-window candidates are scored. A member
 * outside the spatial or temporal window scores zero under
 * `corroborationStrength` and is discarded by the strength floor regardless, so
 * the resulting selection is identical — the pruning only skips the work. Pair
 * geometry is also computed once per unordered pair and shared between both
 * directions, which keeps a mega-cluster from re-running the same trig twice.
 */
export function corroborateCluster(
  members: UnifiedEvent[],
  neighborsById?: Map<string, string[]>,
): Map<string, CorroborationLink[]> {
  const byEvent = new Map<string, CorroborationLink[]>();
  if (members.length < 2) return byEvent;

  const byId = new Map(members.map((m) => [m.id, m]));
  const metricCache = new Map<
    string,
    { affinity: number; distance: number; dt: number }
  >();

  for (const event of members) {
    // When `neighborsById` is supplied it is authoritative: it carries exactly
    // the members that correlate with `event` within both windows, derived from
    // the correlate stage's union scan. Members outside those windows score
    // zero under `corroborationStrength` anyway, so this produces the same
    // selection as scoring the full cluster at a fraction of the work.
    const candidateIds = neighborsById
      ? (neighborsById.get(event.id) ?? [])
      : members.filter((m) => m.id !== event.id).map((m) => m.id);

    const scored: CorroborationLink[] = [];
    for (const id of candidateIds) {
      if (id === event.id) continue;
      const candidate = byId.get(id);
      if (!candidate) continue;

      const pairKey = event.id < id ? `${event.id}|${id}` : `${id}|${event.id}`;
      let geometry = metricCache.get(pairKey);
      if (!geometry) {
        geometry = {
          affinity: sourceAffinity(event.sourceType, candidate.sourceType),
          distance: haversineMeters(event.location, candidate.location),
          dt: deltaSeconds(event.timestamp, candidate.timestamp),
        };
        metricCache.set(pairKey, geometry);
      }

      const strength =
        Math.round(
          geometry.affinity *
            clamp(1 - geometry.distance / CORRELATION_RADIUS_METERS, 0, 1) *
            clamp(1 - geometry.dt / CORRELATION_WINDOW_SECONDS, 0, 1) *
            1000,
        ) / 1000;

      scored.push({
        eventId: id,
        strength,
        distanceMeters: Math.round(geometry.distance),
        deltaSeconds: Math.round(geometry.dt),
        sourceType: candidate.sourceType,
        rationale:
          `${candidate.sourceType.toUpperCase()} observation ${Math.round(geometry.distance)}m away, ` +
          `${Math.round(geometry.dt)}s apart (affinity ${geometry.affinity.toFixed(2)})`,
      });
    }

    const links = selectFromScored(scored);
    event.corroboratedBy = links.map((l) => l.eventId);
    byEvent.set(event.id, links);
  }

  return byEvent;
}

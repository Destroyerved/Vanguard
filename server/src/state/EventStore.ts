/**
 * VANGUARD — In-memory event store.
 *
 * A bounded ring buffer with secondary indices. Deliberately NOT a database:
 * the operational picture is a sliding window of the last hour, every query is
 * a scan over at most a few thousand records, and adding Postgres would buy
 * durability the product does not need while costing the zero-friction setup
 * the product depends on.
 *
 * Capacity is bounded so a long-running process cannot exhaust memory — the
 * oldest event is evicted when the buffer is full, which is exactly the record
 * least relevant to a live operational picture.
 */

import {
  EVENT_ACTIVE_HORIZON_SECONDS,
  EVENT_STORE_CAPACITY,
} from '../config/constants.js';
import type { SeverityLevel, SourceType, UnifiedEvent } from '../types/events.js';
import { haversineMeters, type LatLng } from '../util/geo.js';
import { ageSeconds, toEpochMs } from '../util/time.js';

/** Filter accepted by `query`. All fields are AND-combined. */
export interface EventQuery {
  sourceTypes?: SourceType[];
  severities?: SeverityLevel[];
  minConfidence?: number;
  /** Only events newer than this many seconds. */
  withinSeconds?: number;
  anomaliesOnly?: boolean;
  minCorroborations?: number;
  near?: { lat: number; lng: number; radiusMeters: number };
  /** Case-insensitive substring match against title and description. */
  text?: string;
  /** Point-in-time replay: only events at or before this epoch ms. */
  asOfMs?: number;
  limit?: number;
  offset?: number;
}

export class EventStore {
  private buffer: UnifiedEvent[] = [];
  private readonly index = new Map<string, UnifiedEvent>();
  private readonly capacity: number;
  private evicted = 0;

  constructor(capacity: number = EVENT_STORE_CAPACITY) {
    this.capacity = capacity;
  }

  /** Insert or replace events, evicting the oldest once at capacity. */
  upsert(events: UnifiedEvent[]): void {
    for (const event of events) {
      const existing = this.index.get(event.id);
      if (existing) {
        // Replace in place: fusion re-scores events on every pass, and the
        // buffer must hold the current view, not a history of revisions.
        //
        // `firstSeen` is the exception — it is carried forward from the
        // original observation. For a persistent entity (a radar track) the
        // timestamp advances with every sweep while firstSeen stays fixed,
        // which is what lets the time-scrubber tell whether a contact existed
        // yet at a given instant.
        event.firstSeen = existing.firstSeen ?? existing.timestamp;

        const position = this.buffer.indexOf(existing);
        if (position >= 0) this.buffer[position] = event;
        this.index.set(event.id, event);
        continue;
      }

      this.buffer.push(event);
      this.index.set(event.id, event);
    }

    while (this.buffer.length > this.capacity) {
      const oldest = this.buffer.shift();
      if (oldest) {
        this.index.delete(oldest.id);
        this.evicted++;
      }
    }
  }

  /** Fetch one event by ID. */
  get(id: string): UnifiedEvent | undefined {
    return this.index.get(id);
  }

  /** Fetch many events by ID, skipping the ones that do not exist. */
  getMany(ids: string[]): UnifiedEvent[] {
    const out: UnifiedEvent[] = [];
    for (const id of ids) {
      const event = this.index.get(id);
      if (event) out.push(event);
    }
    return out;
  }

  /** True when the ID resolves — the primitive the AI grounding check uses. */
  has(id: string): boolean {
    return this.index.has(id);
  }

  /** Every event currently held, oldest first. */
  all(): UnifiedEvent[] {
    return [...this.buffer];
  }

  /**
   * Events inside the active operational horizon (default: the last hour).
   * This — not `all()` — is what the fusion pipeline and the API operate on.
   */
  active(horizonSeconds: number = EVENT_ACTIVE_HORIZON_SECONDS): UnifiedEvent[] {
    const now = Date.now();
    return this.buffer.filter((e) => ageSeconds(e.timestamp, now) <= horizonSeconds);
  }

  /**
   * Point-in-time snapshot — the engine behind the 4D time-scrubber.
   * Returns the picture as it stood at `asOfMs`, which is simply every event
   * whose timestamp precedes that instant and which was still inside the
   * horizon then. No separate history structure is needed because events are
   * immutable in time even though their scores are recomputed.
   */
  snapshotAt(
    asOfMs: number,
    horizonSeconds: number = EVENT_ACTIVE_HORIZON_SECONDS,
  ): UnifiedEvent[] {
    return this.buffer.filter((e) => {
      // Existence test uses firstSeen, so a persistent contact acquired ten
      // minutes ago appears in a snapshot from five minutes ago even though its
      // timestamp has since advanced. Using `timestamp` here would make every
      // live track vanish from historical replay.
      const created = toEpochMs(e.firstSeen ?? e.timestamp);
      if (Number.isNaN(created) || created > asOfMs) return false;

      // Horizon test uses the last observation, clamped to the replay instant:
      // an entity still being observed at that time was not stale then.
      const last = toEpochMs(e.timestamp);
      if (Number.isNaN(last)) return false;

      return (asOfMs - Math.min(last, asOfMs)) / 1000 <= horizonSeconds;
    });
  }

  /** Oldest and newest timestamps held, for time-scrubber bounds. */
  timeBounds(): { earliestMs: number; latestMs: number } {
    let earliest = Number.POSITIVE_INFINITY;
    let latest = Number.NEGATIVE_INFINITY;

    for (const e of this.buffer) {
      const t = toEpochMs(e.timestamp);
      if (Number.isNaN(t)) continue;
      if (t < earliest) earliest = t;
      if (t > latest) latest = t;
    }

    const now = Date.now();
    return {
      earliestMs: Number.isFinite(earliest) ? earliest : now,
      latestMs: Number.isFinite(latest) ? latest : now,
    };
  }

  /** Run a filter over the store. Results are newest first. */
  query(filter: EventQuery = {}): UnifiedEvent[] {
    const source =
      filter.asOfMs !== undefined ? this.snapshotAt(filter.asOfMs) : this.buffer;
    const reference = filter.asOfMs ?? Date.now();
    const text = filter.text?.toLowerCase();

    let results = source.filter((e) => {
      if (filter.sourceTypes && !filter.sourceTypes.includes(e.sourceType)) return false;
      if (filter.severities && !filter.severities.includes(e.severity)) return false;
      if (filter.minConfidence !== undefined && e.confidence < filter.minConfidence) return false;
      if (filter.anomaliesOnly && !e.isAnomaly) return false;

      if (
        filter.minCorroborations !== undefined &&
        e.corroboratedBy.length < filter.minCorroborations
      ) {
        return false;
      }

      if (
        filter.withinSeconds !== undefined &&
        ageSeconds(e.timestamp, reference) > filter.withinSeconds
      ) {
        return false;
      }

      if (filter.near) {
        const d = haversineMeters(e.location, {
          lat: filter.near.lat,
          lng: filter.near.lng,
        } as LatLng);
        if (d > filter.near.radiusMeters) return false;
      }

      if (text) {
        const haystack = `${e.title} ${e.description}`.toLowerCase();
        if (!haystack.includes(text)) return false;
      }

      return true;
    });

    const epochMap = new Map<string, number>();
    for (const e of results) {
      epochMap.set(e.id, toEpochMs(e.timestamp));
    }
    results.sort((a, b) => (epochMap.get(b.id) ?? 0) - (epochMap.get(a.id) ?? 0));

    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? results.length;
    return results.slice(offset, offset + limit);
  }

  /** Run a filter over the store and return both paginated results and total count in a single pass. */
  queryWithCount(filter: EventQuery = {}): { events: UnifiedEvent[]; total: number } {
    const { limit, offset, ...restFilter } = filter;
    const allFiltered = this.query({ ...restFilter });
    const total = allFiltered.length;
    const start = offset ?? 0;
    const end = limit !== undefined ? start + limit : total;
    return {
      events: allFiltered.slice(start, end),
      total
    };
  }

  /**
   * The N most operationally significant events.
   *
   * Ranked by severity first, then confidence, then recency. This is the
   * ordering used to select evidence for the AI briefing, so the model always
   * sees the events that matter rather than an arbitrary recent slice.
   */
  mostSignificant(count: number, horizonSeconds?: number): UnifiedEvent[] {
    const order: SeverityLevel[] = ['low', 'medium', 'high', 'critical'];
    return this.active(horizonSeconds)
      .slice()
      .sort((a, b) => {
        const bySeverity = order.indexOf(b.severity) - order.indexOf(a.severity);
        if (bySeverity !== 0) return bySeverity;
        const byConfidence = b.confidence - a.confidence;
        if (byConfidence !== 0) return byConfidence;
        return toEpochMs(b.timestamp) - toEpochMs(a.timestamp);
      })
      .slice(0, count);
  }

  /** Per-source event counts within the active horizon. */
  countsBySource(): Record<SourceType, number> {
    const counts: Record<SourceType, number> = {
      radar: 0,
      weather: 0,
      personnel: 0,
      log: 0,
      incident: 0,
      social_media: 0,
      audio_recording: 0,
    };
    for (const e of this.active()) counts[e.sourceType]++;
    return counts;
  }

  /** Per-severity event counts within the active horizon. */
  countsBySeverity(): Record<SeverityLevel, number> {
    const counts: Record<SeverityLevel, number> = {
      low: 0, medium: 0, high: 0, critical: 0,
    };
    for (const e of this.active()) counts[e.severity]++;
    return counts;
  }

  get size(): number {
    return this.buffer.length;
  }

  get maxSize(): number {
    return this.capacity;
  }

  get evictedCount(): number {
    return this.evicted;
  }

  /** Drop everything. Test and simulation-reset only. */
  clear(): void {
    this.buffer = [];
    this.index.clear();
    this.evicted = 0;
  }
}

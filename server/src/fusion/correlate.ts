/**
 * VANGUARD — Spatiotemporal correlation.
 *
 * Turns a flat list of observations into CLUSTERS: sets of events the engine
 * judges to be views of the same developing real-world situation.
 *
 * Two events correlate when they satisfy BOTH windows simultaneously:
 *   - spatial:  haversine(a, b) <= CORRELATION_RADIUS_METERS   (delta-R)
 *   - temporal: |t(a) - t(b)|   <= CORRELATION_WINDOW_SECONDS  (delta-T)
 *
 * Clusters are the transitive closure of that pairwise relation, computed with
 * a union-find (disjoint set) structure. Transitivity matters operationally: a
 * radar track and a perimeter trip 8 km apart do not correlate directly, but if
 * a patrol sighting sits between them and correlates with both, all three
 * belong to one developing picture — which is exactly the chain of reasoning a
 * human analyst would perform.
 *
 * Complexity: the naive pairwise scan is O(n^2). A spatial grid index reduces
 * it to roughly O(n) for realistic densities by only comparing events in
 * neighbouring cells, which is what `buildSpatialIndex` provides.
 */

import {
  CORRELATION_RADIUS_METERS,
  CORRELATION_WINDOW_SECONDS,
} from '../config/constants.js';
import type {
  CorrelationCluster,
  SeverityLevel,
  SourceType,
  UnifiedEvent,
} from '../types/events.js';
import { SEVERITY_ORDER } from '../types/events.js';
import { centroid, haversineMeters, type LatLng } from '../util/geo.js';
import { nextClusterId } from '../util/ids.js';
import { mean } from '../util/stats.js';
import { deltaSeconds, toEpochMs } from '../util/time.js';

/** Tunable correlation windows, injectable for tests and what-if analysis. */
export interface CorrelationOptions {
  radiusMeters?: number;
  windowSeconds?: number;
}

/** Result of a correlation pass. */
export interface CorrelationResult {
  clusters: CorrelationCluster[];
  /** eventId -> clusterId, for O(1) lookup during scoring. */
  clusterByEvent: Map<string, string>;
  /** eventId -> IDs of every directly-correlating neighbour (in-window pair). */
  neighborsByEvent: Map<string, string[]>;
  /** Number of pairwise comparisons actually performed, for the metrics panel. */
  comparisons: number;
}

/* ------------------------------------------------------------------ *
 * Union-Find (disjoint set) with path compression and union by rank
 * ------------------------------------------------------------------ */

class DisjointSet {
  private readonly parent: number[];
  private readonly rank: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
    this.rank = new Array(size).fill(0);
  }

  find(x: number): number {
    let root = x;
    while (this.parent[root] !== root) root = this.parent[root]!;
    // Path compression: flatten the chain so later finds are O(1).
    let cur = x;
    while (this.parent[cur] !== root) {
      const next = this.parent[cur]!;
      this.parent[cur] = root;
      cur = next;
    }
    return root;
  }

  union(a: number, b: number): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return;
    // Union by rank keeps the tree shallow.
    if (this.rank[ra]! < this.rank[rb]!) {
      this.parent[ra] = rb;
    } else if (this.rank[ra]! > this.rank[rb]!) {
      this.parent[rb] = ra;
    } else {
      this.parent[rb] = ra;
      this.rank[ra] = this.rank[ra]! + 1;
    }
  }
}

/* ------------------------------------------------------------------ *
 * Spatial grid index
 * ------------------------------------------------------------------ */

/**
 * Bucket events into a lat/lng grid whose cell size is the correlation radius.
 * Any two events that can possibly correlate must fall in the same cell or in
 * one of its 8 neighbours, so the candidate set shrinks from O(n) to O(density).
 */
function buildSpatialIndex(
  events: UnifiedEvent[],
  radiusMeters: number,
): Map<string, number[]> {
  // Degrees of latitude per metre is constant; longitude is scaled by cos(lat),
  // but using the latitude-derived cell size for both axes only makes cells
  // narrower in longitude terms, which is conservative (never misses a pair).
  const cellDeg = (radiusMeters / 111_320) || 0.01;
  const index = new Map<string, number[]>();

  events.forEach((e, i) => {
    const key = cellKey(e.location.lat, e.location.lng, cellDeg);
    const bucket = index.get(key);
    if (bucket) bucket.push(i);
    else index.set(key, [i]);
  });

  return index;
}

function cellKey(lat: number, lng: number, cellDeg: number): string {
  return `${Math.floor(lat / cellDeg)}:${Math.floor(lng / cellDeg)}`;
}

function neighborCells(lat: number, lng: number, cellDeg: number): string[] {
  const gy = Math.floor(lat / cellDeg);
  const gx = Math.floor(lng / cellDeg);
  const keys: string[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) keys.push(`${gy + dy}:${gx + dx}`);
  }
  return keys;
}

/* ------------------------------------------------------------------ *
 * Pairwise predicate
 * ------------------------------------------------------------------ */

/** True when two events satisfy both the spatial and the temporal window. */
export function eventsCorrelate(
  a: UnifiedEvent,
  b: UnifiedEvent,
  options: CorrelationOptions = {},
): boolean {
  const radius = options.radiusMeters ?? CORRELATION_RADIUS_METERS;
  const window = options.windowSeconds ?? CORRELATION_WINDOW_SECONDS;

  // Temporal test first: it is a subtraction, haversine is trigonometry.
  if (deltaSeconds(a.timestamp, b.timestamp) > window) return false;
  return haversineMeters(a.location, b.location) <= radius;
}

/* ------------------------------------------------------------------ *
 * Main entry point
 * ------------------------------------------------------------------ */

/**
 * Correlate a set of events into spatiotemporal clusters.
 * Singleton clusters (one event, nothing to correlate with) are NOT emitted —
 * a cluster of one is not a corroborated situation, and emitting them would
 * make the cluster count meaningless.
 */
export function correlateEvents(
  events: UnifiedEvent[],
  options: CorrelationOptions = {},
): CorrelationResult {
  const radius = options.radiusMeters ?? CORRELATION_RADIUS_METERS;
  const cellDeg = (radius / 111_320) || 0.01;

  const ds = new DisjointSet(events.length);
  const index = buildSpatialIndex(events, radius);
  let comparisons = 0;
  // directByIndex[i] = events that correlate with event i within BOTH windows.
  // This is the corroboration candidate set: cluster membership is a transitive
  // closure, so a mega-cluster's colliding members are not all mutually in-window,
  // and scoring only the direct pairs keeps corroboration from re-running O(m^2).
  const directByIndex: number[][] = events.map(() => []);

  for (let i = 0; i < events.length; i++) {
    const a = events[i]!;
    for (const key of neighborCells(a.location.lat, a.location.lng, cellDeg)) {
      const bucket = index.get(key);
      if (!bucket) continue;
      for (const j of bucket) {
        // Compare each unordered pair exactly once.
        if (j <= i) continue;
        comparisons++;
        if (eventsCorrelate(a, events[j]!, options)) {
          ds.union(i, j);
          directByIndex[i]!.push(j);
          directByIndex[j]!.push(i);
        }
      }
    }
  }

  // Collect members by representative root.
  const groups = new Map<number, number[]>();
  for (let i = 0; i < events.length; i++) {
    const root = ds.find(i);
    const g = groups.get(root);
    if (g) g.push(i);
    else groups.set(root, [i]);
  }

  const clusters: CorrelationCluster[] = [];
  const clusterByEvent = new Map<string, string>();
  const neighborsByEvent = new Map<string, string[]>();

  for (const members of groups.values()) {
    if (members.length < 2) continue; // singletons are not clusters

    const memberEvents = members.map((i) => events[i]!);
    const cluster = summarizeCluster(memberEvents);
    clusters.push(cluster);

    for (const e of memberEvents) {
      clusterByEvent.set(e.id, cluster.id);
    }
  }

  for (let i = 0; i < events.length; i++) {
    const direct = directByIndex[i]!;
    if (direct.length === 0) continue;
    const ids = direct.map((j) => events[j]!.id);
    neighborsByEvent.set(events[i]!.id, ids);
  }

  // Largest, most severe clusters first — the order the feed renders in.
  clusters.sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(b.peakSeverity) - SEVERITY_ORDER.indexOf(a.peakSeverity) ||
      b.eventIds.length - a.eventIds.length,
  );

  return { clusters, clusterByEvent, neighborsByEvent, comparisons };
}

/** Reduce a set of member events to a cluster summary record. */
export function summarizeCluster(members: UnifiedEvent[]): CorrelationCluster {
  const points: LatLng[] = members.map((e) => ({ lat: e.location.lat, lng: e.location.lng }));
  const center = centroid(points);

  let radiusMeters = 0;
  for (const p of points) {
    const d = haversineMeters(center, p);
    if (d > radiusMeters) radiusMeters = d;
  }

  const times = members.map((e) => toEpochMs(e.timestamp)).filter((t) => !Number.isNaN(t));
  const distinctSources = [...new Set(members.map((e) => e.sourceType))] as SourceType[];

  let peakSeverity: SeverityLevel = 'low';
  for (const e of members) {
    if (SEVERITY_ORDER.indexOf(e.severity) > SEVERITY_ORDER.indexOf(peakSeverity)) {
      peakSeverity = e.severity;
    }
  }

  return {
    id: nextClusterId(),
    eventIds: members.map((e) => e.id),
    distinctSources,
    centroid: { lat: center.lat, lng: center.lng },
    radiusMeters: Math.round(radiusMeters),
    firstSeen: new Date(times.length ? Math.min(...times) : Date.now()).toISOString(),
    lastSeen: new Date(times.length ? Math.max(...times) : Date.now()).toISOString(),
    peakSeverity,
    meanConfidence: Math.round(mean(members.map((e) => e.confidence))),
  };
}

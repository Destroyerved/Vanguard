/**
 * Fusion pipeline — correlation, corroboration, dedupe, escalation and the
 * full six-stage pass.
 */

import { describe, expect, it } from 'vitest';
import { correlateEvents, eventsCorrelate } from '../src/fusion/correlate.js';
import { selectCorroborators, corroborateCluster, sourceAffinity } from '../src/fusion/corroborate.js';
import { dedupeEvents, isDuplicate } from '../src/fusion/dedupe.js';
import {
  applyHysteresis,
  computeThreatScore,
  escalateSeverity,
  scoreToLevel,
} from '../src/fusion/severity.js';
import { runFusionPipeline } from '../src/fusion/pipeline.js';
import { haversineMeters, destinationPoint, centroid, pointInPolygon } from '../src/util/geo.js';
import { THREAT_THRESHOLDS } from '../src/config/constants.js';
import type { SeverityLevel, SourceType, UnifiedEvent } from '../src/types/events.js';

const BASE_MS = Date.parse('2026-09-08T12:00:00.000Z');
const CENTER = { lat: 23.0225, lng: 72.5714 };

let seq = 0;

function ev(options: {
  source?: SourceType;
  severity?: SeverityLevel;
  offsetMeters?: number;
  bearing?: number;
  offsetSeconds?: number;
  title?: string;
  confidence?: number;
}): UnifiedEvent {
  seq++;
  const position =
    options.offsetMeters === undefined
      ? CENTER
      : destinationPoint(CENTER, options.bearing ?? 0, options.offsetMeters);

  const severity = options.severity ?? 'medium';

  return {
    id: `EV-TEST-${String(seq).padStart(5, '0')}`,
    sourceType: options.source ?? 'radar',
    sourceName: 'TEST',
    timestamp: new Date(BASE_MS - (options.offsetSeconds ?? 0) * 1000).toISOString(),
    location: { lat: position.lat, lng: position.lng },
    severity,
    baseSeverity: severity,
    title: options.title ?? 'Test contact',
    description: 'Synthetic test event',
    confidence: options.confidence ?? 50,
    corroboratedBy: [],
    isAnomaly: false,
    raw: {},
  };
}

describe('geo primitives', () => {
  it('computes a known great-circle distance', () => {
    // Ahmedabad to Mumbai is roughly 440km.
    const d = haversineMeters({ lat: 23.0225, lng: 72.5714 }, { lat: 19.076, lng: 72.8777 });
    expect(d).toBeGreaterThan(430_000);
    expect(d).toBeLessThan(450_000);
  });

  it('round-trips through destinationPoint at the requested distance', () => {
    const target = destinationPoint(CENTER, 45, 5_000);
    expect(haversineMeters(CENTER, target)).toBeCloseTo(5_000, -1);
  });

  it('computes a centroid that sits between its inputs', () => {
    const c = centroid([
      { lat: 23.0, lng: 72.0 },
      { lat: 23.2, lng: 72.4 },
    ]);
    expect(c.lat).toBeCloseTo(23.1, 2);
    expect(c.lng).toBeCloseTo(72.2, 2);
  });

  it('tests point-in-polygon in GeoJSON [lng, lat] order', () => {
    const square: [number, number][] = [
      [72.0, 23.0],
      [72.5, 23.0],
      [72.5, 23.5],
      [72.0, 23.5],
    ];
    expect(pointInPolygon({ lat: 23.25, lng: 72.25 }, square)).toBe(true);
    expect(pointInPolygon({ lat: 24.0, lng: 72.25 }, square)).toBe(false);
  });
});

describe('eventsCorrelate', () => {
  it('correlates events inside both windows', () => {
    const a = ev({});
    const b = ev({ offsetMeters: 1_000, offsetSeconds: 60 });
    expect(eventsCorrelate(a, b)).toBe(true);
  });

  it('rejects events outside the spatial window even when simultaneous', () => {
    const a = ev({});
    const b = ev({ offsetMeters: 20_000 });
    expect(eventsCorrelate(a, b)).toBe(false);
  });

  it('rejects events outside the temporal window even when co-located', () => {
    const a = ev({});
    const b = ev({ offsetSeconds: 5_000 });
    expect(eventsCorrelate(a, b)).toBe(false);
  });
});

describe('correlateEvents', () => {
  it('emits no cluster for a single isolated event', () => {
    const result = correlateEvents([ev({})]);
    expect(result.clusters).toHaveLength(0);
  });

  it('groups nearby simultaneous events into one cluster', () => {
    const events = [
      ev({ source: 'radar', offsetMeters: 0 }),
      ev({ source: 'log', offsetMeters: 500 }),
      ev({ source: 'personnel', offsetMeters: 900 }),
    ];

    const result = correlateEvents(events);
    expect(result.clusters).toHaveLength(1);
    expect(result.clusters[0]!.eventIds).toHaveLength(3);
    expect(result.clusters[0]!.distinctSources.sort()).toEqual(['log', 'personnel', 'radar']);
  });

  it('separates two spatially distant groups', () => {
    const events = [
      ev({ offsetMeters: 0 }),
      ev({ source: 'log', offsetMeters: 400 }),
      ev({ offsetMeters: 30_000, bearing: 90 }),
      ev({ source: 'log', offsetMeters: 30_400, bearing: 90 }),
    ];

    expect(correlateEvents(events).clusters).toHaveLength(2);
  });

  it('links a transitive chain — A-B and B-C put all three in one cluster', () => {
    // A and C are 8km apart, outside the 5km window, but B bridges them.
    const events = [
      ev({ offsetMeters: 0 }),
      ev({ source: 'log', offsetMeters: 4_000, bearing: 90 }),
      ev({ source: 'personnel', offsetMeters: 8_000, bearing: 90 }),
    ];

    const result = correlateEvents(events);
    expect(result.clusters).toHaveLength(1);
    expect(result.clusters[0]!.eventIds).toHaveLength(3);
  });

  it('produces a cluster summary with a sane centroid and radius', () => {
    const events = [
      ev({ offsetMeters: 0 }),
      ev({ source: 'log', offsetMeters: 2_000, bearing: 0 }),
      ev({ source: 'incident', offsetMeters: 2_000, bearing: 180 }),
    ];

    const cluster = correlateEvents(events).clusters[0]!;
    expect(cluster.centroid.lat).toBeCloseTo(CENTER.lat, 2);
    expect(cluster.radiusMeters).toBeGreaterThan(0);
    expect(cluster.radiusMeters).toBeLessThan(3_000);
  });
});

describe('corroboration selection', () => {
  it('rates cross-source pairings above same-source ones', () => {
    expect(sourceAffinity('radar', 'log')).toBeGreaterThan(sourceAffinity('radar', 'radar'));
  });

  it('rates weather as weak corroboration for a radar contact', () => {
    expect(sourceAffinity('radar', 'weather')).toBeLessThan(sourceAffinity('radar', 'personnel'));
  });

  it('prefers breadth: takes one link per source type before doubling up', () => {
    const event = ev({ source: 'radar' });
    const neighbors = [
      ev({ source: 'radar', offsetMeters: 100 }),
      ev({ source: 'radar', offsetMeters: 120 }),
      ev({ source: 'radar', offsetMeters: 140 }),
      ev({ source: 'log', offsetMeters: 800 }),
      ev({ source: 'personnel', offsetMeters: 900 }),
    ];

    const chosen = selectCorroborators(event, neighbors, 3);
    const types = new Set(chosen.map((c) => c.sourceType));

    // Despite three nearer radar returns, the first three picks span three
    // distinct source types.
    expect(types.size).toBe(3);
  });

  it('records only directly-correlating neighbours, not the whole transitive cluster', () => {
    // A—B—C chain: A and C are 5.8 km apart (beyond the correlation radius) but
    // both correlate with B (2.9 km apart), so all three land in one cluster.
    const a = ev({ source: 'radar', offsetMeters: 2_900, bearing: 0 });
    const b = ev({ source: 'log' });
    const c = ev({ source: 'incident', offsetMeters: 2_900, bearing: 180 });

    const { clusters, neighborsByEvent } = correlateEvents([a, b, c]);
    expect(clusters).toHaveLength(1);

    expect(neighborsByEvent.get(a.id)).toEqual([b.id]);
    expect(neighborsByEvent.get(b.id)).toHaveLength(2);
    expect(neighborsByEvent.get(c.id)).toEqual([b.id]);
  });

  it('an event chained into a cluster by transitivity gains no false corroboration', () => {
    const a = ev({ source: 'radar', offsetMeters: 2_900, bearing: 0 });
    const b = ev({ source: 'log' });
    const c = ev({ source: 'incident', offsetMeters: 2_900, bearing: 180 });

    const members = [a, b, c];
    const { neighborsByEvent } = correlateEvents(members);

    const pruned = corroborateCluster(members, neighborsByEvent);
    const full = corroborateCluster(members);

    // The out-of-window pair (A↔C) contributes nothing in either path, so the
    // direct-neighbour pruning produces the same corroboration as scoring the
    // whole cluster — the invariant the mega-cluster fast path relies on.
    expect(full.get(a.id)!.map((l) => l.eventId)).toEqual([b.id]);
    expect(pruned.get(a.id)!.map((l) => l.eventId)).toEqual(full.get(a.id)!.map((l) => l.eventId));
    expect(pruned.get(c.id)!.map((l) => l.eventId)).toEqual([b.id]);
    expect(pruned.get(b.id)!.map((l) => l.eventId)).toHaveLength(2);
  });
});

describe('dedupe', () => {
  it('identifies same-source, co-located, simultaneous, same-title events', () => {
    const a = ev({ source: 'radar', title: 'Contact alpha' });
    const b = ev({ source: 'radar', title: 'Contact alpha', offsetMeters: 50 });
    expect(isDuplicate(a, b)).toBe(true);
  });

  it('does not merge across source types', () => {
    const a = ev({ source: 'radar', title: 'Contact alpha' });
    const b = ev({ source: 'log', title: 'Contact alpha', offsetMeters: 50 });
    expect(isDuplicate(a, b)).toBe(false);
  });

  it('collapses a duplicate group down to one survivor', () => {
    const events = [
      ev({ title: 'Contact alpha' }),
      ev({ title: 'Contact alpha', offsetMeters: 40 }),
      ev({ title: 'Contact alpha', offsetMeters: 80 }),
      ev({ title: 'Different contact', offsetMeters: 3_000 }),
    ];

    const result = dedupeEvents(events);
    expect(result.events).toHaveLength(2);
    expect(result.removed).toBe(2);
  });

  it('keeps the highest confidence seen in the group', () => {
    const events = [
      ev({ title: 'Contact alpha', confidence: 40 }),
      ev({ title: 'Contact alpha', offsetMeters: 40, confidence: 88 }),
    ];

    const survivor = dedupeEvents(events).events[0]!;
    expect(survivor.confidence).toBe(88);
  });
});

describe('severity and threat', () => {
  it('escalates one tier and saturates at critical', () => {
    expect(escalateSeverity('low')).toBe('medium');
    expect(escalateSeverity('high')).toBe('critical');
    expect(escalateSeverity('critical')).toBe('critical');
  });

  it('maps scores onto the documented posture thresholds', () => {
    expect(scoreToLevel(0)).toBe('green');
    expect(scoreToLevel(THREAT_THRESHOLDS.yellow)).toBe('yellow');
    expect(scoreToLevel(THREAT_THRESHOLDS.orange)).toBe('orange');
    expect(scoreToLevel(THREAT_THRESHOLDS.red)).toBe('red');
  });

  it('escalates immediately without hysteresis delay', () => {
    expect(applyHysteresis('green', 'red', 100)).toBe('red');
  });

  it('holds the current level until the score clears the hysteresis band', () => {
    // Just below the RED floor but inside the 15% release band.
    const justBelow = THREAT_THRESHOLDS.red * 0.9;
    expect(applyHysteresis('red', 'orange', justBelow)).toBe('red');
  });

  it('de-escalates once the score falls clear of the band', () => {
    const wellBelow = THREAT_THRESHOLDS.red * 0.5;
    expect(applyHysteresis('red', 'orange', wellBelow)).toBe('orange');
  });

  it('weights one critical event above several low ones', () => {
    const oneCritical = computeThreatScore(
      [ev({ severity: 'critical', confidence: 90 })],
      BASE_MS,
    );
    const fourLow = computeThreatScore(
      Array.from({ length: 4 }, () => ev({ severity: 'low', confidence: 90 })),
      BASE_MS,
    );

    expect(oneCritical.score).toBeGreaterThan(fourLow.score);
  });

  it('discounts low-confidence events in the threat score', () => {
    const confident = computeThreatScore([ev({ severity: 'high', confidence: 95 })], BASE_MS);
    const doubtful = computeThreatScore([ev({ severity: 'high', confidence: 20 })], BASE_MS);
    expect(confident.score).toBeGreaterThan(doubtful.score);
  });
});

describe('runFusionPipeline', () => {
  it('runs all six stages and reports timings for each', () => {
    const events = [
      ev({ source: 'radar', offsetMeters: 0 }),
      ev({ source: 'log', offsetMeters: 600 }),
      ev({ source: 'personnel', offsetMeters: 900 }),
      ev({ source: 'incident', offsetMeters: 20_000, bearing: 90 }),
    ];

    const result = runFusionPipeline({ events, referenceMs: BASE_MS });

    for (const stage of ['dedupe', 'correlate', 'corroborate', 'score', 'anomaly', 'escalate']) {
      expect(result.stageTimings[stage]).toBeTypeOf('number');
    }
    expect(result.stats.outputCount).toBe(4);
    expect(result.clusters.length).toBeGreaterThanOrEqual(1);
  });

  it('escalates severity when three distinct sources corroborate', () => {
    const events = [
      ev({ source: 'radar', severity: 'medium', offsetMeters: 0 }),
      ev({ source: 'log', severity: 'medium', offsetMeters: 400 }),
      ev({ source: 'personnel', severity: 'medium', offsetMeters: 700 }),
    ];

    const result = runFusionPipeline({ events, referenceMs: BASE_MS });

    expect(result.severityChanges.length).toBeGreaterThan(0);
    expect(result.events.every((e) => e.severity !== 'low')).toBe(true);
    // baseSeverity preserves what the source originally reported.
    expect(result.events.every((e) => e.baseSeverity === 'medium')).toBe(true);
  });

  it('does not escalate an isolated single-source event', () => {
    const result = runFusionPipeline({
      events: [ev({ source: 'radar', severity: 'medium' })],
      referenceMs: BASE_MS,
    });

    expect(result.severityChanges).toHaveLength(0);
    expect(result.events[0]!.severity).toBe('medium');
  });

  it('assigns every event a valid confidence and breakdown', () => {
    const events = Array.from({ length: 12 }, (_, i) =>
      ev({ offsetMeters: i * 300, bearing: i * 30 }),
    );

    const result = runFusionPipeline({ events, referenceMs: BASE_MS });

    for (const event of result.events) {
      expect(event.confidence).toBeGreaterThanOrEqual(0);
      expect(event.confidence).toBeLessThanOrEqual(100);
      expect(event.confidenceBreakdown).toBeDefined();
      expect(event.confidenceBreakdown!.overall).toBe(event.confidence);
    }
  });

  it('clears stale corroboration when an event leaves every cluster', () => {
    const orphan = ev({ offsetMeters: 40_000, bearing: 270 });
    orphan.corroboratedBy = ['EV-GHOST-00001'];

    const result = runFusionPipeline({ events: [orphan], referenceMs: BASE_MS });
    expect(result.events[0]!.corroboratedBy).toEqual([]);
  });

  it('handles an empty picture without throwing', () => {
    const result = runFusionPipeline({ events: [], referenceMs: BASE_MS });
    expect(result.events).toHaveLength(0);
    expect(result.threat.level).toBe('green');
  });

  /**
   * REGRESSION. The pipeline re-fuses the whole active picture every tick over
   * the SAME event objects. An earlier revision escalated from the current
   * severity, so a medium event became high on tick two and critical on tick
   * three with no new evidence — within a minute the entire board read CRITICAL
   * and the threat score ran away. Escalation must be idempotent.
   */
  it('does not compound severity when the same events are fused repeatedly', () => {
    const events = [
      ev({ source: 'radar', severity: 'medium', offsetMeters: 0 }),
      ev({ source: 'log', severity: 'medium', offsetMeters: 400 }),
      ev({ source: 'personnel', severity: 'medium', offsetMeters: 700 }),
    ];

    const first = runFusionPipeline({ events, referenceMs: BASE_MS });
    const severitiesAfterFirst = first.events.map((e) => e.severity);

    // Ten more passes over the very same objects, as ten ticks would do.
    for (let i = 0; i < 10; i++) {
      runFusionPipeline({ events, referenceMs: BASE_MS });
    }
    const final = runFusionPipeline({ events, referenceMs: BASE_MS });

    expect(final.events.map((e) => e.severity)).toEqual(severitiesAfterFirst);
    // baseSeverity is never mutated, so the original claim stays auditable.
    expect(final.events.every((e) => e.baseSeverity === 'medium')).toBe(true);
  });

  it('converges on a stable threat score across repeated passes', () => {
    const events = Array.from({ length: 8 }, (_, i) =>
      ev({
        source: (['radar', 'log', 'personnel', 'incident'] as SourceType[])[i % 4],
        severity: 'medium',
        offsetMeters: i * 200,
        bearing: i * 45,
      }),
    );

    const scores = Array.from(
      { length: 6 },
      () => runFusionPipeline({ events, referenceMs: BASE_MS }).threat.score,
    );

    expect(new Set(scores).size).toBe(1);
  });

  it('is deterministic across repeated passes over identical input', () => {
    const build = (): UnifiedEvent[] => {
      seq = 0;
      return [
        ev({ source: 'radar', offsetMeters: 0 }),
        ev({ source: 'log', offsetMeters: 500 }),
        ev({ source: 'personnel', offsetMeters: 800 }),
      ];
    };

    const a = runFusionPipeline({ events: build(), referenceMs: BASE_MS });
    const b = runFusionPipeline({ events: build(), referenceMs: BASE_MS });

    expect(a.events.map((e) => e.confidence)).toEqual(b.events.map((e) => e.confidence));
    expect(a.threat.score).toBe(b.threat.score);
  });
});

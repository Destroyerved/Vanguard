/**
 * End-to-end pipeline: ingestion -> normalization -> validation -> store ->
 * fusion -> threat state, plus the state containers themselves.
 *
 * These tests drive the real simulators, so they also serve as a smoke test
 * that the demo scenario actually produces the effects the pitch claims.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { RadarSimAdapter } from '../src/ingestion/radar.sim.js';
import { LogsSimAdapter } from '../src/ingestion/logs.sim.js';
import { PersonnelSimAdapter } from '../src/ingestion/personnel.sim.js';
import { IncidentsSimAdapter } from '../src/ingestion/incidents.sim.js';
import { normalizeBatch } from '../src/normalization/normalize.js';
import { validateBatch, validateEvent } from '../src/normalization/validate.js';
import { runFusionPipeline } from '../src/fusion/pipeline.js';
import { EventStore } from '../src/state/EventStore.js';
import { ThreatState } from '../src/state/ThreatState.js';
import { SourceHealthRegistry } from '../src/state/SourceHealthRegistry.js';
import { createRng } from '../src/util/random.js';
import { SOURCE_RELIABILITY } from '../src/config/constants.js';
import type { PollContext } from '../src/ingestion/SourceAdapter.js';

const CONTEXT: PollContext = { nowMs: Date.now(), tick: 1, degradedMode: false };

describe('deterministic RNG', () => {
  it('produces an identical stream for an identical seed', () => {
    const a = Array.from({ length: 20 }, () => createRng(12345).next());
    const b = Array.from({ length: 20 }, () => createRng(12345).next());
    expect(a).toEqual(b);
  });

  it('produces different streams for different seeds', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it('stays inside its documented ranges', () => {
    const rng = createRng(999);
    for (let i = 0; i < 500; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);

      const n = rng.int(5, 10);
      expect(n).toBeGreaterThanOrEqual(5);
      expect(n).toBeLessThanOrEqual(10);
    }
  });
});

describe('radar simulator', () => {
  it('maintains persistent tracks across sweeps rather than random points', () => {
    const radar = new RadarSimAdapter(42, 0, 1);
    radar.init();

    const first = radar.poll(CONTEXT).observations.map((o) => o.payload.trackId);
    const second = radar
      .poll({ ...CONTEXT, nowMs: CONTEXT.nowMs + 3_000 })
      .observations.map((o) => o.payload.trackId);

    const persisted = first.filter((id) => second.includes(id));
    expect(persisted.length).toBeGreaterThan(0);
  });

  it('advances a track along its heading between sweeps', () => {
    const radar = new RadarSimAdapter(42, 0, 1);
    radar.init();
    radar.poll(CONTEXT);

    const before = radar.getTracks()[0]!;
    const startLat = before.position.lat;
    const startLng = before.position.lng;

    radar.poll({ ...CONTEXT, nowMs: CONTEXT.nowMs + 10_000 });
    const after = radar.getTracks().find((t) => t.trackId === before.trackId)!;

    expect(after.position.lat !== startLat || after.position.lng !== startLng).toBe(true);
  });

  it('injects a hostile contact that is fast, low and non-squawking', () => {
    const radar = new RadarSimAdapter(42, 0, 1);
    radar.init();

    const track = radar.injectHostileContact();
    expect(track.classification).toBe('suspect');
    expect(track.transponder).toBeNull();
    expect(track.speedKnots).toBeGreaterThan(200);
    expect(track.altitudeMeters).toBeLessThan(1_000);
  });
});

describe('normalization', () => {
  it('normalizes every simulator into valid UnifiedEvents', () => {
    const radar = new RadarSimAdapter(7, 0, 1);
    const logs = new LogsSimAdapter(7, 0, 1);
    const personnel = new PersonnelSimAdapter(7, 0, 1);
    const incidents = new IncidentsSimAdapter(7, 0, 3);

    radar.init();
    logs.init();
    personnel.init();

    const observations = [
      ...radar.poll(CONTEXT).observations,
      ...logs.poll(CONTEXT).observations,
      ...personnel.poll(CONTEXT).observations,
      ...incidents.poll(CONTEXT).observations,
    ];

    const events = normalizeBatch(observations);
    expect(events.length).toBeGreaterThan(0);

    for (const event of events) {
      expect(validateEvent(event).valid).toBe(true);
      // Discrete occurrences get sequential IDs; entity state gets stable,
      // entity-derived IDs (the `-T-` infix).
      expect(event.id).toMatch(/^EV-[A-Z]{3}-(\d{6}|T-[A-Z0-9-]+)$/);
      expect(event.baseSeverity).toBe(event.severity); // fusion has not run yet
      expect(event.corroboratedBy).toEqual([]);
    }
  });

  it('gives a radar track a STABLE id across sweeps, so one contact is one event', () => {
    const radar = new RadarSimAdapter(11, 0, 1);
    radar.init();

    const first = normalizeBatch(radar.poll(CONTEXT).observations);
    const second = normalizeBatch(
      radar.poll({ ...CONTEXT, nowMs: CONTEXT.nowMs + 3_000 }).observations,
    );

    const firstIds = new Set(first.map((e) => e.id));
    const repeated = second.filter((e) => firstIds.has(e.id));

    // Persisting tracks reuse their IDs rather than minting new events.
    expect(repeated.length).toBeGreaterThan(0);
  });

  it('gives each discrete incident report a UNIQUE id', () => {
    const incidents = new IncidentsSimAdapter(11, 0, 1);
    incidents.triggerScenario('perimeter_breach');

    const events = [
      ...normalizeBatch(incidents.poll(CONTEXT).observations),
      ...normalizeBatch(incidents.poll(CONTEXT).observations),
    ];

    expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
  });

  it('escalates a non-squawking, fast, low, small-RCS radar contact to critical', () => {
    const events = normalizeBatch([
      {
        sourceType: 'radar',
        sourceName: 'RADAR-PRIMARY',
        timestamp: new Date().toISOString(),
        payload: {
          trackId: 'R-9999',
          kind: 'uav',
          classification: 'suspect',
          lat: 23.02,
          lng: 72.57,
          speedKnots: 260,
          altitudeMeters: 300,
          transponder: null,
          radarCrossSectionM2: 0.6,
        },
      },
    ]);

    expect(events[0]!.severity).toBe('critical');
  });

  it('downgrades a high-severity report from a low-credibility unverified source', () => {
    const events = normalizeBatch([
      {
        sourceType: 'incident',
        sourceName: 'FIELD-DISPATCH',
        timestamp: new Date().toISOString(),
        payload: {
          title: 'Unauthorized entry reported',
          detail: 'Test',
          reportedSeverity: 'high',
          lat: 23.02,
          lng: 72.57,
          reporterCredibility: 0.35,
          verified: false,
        },
      },
    ]);

    // Claimed HIGH, but an anonymous unverified tip does not set posture alone.
    expect(events[0]!.severity).toBe('medium');
  });
});

describe('validation', () => {
  const valid = {
    id: 'EV-TEST-000001',
    sourceType: 'radar',
    sourceName: 'TEST',
    timestamp: new Date().toISOString(),
    location: { lat: 23.02, lng: 72.57 },
    severity: 'medium',
    baseSeverity: 'medium',
    title: 'Test',
    description: 'Test',
    confidence: 50,
    corroboratedBy: [],
    isAnomaly: false,
    raw: {},
  };

  it('accepts a well-formed event', () => {
    expect(validateEvent(valid).valid).toBe(true);
  });

  it('rejects coordinates outside the WGS-84 domain', () => {
    const result = validateEvent({ ...valid, location: { lat: 200, lng: 72 } });
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/WGS-84/);
  });

  it('rejects an unparseable timestamp', () => {
    expect(validateEvent({ ...valid, timestamp: 'not-a-date' }).valid).toBe(false);
  });

  it('rejects an unknown source type', () => {
    expect(validateEvent({ ...valid, sourceType: 'satellite' }).valid).toBe(false);
  });

  it('repairs an out-of-range confidence rather than rejecting', () => {
    const result = validateEvent({ ...valid, confidence: 150 });
    expect(result.valid).toBe(true);
    expect(result.event!.confidence).toBe(100);
    expect(result.repairs.length).toBeGreaterThan(0);
  });

  it('normalizes a heading into 0..360', () => {
    const result = validateEvent({
      ...valid,
      location: { lat: 23.02, lng: 72.57, headingDegrees: 450 },
    });
    expect(result.event!.location.headingDegrees).toBe(90);
  });

  it('counts rejections in a batch without discarding the survivors', () => {
    const result = validateBatch([valid, { ...valid, id: '' }, { ...valid, id: 'EV-2' }]);
    expect(result.events).toHaveLength(2);
    expect(result.rejected).toBe(1);
  });
});

describe('EventStore', () => {
  let store: EventStore;

  beforeEach(() => {
    store = new EventStore(100);
  });

  const make = (id: string, ageSeconds = 0, severity: 'low' | 'critical' = 'low') => ({
    id,
    sourceType: 'radar' as const,
    sourceName: 'TEST',
    timestamp: new Date(Date.now() - ageSeconds * 1000).toISOString(),
    location: { lat: 23.02, lng: 72.57 },
    severity,
    baseSeverity: severity,
    title: 'Test',
    description: 'Test',
    confidence: 50,
    corroboratedBy: [],
    isAnomaly: false,
    raw: {},
  });

  it('stores and retrieves by ID', () => {
    store.upsert([make('EV-1')]);
    expect(store.get('EV-1')).toBeDefined();
    expect(store.has('EV-1')).toBe(true);
    expect(store.has('EV-NOPE')).toBe(false);
  });

  it('replaces in place on re-upsert rather than duplicating', () => {
    store.upsert([make('EV-1')]);
    store.upsert([{ ...make('EV-1'), confidence: 95 }]);

    expect(store.size).toBe(1);
    expect(store.get('EV-1')!.confidence).toBe(95);
  });

  it('evicts the oldest events once at capacity', () => {
    for (let i = 0; i < 150; i++) store.upsert([make(`EV-${i}`)]);

    expect(store.size).toBe(100);
    expect(store.has('EV-0')).toBe(false);
    expect(store.has('EV-149')).toBe(true);
    expect(store.evictedCount).toBe(50);
  });

  it('excludes events beyond the active horizon', () => {
    store.upsert([make('EV-FRESH', 10), make('EV-STALE', 7_200)]);

    const active = store.active(3_600);
    expect(active.map((e) => e.id)).toEqual(['EV-FRESH']);
  });

  it('reconstructs a point-in-time snapshot for the time-scrubber', () => {
    store.upsert([make('EV-OLD', 600), make('EV-NEW', 10)]);

    const snapshot = store.snapshotAt(Date.now() - 300_000);
    expect(snapshot.map((e) => e.id)).toEqual(['EV-OLD']);
  });

  it('ranks significance by severity before recency', () => {
    store.upsert([make('EV-LOW', 5, 'low'), make('EV-CRIT', 300, 'critical')]);
    expect(store.mostSignificant(1)[0]!.id).toBe('EV-CRIT');
  });
});

describe('SourceHealthRegistry', () => {
  it('returns nominal reliability for a healthy feed', () => {
    const registry = new SourceHealthRegistry();
    registry.register('radar', 'RADAR-PRIMARY', SOURCE_RELIABILITY.radar);

    expect(registry.effectiveReliability('radar')).toBe(SOURCE_RELIABILITY.radar);
  });

  it('lowers reliability when a feed degrades — health drives the math', () => {
    const registry = new SourceHealthRegistry();
    registry.register('radar', 'RADAR-PRIMARY', SOURCE_RELIABILITY.radar);

    registry.recordPoll({
      sourceType: 'radar',
      sourceName: 'RADAR-PRIMARY',
      status: 'degraded',
      latencyMs: 10,
      observationCount: 0,
    });

    expect(registry.effectiveReliability('radar')).toBeLessThan(SOURCE_RELIABILITY.radar);
  });

  it('drops reliability sharply under an operator blackout', () => {
    const registry = new SourceHealthRegistry();
    registry.register('radar', 'RADAR-PRIMARY', SOURCE_RELIABILITY.radar);

    const before = registry.effectiveReliability('radar');
    registry.setBlackout(true);

    expect(registry.effectiveReliability('radar')).toBeLessThan(before * 0.5);
    expect(registry.hasBlackout()).toBe(true);

    registry.setBlackout(false);
    expect(registry.effectiveReliability('radar')).toBe(before);
  });
});

describe('ThreatState', () => {
  it('records an escalation with its trigger events', () => {
    const state = new ThreatState();

    const record = state.update(
      {
        score: 70,
        level: 'red',
        topContributors: [{ eventId: 'EV-1', contribution: 12 }],
        reason: 'test escalation',
      },
      [
        {
          id: 'EV-1',
          sourceType: 'radar',
          sourceName: 'TEST',
          timestamp: new Date().toISOString(),
          location: { lat: 23, lng: 72 },
          severity: 'critical',
          baseSeverity: 'critical',
          title: 'T',
          description: 'T',
          confidence: 90,
          corroboratedBy: [],
          isAnomaly: false,
          raw: {},
        },
      ],
    );

    expect(record).not.toBeNull();
    expect(record!.from).toBe('green');
    expect(record!.to).toBe('red');
    expect(record!.triggerEventIds).toContain('EV-1');
    expect(state.getLevel()).toBe('red');
  });

  it('returns null when the posture does not change', () => {
    const state = new ThreatState();
    const assessment = {
      score: 2,
      level: 'green' as const,
      topContributors: [],
      reason: 'quiet',
    };

    expect(state.update(assessment, [])).toBeNull();
  });
});

describe('scenario injection, end to end', () => {
  it('produces a correlated multi-source cluster from one operator action', () => {
    const incidents = new IncidentsSimAdapter(2026, 0, 1);
    const radar = new RadarSimAdapter(2026, 0, 1);
    radar.init();

    const { epicenter, queued } = incidents.triggerScenario('perimeter_breach');
    expect(queued).toBeGreaterThan(0);

    // Matching air activity at the same epicentre, as the orchestrator does.
    radar.injectHostileContact(epicenter);
    radar.injectHostileContact(epicenter);

    // Drain the queued reports the way successive ticks would.
    const observations = [
      ...incidents.poll(CONTEXT).observations,
      ...incidents.poll(CONTEXT).observations,
      ...radar.poll(CONTEXT).observations,
    ];

    const { events } = validateBatch(normalizeBatch(observations));
    const result = runFusionPipeline({ events });

    // The engine found at least one cluster spanning more than one feed.
    const multiSource = result.clusters.filter((c) => c.distinctSources.length >= 2);
    expect(multiSource.length).toBeGreaterThan(0);
    expect(result.threat.score).toBeGreaterThan(0);
  });
});

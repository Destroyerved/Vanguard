/**
 * Confidence scoring — the formula that every score in the product comes from.
 * These tests are the executable specification of Vanguard_PRD.md section 5.1.
 */

import { describe, expect, it } from 'vitest';
import {
  computeConfidence,
  confidenceBand,
  corroborationBoost,
  effectiveSourceCount,
  recencyFactor,
  spatialAgreement,
  temporalAgreement,
} from '../src/fusion/confidence.js';
import {
  CORROBORATION_BOOST_PER_SOURCE,
  MAX_CORROBORATION_BOOST,
  MIN_RECENCY_FACTOR,
  RECENCY_HALF_LIFE_SECONDS,
  SAME_SOURCE_CORROBORATION_WEIGHT,
} from '../src/config/constants.js';
import type { SourceType, UnifiedEvent } from '../src/types/events.js';

const BASE_MS = Date.parse('2026-09-08T12:00:00.000Z');

function makeEvent(overrides: Partial<UnifiedEvent> & { id: string }): UnifiedEvent {
  return {
    sourceType: 'radar',
    sourceName: 'TEST',
    timestamp: new Date(BASE_MS).toISOString(),
    location: { lat: 23.0225, lng: 72.5714 },
    severity: 'medium',
    baseSeverity: 'medium',
    title: 'Test event',
    description: 'Test',
    confidence: 50,
    corroboratedBy: [],
    isAnomaly: false,
    raw: {},
    ...overrides,
  };
}

describe('recencyFactor', () => {
  it('is 1.0 for a brand-new observation', () => {
    expect(recencyFactor(0)).toBeCloseTo(1, 6);
  });

  it('is exactly 0.5 at one half-life — the defining property of the decay', () => {
    expect(recencyFactor(RECENCY_HALF_LIFE_SECONDS)).toBeCloseTo(0.5, 6);
  });

  it('is 0.25 at two half-lives', () => {
    expect(recencyFactor(RECENCY_HALF_LIFE_SECONDS * 2)).toBeCloseTo(0.25, 6);
  });

  it('decays monotonically', () => {
    const samples = [0, 60, 300, 900, 1800, 3600].map(recencyFactor);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]!).toBeLessThanOrEqual(samples[i - 1]!);
    }
  });

  it('never falls below the floor, so a stale event keeps some weight', () => {
    expect(recencyFactor(86_400)).toBe(MIN_RECENCY_FACTOR);
    expect(recencyFactor(Number.POSITIVE_INFINITY)).toBe(MIN_RECENCY_FACTOR);
  });
});

describe('effectiveSourceCount', () => {
  it('counts a lone event as exactly one source', () => {
    expect(effectiveSourceCount('radar', [])).toBe(1);
  });

  it('gives a different source type full weight', () => {
    const corroborators = [makeEvent({ id: 'A', sourceType: 'log' })];
    expect(effectiveSourceCount('radar', corroborators)).toBe(2);
  });

  it('discounts a same-source corroborator — volume is not independence', () => {
    const corroborators = [makeEvent({ id: 'A', sourceType: 'radar' })];
    expect(effectiveSourceCount('radar', corroborators)).toBe(
      1 + SAME_SOURCE_CORROBORATION_WEIGHT,
    );
  });

  it('rewards breadth over depth for the same number of corroborators', () => {
    const broad = (['log', 'personnel', 'incident'] as SourceType[]).map((s, i) =>
      makeEvent({ id: `B${i}`, sourceType: s }),
    );
    const deep = (['radar', 'radar', 'radar'] as SourceType[]).map((s, i) =>
      makeEvent({ id: `D${i}`, sourceType: s }),
    );

    expect(effectiveSourceCount('radar', broad)).toBeGreaterThan(
      effectiveSourceCount('radar', deep),
    );
  });
});

describe('corroborationBoost', () => {
  it('is exactly 1.0 for a single uncorroborated source', () => {
    expect(corroborationBoost(1)).toBe(1);
  });

  it('follows 1 + 0.15 * (N - 1)', () => {
    expect(corroborationBoost(3)).toBeCloseTo(1 + CORROBORATION_BOOST_PER_SOURCE * 2, 6);
  });

  it('is hard-capped so correlated noise cannot manufacture certainty', () => {
    expect(corroborationBoost(50)).toBe(MAX_CORROBORATION_BOOST);
  });
});

describe('spatialAgreement / temporalAgreement', () => {
  it('report zero when there is nothing to agree with', () => {
    const event = makeEvent({ id: 'E1' });
    expect(spatialAgreement(event, [])).toBe(0);
    expect(temporalAgreement(event, [])).toBe(0);
  });

  it('are 1.0 for a co-located, simultaneous corroborator', () => {
    const event = makeEvent({ id: 'E1' });
    const twin = makeEvent({ id: 'E2', sourceType: 'log' });
    expect(spatialAgreement(event, [twin])).toBeCloseTo(1, 6);
    expect(temporalAgreement(event, [twin])).toBeCloseTo(1, 6);
  });

  it('fall toward zero at the edge of the correlation windows', () => {
    const event = makeEvent({ id: 'E1' });
    // ~4.9km away: just inside the 5km radius.
    const distant = makeEvent({
      id: 'E2',
      sourceType: 'log',
      location: { lat: 23.0666, lng: 72.5714 },
    });
    const agreement = spatialAgreement(event, [distant]);
    expect(agreement).toBeGreaterThan(0);
    expect(agreement).toBeLessThan(0.15);
  });
});

describe('computeConfidence', () => {
  it('reproduces the documented formula exactly', () => {
    const event = makeEvent({ id: 'E1', sourceType: 'radar' });

    const result = computeConfidence({
      event,
      corroborators: [],
      effectiveReliability: 0.92,
      referenceMs: BASE_MS, // zero age -> recency 1.0
    });

    // 0.92 * 1.0 * 1.0 * 100 = 92
    expect(result.confidence).toBe(92);
    expect(result.factors.recencyDecay).toBeCloseTo(1, 3);
    expect(result.factors.corroborationBoost).toBe(1);
  });

  it('is never above 100 even when every factor is maximal', () => {
    const event = makeEvent({ id: 'E1', sourceType: 'weather' });
    const corroborators = (['radar', 'log', 'personnel', 'incident'] as SourceType[]).map(
      (s, i) => makeEvent({ id: `C${i}`, sourceType: s }),
    );

    const result = computeConfidence({
      event,
      corroborators,
      effectiveReliability: 1,
      referenceMs: BASE_MS,
    });

    expect(result.confidence).toBeLessThanOrEqual(100);
  });

  it('raises the score when independent sources corroborate', () => {
    const event = makeEvent({ id: 'E1', sourceType: 'radar' });
    const corroborators = [
      makeEvent({ id: 'C1', sourceType: 'log' }),
      makeEvent({ id: 'C2', sourceType: 'personnel' }),
    ];

    const alone = computeConfidence({ event, corroborators: [], referenceMs: BASE_MS });
    const together = computeConfidence({ event, corroborators, referenceMs: BASE_MS });

    expect(together.confidence).toBeGreaterThan(alone.confidence);
  });

  it('lowers the score when the feed is degraded', () => {
    const event = makeEvent({ id: 'E1' });

    const healthy = computeConfidence({
      event,
      corroborators: [],
      effectiveReliability: 0.92,
      referenceMs: BASE_MS,
    });
    const degraded = computeConfidence({
      event,
      corroborators: [],
      effectiveReliability: 0.92 * 0.4,
      referenceMs: BASE_MS,
    });

    expect(degraded.confidence).toBeLessThan(healthy.confidence);
  });

  it('emits a breakdown whose fields are all valid 0-100 integers', () => {
    const event = makeEvent({ id: 'E1' });
    const result = computeConfidence({
      event,
      corroborators: [makeEvent({ id: 'C1', sourceType: 'log' })],
      referenceMs: BASE_MS,
    });

    for (const value of Object.values(result.breakdown)) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
    expect(result.breakdown.overall).toBe(result.confidence);
  });

  it('is deterministic — the same inputs always produce the same score', () => {
    const event = makeEvent({ id: 'E1' });
    const args = { event, corroborators: [], referenceMs: BASE_MS };

    const runs = Array.from({ length: 5 }, () => computeConfidence(args).confidence);
    expect(new Set(runs).size).toBe(1);
  });
});

describe('confidenceBand', () => {
  it('bands scores at the documented thresholds', () => {
    expect(confidenceBand(95)).toBe('high');
    expect(confidenceBand(80)).toBe('high');
    expect(confidenceBand(79)).toBe('medium');
    expect(confidenceBand(50)).toBe('medium');
    expect(confidenceBand(49)).toBe('low');
    expect(confidenceBand(0)).toBe('low');
  });
});

/**
 * Citation grounding — the anti-hallucination guarantee.
 *
 * These are the most important tests in the repository. They prove that an
 * invented event ID cannot reach an operator's screen, which is the claim the
 * entire "explainable AI" pitch rests on.
 */

import { describe, expect, it } from 'vitest';
import { findUngroundedCitations, groundSummary } from '../src/ai/grounding.js';
import { synthesizeDeterministic } from '../src/ai/fallback.js';
import { selectEvidence } from '../src/ai/briefing.js';
import { parseQueryHeuristic, applyFilter } from '../src/ai/nlQuery.js';
import type { AISummary } from '../src/types/ai.js';
import type { SeverityLevel, SourceType, UnifiedEvent } from '../src/types/events.js';

/** Minimal resolver standing in for the EventStore. */
function makeResolver(events: UnifiedEvent[]) {
  const index = new Map(events.map((e) => [e.id, e]));
  return {
    has: (id: string): boolean => index.has(id),
    get: (id: string): { confidence: number } | undefined => index.get(id),
  };
}

function makeEvent(
  id: string,
  overrides: Partial<UnifiedEvent> = {},
): UnifiedEvent {
  return {
    id,
    sourceType: 'radar',
    sourceName: 'TEST',
    timestamp: new Date().toISOString(),
    location: { lat: 23.0225, lng: 72.5714 },
    severity: 'medium',
    baseSeverity: 'medium',
    title: 'Test contact',
    description: 'Synthetic event',
    confidence: 80,
    corroboratedBy: [],
    isAnomaly: false,
    raw: {},
    ...overrides,
  };
}

function makeSummary(overrides: Partial<AISummary> = {}): AISummary {
  return {
    generatedAt: new Date().toISOString(),
    threatLevel: 'yellow',
    headline: 'Test headline',
    executiveSummary: 'Test summary.',
    keyDevelopments: [],
    prioritizedActions: [],
    coursesOfAction: [],
    overallConfidence: 0,
    provenance: {
      engine: 'gemini',
      model: 'test',
      latencyMs: 0,
      eventsConsidered: 0,
      citationsStripped: 0,
      claimsDiscarded: 0,
    },
    ...overrides,
  };
}

describe('groundSummary', () => {
  const events = [makeEvent('EV-RAD-000001'), makeEvent('EV-LOG-000002', { confidence: 60 })];
  const resolver = makeResolver(events);

  it('keeps citations that resolve to real events', () => {
    const summary = makeSummary({
      keyDevelopments: [
        { point: 'Real development', supportingEventIds: ['EV-RAD-000001'] },
      ],
    });

    const { summary: grounded, report } = groundSummary(summary, resolver);

    expect(grounded.keyDevelopments).toHaveLength(1);
    expect(report.citationsStripped).toBe(0);
  });

  it('STRIPS an invented event ID', () => {
    const summary = makeSummary({
      keyDevelopments: [
        {
          point: 'Partly invented',
          supportingEventIds: ['EV-RAD-000001', 'EV-RAD-999999'],
        },
      ],
    });

    const { summary: grounded, report } = groundSummary(summary, resolver);

    expect(grounded.keyDevelopments[0]!.supportingEventIds).toEqual(['EV-RAD-000001']);
    expect(report.citationsStripped).toBe(1);
    expect(report.strippedIds).toContain('EV-RAD-999999');
  });

  it('DISCARDS a claim whose every citation is invented', () => {
    const summary = makeSummary({
      keyDevelopments: [
        { point: 'Entirely fabricated', supportingEventIds: ['EV-FAKE-000001'] },
        { point: 'Genuine', supportingEventIds: ['EV-RAD-000001'] },
      ],
    });

    const { summary: grounded, report } = groundSummary(summary, resolver);

    expect(grounded.keyDevelopments).toHaveLength(1);
    expect(grounded.keyDevelopments[0]!.point).toBe('Genuine');
    expect(report.claimsDiscarded).toBe(1);
  });

  it('discards an uncited claim entirely', () => {
    const summary = makeSummary({
      keyDevelopments: [{ point: 'No evidence offered', supportingEventIds: [] }],
    });

    expect(groundSummary(summary, resolver).summary.keyDevelopments).toHaveLength(0);
  });

  it('applies the same rule to prioritized actions', () => {
    const summary = makeSummary({
      prioritizedActions: [
        { action: 'Real action', urgency: 4, supportingEventIds: ['EV-LOG-000002'] },
        { action: 'Fabricated action', urgency: 5, supportingEventIds: ['EV-NOPE-000001'] },
      ],
    });

    const grounded = groundSummary(summary, resolver).summary;
    expect(grounded.prioritizedActions).toHaveLength(1);
    expect(grounded.prioritizedActions[0]!.action).toBe('Real action');
  });

  it('recomputes overall confidence from surviving citations, ignoring the model', () => {
    const summary = makeSummary({
      overallConfidence: 99, // the model's claim, which must be discarded
      keyDevelopments: [
        { point: 'A', supportingEventIds: ['EV-RAD-000001'] }, // conf 80
        { point: 'B', supportingEventIds: ['EV-LOG-000002'] }, // conf 60
      ],
    });

    expect(groundSummary(summary, resolver).summary.overallConfidence).toBe(70);
  });

  it('clamps an out-of-range urgency into 1..5', () => {
    const summary = makeSummary({
      prioritizedActions: [
        { action: 'Over', urgency: 99, supportingEventIds: ['EV-RAD-000001'] },
        { action: 'Under', urgency: -4, supportingEventIds: ['EV-RAD-000001'] },
      ],
    });

    const actions = groundSummary(summary, resolver).summary.prioritizedActions;
    expect(actions[0]!.urgency).toBe(5);
    expect(actions[1]!.urgency).toBe(1);
  });

  it('deduplicates a repeated citation', () => {
    const summary = makeSummary({
      keyDevelopments: [
        {
          point: 'Repeated evidence',
          supportingEventIds: ['EV-RAD-000001', 'EV-RAD-000001', 'EV-RAD-000001'],
        },
      ],
    });

    expect(
      groundSummary(summary, resolver).summary.keyDevelopments[0]!.supportingEventIds,
    ).toEqual(['EV-RAD-000001']);
  });

  it('leaves no ungrounded citation behind — the end-to-end invariant', () => {
    const summary = makeSummary({
      keyDevelopments: [
        { point: 'Mixed', supportingEventIds: ['EV-RAD-000001', 'EV-GHOST-1'] },
      ],
      prioritizedActions: [
        { action: 'Mixed', urgency: 3, supportingEventIds: ['EV-GHOST-2', 'EV-LOG-000002'] },
      ],
      coursesOfAction: [
        {
          id: 'COA-0001',
          title: 'Option',
          description: 'Test',
          pros: [],
          tradeoffs: [],
          recommendedUrgency: 3,
          supportingEventIds: ['EV-GHOST-3'],
        },
      ],
    });

    const grounded = groundSummary(summary, resolver).summary;
    expect(findUngroundedCitations(grounded, resolver)).toEqual([]);
  });
});

describe('deterministic synthesizer', () => {
  it('produces a complete briefing with no model call', () => {
    const events = [
      makeEvent('EV-RAD-000001', { severity: 'critical', confidence: 90 }),
      makeEvent('EV-LOG-000002', { sourceType: 'log', severity: 'high' }),
      makeEvent('EV-PER-000003', { sourceType: 'personnel', severity: 'medium' }),
    ];

    const summary = synthesizeDeterministic({
      events,
      clusters: [],
      threatLevel: 'orange',
      threatScore: 35,
      degradedFeeds: [],
      degradedMode: false,
    });

    expect(summary.provenance.engine).toBe('deterministic');
    expect(summary.headline.length).toBeGreaterThan(0);
    expect(summary.executiveSummary.length).toBeGreaterThan(0);
    expect(summary.keyDevelopments.length).toBeGreaterThan(0);
    expect(summary.prioritizedActions.length).toBeGreaterThan(0);
    expect(summary.coursesOfAction.length).toBeGreaterThanOrEqual(2);
  });

  it('cites only real event IDs — grounding is structural, not checked', () => {
    const events = [
      makeEvent('EV-RAD-000001', { severity: 'critical' }),
      makeEvent('EV-LOG-000002', { sourceType: 'log', severity: 'high' }),
    ];

    const summary = synthesizeDeterministic({
      events,
      clusters: [],
      threatLevel: 'red',
      threatScore: 70,
      degradedFeeds: [],
      degradedMode: false,
    });

    expect(findUngroundedCitations(summary, makeResolver(events))).toEqual([]);
  });

  it('offers genuinely distinct courses of action, not one option three times', () => {
    const summary = synthesizeDeterministic({
      events: [makeEvent('EV-RAD-000001', { severity: 'high' })],
      clusters: [],
      threatLevel: 'orange',
      threatScore: 30,
      degradedFeeds: [],
      degradedMode: false,
    });

    const titles = summary.coursesOfAction.map((c) => c.title);
    expect(new Set(titles).size).toBe(titles.length);
    // Every option states an honest cost.
    expect(summary.coursesOfAction.every((c) => c.tradeoffs.length > 0)).toBe(true);
  });

  it('states the limitation explicitly under degraded comms', () => {
    const summary = synthesizeDeterministic({
      events: [makeEvent('EV-RAD-000001')],
      clusters: [],
      threatLevel: 'yellow',
      threatScore: 15,
      degradedFeeds: ['RADAR-PRIMARY'],
      degradedMode: true,
    });

    expect(summary.executiveSummary).toMatch(/degraded/i);
  });

  it('handles an empty picture without throwing', () => {
    const summary = synthesizeDeterministic({
      events: [],
      clusters: [],
      threatLevel: 'green',
      threatScore: 0,
      degradedFeeds: [],
      degradedMode: false,
    });

    expect(summary.headline.length).toBeGreaterThan(0);
  });
});

describe('selectEvidence', () => {
  it('ranks by severity before recency', () => {
    const old = makeEvent('EV-OLD-1', {
      severity: 'critical',
      timestamp: new Date(Date.now() - 600_000).toISOString(),
    });
    const fresh = makeEvent('EV-NEW-1', { severity: 'low' });

    expect(selectEvidence([fresh, old], 10)[0]!.id).toBe('EV-OLD-1');
  });

  it('respects the evidence budget', () => {
    const events = Array.from({ length: 200 }, (_, i) => makeEvent(`EV-${i}`));
    expect(selectEvidence(events, 60)).toHaveLength(60);
  });
});

describe('natural-language query parser (heuristic)', () => {
  const cases: { query: string; expect: (f: ReturnType<typeof parseQueryHeuristic>['filter']) => void }[] = [
    {
      query: 'show me high severity radar contacts',
      expect: (f) => {
        expect(f.sourceTypes).toContain('radar');
        expect(f.severities).toContain('high');
        // "high" implies critical: an operator asking for serious events does
        // not mean "but hide the worst ones".
        expect(f.severities).toContain('critical');
      },
    },
    {
      query: 'incidents in the past 30 minutes',
      expect: (f) => {
        expect(f.sourceTypes).toContain('incident');
        expect(f.withinMinutes).toBe(30);
      },
    },
    {
      query: 'anything unusual in the past hour',
      expect: (f) => {
        expect(f.anomaliesOnly).toBe(true);
        expect(f.withinMinutes).toBe(60);
      },
    },
    {
      query: 'corroborated contacts near sector 3',
      expect: (f) => {
        expect(f.minCorroborations).toBe(1);
        expect(f.zoneName).toBe('Sector 3 South');
        expect(f.nearPoint).toBeDefined();
      },
    },
    {
      query: 'events above 80% confidence',
      expect: (f) => expect(f.minConfidence).toBe(80),
    },
  ];

  for (const testCase of cases) {
    it(`parses "${testCase.query}"`, () => {
      testCase.expect(parseQueryHeuristic(testCase.query).filter);
    });
  }

  it('returns an empty filter for an unconstrained query', () => {
    expect(Object.keys(parseQueryHeuristic('show everything').filter)).toHaveLength(0);
  });
});

describe('applyFilter', () => {
  const events: UnifiedEvent[] = [
    makeEvent('EV-1', { sourceType: 'radar', severity: 'critical', confidence: 90 }),
    makeEvent('EV-2', { sourceType: 'log', severity: 'low', confidence: 40 }),
    makeEvent('EV-3', {
      sourceType: 'incident',
      severity: 'high',
      confidence: 75,
      isAnomaly: true,
    }),
  ];

  it('filters by source type', () => {
    const result = applyFilter(events, { sourceTypes: ['radar' as SourceType] });
    expect(result.map((e) => e.id)).toEqual(['EV-1']);
  });

  it('filters by severity', () => {
    const result = applyFilter(events, {
      severities: ['critical', 'high'] as SeverityLevel[],
    });
    expect(result).toHaveLength(2);
  });

  it('filters by minimum confidence', () => {
    expect(applyFilter(events, { minConfidence: 80 })).toHaveLength(1);
  });

  it('filters to anomalies only', () => {
    expect(applyFilter(events, { anomaliesOnly: true }).map((e) => e.id)).toEqual(['EV-3']);
  });

  it('returns everything for an empty filter', () => {
    expect(applyFilter(events, {})).toHaveLength(3);
  });
});

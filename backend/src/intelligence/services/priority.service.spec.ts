import { describe, expect, it } from 'vitest';
import { PriorityService } from './priority.service.js';
import type { UnifiedEvent } from '../../common/types/index.js';

function event(overrides: Partial<UnifiedEvent>): UnifiedEvent {
  return {
    id: 'evt-test',
    sourceType: 'radar',
    timestamp: new Date().toISOString(),
    location: { lat: 23.03, lng: 72.58 },
    severity: 'medium',
    title: 'Test event',
    description: 'Test',
    confidence: 70,
    corroboratedBy: [],
    isAnomaly: false,
    raw: {},
    ...overrides,
  };
}

describe('PriorityService', () => {
  const service = new PriorityService();

  it('escalates critical severity to critical priority', () => {
    const result = service.prioritize(event({ severity: 'critical', confidence: 90 }));
    expect(result.priority).toBe('critical');
  });

  it('flags low severity + no corroboration as low/medium priority', () => {
    const result = service.prioritize(event({ severity: 'low', confidence: 30 }));
    expect(['low', 'medium']).toContain(result.priority);
  });

  it('boosts priority with corroboration count', () => {
    const noCorrob = service.prioritize(event({}), 0);
    const corrob = service.prioritize(event({}), 3);
    expect(corrob.score).toBeGreaterThan(noCorrob.score);
  });
});
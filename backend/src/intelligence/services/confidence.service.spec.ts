import { describe, expect, it } from 'vitest';
import { ConfidenceService } from './confidence.service.js';

describe('ConfidenceService (PRD §5.1)', () => {
  const service = new ConfidenceService();

  it('computes high confidence for recent, corroborated radar events', () => {
    const confidence = service.compute({
      sourceType: 'radar',
      timestamp: new Date().toISOString(),
      corroborationCount: 3,
      sourceAgreement: 0.9,
      spatialAgreement: 0.9,
      temporalAgreement: 0.9,
    });
    // radar reliability 0.9 * recency ~1 * boost 1.3 => ~117, capped at 100
    expect(confidence).toBe(100);
  });

  it('applies recency decay for old events', () => {
    const old = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const fresh = new Date().toISOString();
    const oldConfidence = service.compute({
      sourceType: 'radar',
      timestamp: old,
      corroborationCount: 1,
      sourceAgreement: 1,
      spatialAgreement: 1,
      temporalAgreement: 1,
    });
    const freshConfidence = service.compute({
      sourceType: 'radar',
      timestamp: fresh,
      corroborationCount: 1,
      sourceAgreement: 1,
      spatialAgreement: 1,
      temporalAgreement: 1,
    });
    expect(oldConfidence).toBeLessThan(freshConfidence);
  });

  it('corroboration boost increases confidence with more sources', () => {
    const one = service.compute({
      sourceType: 'log',
      timestamp: new Date().toISOString(),
      corroborationCount: 1,
      sourceAgreement: 1,
      spatialAgreement: 1,
      temporalAgreement: 1,
    });
    const four = service.compute({
      sourceType: 'log',
      timestamp: new Date().toISOString(),
      corroborationCount: 4,
      sourceAgreement: 1,
      spatialAgreement: 1,
      temporalAgreement: 1,
    });
    expect(four).toBeGreaterThan(one);
  });

  it('produces a 5-factor breakdown', () => {
    const breakdown = service.breakdown({
      sourceType: 'weather',
      timestamp: new Date().toISOString(),
      corroborationCount: 2,
      sourceAgreement: 0.85,
      spatialAgreement: 0.7,
      temporalAgreement: 0.6,
    });
    expect(breakdown.overall).toBeGreaterThan(0);
    expect(breakdown).toHaveProperty('sourceAgreement');
    expect(breakdown).toHaveProperty('spatialAgreement');
    expect(breakdown).toHaveProperty('temporalAgreement');
    expect(breakdown).toHaveProperty('sourceReliability');
    expect(breakdown).toHaveProperty('dataFreshness');
  });
});
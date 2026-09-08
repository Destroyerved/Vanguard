import { describe, expect, it } from 'vitest';
import { haversineMeters } from './geo.util.js';

describe('geo.util', () => {
  it('computes ~0 distance for identical coordinates', () => {
    const d = haversineMeters({ lat: 23.03, lng: 72.58 }, { lat: 23.03, lng: 72.58 });
    expect(d).toBeLessThan(1);
  });

  it('computes a realistic distance between known points', () => {
    // Ahmedabad (~23.03, 72.58) to Mumbai (~19.07, 72.87) ~ 445 km
    const d = haversineMeters(
      { lat: 23.03, lng: 72.58 },
      { lat: 19.07, lng: 72.87 },
    );
    expect(d).toBeGreaterThan(430_000);
    expect(d).toBeLessThan(460_000);
  });
});
import type { ConfidenceBreakdown, GeoLocation, SourceType, UnifiedEvent } from '../types/vanguard';

// Source reliability static base weights
export const SOURCE_RELIABILITY_MAP: Record<SourceType, number> = {
  radar: 0.94,
  weather: 0.98,
  personnel: 0.91,
  log: 0.88,
  incident: 0.82
};

// Calculate Haversine distance in kilometers between two geo coordinates
export function calculateHaversineDistanceKm(loc1: GeoLocation, loc2: GeoLocation): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((loc2.lat - loc1.lat) * Math.PI) / 180;
  const dLon = ((loc2.lng - loc1.lng) * Math.PI) / 180;
  const lat1 = (loc1.lat * Math.PI) / 180;
  const lat2 = (loc2.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Compute deterministic confidence breakdown and overall score
export function computeConfidence(
  sourceType: SourceType,
  eventTimestamp: string,
  corroboratingCount: number,
  spatialClosenessKm: number = 2.5
): { overall: number; breakdown: ConfidenceBreakdown } {
  const sourceReliability = SOURCE_RELIABILITY_MAP[sourceType] || 0.85;

  // Recency decay: e^(-lambda * deltaT_minutes), lambda = 0.005
  const ageMinutes = Math.max(0, (Date.now() - new Date(eventTimestamp).getTime()) / (1000 * 60));
  const recencyDecay = Math.exp(-0.004 * ageMinutes);

  // Corroboration boost: 1.0 + 0.15 * (N - 1)
  const corroborationBoost = 1.0 + 0.15 * Math.max(0, corroboratingCount);

  // Sub-scores for explainability drawer (0-100 scale)
  const sourceAgreement = Math.min(100, Math.round(80 + Math.min(corroboratingCount * 8, 20)));
  const spatialAgreement = Math.min(100, Math.max(40, Math.round(100 - spatialClosenessKm * 3)));
  const temporalAgreement = Math.min(100, Math.max(30, Math.round(recencyDecay * 100)));
  const reliabilityPercent = Math.round(sourceReliability * 100);
  const freshnessPercent = Math.min(100, Math.max(20, Math.round(recencyDecay * 100)));

  // Overall formula: min(100, round(SourceReliability * RecencyDecay * CorroborationBoost * 100))
  const rawScore = sourceReliability * recencyDecay * corroborationBoost * 100;
  const overall = Math.min(100, Math.max(10, Math.round(rawScore)));

  return {
    overall,
    breakdown: {
      overall,
      sourceAgreement,
      spatialAgreement,
      temporalAgreement,
      sourceReliability: reliabilityPercent,
      dataFreshness: freshnessPercent
    }
  };
}

// Corroborate an incoming event against an active pool of events
export function findCorroborations(
  target: UnifiedEvent,
  pool: UnifiedEvent[],
  maxDistanceKm: number = 35.0,
  maxTimeDiffMinutes: number = 45.0
): string[] {
  const corroboratingIds: string[] = [];
  const targetTime = new Date(target.timestamp).getTime();

  for (const item of pool) {
    if (item.id === target.id) continue;

    const timeDiffMinutes = Math.abs(targetTime - new Date(item.timestamp).getTime()) / (1000 * 60);
    if (timeDiffMinutes > maxTimeDiffMinutes) continue;

    const distanceKm = calculateHaversineDistanceKm(target.location, item.location);
    if (distanceKm <= maxDistanceKm) {
      corroboratingIds.push(item.id);
    }
  }

  return corroboratingIds;
}

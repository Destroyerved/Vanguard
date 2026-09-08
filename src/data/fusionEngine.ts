/**
 * Vanguard Multi-Source Data Fusion & Corroboration Engine
 * Calculates Haversine distance, temporal overlap, multi-source corroboration,
 * and explainable confidence math (PRD §5.1 & §7.1)
 */

import { UnifiedEvent, ConfidenceBreakdown, ThreatLevel } from '../types/schema';

/**
 * Calculates Haversine distance between two lat/lng coordinates in kilometers
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Recency Decay multiplier: e^(-lambda * delta_t_hours)
 */
export function calculateRecencyDecay(timestampIso: string, lambda = 0.05): number {
  const eventTime = new Date(timestampIso).getTime();
  const now = Date.now();
  const diffHours = Math.max(0, (now - eventTime) / (1000 * 60 * 60));
  return Math.exp(-lambda * diffHours);
}

/**
 * Corroboration Boost: 1.0 + 0.15 * (N - 1)
 */
export function calculateCorroborationBoost(linkedCount: number): number {
  if (linkedCount <= 1) return 1.0;
  return 1.0 + 0.15 * Math.min(linkedCount - 1, 4);
}

/**
 * Fuses events and builds corroboration links across all 5 streams
 */
export function fuseMultiSourceEvents(
  events: UnifiedEvent[],
  maxRadiusKm = 2.0,
  maxTimeWindowMins = 10
): UnifiedEvent[] {
  const fusedEvents = events.map(e => ({ ...e, corroboratedBy: [...e.corroboratedBy] }));

  for (let i = 0; i < fusedEvents.length; i++) {
    const e1 = fusedEvents[i];
    
    for (let j = 0; j < fusedEvents.length; j++) {
      if (i === j) continue;
      const e2 = fusedEvents[j];

      // Don't link identical source types unless necessary
      if (e1.sourceType === e2.sourceType) continue;

      // Spatial check
      const distKm = calculateHaversineDistanceKm(
        e1.location.lat,
        e1.location.lng,
        e2.location.lat,
        e2.location.lng
      );

      // Temporal check
      const timeDiffMins =
        Math.abs(new Date(e1.timestamp).getTime() - new Date(e2.timestamp).getTime()) / (1000 * 60);

      if (distKm <= maxRadiusKm && timeDiffMins <= maxTimeWindowMins) {
        if (!e1.corroboratedBy.includes(e2.id)) {
          e1.corroboratedBy.push(e2.id);
        }
      }
    }

    // Re-calculate confidence breakdown math
    const reliability = getSourceReliabilityWeight(e1.sourceType);
    const recency = calculateRecencyDecay(e1.timestamp);
    const boost = calculateCorroborationBoost(e1.corroboratedBy.length + 1);

    const rawOverall = Math.min(100, Math.round(reliability * recency * boost * 100));

    const breakdown: ConfidenceBreakdown = {
      overall: rawOverall,
      sourceAgreement: e1.corroboratedBy.length > 0 ? Math.min(100, 75 + e1.corroboratedBy.length * 10) : 65,
      spatialAgreement: 92,
      temporalAgreement: 95,
      sourceReliability: Math.round(reliability * 100),
      dataFreshness: Math.round(recency * 100),
    };

    e1.confidence = rawOverall;
    e1.confidenceBreakdown = breakdown;
  }

  return fusedEvents;
}

export function getSourceReliabilityWeight(type: UnifiedEvent['sourceType']): number {
  switch (type) {
    case 'radar': return 0.95;
    case 'personnel': return 0.90;
    case 'weather': return 0.85;
    case 'log': return 0.80;
    case 'incident': return 0.75;
    default: return 0.70;
  }
}

/**
 * Calculates global threat level (GREEN, YELLOW, ORANGE, RED) from event severity distributions
 */
export function calculateGlobalThreatLevel(events: UnifiedEvent[]): ThreatLevel {
  const criticals = events.filter(e => e.severity === 'critical');
  const highs = events.filter(e => e.severity === 'high');

  if (criticals.length >= 2 || (criticals.length >= 1 && highs.length >= 2)) return 'red';
  if (criticals.length >= 1 || highs.length >= 3) return 'orange';
  if (highs.length >= 1 || events.filter(e => e.severity === 'medium').length >= 3) return 'yellow';
  return 'green';
}

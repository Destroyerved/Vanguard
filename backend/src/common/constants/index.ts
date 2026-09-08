import type { SourceType, SourceHealth, PriorityLevel, SeverityLevel } from '../types/index.js';

export const SOURCE_TYPES: SourceType[] = ['radar', 'weather', 'personnel', 'log', 'incident'];

export const SEVERITY_ORDER: Record<SeverityLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export const PRIORITY_ORDER: Record<PriorityLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export const THREAT_ORDER: Record<string, number> = {
  green: 1,
  yellow: 2,
  orange: 3,
  red: 4,
};

/**
 * Confidence formula (PRD §5.1):
 *   Confidence = min(100, round(SourceReliability * RecencyDecay * CorroborationBoost * 100))
 *   RecencyDecay    = e^(-lambda * deltaT)
 *   CorroborationBoost = 1 + 0.15 * (N - 1)
 */
export const CONFIDENCE = {
  LAMBDA: 1 / (60 * 60 * 1000), // per ms, ~1 hour half-life
  CORROBORATION_STEP: 0.15,
  MAX: 100,
};

export const SPATIAL_RADIUS_METERS = 2000;
export const TEMPORAL_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Source reliability profiles (0.0 - 1.0). Static baseline weights used for
 * the SourceReliability factor in the confidence formula. Dynamic per-source
 * reliability scoring can override these.
 */
export const SOURCE_RELIABILITY: Record<SourceType, number> = {
  radar: 0.9,
  weather: 0.85,
  personnel: 0.8,
  log: 0.75,
  incident: 0.7,
};

export const SOURCE_DISPLAY_NAMES: Record<SourceType, string> = {
  radar: 'Radar / Surveillance',
  weather: 'Weather (Open-Meteo)',
  personnel: 'Personnel & Assets',
  log: 'Operational Logs',
  incident: 'Incident Reports',
};

export const DEFAULT_SOURCE_HEALTH: SourceHealth[] = SOURCE_TYPES.map((st) => ({
  sourceType: st,
  sourceName: SOURCE_DISPLAY_NAMES[st],
  status: 'live',
  lastUpdate: new Date(0).toISOString(),
  reliabilityScore: SOURCE_RELIABILITY[st],
  activeCount: 0,
}));

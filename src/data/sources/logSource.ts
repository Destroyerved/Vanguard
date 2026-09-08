/**
 * Base Defense Perimeter & Operational Log Stream Collector
 */

import { UnifiedEvent, SourceHealth } from '../../types/schema';

export const LOG_RELIABILITY = 0.80;

export function getLogEvents(): UnifiedEvent[] {
  const now = new Date();

  return [
    {
      id: 'LOG-TRIP-01',
      sourceType: 'log',
      timestamp: new Date(now.getTime() - 120000).toISOString(),
      location: { lat: 28.6425, lng: 77.2430 },
      severity: 'critical',
      title: 'PERIMETER TRIPWIRE BREACH — Optical Sensor Sector 4',
      description: 'Fiber-optic fence sensor triggered at Sector 4-B. Unscheduled physical entry detected near radar contact RAD-7041 trajectory.',
      confidence: 88,
      confidenceBreakdown: {
        overall: 88,
        sourceAgreement: 85,
        spatialAgreement: 92,
        temporalAgreement: 95,
        sourceReliability: 80,
        dataFreshness: 90,
      },
      corroboratedBy: ['RAD-EVT-1'], // Links to RAD-7041 radar track!
      isAnomaly: true,
      raw: { sensorId: 'OPTIC-SEC4-B', breachType: 'PHYSICAL_VIBRATION', signalLevel: 94 },
    },
    {
      id: 'LOG-JAM-02',
      sourceType: 'log',
      timestamp: new Date(now.getTime() - 300000).toISOString(),
      location: { lat: 28.6810, lng: 77.2900 },
      severity: 'high',
      title: 'RF FREQUENCY JAMMING DETECTED — VHF Band',
      description: 'Wideband RF noise spike registered across 142MHz - 156MHz frequency band near Eastern Perimeter Watchtower.',
      confidence: 82,
      confidenceBreakdown: {
        overall: 82,
        sourceAgreement: 80,
        spatialAgreement: 85,
        temporalAgreement: 88,
        sourceReliability: 80,
        dataFreshness: 85,
      },
      corroboratedBy: ['RAD-EVT-3'], // Links to hostile stealth contact!
      isAnomaly: true,
      raw: { band: 'VHF', noiseFloorDbm: -45, normalDbm: -110 },
    },
    {
      id: 'LOG-SYS-03',
      sourceType: 'log',
      timestamp: new Date(now.getTime() - 600000).toISOString(),
      location: { lat: 28.6139, lng: 77.2090 },
      severity: 'low',
      title: 'Routine Encryption Rekey Completed',
      description: 'Tactical comms gateway completed automated 30-minute AES-256 key rotation cycle cleanly.',
      confidence: 100,
      confidenceBreakdown: {
        overall: 100,
        sourceAgreement: 100,
        spatialAgreement: 100,
        temporalAgreement: 100,
        sourceReliability: 100,
        dataFreshness: 100,
      },
      corroboratedBy: [],
      isAnomaly: false,
      raw: { module: 'CRYPTO-MGR', event: 'REKEY_SUCCESS' },
    }
  ];
}

export const logSourceHealth: SourceHealth = {
  sourceType: 'log',
  sourceName: 'Base Defense Syslog & Perimeter Tripwires',
  status: 'live',
  lastUpdate: new Date().toISOString(),
  reliabilityScore: LOG_RELIABILITY,
  activeCount: 3,
};

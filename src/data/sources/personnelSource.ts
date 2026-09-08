/**
 * Personnel & Asset Readiness Telemetry Collector
 */

import { UnifiedEvent, SourceHealth, AssetUnit } from '../../types/schema';

export const PERSONNEL_RELIABILITY = 0.90;

export function getInitialAssets(): AssetUnit[] {
  return [
    {
      id: 'AST-ALPHA-1',
      callsign: 'Alpha Patrol 1',
      branch: 'ARMY',
      status: 'ENGAGED',
      location: { lat: 28.6300, lng: 77.2200, speedKnots: 25, headingDegrees: 90 },
      fuelLevel: 82,
      batteryPercent: 95,
      commIntegrity: 100,
      lastBeacon: new Date().toISOString(),
    },
    {
      id: 'AST-FALCON-3',
      callsign: 'Falcon Recon 3',
      branch: 'AIRFORCE',
      status: 'READY',
      location: { lat: 28.6100, lng: 77.1900, altitudeMeters: 2500, speedKnots: 220, headingDegrees: 310 },
      fuelLevel: 68,
      batteryPercent: 88,
      commIntegrity: 92,
      lastBeacon: new Date().toISOString(),
    },
    {
      id: 'AST-TRIDENT-2',
      callsign: 'Trident Naval Sector 2',
      branch: 'NAVY',
      status: 'READY',
      location: { lat: 28.5500, lng: 77.2500, speedKnots: 14, headingDegrees: 180 },
      fuelLevel: 91,
      batteryPercent: 100,
      commIntegrity: 98,
      lastBeacon: new Date().toISOString(),
    },
    {
      id: 'AST-HQ-BASE',
      callsign: 'Vanguard Command HQ',
      branch: 'ARMY',
      status: 'READY',
      location: { lat: 28.6139, lng: 77.2090 },
      fuelLevel: 100,
      batteryPercent: 100,
      commIntegrity: 100,
      lastBeacon: new Date().toISOString(),
    }
  ];
}

export function getPersonnelEvents(): UnifiedEvent[] {
  const assets = getInitialAssets();
  
  return assets.map(a => ({
    id: `PSN-EVT-${a.id}`,
    sourceType: 'personnel',
    timestamp: a.lastBeacon,
    location: a.location,
    severity: a.status === 'ENGAGED' ? 'medium' : a.status === 'OFFLINE' ? 'high' : 'low',
    title: `Asset Status: ${a.callsign} [${a.status}]`,
    description: `Branch: ${a.branch}. Fuel: ${a.fuelLevel}%, Battery: ${a.batteryPercent}%, Comms Integrity: ${a.commIntegrity}%.`,
    confidence: Math.round(PERSONNEL_RELIABILITY * 100),
    confidenceBreakdown: {
      overall: Math.round(PERSONNEL_RELIABILITY * 100),
      sourceAgreement: 92,
      spatialAgreement: 95,
      temporalAgreement: 98,
      sourceReliability: 90,
      dataFreshness: 95,
    },
    corroboratedBy: [],
    isAnomaly: a.status === 'OFFLINE' || a.commIntegrity < 50,
    raw: { ...a },
  }));
}

export const personnelSourceHealth: SourceHealth = {
  sourceType: 'personnel',
  sourceName: 'Encrypted Tactical Unit Telemetry Stream',
  status: 'live',
  lastUpdate: new Date().toISOString(),
  reliabilityScore: PERSONNEL_RELIABILITY,
  activeCount: 4,
};

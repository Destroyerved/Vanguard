/**
 * Vanguard Interactive Scenario Injector Engine
 * Allows 1-click injection of custom operational scenarios during live judging demonstrations.
 */

import { ScenarioDefinition, UnifiedEvent } from '../types/schema';
import { fuseMultiSourceEvents, calculateGlobalThreatLevel } from './fusionEngine';
import { getInitialAssets } from './sources/personnelSource';

export type DemoScenarioMode = 'NORMAL_OPS' | 'SEVERE_WEATHER' | 'COORDINATED_ATTACK';

export function getScenarioDataset(mode: DemoScenarioMode): ScenarioDefinition {
  const now = new Date();
  const assets = getInitialAssets();

  if (mode === 'NORMAL_OPS') {
    const rawEvents: UnifiedEvent[] = [
      {
        id: 'WX-NORM-01',
        sourceType: 'weather',
        timestamp: now.toISOString(),
        location: { lat: 28.6139, lng: 77.2090 },
        severity: 'low',
        title: 'Clear Meteorological Conditions',
        description: 'Standard atmospheric pressure 1012 hPa, temperature 25°C, wind speed 12 km/h from 180°.',
        confidence: 90,
        corroboratedBy: [],
        isAnomaly: false,
        raw: { status: 'NORMAL' },
      },
      {
        id: 'RAD-NORM-02',
        sourceType: 'radar',
        timestamp: new Date(now.getTime() - 30000).toISOString(),
        location: { lat: 28.5900, lng: 77.1700, altitudeMeters: 3500, speedKnots: 250, headingDegrees: 45 },
        severity: 'low',
        title: 'Scheduled Commercial Flight AIC-405',
        description: 'Verified IFF tag FRIENDLY, squawk 1200, maintaining assigned corridor.',
        confidence: 98,
        corroboratedBy: [],
        isAnomaly: false,
        raw: { iffTag: 'FRIENDLY' },
      }
    ];

    const events = fuseMultiSourceEvents(rawEvents);
    return {
      id: 'SCENARIO-1',
      name: 'Peacetime Patrol (Normal Operations)',
      description: 'All sectors nominal. Clear airspace, routine unit beacons, zero perimeter anomalies.',
      threatLevel: calculateGlobalThreatLevel(events),
      events,
      assets,
      sourcesHealth: [
        { sourceType: 'weather', sourceName: 'Open-Meteo Weather', status: 'live', lastUpdate: now.toISOString(), reliabilityScore: 0.85, activeCount: 1 },
        { sourceType: 'radar', sourceName: 'Primary Radar', status: 'live', lastUpdate: now.toISOString(), reliabilityScore: 0.95, activeCount: 1 },
        { sourceType: 'personnel', sourceName: 'Unit Telemetry', status: 'live', lastUpdate: now.toISOString(), reliabilityScore: 0.90, activeCount: 4 },
      ]
    };
  }

  if (mode === 'SEVERE_WEATHER') {
    const rawEvents: UnifiedEvent[] = [
      {
        id: 'WX-STORM-01',
        sourceType: 'weather',
        timestamp: now.toISOString(),
        location: { lat: 28.6139, lng: 77.2090 },
        severity: 'critical',
        title: 'SEVERE WEATHER FRONT — Gale Wind & Heavy Rain',
        description: 'Wind speed 75 km/h from 240°, precipitation 35mm/h. Optical sensors and drone flights restricted.',
        confidence: 85,
        corroboratedBy: [],
        isAnomaly: true,
        raw: { status: 'STORM_WARNING' },
      },
      {
        id: 'LOG-COMMS-02',
        sourceType: 'log',
        timestamp: new Date(now.getTime() - 60000).toISOString(),
        location: { lat: 28.6300, lng: 77.2200 },
        severity: 'high',
        title: 'Comms Degradation Warning',
        description: 'Atmospheric interference registered on UHF radio channels. Signal integrity degraded to 65%.',
        confidence: 80,
        corroboratedBy: [],
        isAnomaly: true,
        raw: { status: 'ATMOSPHERIC_DEGRADATION' },
      }
    ];

    const events = fuseMultiSourceEvents(rawEvents);
    return {
      id: 'SCENARIO-2',
      name: 'Severe Storm & Comms Degradation',
      description: 'Storm front restricting airborne assets. Increased uncertainty tags and degraded signal notices.',
      threatLevel: calculateGlobalThreatLevel(events),
      events,
      assets: assets.map(a => ({ ...a, commIntegrity: 65 })),
      sourcesHealth: [
        { sourceType: 'weather', sourceName: 'Open-Meteo Weather', status: 'live', lastUpdate: now.toISOString(), reliabilityScore: 0.85, activeCount: 1 },
        { sourceType: 'radar', sourceName: 'Primary Radar', status: 'degraded', lastUpdate: now.toISOString(), reliabilityScore: 0.70, activeCount: 1 },
        { sourceType: 'personnel', sourceName: 'Unit Telemetry', status: 'degraded', lastUpdate: now.toISOString(), reliabilityScore: 0.65, activeCount: 4 },
      ]
    };
  }

  // COORDINATED_ATTACK (Red Threat Level)
  const rawEvents: UnifiedEvent[] = [
    {
      id: 'RAD-HOSTILE-01',
      sourceType: 'radar',
      timestamp: now.toISOString(),
      location: { lat: 28.6410, lng: 77.2410, altitudeMeters: 220, speedKnots: 450, headingDegrees: 185 },
      severity: 'critical',
      title: 'UNIDENTIFIED LOW-ALTITUDE RADAR CONTACT RAD-7041',
      description: 'High-speed contact flying below radar horizon. Squawk 7700 emergency override. RCS: 0.4m² (Stealth trajectory).',
      confidence: 95,
      corroboratedBy: [],
      isAnomaly: true,
      raw: { iffTag: 'HOSTILE', squawk: '7700' },
    },
    {
      id: 'LOG-BREACH-02',
      sourceType: 'log',
      timestamp: new Date(now.getTime() - 45000).toISOString(),
      location: { lat: 28.6425, lng: 77.2430 },
      severity: 'critical',
      title: 'OPTICAL TRIPWIRE BREACH — Sector 4 Perimeter',
      description: 'Fiber-optic fence vibration sensor triggered at Sector 4-B North Perimeter. Physical invasion breach suspected.',
      confidence: 90,
      corroboratedBy: [],
      isAnomaly: true,
      raw: { sensorId: 'OPTIC-SEC4-B', breachConfirmed: true },
    },
    {
      id: 'LOG-JAMMING-03',
      sourceType: 'log',
      timestamp: new Date(now.getTime() - 120000).toISOString(),
      location: { lat: 28.6810, lng: 77.2900 },
      severity: 'high',
      title: 'RF FREQUENCY JAMMING DETECTED',
      description: 'Wideband RF noise spike on 142MHz - 156MHz band. Frequency hopping protocol engaged.',
      confidence: 85,
      corroboratedBy: [],
      isAnomaly: true,
      raw: { band: 'VHF', noiseFloorDbm: -45 },
    },
    {
      id: 'INC-SALUTE-04',
      sourceType: 'incident',
      timestamp: new Date(now.getTime() - 90000).toISOString(),
      location: { lat: 28.6418, lng: 77.2420 },
      severity: 'critical',
      title: 'SALUTE SPOT REPORT — Unmanned Aerial Vehicle Intrusion',
      description: 'Alpha Patrol spot report: Low-flying rotary UAV over Sector 4-B. Corroborates radar contact & optical tripwire.',
      confidence: 88,
      corroboratedBy: [],
      isAnomaly: true,
      raw: { format: 'SALUTE', reportingUnit: 'Alpha Patrol 1' },
    }
  ];

  const events = fuseMultiSourceEvents(rawEvents);
  return {
    id: 'SCENARIO-3',
    name: 'Coordinated Perimeter Breach & RF Jamming Spike',
    description: 'CRITICAL SECTOR RED ALERT. Multi-source corroboration confirms low-altitude stealth contact + optical perimeter breach.',
    threatLevel: calculateGlobalThreatLevel(events),
    events,
    assets: assets.map(a => a.id === 'AST-ALPHA-1' ? { ...a, status: 'ENGAGED' } : a),
    sourcesHealth: [
      { sourceType: 'weather', sourceName: 'Open-Meteo Weather', status: 'live', lastUpdate: now.toISOString(), reliabilityScore: 0.85, activeCount: 1 },
      { sourceType: 'radar', sourceName: 'Primary Radar', status: 'live', lastUpdate: now.toISOString(), reliabilityScore: 0.95, activeCount: 1 },
      { sourceType: 'personnel', sourceName: 'Unit Telemetry', status: 'live', lastUpdate: now.toISOString(), reliabilityScore: 0.90, activeCount: 4 },
      { sourceType: 'log', sourceName: 'Perimeter Sensors', status: 'degraded', lastUpdate: now.toISOString(), reliabilityScore: 0.80, activeCount: 3 },
      { sourceType: 'incident', sourceName: 'Spot Reports', status: 'live', lastUpdate: now.toISOString(), reliabilityScore: 0.75, activeCount: 2 },
    ]
  };
}

/**
 * Tactical Field Spot Reports & Civil Incident Dispatch Collector
 */

import { UnifiedEvent, SourceHealth } from '../../types/schema';

export const INCIDENT_RELIABILITY = 0.75;

export function getIncidentEvents(): UnifiedEvent[] {
  const now = new Date();

  return [
    {
      id: 'INC-SPOT-101',
      sourceType: 'incident',
      timestamp: new Date(now.getTime() - 90000).toISOString(),
      location: { lat: 28.6418, lng: 77.2420 },
      severity: 'critical',
      title: 'SPOT REPORT — Unidentified Aerial Vehicle & Perimeter Contact',
      description: 'SALUTE Report from Alpha Patrol: Visual observation of low-flying rotary-wing UAV near Sector 4 perimeter. Corroborates optic tripwire trigger.',
      confidence: 84,
      confidenceBreakdown: {
        overall: 84,
        sourceAgreement: 88,
        spatialAgreement: 95,
        temporalAgreement: 92,
        sourceReliability: 75,
        dataFreshness: 95,
      },
      corroboratedBy: ['LOG-TRIP-01', 'RAD-EVT-1'], // Multi-source corroboration!
      isAnomaly: true,
      raw: {
        reportFormat: 'SALUTE',
        size: '1 UAV (2m wingspan)',
        activity: 'Low-altitude hovering & perimeter scan',
        locationStr: 'Grid 28.6418, 77.2420',
        unit: 'Alpha Patrol 1',
        time: new Date(now.getTime() - 90000).toISOString(),
        equipment: 'Electro-optical payload',
      },
    },
    {
      id: 'INC-CIVIL-202',
      sourceType: 'incident',
      timestamp: new Date(now.getTime() - 450000).toISOString(),
      location: { lat: 28.5800, lng: 77.1500 },
      severity: 'medium',
      title: 'Civil Power Grid Fluctuation Dispatch',
      description: 'Regional dispatch report: 15% voltage drop observed at West Grid Substation 3. Emergency maintenance dispatched.',
      confidence: 78,
      confidenceBreakdown: {
        overall: 78,
        sourceAgreement: 75,
        spatialAgreement: 80,
        temporalAgreement: 85,
        sourceReliability: 75,
        dataFreshness: 80,
      },
      corroboratedBy: [],
      isAnomaly: false,
      raw: { dispatchId: 'EMERG-PWR-88', gridZone: 'SUBSTATION-3', voltageDropPct: 15 },
    }
  ];
}

export const incidentSourceHealth: SourceHealth = {
  sourceType: 'incident',
  sourceName: 'Tactical Spot Reports & Field Dispatches',
  status: 'live',
  lastUpdate: new Date().toISOString(),
  reliabilityScore: INCIDENT_RELIABILITY,
  activeCount: 2,
};

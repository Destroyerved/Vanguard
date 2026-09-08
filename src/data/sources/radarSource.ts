/**
 * Radar & Surveillance Kinematic Track Collector & Dataset Generator
 */

import { UnifiedEvent, SourceHealth } from '../../types/schema';

export const RADAR_RELIABILITY = 0.95;

export interface RadarTrackRaw {
  trackId: string;
  squawkCode: string;
  lat: number;
  lng: number;
  altitudeMeters: number;
  speedKnots: number;
  headingDegrees: number;
  iffTag: 'FRIENDLY' | 'HOSTILE' | 'NEUTRAL' | 'UNKNOWN';
  rcsSquareMeters: number;
}

export function getRadarDataset(): UnifiedEvent[] {
  const now = new Date();
  
  const tracks: RadarTrackRaw[] = [
    {
      trackId: 'RAD-7041',
      squawkCode: '7700', // Squawk emergency / unannounced contact
      lat: 28.6410,
      lng: 77.2410,
      altitudeMeters: 450,
      speedKnots: 420,
      headingDegrees: 185,
      iffTag: 'UNKNOWN',
      rcsSquareMeters: 1.2,
    },
    {
      trackId: 'RAD-3012',
      squawkCode: '1200',
      lat: 28.5910,
      lng: 77.1710,
      altitudeMeters: 3200,
      speedKnots: 240,
      headingDegrees: 45,
      iffTag: 'FRIENDLY',
      rcsSquareMeters: 8.5,
    },
    {
      trackId: 'RAD-9902',
      squawkCode: '0000',
      lat: 28.6820,
      lng: 77.2910,
      altitudeMeters: 180, // Very low altitude, stealth trajectory
      speedKnots: 510,
      headingDegrees: 220,
      iffTag: 'HOSTILE',
      rcsSquareMeters: 0.4,
    },
    {
      trackId: 'RAD-1055',
      squawkCode: '4410',
      lat: 28.5200,
      lng: 77.1000,
      altitudeMeters: 6500,
      speedKnots: 380,
      headingDegrees: 120,
      iffTag: 'NEUTRAL',
      rcsSquareMeters: 15.0,
    }
  ];

  return tracks.map((t, idx) => {
    const isAnomaly = t.iffTag === 'HOSTILE' || t.iffTag === 'UNKNOWN' || t.altitudeMeters < 500;
    const severity = t.iffTag === 'HOSTILE' ? 'critical' : t.iffTag === 'UNKNOWN' ? 'high' : 'low';
    
    return {
      id: `RAD-EVT-${idx + 1}`,
      sourceType: 'radar',
      timestamp: new Date(now.getTime() - idx * 45000).toISOString(),
      location: {
        lat: t.lat,
        lng: t.lng,
        altitudeMeters: t.altitudeMeters,
        speedKnots: t.speedKnots,
        headingDegrees: t.headingDegrees,
      },
      severity,
      title: `Kinematic Radar Track: ${t.trackId} [IFF: ${t.iffTag}]`,
      description: `Track ${t.trackId} flying at ${t.altitudeMeters}m altitude, speed ${t.speedKnots} kts. Squawk: ${t.squawkCode}. RCS: ${t.rcsSquareMeters} m².`,
      confidence: Math.round(RADAR_RELIABILITY * 100),
      confidenceBreakdown: {
        overall: Math.round(RADAR_RELIABILITY * 100),
        sourceAgreement: isAnomaly ? 90 : 98,
        spatialAgreement: 95,
        temporalAgreement: 96,
        sourceReliability: 95,
        dataFreshness: 99,
      },
      corroboratedBy: [],
      isAnomaly,
      raw: { ...t },
    };
  });
}

export const radarSourceHealth: SourceHealth = {
  sourceType: 'radar',
  sourceName: 'Primary Air & Surface Surveillance Radar',
  status: 'live',
  lastUpdate: new Date().toISOString(),
  reliabilityScore: RADAR_RELIABILITY,
  activeCount: 4,
};

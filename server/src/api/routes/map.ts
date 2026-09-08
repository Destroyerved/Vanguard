/**
 * VANGUARD — Map layer routes.
 *
 *   GET /api/v1/map/assets     friendly units          (Assets layer)
 *   GET /api/v1/map/alerts     severity-coded alerts   (Alerts layer)
 *   GET /api/v1/map/weather    live meteorological grid (Weather layer)
 *   GET /api/v1/map/zones      sectors and perimeters   (Zones layer)
 *   GET /api/v1/map/heatmap    incident density surface
 *   GET /api/v1/map/all        all four layers in one call
 *
 * Every layer is returned as a GeoJSON FeatureCollection so MapLibre can
 * consume it directly with no client-side transformation. Note the coordinate
 * order flip: VANGUARD works in {lat, lng} internally, GeoJSON demands
 * [lng, lat], and this file is the only place that conversion happens.
 */

import { Router } from 'express';
import type { Orchestrator } from '../../orchestrator/Orchestrator.js';
import { AO_CENTER, AO_SECTORS } from '../../config/constants.js';
import { confidenceBand } from '../../fusion/confidence.js';
import type { UnifiedEvent } from '../../types/events.js';
import { circlePolygon } from '../../util/geo.js';
import { severities, sourceTypes } from '../middleware/query.js';

/** Minimal GeoJSON types — no dependency needed for four shapes. */
interface Feature {
  type: 'Feature';
  geometry:
    | { type: 'Point'; coordinates: [number, number] }
    | { type: 'Polygon'; coordinates: [number, number][][] };
  properties: Record<string, unknown>;
}

interface FeatureCollection {
  type: 'FeatureCollection';
  features: Feature[];
}

const collection = (features: Feature[]): FeatureCollection => ({
  type: 'FeatureCollection',
  features,
});

/** Convert an event into a GeoJSON point feature for the Alerts layer. */
function eventFeature(event: UnifiedEvent): Feature {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      // GeoJSON order: [longitude, latitude].
      coordinates: [event.location.lng, event.location.lat],
    },
    properties: {
      id: event.id,
      sourceType: event.sourceType,
      severity: event.severity,
      baseSeverity: event.baseSeverity,
      escalated: event.severity !== event.baseSeverity,
      confidence: event.confidence,
      confidenceBand: confidenceBand(event.confidence),
      title: event.title,
      description: event.description,
      timestamp: event.timestamp,
      isAnomaly: event.isAnomaly,
      anomalyReason: event.anomalyReason ?? null,
      corroborationCount: event.corroboratedBy.length,
      corroboratedBy: event.corroboratedBy,
      clusterId: event.clusterId ?? null,
      headingDegrees: event.location.headingDegrees ?? null,
      speedKnots: event.location.speedKnots ?? null,
      altitudeMeters: event.location.altitudeMeters ?? null,
    },
  };
}

export function mapRoutes(orchestrator: Orchestrator): Router {
  const router = Router();

  /** Friendly units with heading and readiness. */
  router.get('/assets', (_req, res) => {
    const assets = orchestrator.getAssets();
    const units = orchestrator.personnel.getUnits();
    const byId = new Map(units.map((u) => [u.unitId, u]));

    res.json({
      count: assets.length,
      geojson: collection(
        assets.map((asset) => {
          const unit = byId.get(asset.id);
          return {
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: [asset.location.lng, asset.location.lat] as [number, number],
            },
            properties: {
              id: asset.id,
              callsign: asset.callsign,
              kind: asset.kind,
              status: asset.status,
              readinessPercent: asset.readinessPercent,
              personnelCount: unit?.personnelCount ?? null,
              fuelPercent: unit ? Math.round(unit.fuelPercent) : null,
              sector: unit?.sector ?? null,
              lastUpdate: asset.lastUpdate,
            },
          };
        }),
      ),
      assets,
    });
  });

  /** Active alerts, filterable by severity and source. */
  router.get('/alerts', (req, res) => {
    const requestedSeverities = severities(req);
    const requestedSources = sourceTypes(req);

    // Default to the tiers a watchstander actually needs pinned on the map.
    // Rendering every routine log line would bury the alerts that matter.
    const events = orchestrator.store.query({
      severities: requestedSeverities ?? ['medium', 'high', 'critical'],
      sourceTypes: requestedSources,
    });

    res.json({
      count: events.length,
      geojson: collection(events.map(eventFeature)),
      clusters: orchestrator.getClusters(),
    });
  });

  /** Live Open-Meteo grid, one point per sector. */
  router.get('/weather', (_req, res) => {
    const grid = orchestrator.weather.getLatestGrid();

    res.json({
      count: grid.length,
      live: grid.some((g) => !g.synthetic),
      geojson: collection(
        grid.map((station) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [station.lng, station.lat] as [number, number],
          },
          properties: { ...station },
        })),
      ),
      stations: grid,
    });
  });

  /** Operational sectors as circular polygons, plus sensor emplacements. */
  router.get('/zones', (_req, res) => {
    const sectorFeatures: Feature[] = AO_SECTORS.map((sector) => ({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [circlePolygon({ lat: sector.lat, lng: sector.lng }, sector.radiusMeters)],
      },
      properties: {
        id: sector.name.replace(/\s+/g, '-').toLowerCase(),
        name: sector.name,
        kind: 'sector',
        radiusMeters: sector.radiusMeters,
        centerLat: sector.lat,
        centerLng: sector.lng,
      },
    }));

    // The AO boundary itself, so the operator can see the edge of coverage.
    sectorFeatures.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [circlePolygon(AO_CENTER, 45_000, 64)] },
      properties: {
        id: 'ao-boundary',
        name: 'Area of Operations',
        kind: 'patrol_perimeter',
        radiusMeters: 45_000,
      },
    });

    const sensors = orchestrator.logs.getSensors();

    res.json({
      count: sectorFeatures.length,
      geojson: collection(sectorFeatures),
      sensors: collection(
        sensors.map((sensor) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [sensor.position.lng, sensor.position.lat] as [number, number],
          },
          properties: {
            id: sensor.sensorId,
            kind: sensor.kind,
            sector: sensor.sector,
            rangeMeters: sensor.rangeMeters,
            healthy: sensor.healthy,
          },
        })),
      ),
    });
  });

  /**
   * Incident density surface.
   * Each point is weighted by severity and confidence, so the heatmap shows
   * where the SIGNIFICANT activity is rather than merely where the most
   * numerous activity is — a hundred routine log lines should not outglow one
   * corroborated critical contact.
   */
  router.get('/heatmap', (_req, res) => {
    const weights = { low: 0.15, medium: 0.4, high: 0.75, critical: 1 } as const;
    const events = orchestrator.store.active();

    res.json({
      count: events.length,
      geojson: collection(
        events.map((event) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [event.location.lng, event.location.lat] as [number, number],
          },
          properties: {
            id: event.id,
            weight:
              Math.round(weights[event.severity] * (event.confidence / 100) * 1000) / 1000,
            severity: event.severity,
            confidence: event.confidence,
          },
        })),
      ),
    });
  });

  /** Every layer in one round trip — what the map uses on first paint. */
  router.get('/all', (_req, res) => {
    const alerts = orchestrator.store.query({ severities: ['medium', 'high', 'critical'] });
    const assets = orchestrator.getAssets();
    const grid = orchestrator.weather.getLatestGrid();

    res.json({
      center: AO_CENTER,
      layers: {
        assets: collection(
          assets.map((a) => ({
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: [a.location.lng, a.location.lat] as [number, number],
            },
            properties: { ...a, lat: undefined, lng: undefined },
          })),
        ),
        alerts: collection(alerts.map(eventFeature)),
        weather: collection(
          grid.map((s) => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] as [number, number] },
            properties: { ...s },
          })),
        ),
        zones: collection(
          AO_SECTORS.map((sector) => ({
            type: 'Feature' as const,
            geometry: {
              type: 'Polygon' as const,
              coordinates: [
                circlePolygon({ lat: sector.lat, lng: sector.lng }, sector.radiusMeters),
              ],
            },
            properties: { name: sector.name, kind: 'sector' },
          })),
        ),
      },
      clusters: orchestrator.getClusters(),
      situation: orchestrator.getSituation(),
    });
  });

  return router;
}

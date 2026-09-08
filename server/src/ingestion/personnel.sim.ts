/**
 * VANGUARD — Personnel and asset telemetry simulator.
 *
 * Models a squad of units patrolling assigned sectors. Units follow circular
 * patrol routes with drift, report readiness, and occasionally file a visual
 * sighting when something is near them.
 *
 * The sighting behaviour is the operationally important part: it is what lets
 * a PERSONNEL observation land in the same place and time as a RADAR contact,
 * which is what produces genuine cross-source corroboration rather than a
 * coincidence the engine got lucky on.
 */

import { AO_SECTORS } from '../config/constants.js';
import { destinationPoint, haversineMeters, type LatLng } from '../util/geo.js';
import { createRng, type Rng } from '../util/random.js';
import { nowIso } from '../util/time.js';
import { ok, type PollContext, type PollOutcome, type RawObservation, type SourceAdapter } from './SourceAdapter.js';

export type UnitStatus = 'ready' | 'engaged' | 'refit' | 'offline';
export type UnitKind = 'ground' | 'air' | 'naval' | 'static';

/** One tracked friendly unit. */
export interface PatrolUnit {
  unitId: string;
  callsign: string;
  kind: UnitKind;
  /** Centre of the assigned patrol orbit. */
  anchor: LatLng;
  orbitRadiusMeters: number;
  /** Current angle around the orbit, degrees. */
  orbitPhase: number;
  orbitRateDegPerSec: number;
  position: LatLng;
  status: UnitStatus;
  readinessPercent: number;
  personnelCount: number;
  fuelPercent: number;
  sector: string;
}

const CALLSIGNS = [
  'REAPER', 'VIPER', 'HAMMER', 'SENTINEL', 'FALCON',
  'GRIZZLY', 'TALON', 'OUTRIDER', 'BASTION', 'NOMAD',
] as const;

export class PersonnelSimAdapter implements SourceAdapter {
  readonly sourceType = 'personnel' as const;
  readonly sourceName = 'UNIT-TELEMETRY';
  readonly nominalReliability = 0.88;
  readonly pollIntervalMs: number;

  private readonly rng: Rng;
  private units: PatrolUnit[] = [];
  private lastPollMs = 0;
  /** Contacts of interest published by the orchestrator for sighting checks. */
  private pointsOfInterest: LatLng[] = [];

  constructor(seed: number, pollIntervalMs = 6_000, private readonly intensity = 1) {
    this.rng = createRng(seed ^ 0x50455253); // 'PERS'
    this.pollIntervalMs = pollIntervalMs;
  }

  init(): void {
    const count = Math.max(5, Math.round(8 * this.intensity));
    for (let i = 0; i < count; i++) this.units.push(this.spawnUnit(i));
    this.lastPollMs = Date.now();
  }

  poll(context: PollContext): PollOutcome {
    const started = Date.now();
    const elapsedSec = this.lastPollMs === 0 ? 6 : (context.nowMs - this.lastPollMs) / 1000;
    this.lastPollMs = context.nowMs;

    const observations: RawObservation[] = [];

    for (const unit of this.units) {
      this.advance(unit, elapsedSec);
      observations.push(this.toTelemetry(unit));

      // A unit close to a contact of interest may file a visual sighting.
      const sighting = this.maybeSight(unit);
      if (sighting) observations.push(sighting);
    }

    return ok(observations, Date.now() - started);
  }

  /** Advance a unit along its patrol orbit with positional drift. */
  private advance(unit: PatrolUnit, elapsedSec: number): void {
    unit.orbitPhase = (unit.orbitPhase + unit.orbitRateDegPerSec * elapsedSec) % 360;

    const jitter = this.rng.gaussian(0, unit.orbitRadiusMeters * 0.04);
    unit.position = destinationPoint(
      unit.anchor,
      unit.orbitPhase,
      Math.max(100, unit.orbitRadiusMeters + jitter),
    );

    // Consumables drain slowly and recover during refit.
    if (unit.status === 'refit') {
      unit.fuelPercent = Math.min(100, unit.fuelPercent + 0.6);
      unit.readinessPercent = Math.min(100, unit.readinessPercent + 0.4);
      if (unit.fuelPercent > 92 && this.rng.chance(0.2)) unit.status = 'ready';
    } else if (unit.status !== 'offline') {
      unit.fuelPercent = Math.max(0, unit.fuelPercent - this.rng.float(0.02, 0.12));
      if (unit.fuelPercent < 22 && this.rng.chance(0.3)) unit.status = 'refit';
    }

    // Rare status transitions keep the readiness board alive.
    if (this.rng.chance(0.01)) {
      unit.status = this.rng.pick<UnitStatus>(['ready', 'ready', 'engaged', 'refit']);
    }
    if (this.rng.chance(0.004)) {
      unit.status = 'offline'; // comms loss
    } else if (unit.status === 'offline' && this.rng.chance(0.25)) {
      unit.status = 'ready'; // comms restored
    }
  }

  /**
   * File a visual sighting when a contact of interest is inside this unit's
   * observation range. Detection probability falls off with distance, which is
   * both realistic and what makes the resulting corroboration meaningful.
   */
  private maybeSight(unit: PatrolUnit): RawObservation | null {
    if (unit.status === 'offline') return null;
    if (this.pointsOfInterest.length === 0) return null;

    const observationRangeM = unit.kind === 'air' ? 9_000 : 4_500;

    let nearest: LatLng | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const poi of this.pointsOfInterest) {
      const d = haversineMeters(unit.position, poi);
      if (d < nearestDistance) {
        nearestDistance = d;
        nearest = poi;
      }
    }

    if (!nearest || nearestDistance > observationRangeM) return null;

    // Linear detection falloff, scaled down so sightings stay notable.
    const detectionProbability = (1 - nearestDistance / observationRangeM) * 0.35;
    if (!this.rng.chance(detectionProbability)) return null;

    return {
      sourceType: this.sourceType,
      sourceName: this.sourceName,
      timestamp: nowIso(),
      payload: {
        kind: 'visual_sighting',
        unitId: unit.unitId,
        callsign: unit.callsign,
        lat: nearest.lat,
        lng: nearest.lng,
        observerLat: unit.position.lat,
        observerLng: unit.position.lng,
        rangeMeters: Math.round(nearestDistance),
        confidenceReported: Math.round((1 - nearestDistance / observationRangeM) * 100),
        sector: unit.sector,
        note: 'Visual contact reported by patrol element',
      },
    };
  }

  private spawnUnit(index: number): PatrolUnit {
    const sector = AO_SECTORS[index % AO_SECTORS.length]!;
    const kind = this.rng.pick<UnitKind>(['ground', 'ground', 'ground', 'air', 'static']);
    const anchor = destinationPoint(
      { lat: sector.lat, lng: sector.lng },
      this.rng.float(0, 360),
      this.rng.float(0, sector.radiusMeters * 0.4),
    );

    return {
      unitId: `U-${String(100 + index)}`,
      callsign: `${CALLSIGNS[index % CALLSIGNS.length]}-${this.rng.int(1, 9)}`,
      kind,
      anchor,
      orbitRadiusMeters: kind === 'static' ? 0 : this.rng.float(800, 5_500),
      orbitPhase: this.rng.float(0, 360),
      // Air units orbit faster than dismounted ground elements.
      orbitRateDegPerSec: kind === 'static' ? 0 : this.rng.float(0.05, kind === 'air' ? 0.9 : 0.25),
      position: anchor,
      status: 'ready',
      readinessPercent: this.rng.int(72, 100),
      personnelCount: kind === 'air' ? this.rng.int(2, 4) : this.rng.int(4, 12),
      fuelPercent: this.rng.int(45, 100),
      sector: sector.name,
    };
  }

  private toTelemetry(unit: PatrolUnit): RawObservation {
    return {
      sourceType: this.sourceType,
      sourceName: this.sourceName,
      timestamp: nowIso(),
      payload: {
        kind: 'unit_telemetry',
        unitId: unit.unitId,
        callsign: unit.callsign,
        unitKind: unit.kind,
        lat: unit.position.lat,
        lng: unit.position.lng,
        status: unit.status,
        readinessPercent: Math.round(unit.readinessPercent),
        personnelCount: unit.personnelCount,
        fuelPercent: Math.round(unit.fuelPercent),
        sector: unit.sector,
      },
    };
  }

  /**
   * Publish the current contacts of interest (typically radar tracks) so units
   * can generate corroborating sightings. Called by the orchestrator each tick.
   */
  setPointsOfInterest(points: LatLng[]): void {
    this.pointsOfInterest = points;
  }

  /** Current units, for the map assets layer. */
  getUnits(): readonly PatrolUnit[] {
    return this.units;
  }
}

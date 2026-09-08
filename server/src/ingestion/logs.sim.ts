/**
 * VANGUARD — Operational log and perimeter sensor simulator.
 *
 * Emits two classes of machine-generated event:
 *
 *   PERIMETER SENSORS — fixed IR, seismic and fence-tension sensors on a
 *   patrol ring. These trip when something crosses them, and they are the
 *   feed most likely to independently confirm a radar contact, because they
 *   observe the same physical intrusion by a completely different mechanism.
 *
 *   SYSTEM LOGS — comms link status, power, network telemetry. Operationally
 *   low severity, but they matter to the fusion picture: a comms relay
 *   degrading at the same moment a perimeter trips is a very different
 *   situation from either event alone.
 */

import { AO_SECTORS } from '../config/constants.js';
import { destinationPoint, haversineMeters, type LatLng } from '../util/geo.js';
import { createRng, type Rng } from '../util/random.js';
import { nowIso } from '../util/time.js';
import { ok, type PollContext, type PollOutcome, type RawObservation, type SourceAdapter } from './SourceAdapter.js';

export type SensorKind = 'infrared' | 'seismic' | 'fence_tension' | 'acoustic' | 'magnetic';

/** A fixed perimeter sensor emplacement. */
export interface PerimeterSensor {
  sensorId: string;
  kind: SensorKind;
  position: LatLng;
  sector: string;
  /** Detection radius, metres. */
  rangeMeters: number;
  /** Per-poll probability of a spurious trip. Real sensors have false alarms. */
  falseAlarmRate: number;
  healthy: boolean;
}

const SYSTEM_LOG_TEMPLATES = [
  { code: 'NET-1101', message: 'Backhaul link latency exceeded threshold', severity: 'medium' },
  { code: 'PWR-2043', message: 'Generator load shed on auxiliary bus', severity: 'medium' },
  { code: 'COM-3310', message: 'Encrypted voice channel re-keyed', severity: 'low' },
  { code: 'SEN-4002', message: 'Sensor self-test completed nominally', severity: 'low' },
  { code: 'NET-1120', message: 'Packet loss on relay segment', severity: 'medium' },
  { code: 'SYS-5001', message: 'Time sync drift corrected against GNSS reference', severity: 'low' },
  { code: 'SEC-6210', message: 'Failed authentication attempt on operator console', severity: 'high' },
  { code: 'SEN-4110', message: 'Camera mast heater cycled', severity: 'low' },
] as const;

export class LogsSimAdapter implements SourceAdapter {
  readonly sourceType = 'log' as const;
  readonly sourceName = 'PERIMETER-C2';
  readonly nominalReliability = 0.8;
  readonly pollIntervalMs: number;

  private readonly rng: Rng;
  private sensors: PerimeterSensor[] = [];
  private pointsOfInterest: LatLng[] = [];
  private logSeq = 0;

  constructor(seed: number, pollIntervalMs = 4_000, private readonly intensity = 1) {
    this.rng = createRng(seed ^ 0x4c4f4753); // 'LOGS'
    this.pollIntervalMs = pollIntervalMs;
  }

  init(): void {
    // Ring each sector with a handful of emplacements.
    for (const sector of AO_SECTORS) {
      const perSector = Math.max(3, Math.round(4 * this.intensity));
      for (let i = 0; i < perSector; i++) {
        this.sensors.push(this.spawnSensor(sector, i));
      }
    }
  }

  poll(context: PollContext): PollOutcome {
    const started = Date.now();
    const observations: RawObservation[] = [];

    for (const sensor of this.sensors) {
      // Sensors occasionally fail and self-recover.
      if (!sensor.healthy) {
        if (this.rng.chance(0.08)) sensor.healthy = true;
        continue;
      }
      if (this.rng.chance(0.002)) {
        sensor.healthy = false;
        observations.push(this.sensorFault(sensor));
        continue;
      }

      const trip = this.evaluateTrip(sensor);
      if (trip) observations.push(trip);
    }

    // A steady trickle of routine system logs.
    const logCount = this.rng.chance(0.55 * this.intensity) ? this.rng.int(1, 2) : 0;
    for (let i = 0; i < logCount; i++) observations.push(this.systemLog());

    return ok(observations, Date.now() - started);
  }

  /**
   * Decide whether a sensor trips this poll.
   * A genuine trip requires a contact of interest inside detection range;
   * everything else is a false alarm, tagged as such in the payload so the
   * fusion engine's corroboration logic can be seen doing real work.
   */
  private evaluateTrip(sensor: PerimeterSensor): RawObservation | null {
    let nearest: LatLng | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const poi of this.pointsOfInterest) {
      const d = haversineMeters(sensor.position, poi);
      if (d < nearestDistance) {
        nearestDistance = d;
        nearest = poi;
      }
    }

    const inRange = nearest !== null && nearestDistance <= sensor.rangeMeters;

    if (inRange) {
      // Detection probability falls off linearly across the sensor's range.
      const p = (1 - nearestDistance / sensor.rangeMeters) * 0.6;
      if (this.rng.chance(p)) return this.trip(sensor, nearest!, nearestDistance, false);
    }

    if (this.rng.chance(sensor.falseAlarmRate)) {
      // A false alarm reports at the sensor's own position with no real cause.
      return this.trip(sensor, sensor.position, 0, true);
    }

    return null;
  }

  private trip(
    sensor: PerimeterSensor,
    at: LatLng,
    rangeMeters: number,
    falseAlarm: boolean,
  ): RawObservation {
    this.logSeq++;
    return {
      sourceType: this.sourceType,
      sourceName: this.sourceName,
      timestamp: nowIso(),
      payload: {
        kind: 'perimeter_trip',
        logId: `L-${String(this.logSeq).padStart(5, '0')}`,
        sensorId: sensor.sensorId,
        sensorKind: sensor.kind,
        lat: at.lat,
        lng: at.lng,
        sensorLat: sensor.position.lat,
        sensorLng: sensor.position.lng,
        sector: sensor.sector,
        detectionRangeMeters: Math.round(rangeMeters),
        // Signal amplitude is lower for false alarms — an operator drilling
        // into the raw payload can see the difference the engine acted on.
        signalAmplitude: falseAlarm
          ? Math.round(this.rng.float(0.15, 0.4) * 100) / 100
          : Math.round(this.rng.float(0.55, 0.98) * 100) / 100,
        suspectedFalseAlarm: falseAlarm,
        message: `${sensor.kind.replace('_', ' ')} sensor ${sensor.sensorId} tripped in ${sensor.sector}`,
      },
    };
  }

  private sensorFault(sensor: PerimeterSensor): RawObservation {
    this.logSeq++;
    return {
      sourceType: this.sourceType,
      sourceName: this.sourceName,
      timestamp: nowIso(),
      payload: {
        kind: 'sensor_fault',
        logId: `L-${String(this.logSeq).padStart(5, '0')}`,
        sensorId: sensor.sensorId,
        sensorKind: sensor.kind,
        lat: sensor.position.lat,
        lng: sensor.position.lng,
        sector: sensor.sector,
        code: 'SEN-4900',
        message: `Sensor ${sensor.sensorId} stopped reporting — coverage gap in ${sensor.sector}`,
      },
    };
  }

  private systemLog(): RawObservation {
    this.logSeq++;
    const template = this.rng.pick(SYSTEM_LOG_TEMPLATES);
    const sector = this.rng.pick(AO_SECTORS);
    const at = destinationPoint(
      { lat: sector.lat, lng: sector.lng },
      this.rng.float(0, 360),
      this.rng.float(0, sector.radiusMeters * 0.5),
    );

    return {
      sourceType: this.sourceType,
      sourceName: this.sourceName,
      timestamp: nowIso(),
      payload: {
        kind: 'system_log',
        logId: `L-${String(this.logSeq).padStart(5, '0')}`,
        code: template.code,
        message: template.message,
        reportedSeverity: template.severity,
        lat: at.lat,
        lng: at.lng,
        sector: sector.name,
        subsystem: template.code.slice(0, 3),
      },
    };
  }

  private spawnSensor(
    sector: (typeof AO_SECTORS)[number],
    index: number,
  ): PerimeterSensor {
    const kind = this.rng.pick<SensorKind>([
      'infrared', 'seismic', 'fence_tension', 'acoustic', 'magnetic',
    ]);

    return {
      sensorId: `P-${sector.name.replace(/\D/g, '')}${String(index + 1).padStart(2, '0')}`,
      kind,
      // Emplaced on the sector perimeter, not at its centre.
      position: destinationPoint(
        { lat: sector.lat, lng: sector.lng },
        (360 / 6) * index + this.rng.float(-20, 20),
        sector.radiusMeters * this.rng.float(0.65, 0.95),
      ),
      sector: sector.name,
      rangeMeters: kind === 'acoustic' ? 3_000 : kind === 'infrared' ? 2_200 : 900,
      falseAlarmRate: kind === 'seismic' ? 0.02 : 0.008,
      healthy: true,
    };
  }

  /** Publish contacts of interest so sensors can trip on something real. */
  setPointsOfInterest(points: LatLng[]): void {
    this.pointsOfInterest = points;
  }

  /** Current emplacements, for the map zones/diagnostics layers. */
  getSensors(): readonly PerimeterSensor[] {
    return this.sensors;
  }
}

/**
 * VANGUARD — Radar / surveillance track simulator.
 *
 * Not a random point generator. This maintains PERSISTENT CONTACTS with real
 * kinematics: each track holds a position, heading, speed and altitude, and is
 * dead-reckoned forward every sweep. That matters for three reasons:
 *
 *   1. Correlation only means something if a contact stays in one place long
 *      enough for another feed to see it too. Random points never correlate.
 *   2. The 4D time-scrubber replays a coherent trajectory rather than noise.
 *   3. Kinematic anomaly detection needs a realistic speed distribution to
 *      find a genuine outlier inside.
 *
 * Everything is driven by a seeded RNG, so the same SIM_SEED produces the same
 * scenario on every machine — you can rehearse a demo and have it hold.
 */

import { AO_CENTER, AO_RADIUS_METERS, AO_SECTORS } from '../config/constants.js';
import { destinationPoint, haversineMeters, knotsToMps, type LatLng } from '../util/geo.js';
import { createRng, type Rng } from '../util/random.js';
import { nowIso } from '../util/time.js';
import { ok, type PollContext, type PollOutcome, type RawObservation, type SourceAdapter } from './SourceAdapter.js';

/** Classification a radar operator would assign to a return. */
export type ContactClass = 'friendly' | 'neutral' | 'unknown' | 'suspect';

/** Broad platform category inferred from speed and altitude. */
export type ContactKind = 'aircraft' | 'rotary' | 'uav' | 'vehicle' | 'vessel';

/** One persistent tracked contact. */
export interface RadarTrack {
  trackId: string;
  kind: ContactKind;
  classification: ContactClass;
  position: LatLng;
  headingDegrees: number;
  speedKnots: number;
  altitudeMeters: number;
  /** IFF transponder code, or null for a non-squawking contact. */
  transponder: string | null;
  /** Radar cross-section, square metres. Small RCS on a fast track is notable. */
  radarCrossSectionM2: number;
  /** Sweeps since the track was first acquired. */
  age: number;
  /** Track quality 0..1, degrades with range and low RCS. */
  trackQuality: number;
}

/** Nominal envelope per platform category: [minKt, maxKt, minAlt, maxAlt]. */
const ENVELOPE: Record<ContactKind, [number, number, number, number]> = {
  aircraft: [180, 420, 3_000, 11_000],
  rotary: [60, 140, 150, 2_500],
  uav: [40, 110, 300, 4_500],
  vehicle: [10, 70, 0, 200],
  vessel: [5, 35, 0, 10],
};

export class RadarSimAdapter implements SourceAdapter {
  readonly sourceType = 'radar' as const;
  readonly sourceName = 'RADAR-PRIMARY';
  readonly nominalReliability = 0.92;
  readonly pollIntervalMs: number;

  private readonly rng: Rng;
  private tracks: RadarTrack[] = [];
  private trackSeq = 0;
  private lastSweepMs = 0;

  constructor(seed: number, pollIntervalMs = 3_000, private readonly intensity = 1) {
    this.rng = createRng(seed ^ 0x52414441); // 'RADA'
    this.pollIntervalMs = pollIntervalMs;
  }

  init(): void {
    // Seed the picture with a realistic standing traffic load so the map is
    // populated the instant the command center opens.
    const initial = Math.max(6, Math.round(10 * this.intensity));
    for (let i = 0; i < initial; i++) this.tracks.push(this.spawnTrack());
    this.lastSweepMs = Date.now();
  }

  poll(context: PollContext): PollOutcome {
    const started = Date.now();
    const elapsedSec = this.lastSweepMs === 0 ? 3 : (context.nowMs - this.lastSweepMs) / 1000;
    this.lastSweepMs = context.nowMs;

    this.advance(elapsedSec);
    this.retire();
    this.spawnIfDue();

    const observations = this.tracks.map((t) => this.toObservation(t));
    return ok(observations, Date.now() - started);
  }

  /** Dead-reckon every track forward and apply manoeuvre noise. */
  private advance(elapsedSec: number): void {
    for (const track of this.tracks) {
      track.age++;

      // Gentle course and speed jitter: real contacts manoeuvre.
      track.headingDegrees = (track.headingDegrees + this.rng.gaussian(0, 3) + 360) % 360;
      const [minKt, maxKt] = ENVELOPE[track.kind];
      track.speedKnots = clampNum(track.speedKnots + this.rng.gaussian(0, 4), minKt, maxKt);

      const distance = knotsToMps(track.speedKnots) * elapsedSec;
      track.position = destinationPoint(track.position, track.headingDegrees, distance);

      // Turn back toward the AO before leaving radar coverage, so contacts do
      // not silently drift off the map and empty the picture.
      const range = haversineMeters(track.position, AO_CENTER);
      if (range > AO_RADIUS_METERS * 0.85) {
        const inbound = bearingTo(track.position, AO_CENTER);
        track.headingDegrees = inbound + this.rng.float(-25, 25);
      }

      // Track quality degrades with range and with a small cross-section.
      const rangeFactor = 1 - Math.min(0.6, range / (AO_RADIUS_METERS * 1.5));
      const rcsFactor = Math.min(1, 0.55 + track.radarCrossSectionM2 / 12);
      track.trackQuality = clampNum(rangeFactor * rcsFactor + this.rng.gaussian(0, 0.03), 0.15, 1);
    }
  }

  /** Retire long-lived or out-of-coverage tracks. */
  private retire(): void {
    this.tracks = this.tracks.filter((t) => {
      if (t.age > 400) return false;
      return haversineMeters(t.position, AO_CENTER) <= AO_RADIUS_METERS * 1.2;
    });
  }

  /** Maintain the traffic load with occasional new acquisitions. */
  private spawnIfDue(): void {
    const target = Math.max(6, Math.round(10 * this.intensity));
    if (this.tracks.length < target || this.rng.chance(0.12 * this.intensity)) {
      this.tracks.push(this.spawnTrack());
    }
  }

  private spawnTrack(): RadarTrack {
    this.trackSeq++;

    const kind = this.rng.pick<ContactKind>(['aircraft', 'rotary', 'uav', 'vehicle', 'vessel']);
    const [minKt, maxKt, minAlt, maxAlt] = ENVELOPE[kind];

    // Weight classification heavily toward benign traffic. A picture that is
    // all suspects is not a fusion problem, it is a war — and it would make the
    // corroboration engine look better than it is by handing it a target-rich
    // environment where anything correlates with anything.
    //
    // 12% non-cooperative matches a realistic peacetime AO and keeps the
    // baseline posture at GREEN/YELLOW, so a scenario injection produces a
    // visible, meaningful escalation rather than nudging an already-red board.
    const roll = this.rng.next();
    const classification: ContactClass =
      roll < 0.55 ? 'friendly' : roll < 0.88 ? 'neutral' : roll < 0.97 ? 'unknown' : 'suspect';

    const bearing = this.rng.float(0, 360);
    const range = this.rng.float(AO_RADIUS_METERS * 0.15, AO_RADIUS_METERS * 0.8);
    const position = destinationPoint(AO_CENTER, bearing, range);

    // Non-cooperative contacts are the ones worth fusing on.
    const squawks = classification === 'friendly' || classification === 'neutral';

    return {
      trackId: `R-${String(1000 + this.trackSeq)}`,
      kind,
      classification,
      position,
      headingDegrees: this.rng.float(0, 360),
      speedKnots: Math.round(this.rng.float(minKt, maxKt)),
      altitudeMeters: Math.round(this.rng.float(minAlt, maxAlt)),
      transponder: squawks ? `${this.rng.int(1000, 7777)}` : null,
      radarCrossSectionM2: Math.round(this.rng.float(0.4, 14) * 10) / 10,
      age: 0,
      trackQuality: 1,
    };
  }

  /**
   * Inject a hostile fast-mover on a specified bearing.
   * Drives the "coordinated border spike" demo scenario and the what-if sandbox.
   */
  injectHostileContact(near?: LatLng): RadarTrack {
    this.trackSeq++;
    const sector = this.rng.pick(AO_SECTORS);
    const origin = near ?? { lat: sector.lat, lng: sector.lng };

    const track: RadarTrack = {
      trackId: `R-${String(1000 + this.trackSeq)}`,
      kind: 'uav',
      classification: 'suspect',
      position: destinationPoint(origin, this.rng.float(0, 360), this.rng.float(500, 3_000)),
      headingDegrees: bearingTo(origin, AO_CENTER),
      speedKnots: this.rng.int(210, 320), // well outside the UAV envelope: a kinematic outlier
      altitudeMeters: this.rng.int(120, 600), // low and fast
      transponder: null, // non-squawking
      radarCrossSectionM2: 0.6, // small cross-section
      age: 0,
      trackQuality: 0.72,
    };

    this.tracks.push(track);
    return track;
  }

  /** Current tracks, for the map assets layer and diagnostics. */
  getTracks(): readonly RadarTrack[] {
    return this.tracks;
  }

  private toObservation(track: RadarTrack): RawObservation {
    return {
      sourceType: this.sourceType,
      sourceName: this.sourceName,
      timestamp: nowIso(),
      payload: {
        trackId: track.trackId,
        kind: track.kind,
        classification: track.classification,
        lat: track.position.lat,
        lng: track.position.lng,
        headingDegrees: Math.round(track.headingDegrees),
        speedKnots: Math.round(track.speedKnots),
        altitudeMeters: Math.round(track.altitudeMeters),
        transponder: track.transponder,
        radarCrossSectionM2: track.radarCrossSectionM2,
        trackQuality: Math.round(track.trackQuality * 100) / 100,
        sweepAge: track.age,
        radarFreqGhz: 9.4,
      },
    };
  }
}

function clampNum(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** Initial bearing helper, duplicated locally to keep the simulator self-contained. */
function bearingTo(from: LatLng, to: LatLng): number {
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const y = Math.sin(toRad(to.lng - from.lng)) * Math.cos(toRad(to.lat));
  const x =
    Math.cos(toRad(from.lat)) * Math.sin(toRad(to.lat)) -
    Math.sin(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.cos(toRad(to.lng - from.lng));
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

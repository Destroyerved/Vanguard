/**
 * VANGUARD — Fixed CCTV grid simulator (video feed).
 *
 * Emits deterministic "clips" exactly the way the radar sim emits tracks and
 * the media sim emits posts: RAW payloads only, driven by a per-camera seeded
 * RNG so the whole demo replays identically from SIM_SEED. Processing — track
 * association, forensics, claim validation — is deliberately NOT simulated
 * here; the vision engine owns it. This adapter only produces the FRAME
 * DETECTIONS and BITSTREAM HINTS the engine consumes, plus structured claims
 * for it to validate.
 *
 * Three content profiles, matching the media feed's four-way spread:
 *
 *   AUTHENTIC   honest bitstream (C2PA intact), clean forensic signals, real
 *               world objects on camera, claims that can be SUPPORTED.
 *   EDITED      real capture lightly processed (stabilize/upscale), benign
 *               forensic signals, honest claims.
 *   FABRICATED  a synthetic object (typically a UAV) is injected that is NOT in
 *               the camera's world model, with neural-generation bitstream
 *               markers and a dramatic claim attached. The tracker will fail to
 *               keep its identity and the forensics will classify the clip
 *               POTENTIAL_SYNTHETIC, so the claim is CONTRADICTED and surfaced —
 *               exactly what §26-§28 demand of a refuted report.
 *
 * Cameras on restricted-zone posts carry a "poacher" whose walk carries them
 * across the zone boundary, which is what lets the tracker's restricted-entry
 * alarm turn a plain detection into an operational event.
 */

import { VISION_RESTRICTED_ZONES } from '../config/constants.js';
import {
  bearingDegrees,
  destinationPoint,
  haversineMeters,
  knotsToMps,
  type LatLng,
} from '../util/geo.js';
import { createRng, type Rng } from '../util/random.js';
import { round } from '../util/stats.js';
import { nowIso } from '../util/time.js';
import { ok, type PollContext, type PollOutcome, type RawObservation, type SourceAdapter } from './SourceAdapter.js';

const SYNTHETIC_FINGERPRINT = 'SYNTHETIC_CONTAINER_NO_PHYSICAL_SENSOR_ID';

/** Fixed surveillance grid around the AO. */
const CCTVS = [
  { cameraId: 'NC-01', name: 'North Gate Perimeter Cam 01', lat: 23.148, lng: 72.588, zoneId: 'RZ-1' },
  { cameraId: 'NC-02', name: 'North Approach Road Cam 02', lat: 23.141, lng: 72.598, zoneId: null },
  { cameraId: 'CC-03', name: 'Coastal Cordon Cam 03', lat: 22.905, lng: 72.5825, zoneId: 'RZ-2' },
  { cameraId: 'CC-04', name: 'Coastal Jetty Cam 04', lat: 22.908, lng: 72.593, zoneId: null },
  { cameraId: 'EA-05', name: 'Eastern Approach Cam 05', lat: 23.032, lng: 72.693, zoneId: null },
  { cameraId: 'CT-06', name: 'Central Terminal Cam 06', lat: 23.021, lng: 72.592, zoneId: null },
] as const;

interface CctvCamera {
  cameraId: string;
  name: string;
  location: LatLng;
  zoneId: string | null;
}

const CAMERAS: CctvCamera[] = CCTVS.map((c) => ({
  cameraId: c.cameraId,
  name: c.name,
  location: { lat: c.lat, lng: c.lng },
  zoneId: c.zoneId,
}));

interface WorldObject {
  id: string;
  classId: string;
  label: string;
  position: LatLng;
  heading: number;
  speedKnots: number;
  staticObject: boolean;
}

interface CameraState {
  camera: CctvCamera;
  objects: WorldObject[];
  frameIndex: number;
  simTimeSec: number;
  clipSeq: number;
}

interface SimProfile {
  key: 'authentic' | 'edited' | 'fabricated';
  weight: number;
}

const PROFILES: SimProfile[] = [
  { key: 'authentic', weight: 4.5 },
  { key: 'edited', weight: 2.5 },
  { key: 'fabricated', weight: 1.2 },
];

/** Routine claims an honest clip can actually support. */
const SCENE_CLAIMS: { text: string; requires: { label: string; minCount: number } }[] = [
  { text: 'Persons are present in the monitored area', requires: { label: 'person', minCount: 1 } },
  { text: 'Vehicle activity at the camera vantage', requires: { label: 'vehicle', minCount: 1 } },
  { text: 'Maritime traffic in view of the camera', requires: { label: 'vessel', minCount: 1 } },
];

/** Dramatic claims fabricated media attach to a synthetic subject. */
const FABRICATED_CLAIMS: { text: string; requires: { label: string; minCount: number } }[] = [
  { text: 'Unmanned aerial incursion over the restricted perimeter', requires: { label: 'uav', minCount: 1 } },
  { text: 'Explosion and smoke column inside the restricted sector', requires: { label: 'smoke', minCount: 1 } },
  { text: 'Unauthorized vessel breaching the coastal cordon', requires: { label: 'vessel', minCount: 1 } },
];

/** CCTV bitstream fingerprints per content profile. */
const CAMERA_DEVICES = [
  'Axis Q1645-LE SN-77321 (4mm Varifocal)',
  'Hikvision DS-2CD2686G2P-IZS SN-88104',
  'Bosch AUTODOME IP 7000i SN-55490',
];

const FRAME_COUNT_RANGE: [number, number] = [20, 36];
const FRAME_STRIDE_SEC = 0.55;

export class CctvVisionSimAdapter implements SourceAdapter {
  readonly sourceType = 'video' as const;
  readonly sourceName = 'CCTV-VISION-GRID';
  readonly nominalReliability = 0.86;

  readonly pollIntervalMs: number;
  private readonly rng: Rng;
  private readonly states = new Map<string, CameraState>();
  private readonly queued: RawObservation[] = [];
  private intensity: number;
  private pointsOfInterest: LatLng[] = [];

  constructor(seed: number, pollIntervalMs = 5_000, intensity = 1) {
    this.pollIntervalMs = pollIntervalMs;
    this.intensity = intensity;
    this.rng = createRng(seed ^ 0x56494f46); // 'VIOF'
  }

  /** Nearby operational contacts, so fabricated clips can claim them too. */
  setPointsOfInterest(points: LatLng[]): void {
    this.pointsOfInterest = points;
  }

  /** Seed a standing backlog so the picture opens with CCTV already present. */
  init(): void {
    for (const camera of CAMERAS) this.states.set(camera.cameraId, this.initCamera(camera));
    const seedCount = Math.max(2, Math.round(2 * this.intensity));
    for (let i = 0; i < seedCount; i++) this.queued.push(this.buildObservation());
  }

  poll(_context: PollContext): PollOutcome {
    const started = Date.now();
    const observations: RawObservation[] = [];

    const drain = Math.min(this.queued.length, 2);
    for (let i = 0; i < drain; i++) observations.push(this.queued.shift()!);

    if (this.rng.chance(0.35 * this.intensity)) {
      observations.push(this.buildObservation());
    }

    return ok(observations, Date.now() - started);
  }

  /* ------------------------------------------------------------------ *
   * World model
   * ------------------------------------------------------------------ */

  private initCamera(camera: CctvCamera): CameraState {
    const rng = this.rng.fork(camera.cameraId.charCodeAt(0) * 1_000 + camera.cameraId.charCodeAt(1));
    const objects: WorldObject[] = [];

    // Persons: every camera has 1-3 on foot.
    const personCount = rng.int(1, 3);
    for (let i = 0; i < personCount; i++) {
      objects.push({
        id: `${camera.cameraId}-P-${i + 1}`,
        classId: 'person',
        label: 'person',
        position: this.nearCamera(rng, camera.location),
        heading: rng.float(0, 360),
        speedKnots: rng.float(1.5, 3),
        staticObject: false,
      });
    }

    // Vehicles: most cameras get one parked or slow-moving.
    if (rng.chance(0.7)) {
      objects.push({
        id: `${camera.cameraId}-V-1`,
        classId: 'vehicle',
        label: 'vehicle',
        position: this.nearCamera(rng, camera.location),
        heading: rng.float(0, 360),
        speedKnots: rng.chance(0.55) ? 0 : rng.float(4, 9),
        staticObject: rng.chance(0.45),
      });
    }

    // Coastal cameras see a vessel on approach lanes.
    if (camera.cameraId.startsWith('CC')) {
      objects.push({
        id: `${camera.cameraId}-M-1`,
        classId: 'vessel',
        label: 'vessel',
        position: this.nearCamera(rng, camera.location, 350),
        heading: rng.float(220, 320),
        speedKnots: rng.float(2, 6),
        staticObject: false,
      });
    }

    // Smoke plumes occasionally present on the eastern/terminal cameras.
    if (rng.chance(0.4) && (camera.cameraId === 'EA-05' || camera.cameraId === 'CT-06')) {
      objects.push({
        id: `${camera.cameraId}-SM-1`,
        classId: 'smoke',
        label: 'smoke',
        position: this.nearCamera(rng, camera.location, 180),
        heading: 0,
        speedKnots: 0,
        staticObject: true,
      });
    }

    // Restricted-zone post: a "poacher" whose path carries them into the zone.
    if (camera.zoneId) {
      objects.push({
        id: `${camera.cameraId}-X-1`,
        classId: 'person',
        label: 'person',
        position: this.nearCamera(rng, camera.location, 150),
        heading: this.headingToZone(camera.location, camera.zoneId),
        speedKnots: rng.float(1.6, 2.6),
        staticObject: false,
      });
    }

    return { camera, objects, frameIndex: 0, simTimeSec: 0, clipSeq: 0 };
  }

  private nearCamera(rng: Rng, origin: LatLng, radius = 400): LatLng {
    return destinationPoint(origin, rng.float(0, 360), rng.float(40, radius));
  }

  private headingToZone(from: LatLng, zoneId: string): number {
    const zone = VISION_RESTRICTED_ZONES.find((z) => z.id === zoneId);
    return zone ? bearingDegrees(from, zone.center) : rngFloat(from);
  }

  /* ------------------------------------------------------------------ *
   * Clip synthesis
   * ------------------------------------------------------------------ */

  private buildObservation(): RawObservation {
    const camera = this.rng.pick(CAMERAS);
    const state = this.states.get(camera.cameraId) ?? this.initCamera(camera);
    this.states.set(camera.cameraId, state);

    const profile = this.weightedProfile();
    state.clipSeq++;

    const frameCount = this.rng.int(FRAME_COUNT_RANGE[0], FRAME_COUNT_RANGE[1]);
    const durationSec = round(frameCount * FRAME_STRIDE_SEC, 1);
    const startFrame = state.frameIndex;
    const clipId = `CLIP-${camera.cameraId}-${String(state.clipSeq).padStart(5, '0')}`;

    const fabricated = profile.key === 'fabricated';
    const fake = fabricated ? this.fabricatedObject(camera.location) : null;
    const anchor = fake ?? null;

    const frames: Record<string, unknown>[] = [];
    for (let i = 0; i < frameCount; i++) {
      const frameIndex = startFrame + i;
      const timestampSec = round(state.simTimeSec + i * FRAME_STRIDE_SEC, 2);

      // Advance real world objects to their position for this frame.
      const detections: Record<string, unknown>[] = [];
      for (const obj of state.objects) {
        this.advance(state, obj, FRAME_STRIDE_SEC, camera);
        if (!this.inView(state, obj, camera)) continue;
        detections.push(this.detectionFor(state, obj, frameIndex, 0.66));
      }

      // A fabricated subject is not in the world model: it teleports rather
      // than moves, so the tracker cannot keep a coherent identity.
      if (fake) {
        this.teleport(fake, camera, frameIndex);
        detections.push(this.detectionFor(state, fake, frameIndex, 0.85, true));
      }

      frames.push({ frameIndex, timestampSec, detections });
    }

    state.frameIndex += frameCount;
    state.simTimeSec += durationSec;

    const claims = fabricated
      ? [this.fabricatedClaim()]
      : [this.sceneClaim(state)];

    const payload: Record<string, unknown> = {
      cameraId: camera.cameraId,
      cameraName: camera.name,
      cameraLat: camera.location.lat,
      cameraLng: camera.location.lng,
      clipId,
      durationSec,
      framesAnalyzed: frameCount,
      startFrameIndex: startFrame,
      contentProfile: profile.key,
      camera: { ci: 0 }, // placeholder kept for schema clarity
      frames,
      claims,
      claimedSeverity: fabricated ? 'medium' : 'low',
      // Media payload fields so the generic media-authenticity audit runs too.
      mediaId: `V-${state.clipSeq.toString().padStart(5, '0')}`,
      mediaKind: 'video',
      ...this.bitstream(profile.key),
      lat: camera.location.lat,
      lng: camera.location.lng,
      sourceName: this.sourceName,
    };
    void anchor;

    return {
      sourceType: this.sourceType,
      sourceName: this.sourceName,
      timestamp: nowIso(),
      payload,
    };
  }

  private advance(state: CameraState, obj: WorldObject, dtSec: number, camera: CctvCamera): void {
    if (obj.staticObject || obj.speedKnots === 0) return;
    if (!state.camera.zoneId || !this.poacherInsideZone(obj, state.camera)) {
      obj.position = destinationPoint(
        obj.position,
        obj.heading,
        knotsToMps(obj.speedKnots) * dtSec,
      );
    }
    // Keep objects near the camera so the detector keeps finding them.
    if (haversineMeters(obj.position, camera.location) > 750) {
      const rng = this.rng.fork(Math.round(obj.position.lat * 1_000));
      obj.position = this.nearCamera(rng, camera.location, 250);
      if (state.camera.zoneId) {
        obj.heading = this.headingToZone(obj.position, state.camera.zoneId);
      } else {
        obj.heading = rng.float(0, 360);
      }
    }
  }

  private poacherInsideZone(obj: WorldObject, camera: CctvCamera): boolean {
    if (!camera.zoneId) return false;
    const zone = VISION_RESTRICTED_ZONES.find((z) => z.id === camera.zoneId);
    return zone ? haversineMeters(obj.position, zone.center) <= zone.radiusMeters : false;
  }

  private inView(state: CameraState, obj: WorldObject, camera: CctvCamera): boolean {
    return haversineMeters(obj.position, camera.location) <= 800;
  }

  private detectionFor(
    state: CameraState,
    obj: WorldObject,
    frameIndex: number,
    baseConfidence: number,
    fabricated = false,
  ): Record<string, unknown> {
    const camera = state.camera;
    const rng = this.rng.fork(Math.round(obj.position.lng * 10_000) + frameIndex);
    const distance = Math.max(5, haversineMeters(obj.position, camera.location));
    const widthScale = distance < 160 ? 1 : 160 / distance;
    const w = round(Math.min(0.5, 0.24 * widthScale * rng.float(0.85, 1.15)), 3);
    const h = round(w * (obj.classId === 'vehicle' || obj.classId === 'vessel' ? 1.2 : 1.9), 3);
    const confidence = round(
      fabricated
        ? rng.float(0.82, 0.92)
        : Math.min(0.98, baseConfidence + rng.float(0, 0.24)),
      3,
    );
    return {
      detectionId: obj.id,
      classId: obj.classId,
      label: obj.label,
      confidence,
      bbox: {
        x: round(rng.float(0.12, 0.72), 3),
        y: round(rng.float(0.2, 0.62), 3),
        w,
        h,
      },
      lat: round(obj.position.lat, 6),
      lng: round(obj.position.lng, 6),
      speedKnots: fabricated ? round(rng.float(12, 45), 1) : round(obj.speedKnots, 1),
      headingDegrees: fabricated ? round(rng.float(0, 360), 1) : round(obj.heading, 1),
    };
  }

  private fabricatedObject(anchor: LatLng): WorldObject {
    return {
      id: `FAKE-UAV-${this.rng.int(1, 9_999)}`,
      classId: 'uav',
      label: 'uav',
      position: { lat: anchor.lat, lng: anchor.lng },
      heading: this.rng.float(0, 360),
      speedKnots: this.rng.float(18, 42),
      staticObject: false,
    };
  }

  private teleport(fake: WorldObject, camera: CctvCamera, frameIndex: number): void {
    const rng = this.rng.fork(7_913 + frameIndex * 31);
    fake.position = destinationPoint(fake.position, rng.float(0, 360), rng.float(150, 450));
    // Fold it back inside the view when the jump escapes the detector's range.
    if (haversineMeters(fake.position, camera.location) > 800) {
      fake.position = destinationPoint(camera.location, rng.float(0, 360), rng.float(120, 420));
    }
  }

  private sceneClaim(state: CameraState): Record<string, unknown> {
    const available = state.objects.map((o) => o.label);
    let template = this.rng.pick(SCENE_CLAIMS);

    // About a quarter of the time, claim something that contradicts the actual
    // scene — honest footage refuting a careless report is a contradiction the
    // engine must also surface.
    const mismatch = this.rng.chance(0.25);
    if (mismatch) {
      const others = SCENE_CLAIMS.filter((c) => !available.includes(c.requires.label));
      if (others.length > 0) template = this.rng.pick(others);
    }

    const restricted = state.camera.zoneId
      ? {
          id: `CL-${state.camera.cameraId}-${state.clipSeq}`,
          text: `Unauthorized entry into ${state.camera.zoneId} by foot`,
          claimConfidence: round(this.rng.float(0.6, 0.9), 2),
          requires: { behavior: 'RESTRICTED_ZONE_ENTRY' },
        }
      : null;

    if (restricted && this.rng.chance(0.5)) return restricted;
    return {
      id: `CL-${state.camera.cameraId}-${state.clipSeq}`,
      text: template.text,
      claimConfidence: round(this.rng.float(0.6, 0.9), 2),
      requires: template.requires,
    };
  }

  private fabricatedClaim(): Record<string, unknown> {
    const template = this.rng.pick(FABRICATED_CLAIMS);
    return {
      id: `CL-FAB-${this.rng.int(100, 9_999)}`,
      text: template.text,
      claimConfidence: round(this.rng.float(0.7, 0.95), 2),
      requires: template.requires,
    };
  }

  /* ------------------------------------------------------------------ *
   * Bitstream fingerprints + forensic signals
   * ------------------------------------------------------------------ */

  private bitstream(profile: 'authentic' | 'edited' | 'fabricated'): Record<string, unknown> {
    if (profile === 'fabricated') {
      return {
        container: 'MP4 v2 (Custom Atom Layout)',
        videoCodec: 'H.264 / AVC (High Profile @ Level 4.0)',
        audioCodec: 'N/A',
        resolution: '1920x1080 (Full HD)',
        frameRateFps: 25,
        bitrateKbps: this.rng.float(3_200, 4_800),
        softwareMuxer: 'Lavf/59.27.100 (FFmpeg Neural Pipeline)',
        reEncodingHistory: [
          'AI Generation: Runway Gen-3 / Sora Neural Synthesis Model',
          'Motion Graphics: Surveillance-grade timestamp burned into synthetic frames',
          'Muxing: FFmpeg v5.1.2 (Lavf59.27.100) — Custom MP4 Atom Structure',
        ],
        c2paManifestIntact: false,
        deviceFingerprint: SYNTHETIC_FINGERPRINT,
        captureDevice: undefined,
        estimatedSensorType: 'Synthetic Neural Render (No Physical Sensor)',
        prnuMatchPct: this.rng.float(2, 8),
        chromaticAberrationPct: this.rng.float(18, 30),
        compressionPattern: 'FFmpeg Synthetic Transcode / Lossy Neural Interpolation',
        deepfakeVideo: true,
        visualArtifacts: [
          'Neural Texture Dissolve & Edge Aliasing',
          'Synthetic timestamp glyph instability',
        ],
        forensicSignals: {
          compressionAnomaly: 0.6,
          frameAnomaly: 0.45,
          lightingAnomaly: this.rng.chance(0.5) ? 0.4 : 0.2,
          temporalAnomaly: 0.55,
          metadataAnomaly: 0.5,
          syntheticMediaSignal: true,
        },
      };
    }

    const device = this.rng.pick(CAMERA_DEVICES);
    const edited = profile === 'edited';
    const upscaled = edited && this.rng.chance(0.5);

    return {
      container: 'ISO Base Media File Format (MP4 / ISOM)',
      videoCodec: 'H.264 / AVC (High Profile, Fixed-Length GOP)',
      audioCodec: 'N/A',
      resolution: upscaled ? '3840x2160 (4K, AI-upscaled)' : '1920x1080 (Full HD)',
      frameRateFps: 25,
      bitrateKbps: upscaled ? 14_000 : 8_200,
      softwareMuxer: edited
        ? 'CapCut Muxer (CMF)' + (this.rng.chance(0.5) ? '' : '')
        : `${device} Stream Handler`,
      reEncodingHistory: edited
        ? [
            `Hardware Capture: ${device}`,
            this.rng.pick(['Edit / Crop: DaVinci Resolve 19', 'Stabilize: Optical-Flow Stabilize', 'Denoise: Temporal Denoise Pass']),
            ...(upscaled ? ['AI Enhancement: Perceptual Super-Resolution Upscale to 4K'] : []),
          ]
        : [`Hardware Capture: ${device}`, 'Direct DVR Archive Write (H.264 High)'],
      c2paManifestIntact: !edited,
      deviceFingerprint: device,
      captureDevice: device,
      estimatedSensorType: '1/2.7" Progressive CMOS (Rolling Shutter)',
      prnuMatchPct: edited ? this.rng.float(70, 86) : this.rng.float(91, 96),
      chromaticAberrationPct: edited ? this.rng.float(72, 84) : this.rng.float(88, 93),
      compressionPattern: edited
        ? 'H.264 High@L4.0 CABAC (Re-encoded)' + (upscaled ? ' — AI-upscaled' : '')
        : 'H.264 High@L4.1 CABAC Bitstream (Compliant ISO/IEC 14496-10)',
      aiUpscaled: upscaled,
      stabilized: edited && !upscaled && this.rng.chance(0.5),
      visualArtifacts: edited
        ? upscaled
          ? ['Minor AI-upscale ringing around high-contrast edges']
          : ['Minor Compression Noise (Re-encode)']
        : ['None Detected'],
      forensicSignals: edited
        ? {
            compressionAnomaly: 0.2,
            frameAnomaly: 0.15,
            lightingAnomaly: 0.1,
            temporalAnomaly: 0.1,
            metadataAnomaly: 0.25,
            syntheticMediaSignal: false,
          }
        : {
            compressionAnomaly: 0,
            frameAnomaly: 0,
            lightingAnomaly: 0,
            temporalAnomaly: 0,
            metadataAnomaly: 0,
            syntheticMediaSignal: false,
          },
    };
  }

  private weightedProfile(): SimProfile {
    const total = PROFILES.reduce((s, p) => s + p.weight, 0);
    let roll = this.rng.float(0, total);
    for (const profile of PROFILES) {
      roll -= profile.weight;
      if (roll <= 0) return profile;
    }
    return PROFILES[0]!;
  }
}

/** Deterministic pseudo-bearing fallback (0-360). */
function rngFloat(from: LatLng): number {
  return (Math.abs(from.lat * 180 + from.lng) * 7919) % 360;
}
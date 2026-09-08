/**
 * VANGUARD — Open-source media and hydrophone audio simulator.
 *
 * Two new feeds, deliberately the most untrustworthy and the most verifiable:
 *
 *   OSINT-SOCIAL-GRID   social_media  — public footage and posts. Freely
 *                       manipulable, platform-transcoded, provenance-stripped.
 *   HYDROPHONE-ARRAY    audio_recording — instrumented acoustic capture that
 *                       any navy would trust far more than a phone clip.
 *
 * The social feed emits FOUR fidelity profiles so the media-authenticity
 * engine has discriminating work to do:
 *
 *   AUTHENTIC       hardware capture, intact (or cleanly stripped) provenance
 *   LEGIT_EDITED    captured then cropped/graded/stabilized/denoised/AI-upscaled
 *   FABRICATED      deepfakes / neural video — can describe an event that never
 *                   happened
 *   HYBRID_VOICE    real footage with an AI voice layer (TTS/cloned narration)
 *
 * Fabricated items are placed near live contacts of interest about a quarter of
 * the time, which is exactly how real disinformation behaves: it attaches to
 * real events to borrow their credibility. Those land as HYBRID_CORROBORATED;
 * the ones seeded nowhere near a live contact land as EVENT_FABRICATING. That
 * split is what proves the engine distinguishes "fake media about a real
 * event" from "fake media describing nothing real" — the core demand of the
 * authenticity flow.
 *
 * Everything is deterministic from SIM_SEED, so a demo replays identically.
 */

import { AO_SECTORS } from '../config/constants.js';
import { destinationPoint, type LatLng } from '../util/geo.js';
import { createRng, type Rng } from '../util/random.js';
import { nowIso } from '../util/time.js';
import { ok, type PollContext, type PollOutcome, type RawObservation, type SourceAdapter } from './SourceAdapter.js';

const SYNTHETIC_FINGERPRINT = 'SYNTHETIC_CONTAINER_NO_PHYSICAL_SENSOR_ID';

interface SocialTemplate {
  key: 'authentic' | 'legit_edited' | 'fabricated' | 'hybrid_voice';
  weight: number;
}

const SOCIAL_PROFILES: SocialTemplate[] = [
  { key: 'authentic', weight: 5 },
  { key: 'legit_edited', weight: 3.5 },
  { key: 'fabricated', weight: 1.2 },
  { key: 'hybrid_voice', weight: 0.8 },
];

const PLATFORMS = [
  { name: 'Instagram', handlePrefix: '@', cdn: 'Meta Instagram CDN' },
  { name: 'X_Twitter', handlePrefix: '@', cdn: 'X/Twitter Transcode Engine' },
  { name: 'Telegram', handlePrefix: '@', cdn: 'Telegram CDN' },
  { name: 'YouTube', handlePrefix: '@', cdn: 'YouTube Transcode Engine' },
] as const;

/** Subjects a fabricated clip claims to show — the fabrication vector. */
const FABRICATED_SUBJECTS: { subject: string; severity: 'low' | 'medium' | 'high' }[] = [
  { subject: 'Unmanned aerial incursion over the restricted perimeter', severity: 'high' },
  { subject: 'Explosion and smoke column inside the coastal sector', severity: 'high' },
  { subject: 'Unidentified vessel loitering at the maritime boundary', severity: 'medium' },
  { subject: 'Unauthorized persons inside the outer cordon', severity: 'medium' },
];

/** Subjects authentic/edited footage most plausibly shows. */
const ROUTINE_SUBJECTS: { subject: string; severity: 'low' | 'medium' }[] = [
  { subject: 'Dense commuter traffic on the eastern approach road', severity: 'low' },
  { subject: 'Night patrol visible from the sector perimeter', severity: 'low' },
  { subject: 'Maritime activity off the coast', severity: 'low' },
  { subject: 'Gathering crowd forming near the outer cordon', severity: 'medium' },
  { subject: 'Heavy weather front moving across the sector', severity: 'low' },
];

const CAMERAS = [
  { device: 'Apple iPhone 15 Pro (Rear Camera 24mm f/1.78)', sensor: '1/1.3" Stacked CMOS' },
  { device: 'Samsung Galaxy S24 Ultra (Main Wide 23mm)', sensor: '1/1.4" CMOS' },
  { device: 'Sony ILME-FX6V Serial #4089210', sensor: 'Full-Frame CMOS (Global Shutter)' },
  { device: 'DJI Mavic 3 Pro (Hasselblad L2D-20c)', sensor: '4/3" CMOS' },
];

const LEGIT_EDIT_TOOLS = [
  'CapCut iOS Build 12.8.1 (Reel Timeline)',
  'Adobe Premiere Pro 2024 (Color Grade / Crop)',
  'DaVinci Resolve 19 (Optical-Flow Stabilize)',
  'CapCut (Denoise / AI Upscale to 4K)',
];

const HYDROPHONE_DEVICE = 'Teledyne-Reson-TC4032-SN-99841';

interface MediaSimConfig {
  kind: 'social' | 'audio';
  seed: number;
  intensity: number;
  pollIntervalMs: number;
}

/**
 * Shared simulator machinery. Subclasses bind the actual source type, reliability
 * and payload builders so the orchestrator can register them as distinct feeds.
 */
abstract class MediaSimAdapterBase implements SourceAdapter {
  abstract readonly sourceType: SourceAdapter['sourceType'];
  abstract readonly sourceName: string;
  abstract readonly nominalReliability: number;

  protected readonly rng: Rng;
  protected readonly intensity: number;
  protected readonly kind: MediaSimConfig['kind'];
  protected readonly queued: RawObservation[] = [];
  protected seq = 0;
  protected pointsOfInterest: LatLng[] = [];

  readonly pollIntervalMs: number;

  protected constructor(config: MediaSimConfig) {
    this.kind = config.kind;
    this.intensity = config.intensity;
    this.rng = createRng(
      config.seed ^ (this.kind === 'social' ? 0x4f534e4c : 0x48445249), // 'OSNL' / 'HDRI'
    );
    this.pollIntervalMs = config.pollIntervalMs;
  }

  /** Contacts of interest from the pipeline, so nvivo media can attach to real events. */
  setPointsOfInterest(points: LatLng[]): void {
    this.pointsOfInterest = points;
  }

  /** Seed a standing backlog so the picture opens with media already present. */
  init(): void {
    const seed = Math.max(2, Math.round(3 * this.intensity));
    for (let i = 0; i < seed; i++) this.queued.push(this.buildObservation());
  }

  poll(_context: PollContext): PollOutcome {
    const started = Date.now();
    const observations: RawObservation[] = [];

    const drain = Math.min(this.queued.length, 3);
    for (let i = 0; i < drain; i++) observations.push(this.queued.shift()!);

    const rate = this.kind === 'social' ? 0.45 : 0.3;
    if (this.rng.chance(rate * this.intensity)) {
      observations.push(this.buildObservation());
    }

    return ok(observations, Date.now() - started);
  }

  protected abstract buildObservation(): RawObservation;

  /* ---------------- shared geometry helpers ---------------- */

  /** A sector position, with no knowledge of live contacts. */
  protected sectorPosition(): LatLng {
    const sector = this.rng.pick(AO_SECTORS);
    return destinationPoint(
      { lat: sector.lat, lng: sector.lng },
      this.rng.float(0, 360),
      this.rng.float(0, sector.radiusMeters * 0.85),
    );
  }

  /**
   * Position for this observation. The item is placed near a live contact of
   * interest with probability `attachToPoi` — that is what creates genuine
   * spatial coincidence between an independent open-source feed and the radar/
   * incident picture the fusion engine is already holding.
   */
  protected position(attachToPoi: number): LatLng {
    if (this.rng.chance(attachToPoi) && this.pointsOfInterest.length > 0) {
      const anchor = this.rng.pick(this.pointsOfInterest);
      return destinationPoint(anchor, this.rng.float(0, 360), this.rng.float(0, 1_500));
    }
    return this.sectorPosition();
  }

  protected nextSeq(): number {
    this.seq += 1;
    return this.seq;
  }
}

/* ------------------------------------------------------------------ *
 * Social media feed
 * ------------------------------------------------------------------ */

export class SocialMediaSimAdapter extends MediaSimAdapterBase {
  readonly sourceType = 'social_media' as const;
  readonly sourceName = 'OSINT-SOCIAL-GRID';
  readonly nominalReliability = 0.6;

  constructor(seed: number, pollIntervalMs = 6_000, intensity = 1) {
    super({ kind: 'social', seed, intensity, pollIntervalMs });
  }

  protected buildObservation(): RawObservation {
    const profile = this.weightedProfile();
    const platform = this.rng.pick(PLATFORMS);
    const seq = this.nextSeq();

    const fabricated = profile.key === 'fabricated';
    // Fabricated media attaches to live contacts a quarter of the time — real
    // disinformation attaches to real events to borrow their credibility.
    const attachToPoi = fabricated ? 0.25 : profile.key === 'hybrid_voice' ? 0.75 : 0.55;
    const position = this.position(attachToPoi);

    const payload =
      profile.key === 'authentic'
        ? this.authenticPayload(platform.name)
        : profile.key === 'legit_edited'
          ? this.legitEditedPayload(platform.name)
          : profile.key === 'fabricated'
            ? this.fabricatedPayload(platform.name)
            : this.hybridVoicePayload(platform.name);

    payload.subject = payload.subject ?? FABRICATED_SUBJECTS[0]!.subject;
    payload.accountReputation =
      typeof payload.accountReputation === 'number'
        ? payload.accountReputation
        : this.rng.float(0.5, 0.95);
    payload.followers = Math.round(this.rng.float(200, 250_000));
    payload.engagementRate = this.rng.float(0.002, 0.045);
    payload.lat = position.lat;
    payload.lng = position.lng;
    payload.sector = this.nearestSector(position).name;

    return {
      sourceType: this.sourceType,
      sourceName: this.sourceName,
      timestamp: nowIso(),
      payload: {
        mediaId: `S-${String(seq).padStart(5, '0')}`,
        platform: platform.name,
        handle: `${platform.handlePrefix}${this.handleFor(seq)}`,
        postedAt: nowIso(),
        mediaKind: 'video',
        ...payload,
      },
    };
  }

  private authenticPayload(platform: string): Record<string, unknown> {
    const camera = this.rng.pick(CAMERAS);
    const c2pa = this.rng.chance(0.65);
    const subject = this.rng.pick(ROUTINE_SUBJECTS);

    return {
      subject: subject.subject,
      claimedSeverity: subject.severity,
      claimsEvent: true,
      container: 'ISO Base Media File Format (MP4 / ISOM)',
      videoCodec: this.rng.chance(0.5) ? 'HEVC / H.265 (Main 10 Profile @ Level 5.1)' : 'H.264 / AVC (High Profile)',
      audioCodec: 'AAC-LC (256 kbps, 48 kHz Stereo)',
      resolution: this.rng.chance(0.5) ? '1920x1080 (Full HD)' : '3840x2160 (4K)',
      frameRateFps: this.rng.chance(0.5) ? 59.94 : 30,
      bitrateKbps: this.rng.chance(0.5) ? 12500 : 9600,
      durationSec: this.rng.float(15, 90),
      creationTimestamp: nowIso(),
      softwareMuxer: c2pa ? 'Sony XDCAM HD422 Stream Handler' : `${platform} Ingest Transcoder`,
      reEncodingHistory: [
        `Camera Capture: ${camera.device}`,
        ...(c2pa
          ? ['C2PA Cryptographic Signature: Signed with Hardware Security Module (HSM)']
          : [`Platform Ingest: ${platform} CDN Re-encode (H.264 High@L4.1)`]),
      ],
      c2paManifestIntact: c2pa,
      deviceFingerprint: this.rng.chance(0.12) ? undefined : camera.device,
      captureDevice: camera.device,
      estimatedSensorType: camera.sensor,
      prnuMatchPct: this.rng.float(92, 97),
      chromaticAberrationPct: this.rng.float(88, 94),
      compressionPattern: 'H.264 High@L4.1 CABAC Bitstream (Compliant ISO/IEC 14496-10)',
      visualArtifacts: [this.rng.chance(0.6) ? 'Minor Compression Noise (Standard Platform Transcode)' : 'None Detected'],
    };
  }

  private legitEditedPayload(platform: string): Record<string, unknown> {
    const camera = this.rng.pick(CAMERAS);
    const editor = this.rng.pick(LEGIT_EDIT_TOOLS);
    const upscaled = this.rng.chance(0.5);
    const subject = this.rng.pick(ROUTINE_SUBJECTS);

    return {
      subject: subject.subject,
      claimedSeverity: subject.severity,
      claimsEvent: true,
      container: 'ISO Base Media File Format (MP4 / ISOM)',
      videoCodec: 'H.264 / AVC (Main Profile)',
      audioCodec: 'AAC-LC (192 kbps, 44.1 kHz Stereo)',
      resolution: upscaled ? '3840x2160 (4K, AI-upscaled)' : '1920x1080 (Full HD)',
      frameRateFps: 30,
      bitrateKbps: upscaled ? 14000 : 8400,
      durationSec: this.rng.float(12, 70),
      creationTimestamp: nowIso(),
      softwareMuxer: editor.includes('CapCut') ? 'CapCut Muxer (CMF)' : this.rng.pick(['ffmpeg (Lavf60.3.100)', 'Premiere Export H.264']),
      reEncodingHistory: [
        `Camera Capture: ${camera.device}`,
        `Edit / Grade: ${editor}`,
        ...(upscaled ? ['AI Enhancement: Perceptual Super-Resolution Upscale to 4K'] : []),
        `Platform Ingest: ${platform} CDN Re-encode (H.264 High@L4.0)`,
      ],
      c2paManifestIntact: false,
      deviceFingerprint: this.rng.chance(0.4) ? camera.device : undefined,
      captureDevice: this.rng.chance(0.4) ? camera.device : undefined,
      estimatedSensorType: camera.sensor,
      prnuMatchPct: this.rng.float(72, 88),
      chromaticAberrationPct: this.rng.float(76, 88),
      compressionPattern: 'H.264 Main@L4.0 CABAC Bitstream (Re-encoded)',
      aiUpscaled: upscaled,
      denoised: this.rng.chance(0.5),
      stabilized: this.rng.chance(0.5),
      visualArtifacts: upscaled
        ? ['Minor AI-upscale ringing around high-contrast edges']
        : ['Minor Compression Noise (Multiple Re-encodes)'],
    };
  }

  private fabricatedPayload(platform: string): Record<string, unknown> {
    const subject = this.rng.pick(FABRICATED_SUBJECTS);

    return {
      subject: subject.subject,
      claimedSeverity: subject.severity,
      claimsEvent: true,
      deepfakeVideo: true,
      syntheticVideo: this.rng.chance(0.2),
      container: 'ISO Base Media File Format (MP4 v2)',
      videoCodec: 'H.264 / AVC (High Profile @ Level 4.0)',
      audioCodec: this.rng.chance(0.4) ? 'AAC-LC (128 kbps, 48 kHz)' : 'N/A',
      resolution: '1280x720 (HD 16:9)',
      frameRateFps: 30,
      bitrateKbps: 4200,
      durationSec: this.rng.float(8, 30),
      creationTimestamp: nowIso(),
      softwareMuxer: 'Lavf/59.27.100 (FFmpeg Neural Pipeline)',
      reEncodingHistory: [
        'AI Generation: Runway Gen-3 / Sora Neural Synthesis Model',
        'Post-Processing: CapCut Web Edition v3.4 (Synthetic LUT Applied)',
        'Muxing: FFmpeg v5.1.2 (Lavf59.27.100) — Custom MP4 Atom Structure',
        `Social Ingest: ${platform} Transcode Engine (H.264 High@L4.0)`,
      ],
      c2paManifestIntact: false,
      deviceFingerprint: SYNTHETIC_FINGERPRINT,
      captureDevice: undefined,
      estimatedSensorType: 'Synthetic Neural Render (No Physical Sensor)',
      prnuMatchPct: this.rng.float(2, 8),
      chromaticAberrationPct: this.rng.float(18, 30),
      compressionPattern: 'FFmpeg Synthetic Transcode / Lossy Neural Interpolation',
      visualArtifacts: [
        'Neural Facial Mask Boundary Discontinuity',
        'Lighting Illumination Vector Inversion (Key vs Ambient)',
        'Pupil Corneal Highlight Geometric Asymmetry',
        'Generative Texture Dissolve & Edge Aliasing',
      ],
      accountReputation: this.rng.float(0.05, 0.3),
    };
  }

  private hybridVoicePayload(platform: string): Record<string, unknown> {
    const camera = this.rng.pick(CAMERAS);

    return {
      subject: this.rng.pick(ROUTINE_SUBJECTS).subject,
      claimedSeverity: 'medium',
      claimsEvent: true,
      aiVoiceover: true,
      clonedVoice: this.rng.chance(0.4),
      container: 'QuickTime Movie (MPEG-4 Part 14)',
      videoCodec: 'H.264 / AVC (Main Profile @ Level 3.1)',
      audioCodec: 'AAC-LC (96 kbps, 44.1 kHz Mono)',
      resolution: '1080x1920 (Vertical Reel 9:16)',
      frameRateFps: 29.97,
      bitrateKbps: 6800,
      durationSec: this.rng.float(20, 60),
      creationTimestamp: nowIso(),
      softwareMuxer: `${platform} Ingest Transcoder`,
      reEncodingHistory: [
        `Camera Capture: ${camera.device}`,
        'Voice Layer: ElevenLabs TTS API (Constant-Phase Neural Audio)',
        'Composition: CapCut iOS Build 12.8.1 (Reel Timeline)',
        `Platform Ingest: ${platform} CDN Re-encode (H.264 Main@L3.1)`,
      ],
      c2paManifestIntact: false,
      deviceFingerprint: this.rng.chance(0.6) ? camera.device : undefined,
      captureDevice: camera.device,
      estimatedSensorType: camera.sensor,
      prnuMatchPct: this.rng.float(88, 94),
      chromaticAberrationPct: this.rng.float(86, 92),
      compressionPattern: 'H.264 Main@L3.1 CABAC Bitstream',
      audioTrack: true,
      voiceCloningProbability: this.rng.float(78, 92),
      acousticArtifacts: [
        'Neural Text-to-Speech Voice Model Harmonics (Constant Phase Envelope)',
        'Zero Ambient Noise Floor (-94 dBFS Studio Synthetic Profile)',
      ],
      visualArtifacts: ['Minor Compression Noise (Vertical Reel)'],
      accountReputation: this.rng.float(0.2, 0.6),
    };
  }

  private weightedProfile(): SocialTemplate {
    const total = SOCIAL_PROFILES.reduce((s, t) => s + t.weight, 0);
    let roll = this.rng.float(0, total);
    for (const t of SOCIAL_PROFILES) {
      roll -= t.weight;
      if (roll <= 0) return t;
    }
    return SOCIAL_PROFILES[0]!;
  }

  private handleFor(seq: number): string {
    const names = ['watch_dog', 'frontline_feed', 'coastal_eyewitness', 'gujarat_observer', 'night_grid', 'citizen_alert'];
    return `${names[seq % names.length]}${String(seq).padStart(3, '0')}`;
  }

  private nearestSector(position: LatLng): (typeof AO_SECTORS)[number] {
    let best: (typeof AO_SECTORS)[number] = AO_SECTORS[0]!;
    let bestD = Number.POSITIVE_INFINITY;
    for (const sector of AO_SECTORS) {
      const dist = Math.abs(sector.lat - position.lat) + Math.abs(sector.lng - position.lng);
      if (dist < bestD) {
        bestD = dist;
        best = sector;
      }
    }
    return best;
  }
}

/* ------------------------------------------------------------------ *
 * Hydrophone audio feed
 * ------------------------------------------------------------------ */

export class AudioRecordingSimAdapter extends MediaSimAdapterBase {
  readonly sourceType = 'audio_recording' as const;
  readonly sourceName = 'HYDROPHONE-ARRAY';
  readonly nominalReliability = 0.72;

  constructor(seed: number, pollIntervalMs = 8_000, intensity = 1) {
    super({ kind: 'audio', seed, intensity, pollIntervalMs });
  }

  protected buildObservation(): RawObservation {
    const synthetic = this.rng.chance(0.28);
    const position = this.position(synthetic ? 0.5 : 0.6); // real detections cluster on active POIs
    const seq = this.nextSeq();

    const payload: Record<string, unknown> = {
      mediaId: `H-${String(seq).padStart(5, '0')}`,
      audioStream: true,
      mediaKind: 'audio',
      claimedSeverity: synthetic ? 'medium' : 'low',
      claimsEvent: true,
      container: 'Broadcast Wave Format (BWF / RIFF)',
      videoCodec: 'N/A',
      audioCodec: 'Linear PCM 24-bit (48.0 kHz Uncompressed Stereo)',
      resolution: 'N/A',
      frameRateFps: 0,
      bitrateKbps: 2304,
      durationSec: this.rng.float(60, 180),
      creationTimestamp: nowIso(),
      lat: position.lat,
      lng: position.lng,
      sector: this.nearestSector(position).name,
      sourceName: this.sourceName,
    };

    if (synthetic) {
      payload.subject = 'Fabricated distress voice transmission';
      payload.syntheticWaveform = true;
      payload.aiVoiceover = this.rng.chance(0.6);
      payload.clonedVoice = this.rng.chance(0.35);
      payload.softwareMuxer = 'Neural Audio Generator v2.1 (Waveform Synthesis)';
      payload.reEncodingHistory = [
        'AI Generation: Neural Waveform Synthesis (Diffusion TTS)',
        'Muxing: FFmpeg (BWF Container)',
        'Telemetry Relay: spoofed relay node',
      ];
      payload.c2paManifestIntact = false;
      payload.deviceFingerprint = this.rng.chance(0.7) ? SYNTHETIC_FINGERPRINT : undefined;
      payload.captureDevice = undefined;
      payload.voiceCloningProbability = this.rng.float(88, 95);
      payload.noiseFloorDbfs = -94.2;
      payload.highFrequencyCutoffKhz = 16.0;
      payload.acousticArtifacts = [
        'Synthetic Audio Generator Pattern (Zero background ambient floor)',
        'Neural Vocoder Bandwidth Cap',
      ];
      payload.accountReputation = 0;
      payload.recordingKind = 'clipped_audio';
    } else {
      const sig = this.rng.pick(['Contact propeller signature', 'Distant marine engine cavitation', 'Unidentified low-frequency hum within the patrol zone'] as const);
      payload.subject = sig;
      payload.softwareMuxer = 'Teledyne Hydrophone Digital Signal Interface v4.2';
      payload.reEncodingHistory = [
        'Direct Sensor Capture: Teledyne Reson Hydrophone Array Hydro-38',
        'ADC: 24-bit 96 kHz Direct Acoustic Stream',
        'Telemetry Relay: Vanguard Secure Edge Node 4A (BWF Container)',
      ];
      payload.c2paManifestIntact = true;
      payload.deviceFingerprint = HYDROPHONE_DEVICE;
      payload.captureDevice = 'Teledyne Reson Hydrophone Array Hydro-38';
      payload.voiceCloningProbability = this.rng.float(4, 10);
      payload.noiseFloorDbfs = this.rng.float(-54, -48);
      payload.highFrequencyCutoffKhz = 22.05;
      payload.recordingKind = 'hydrophone';
    }

    return {
      sourceType: this.sourceType,
      sourceName: this.sourceName,
      timestamp: nowIso(),
      payload: {
        ...payload,
        lat: position.lat,
        lng: position.lng,
      },
    };
  }

  private nearestSector(position: LatLng): (typeof AO_SECTORS)[number] {
    let best: (typeof AO_SECTORS)[number] = AO_SECTORS[0]!;
    let bestD = Number.POSITIVE_INFINITY;
    for (const sector of AO_SECTORS) {
      const dist = Math.abs(sector.lat - position.lat) + Math.abs(sector.lng - position.lng);
      if (dist < bestD) {
        bestD = dist;
        best = sector;
      }
    }
    return best;
  }
}
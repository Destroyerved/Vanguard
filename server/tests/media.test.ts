/**
 * Media authenticity engine — the forensic pipeline end to end.
 *
 * These tests are fully deterministic: events are hand-built RawObservations
 * whose payloads mirror the media simulators' four fidelity profiles, so the
 * checks, scores, classification and confidence integration can be asserted
 * exactly rather than sampled from a seeded stream.
 */

import { describe, expect, it } from 'vitest';
import { evaluateMediaAuthenticity, classifyManipulation, mediaAuthenticityFactor, mediaCorroborationScore, refreshAuditCorroboration } from '../src/media/authenticity.js';
import { buildProvenanceChain } from '../src/media/metadata.js';
import { normalizeObservation } from '../src/normalization/normalize.js';
import { computeConfidence } from '../src/fusion/confidence.js';
import { runFusionPipeline } from '../src/fusion/pipeline.js';
import { MEDIA_AUTHENTICITY_TERM, MEDIA_CATEGORY_THRESHOLDS, SOURCE_RELIABILITY } from '../src/config/constants.js';
import { destinationPoint } from '../src/util/geo.js';
import type { MediaAuthenticityAudit, RawObservation, SourceType, UnifiedEvent } from '../src/types/events.js';

const BASE = '2026-09-08T12:00:00.000Z';
const CENTER = { lat: 23.0225, lng: 72.5714 };

let seq = 0;

/** Build a social-media raw observation (mirrors OSINT-SOCIAL-GRID profiles). */
function rawSocial(patch: Record<string, unknown> = {}): RawObservation {
  seq++;
  return {
    sourceType: 'social_media',
    sourceName: 'OSINT-SOCIAL-GRID',
    timestamp: BASE,
    payload: {
      mediaId: `S-${String(seq).padStart(5, '0')}`,
      platform: 'X_Twitter',
      handle: `@watch_dog${seq}`,
      postedAt: BASE,
      mediaKind: 'video',
      claimedSeverity: 'low',
      claimsEvent: true,
      ...patch,
    },
  };
}

/** Build an audio-recording raw observation (mirrors HYDROPHONE-ARRAY). */
function rawAudio(patch: Record<string, unknown> = {}): RawObservation {
  seq++;
  return {
    sourceType: 'audio_recording',
    sourceName: 'HYDROPHONE-ARRAY',
    timestamp: BASE,
    payload: {
      mediaId: `H-${String(seq).padStart(5, '0')}`,
      mediaKind: 'audio',
      claimedSeverity: 'low',
      claimsEvent: true,
      ...patch,
    },
  };
}

/** Normalize a raw observation and require a media audit on it. */
function asMediaEvent(raw: RawObservation): UnifiedEvent & { mediaAudit: MediaAuthenticityAudit } {
  const event = normalizeObservation(raw);
  expect(event).not.toBeNull();
  expect(event!.mediaAudit).toBeDefined();
  return event! as UnifiedEvent & { mediaAudit: MediaAuthenticityAudit };
}

/** Hand-crafted payloads — no RNG, so assertions are exact. */
const AUTHENTIC_PAYLOAD: Record<string, unknown> = {
  subject: 'Maritime activity off the coast',
  claimedSeverity: 'low',
  container: 'ISO Base Media File Format (MP4 / ISOM)',
  videoCodec: 'HEVC / H.265 (Main 10 Profile @ Level 5.1)',
  audioCodec: 'AAC-LC (256 kbps, 48 kHz Stereo)',
  resolution: '1920x1080 (Full HD)',
  frameRateFps: 59.94,
  bitrateKbps: 12500,
  durationSec: 45,
  creationTimestamp: BASE,
  softwareMuxer: 'Sony XDCAM HD422 Stream Handler',
  reEncodingHistory: [
    'Camera Capture: Sony ILME-FX6V Serial #4089210',
    'C2PA Cryptographic Signature: Signed with Hardware Security Module (HSM)',
  ],
  c2paManifestIntact: true,
  deviceFingerprint: 'Sony ILME-FX6V Serial #4089210',
  captureDevice: 'Sony ILME-FX6V Serial #4089210',
  estimatedSensorType: 'Full-Frame CMOS (Global Shutter)',
  prnuMatchPct: 95,
  chromaticAberrationPct: 91,
  compressionPattern: 'H.264 High@L4.1 CABAC Bitstream (Compliant ISO/IEC 14496-10)',
  audioTrack: true,
  accountReputation: 0.92,
  accountFollowers: 18_000,
};

const LEGIT_EDITED_PAYLOAD: Record<string, unknown> = {
  subject: 'Dense commuter traffic on the eastern approach road',
  claimedSeverity: 'low',
  container: 'ISO Base Media File Format (MP4 / ISOM)',
  videoCodec: 'H.264 / AVC (Main Profile)',
  audioCodec: 'AAC-LC (192 kbps, 44.1 kHz Stereo)',
  resolution: '3840x2160 (4K, AI-upscaled)',
  frameRateFps: 30,
  bitrateKbps: 14000,
  durationSec: 30,
  creationTimestamp: BASE,
  softwareMuxer: 'CapCut Muxer (CMF)',
  reEncodingHistory: [
    'Camera Capture: Apple iPhone 15 Pro (Rear Camera 24mm f/1.78)',
    'Edit / Grade: Adobe Premiere Pro 2024 (Color Grade / Crop)',
    'AI Enhancement: Perceptual Super-Resolution Upscale to 4K',
    'Platform Ingest: Instagram CDN Re-encode (H.264 High@L4.0)',
  ],
  c2paManifestIntact: false,
  deviceFingerprint: 'Apple iPhone 15 Pro (Rear Camera 24mm f/1.78)',
  captureDevice: 'Apple iPhone 15 Pro (Rear Camera 24mm f/1.78)',
  estimatedSensorType: '1/1.3" Stacked CMOS',
  prnuMatchPct: 78,
  chromaticAberrationPct: 82,
  aiUpscaled: true,
  audioTrack: true,
  accountReputation: 0.6,
};

const FABRICATED_PAYLOAD: Record<string, unknown> = {
  subject: 'Explosion and smoke column inside the coastal sector',
  claimedSeverity: 'high',
  deepfakeVideo: true,
  syntheticVideo: true,
  container: 'ISO Base Media File Format (MP4 v2)',
  videoCodec: 'H.264 / AVC (High Profile @ Level 4.0)',
  audioCodec: 'AAC-LC (128 kbps, 48 kHz)',
  resolution: '1280x720 (HD 16:9)',
  frameRateFps: 30,
  bitrateKbps: 4200,
  durationSec: 18,
  creationTimestamp: BASE,
  softwareMuxer: 'Lavf/59.27.100 (FFmpeg Neural Pipeline)',
  reEncodingHistory: [
    'AI Generation: Runway Gen-3 / Sora Neural Synthesis Model',
    'Post-Processing: CapCut Web Edition v3.4 (Synthetic LUT Applied)',
    'Muxing: FFmpeg v5.1.2 (Lavf59.27.100)',
    'Social Ingest: X_Twitter Transcode Engine',
  ],
  c2paManifestIntact: false,
  deviceFingerprint: 'SYNTHETIC_CONTAINER_NO_PHYSICAL_SENSOR_ID',
  captureDevice: undefined,
  estimatedSensorType: 'Synthetic Neural Render (No Physical Sensor)',
  prnuMatchPct: 4,
  chromaticAberrationPct: 22,
  compressionPattern: 'FFmpeg Synthetic Transcode / Lossy Neural Interpolation',
  visualArtifacts: [
    'Neural Facial Mask Boundary Discontinuity',
    'Lighting Illumination Vector Inversion (Key vs Ambient)',
  ],
  accountReputation: 0.1,
};

const HYBRID_VOICE_PAYLOAD: Record<string, unknown> = {
  subject: 'Gathering crowd forming near the outer cordon',
  claimedSeverity: 'medium',
  aiVoiceover: true,
  clonedVoice: true,
  container: 'QuickTime Movie (MPEG-4 Part 14)',
  videoCodec: 'H.264 / AVC (Main Profile @ Level 3.1)',
  audioCodec: 'AAC-LC (96 kbps, 44.1 kHz Mono)',
  resolution: '1080x1920 (Vertical Reel 9:16)',
  frameRateFps: 29.97,
  bitrateKbps: 6800,
  durationSec: 40,
  creationTimestamp: BASE,
  softwareMuxer: 'Instagram Ingest Transcoder',
  reEncodingHistory: [
    'Camera Capture: Apple iPhone 15 Pro (Rear Camera 24mm f/1.78)',
    'Voice Layer: ElevenLabs TTS API (Constant-Phase Neural Audio)',
    'Composition: CapCut iOS Build 12.8.1 (Reel Timeline)',
    'Platform Ingest: Instagram CDN Re-encode (H.264 Main@L3.1)',
  ],
  c2paManifestIntact: false,
  deviceFingerprint: 'Apple iPhone 15 Pro (Rear Camera 24mm f/1.78)',
  captureDevice: 'Apple iPhone 15 Pro (Rear Camera 24mm f/1.78)',
  estimatedSensorType: '1/1.3" Stacked CMOS',
  prnuMatchPct: 91,
  chromaticAberrationPct: 89,
  voiceCloningProbability: 91,
  audioTrack: true,
  accountReputation: 0.45,
};

describe('forensic metadata extraction', () => {
  it('classifies a hardware capture step as capture', () => {
    const step = buildProvenanceChain(['Camera Capture: Sony ILME-FX6V Serial #4089210'])[0]!;
    expect(step.hardwareCapture).toBe(true);
    expect(step.syntheticGeneration).toBe(false);
    expect(step.legitimateEditing).toBe(false);
  });

  it('classifies an AI-generation step as synthetic', () => {
    const step = buildProvenanceChain(['AI Generation: Runway Gen-3 Neural Synthesis Model'])[0]!;
    expect(step.syntheticGeneration).toBe(true);
    expect(step.hardwareCapture).toBe(false);
  });

  it('classifies an edit tool step as legitimate editing', () => {
    const step = buildProvenanceChain([
      'Edit / Grade: Adobe Premiere Pro 2024 (Color Grade / Crop)',
    ])[0]!;
    expect(step.legitimateEditing).toBe(true);
    expect(step.syntheticGeneration).toBe(false);
  });
});

describe('evaluateMediaAuthenticity — the four fidelity profiles', () => {
  it('reads an authentic clip as NONE_DETECTED with high authenticity', () => {
    const event = asMediaEvent(rawSocial(AUTHENTIC_PAYLOAD));
    const audit = event.mediaAudit;

    expect(audit.manipulationCategory).toBe('NONE_DETECTED');
    expect(audit.authenticityScore).toBeGreaterThanOrEqual(85);
    expect(audit.manipulationRisk).toBeLessThan(MEDIA_AUTHENTICITY_TERM.windowFloor * 100);
    expect(audit.aiSyntheticScore).toBeLessThan(MEDIA_CATEGORY_THRESHOLDS.syntheticModerate);
    expect(audit.sourceReliability).toBe(SOURCE_RELIABILITY.social_media);
    expect(audit.provenanceChain[0]!.hardwareCapture).toBe(true);
    expect(audit.metadata!.c2paManifestIntact).toBe(true);
  });

  it('reads an edited & upscaled clip as LEGITIMATE_ENHANCEMENT, not fabrication', () => {
    const event = asMediaEvent(rawSocial(LEGIT_EDITED_PAYLOAD));
    const audit = event.mediaAudit;

    expect(audit.manipulationCategory).toBe('LEGITIMATE_ENHANCEMENT');
    expect(audit.aiSyntheticScore).toBeLessThan(MEDIA_CATEGORY_THRESHOLDS.syntheticModerate);
    expect(audit.authenticityScore).toBeGreaterThan(60);
    expect(event.sourceType).toBe('social_media');
  });

  it('flags a neural deepfake as EVENT_FABRICATING with strong synthetic evidence', () => {
    const event = asMediaEvent(rawSocial(FABRICATED_PAYLOAD));
    const audit = event.mediaAudit;

    expect(audit.manipulationCategory).toBe('EVENT_FABRICATING');
    expect(audit.aiSyntheticScore).toBeGreaterThanOrEqual(MEDIA_CATEGORY_THRESHOLDS.syntheticHigh);
    expect(audit.authenticityScore).toBeLessThan(45);
    expect(audit.deepfakeArtifacts.length).toBeGreaterThan(0);
    // The provenance chain exposes the neural generation step.
    expect(audit.provenanceChain.some((s) => s.syntheticGeneration)).toBe(true);
  });

  it('flags a cloned voice over real footage as fabricating, not a benign edit', () => {
    const event = asMediaEvent(rawSocial(HYBRID_VOICE_PAYLOAD));
    const audit = event.mediaAudit;

    expect(audit.manipulationCategory).toBe('EVENT_FABRICATING');
    expect(audit.aiSyntheticScore).toBeGreaterThanOrEqual(
      MEDIA_CATEGORY_THRESHOLDS.syntheticModerate,
    );
    // Real footage means the visual dimensions stay clean — the strongest
    // detector is the acoustic/voice one, and it must carry the verdict.
    expect(audit.visualFrames!.faceConsistencyScore).toBeGreaterThan(80);
  });

  it('flags a synthetic audio transmission from the hydrophone array', () => {
    const event = asMediaEvent(
      rawAudio({
        subject: 'Fabricated distress voice transmission',
        syntheticWaveform: true,
        aiVoiceover: true,
        voiceCloningProbability: 92,
        noiseFloorDbfs: -94.2,
        highFrequencyCutoffKhz: 16.0,
        deviceFingerprint: undefined,
        reEncodingHistory: [
          'AI Generation: Neural Waveform Synthesis (Diffusion TTS)',
          'Muxing: FFmpeg (BWF Container)',
          'Telemetry Relay: spoofed relay node',
        ],
      }),
    );

    expect(event.mediaAudit.manipulationCategory).toBe('EVENT_FABRICATING');
    expect(event.mediaAudit.acousticSpectrum!.voiceCloningProbability).toBeGreaterThan(80);
  });

  it('reads a genuine hydrophone detection as authentic hardware capture', () => {
    const event = asMediaEvent(
      rawAudio({
        subject: 'Contact propeller signature',
        reEncodingHistory: [
          'Direct Sensor Capture: Teledyne Reson Hydrophone Array Hydro-38',
          'ADC: 24-bit 96 kHz Direct Acoustic Stream',
          'Telemetry Relay: Vanguard Secure Edge Node 4A (BWF Container)',
        ],
        noiseFloorDbfs: -52,
        highFrequencyCutoffKhz: 22.05,
        voiceCloningProbability: 7,
        c2paManifestIntact: true,
        deviceFingerprint: 'Teledyne-Reson-TC4032-SN-99841',
      }),
    );

    expect(event.mediaAudit.manipulationCategory).toBe('NONE_DETECTED');
    expect(event.mediaAudit.authenticityScore).toBeGreaterThanOrEqual(80);
  });
});

describe('normalizer severity discipline for media', () => {
  it('downgrades an anonymous high-severity claim one tier', () => {
    const event = asMediaEvent(rawSocial({ ...FABRICATED_PAYLOAD, accountReputation: 0.1 }));
    expect(event.baseSeverity).toBe('medium'); // claimed high -> medium
    expect(event.mediaAudit.manipulationCategory).toBe('EVENT_FABRICATING');
  });

  it('keeps an authentic claim at its reported severity', () => {
    const event = asMediaEvent(rawSocial(AUTHENTIC_PAYLOAD));
    expect(event.baseSeverity).toBe('low');
  });
});

describe('classifyManipulation', () => {
  it('is a pure function of its inputs', () => {
    expect(classifyManipulation(84, 31, 0)).toBe('EVENT_FABRICATING');
    expect(classifyManipulation(8, 90, 0)).toBe('NONE_DETECTED');
    expect(classifyManipulation(16, 62, 0, true)).toBe('LEGITIMATE_ENHANCEMENT');
    expect(classifyManipulation(10, 25, 0, false)).toBe('AUTHENTICITY_UNVERIFIED');
  });

  it('reclassifies a fabricated clip as HYBRID_CORROBORATED once the event is corroborated', () => {
    expect(classifyManipulation(84, 31, 0)).toBe('EVENT_FABRICATING');
    expect(classifyManipulation(84, 31, 75)).toBe('HYBRID_CORROBORATED');
  });
});

describe('mediaAuthenticityFactor', () => {
  const audit = () =>
    ({
      manipulationRisk: 0,
    }) as unknown as MediaAuthenticityAudit;

  it('is exactly 1 at or below the manipulation risk floor', () => {
    expect(mediaAuthenticityFactor({ ...audit(), manipulationRisk: 0 })).toBe(1);
    expect(mediaAuthenticityFactor({ ...audit(), manipulationRisk: 45 })).toBe(1);
  });

  it('reaches the cap floor for a fully fabricated item — never zero', () => {
    expect(mediaAuthenticityFactor({ ...audit(), manipulationRisk: 100 })).toBe(
      MEDIA_AUTHENTICITY_TERM.capFactor,
    );
  });

  it('is monotonic in risk and stays within [capFactor, 1]', () => {
    const values = [46, 60, 75, 90].map((r) => mediaAuthenticityFactor({ ...audit(), manipulationRisk: r }));
    for (let i = 1; i < values.length; i++) expect(values[i]!).toBeLessThan(values[i - 1]!);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(MEDIA_AUTHENTICITY_TERM.capFactor);
    expect(Math.max(...values)).toBeLessThanOrEqual(1);
  });
});

describe('mediaCorroborationScore', () => {
  it('is zero without any corroborators', () => {
    const event = asMediaEvent(rawSocial(FABRICATED_PAYLOAD));
    expect(mediaCorroborationScore(event, [])).toBe(0);
  });

  it('grows with the number of DISTINCT sources, damped by distance', () => {
    const event = asMediaEvent(rawSocial(FABRICATED_PAYLOAD));
    const corroborator = (source: SourceType, offsetMeters: number): UnifiedEvent => ({
      ...event,
      id: `EV-CORR-${source}`,
      sourceType: source,
      location: destinationPoint(event.location, 0, offsetMeters),
    });

    const coLocated = [corroborator('radar', 100), corroborator('log', 200), corroborator('personnel', 300)];
    expect(mediaCorroborationScore(event, coLocated)).toBeGreaterThanOrEqual(60);

    const distant = corroborator('radar', 9_000);
    expect(mediaCorroborationScore(event, [distant])).toBeLessThan(
      mediaCorroborationScore(event, [
        corroborator('radar', 100),
      ]),
    );
  });
});

describe('confidence integration', () => {
  it('discounts a fabricated, uncorroborated clip well below an authentic one', () => {
    const fabricated = asMediaEvent(rawSocial(FABRICATED_PAYLOAD));
    const authentic = asMediaEvent(rawSocial(AUTHENTIC_PAYLOAD));

    const fabricatedResult = computeConfidence({ event: fabricated, corroborators: [], referenceMs: Date.parse(BASE) });
    const authenticResult = computeConfidence({ event: authentic, corroborators: [], referenceMs: Date.parse(BASE) });

    expect(fabricatedResult.factors.mediaAuthenticity).toBeLessThan(1);
    expect(authenticResult.factors.mediaAuthenticity).toBe(1);
    expect(fabricatedResult.confidence).toBeLessThan(authenticResult.confidence);
    expect(fabricatedResult.confidence).toBeLessThan(60);
    expect(fabricatedResult.breakdown.mediaAuthenticity).toBeGreaterThan(0);
    // The formula string names the media term.
    expect(fabricatedResult.explanation).toContain('media authenticity');
  });

  it('applies no media term to non-media events (factor exactly 1)', () => {
    const radar = {
      id: 'EV-RAD-00001',
      sourceType: 'radar' as const,
      sourceName: 'RADAR-PRIMARY',
      timestamp: BASE,
      location: CENTER,
      severity: 'medium' as const,
      baseSeverity: 'medium' as const,
      title: 'Radar contact',
      description: 'Primary return',
      confidence: 50,
      corroboratedBy: [],
      isAnomaly: false,
      raw: {},
    };
    const result = computeConfidence({ event: radar, corroborators: [], referenceMs: Date.parse(BASE) });
    expect(result.factors.mediaAuthenticity).toBe(1);
    expect(result.breakdown.mediaAuthenticity).toBe(100);
    expect(result.explanation).not.toContain('media authenticity');
  });
});

describe('fusion pipeline refresh', () => {
  it('flips a fabricated clip to HYBRID_CORROBORATED when three independent feeds agree', () => {
    const social = asMediaEvent(rawSocial(FABRICATED_PAYLOAD));
    let s = 0;
    const partner = (source: SourceType): UnifiedEvent => {
      s++;
      return {
        id: `EV-MED-PARTNER-${s}`,
        sourceType: source,
        sourceName: 'TEST',
        timestamp: BASE,
        location: destinationPoint(social.location, 0, 100 + s * 100),
        severity: 'medium',
        baseSeverity: 'medium',
        title: `${source} corroborator`,
        description: 'Independent feed',
        confidence: 50,
        corroboratedBy: [],
        isAnomaly: false,
        raw: {},
      };
    };

    const result = runFusionPipeline({
      events: [
        social,
        partner('radar'),
        partner('log'),
        partner('personnel'),
      ],
      referenceMs: Date.parse(BASE),
    });

    const fusedSocial = result.events.find((e) => e.id === social.id)!;
    expect(fusedSocial.corroboratedBy.length).toBe(3);
    expect(fusedSocial.mediaAudit!.manipulationCategory).toBe('HYBRID_CORROBORATED');
    expect(fusedSocial.mediaAudit!.corroborationScore).toBeGreaterThanOrEqual(60);
  });

  it('keeps an isolated fabricated clip EVENT_FABRICATING through a full pass', () => {
    const social = asMediaEvent(rawSocial(FABRICATED_PAYLOAD));
    const result = runFusionPipeline({
      events: [social],
      referenceMs: Date.parse(BASE),
    });

    expect(result.events[0]!.mediaAudit!.manipulationCategory).toBe('EVENT_FABRICATING');
    expect(result.events[0]!.mediaAudit!.corroborationScore).toBe(0);
  });

  it('refreshAuditCorroboration mutates the exposed audit in place', () => {
    const social = asMediaEvent(rawSocial(FABRICATED_PAYLOAD));
    expect(social.mediaAudit.manipulationCategory).toBe('EVENT_FABRICATING');

    const corroborator = {
      ...social,
      id: 'EV-CORR-X',
      sourceType: 'radar' as const,
      location: destinationPoint(social.location, 0, 200),
    };

    refreshAuditCorroboration(social.mediaAudit, social, [corroborator]);
    expect(social.mediaAudit.manipulationCategory).toBe('EVENT_FABRICATING'); // one source, < 60
    expect(social.mediaAudit.corroborationScore).toBeGreaterThan(0);
  });
});
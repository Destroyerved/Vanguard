/**
 * VANGUARD — Media forensic check runners.
 *
 * Seven independent checks, each answering one narrow question about a piece of
 * media. Every check is DETERMINISTIC: it reads the payload's forensic signals
 * (codecs, C2PA state, re-encoding chain, per-frame analysis hints) and returns
 * a score where 100 means "no manipulation evidence in this dimension".
 *
 * The checks deliberately do NOT share state, so their disagreement is
 * meaningful. A clip can have an intact C2PA signature (provenance clean) yet
 * fail the visual-frame check (content synthetic) — that divergence is exactly
 * the signal the authenticity scoring engine needs.
 */

import type {
  AcousticSpectrumAnalysis,
  CameraSensorCharacteristics,
  MediaCheckResult,
  MediaFinding,
  MediaForensicMetadata,
  ProvenanceEntry,
  TemporalConsistencyAnalysis,
  UnifiedEvent,
  VisualFrameAnalysis,
} from '../types/events.js';
import { MEDIA_CHECK_WEIGHTS } from '../config/constants.js';
import { clamp, mean, round } from '../util/stats.js';

/** Read a boolean signal from the payload. */
function is(raw: Record<string, unknown>, key: string): boolean {
  return raw[key] === true;
}

/** Read a finite number signal from the payload. */
function n(raw: Record<string, unknown>, key: string, fallback: number): number {
  const v = raw[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/** Read a non-empty string signal from the payload. */
function s(raw: Record<string, unknown>, key: string, fallback: string): string {
  const v = raw[key];
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}

function finding(code: string, detail: string, confidence = 90): MediaFinding {
  return { code, detail, confidence };
}

/** Assemble a check result from the shared weight table. */
function result(
  id: MediaCheckResult['id'],
  name: string,
  score: number,
  applicable: boolean,
  findings: MediaFinding[],
): MediaCheckResult {
  return {
    id,
    name,
    score: applicable ? clamp(round(score), 0, 100) : 100,
    weight: MEDIA_CHECK_WEIGHTS[id],
    applicable,
    findings,
  };
}

const SYNTHETIC_FINGERPRINT = 'SYNTHETIC_CONTAINER_NO_PHYSICAL_SENSOR_ID';

/* ------------------------------------------------------------------ *
 * 1. PROVENANCE / C2PA
 * ------------------------------------------------------------------ */

/**
 * How intact the cryptographic provenance is. C2PA is the strongest signal, and
 * its absence is treated as one tier of doubt, not a conviction: legitimate
 * platform re-encoding strips manifests routinely, so a clean platform transcode
 * without a manifest scores higher than a synthetic container that claims a
 * fake hardware provenance.
 */
export function provenanceC2paCheck(
  event: UnifiedEvent,
  metadata: MediaForensicMetadata,
): MediaCheckResult {
  const p = event.raw;
  const findings: MediaFinding[] = [];

  if (metadata.c2paManifestIntact) {
    // A signed capture that survives re-encoding is hard to fake.
    return result(
      'provenance-c2pa',
      'Provenance / C2PA signature',
      96,
      true,
      [finding('C2PA_MANIFEST_INTACT', 'Container carries an intact C2PA cryptographic signature')],
    );
  }

  // No manifest. Two flavours: plausible (edited/platform) vs damning (synthetic).
  const syntheticFingerprint =
    metadata.deviceFingerprint === undefined ||
    metadata.deviceFingerprint.includes(SYNTHETIC_FINGERPRINT) ||
    metadata.deviceFingerprint === 'SYNTHETIC_CONTAINER';
  const devClaim = s(p, 'deviceFingerprint', s(p, 'exifDeviceFingerprint', ''));

  if (syntheticFingerprint && devClaim.includes('SYNTHETIC')) {
    findings.push(
      finding('NO_PHYSICAL_SENSOR', 'No physical sensor provenance; container claims a synthetic identifier'),
    );
    return result('provenance-c2pa', 'Provenance / C2PA signature', 18, true, findings);
  }

  findings.push(finding('C2PA_ABSENT', 'C2PA manifest absent — signature stripped or never created'));
  if (metadata.deviceFingerprint === undefined) {
    findings.push(finding('DEVICE_FP_ABSENT', 'No device fingerprint embedded in the media'));
  }

  // Platform transcode or plain edit: provenance is weakened, not destroyed.
  const edits = metadata.reEncodingHistory.length;
  return result(
    'provenance-c2pa',
    'Provenance / C2PA signature',
    edits >= 3 ? 52 : 66,
    true,
    findings,
  );
}

/* ------------------------------------------------------------------ *
 * 2. BITSTREAM / CONTAINER
 * ------------------------------------------------------------------ */

/**
 * Container-level integrity: muxer, resolution and codecs should be internally
 * consistent and physically plausible. A neural pipeline commonly leaves a
 * fingerprint in the muxer string and in an implausible edit history.
 */
export function bitstreamContainerCheck(
  event: UnifiedEvent,
  metadata: MediaForensicMetadata,
): MediaCheckResult {
  const p = event.raw;
  const findings: MediaFinding[] = [];

  const muxer = metadata.softwareMuxer.toLowerCase();
  const neuralMuxer = muxer.includes('lavf') && (muxer.includes('neural') || muxer.includes('gen-3') || muxer.includes('sora'));
  const container = metadata.container.toLowerCase();

  if (neuralMuxer || container.includes('synthetic')) {
    findings.push(
      finding('NEURAL_MUXER', `Muxer ${metadata.softwareMuxer} is a neural-generation fingerprint`),
      finding(
        'SYNTHETIC_CONTAINER',
        `Container ${metadata.container} is not produced by any consumer encoder`,
      ),
    );
    return result('bitstream-container', 'Bitstream & container integrity', 20, true, findings);
  }

  const compression = s(p, 'compressionPattern', '');
  if (compression.toLowerCase().includes('synthetic') || compression.toLowerCase().includes('neural')) {
    findings.push(
      finding('SYNTHETIC_COMPRESSION', `Compression profile ${compression} is a synthetic-generation signature`),
    );
    return result('bitstream-container', 'Bitstream & container integrity', 25, true, findings);
  }

  const generic = muxer.includes('lavf') && !muxer.includes('neural');
  const reencodes = metadata.reEncodingHistory.length;

  if (reencodes >= 4) {
    findings.push(finding('DEEP_REENCODE_CHAIN', `${reencodes} re-encode generations — provenance degraded by transit`));
  }
  if (generic) {
    findings.push(finding('GENERIC_FFMPEG', 'Muxed by a generic ffmpeg build — no professional authoring tool'));
  }

  if (reencodes === 0 && metadata.c2paManifestIntact) {
    return result('bitstream-container', 'Bitstream & container integrity', 94, true, findings);
  }
  return result(
    'bitstream-container',
    'Bitstream & container integrity',
    generic || reencodes >= 3 ? 66 : 84,
    true,
    findings,
  );
}

/* ------------------------------------------------------------------ *
 * 3. VISUAL FRAME
 * ------------------------------------------------------------------ */

/**
 * Synthesize a `VisualFrameAnalysis` from the payload's per-frame signals.
 * For genuine AI-generated video the payload carries the frame analytics
 * (facial seam artifacts, lighting vector inversions, corneal highlight
 * asymmetry); for everything else the checks find natural properties.
 */
export function analyzeVisualFrames(event: UnifiedEvent): VisualFrameAnalysis {
  const p = event.raw;
  if (is(p, 'deepfakeVideo') || is(p, 'syntheticVideo')) {
    return {
      faceConsistencyScore: 18,
      edgeBoundaryBlurScore: 24,
      lightingShadowScore: 32,
      pupilReflectionScore: 28,
      keyframeArtifacts: (s(p, 'visualArtifacts', '')
        .split('|')
        .filter(Boolean)
        .map((detail, i) => ({
          frameIndex: 14 + i * 34,
          timestampSec: round(0.46 + i * 1.14, 2),
          anomalyType: detail,
          confidence: 88 + (i % 3) * 3,
        }))),
    };
  }
  if (is(p, 'aiUpscaled')) {
    return {
      faceConsistencyScore: 86,
      edgeBoundaryBlurScore: 78,
      lightingShadowScore: 84,
      pupilReflectionScore: 90,
      keyframeArtifacts: [{
        frameIndex: 0,
        timestampSec: 0,
        anomalyType: 'Perceptual super-resolution ringing (AI upscale resynthesis)',
        confidence: 55,
      }],
    };
  }
  return {
    faceConsistencyScore: 94,
    edgeBoundaryBlurScore: 92,
    lightingShadowScore: 89,
    pupilReflectionScore: 95,
    keyframeArtifacts: [],
  };
}

/** Score the visual-frame check from the synthesized frame analysis. */
export function visualFrameCheck(
  event: UnifiedEvent,
): MediaCheckResult {
  const applicable = s(event.raw, 'mediaKind', 'video') === 'video';
  if (!applicable) return result('visual-frame', 'Visual frame-level analysis', 100, false, []);

  const frames = analyzeVisualFrames(event);
  const score = mean([
    frames.faceConsistencyScore,
    frames.edgeBoundaryBlurScore,
    frames.lightingShadowScore,
    frames.pupilReflectionScore,
  ]);

  const artifacts = frames.keyframeArtifacts.map((a) =>
    finding('FRAME_ARTIFACT', `${a.anomalyType} (frame ${a.frameIndex}, t=${a.timestampSec}s)`, a.confidence),
  );

  return result('visual-frame', 'Visual frame-level analysis', score, true, artifacts);
}

/* ------------------------------------------------------------------ *
 * 4. TEMPORAL CONSISTENCY
 * ------------------------------------------------------------------ */

/** Synthesize temporal-consistency analytics from payload signals. */
export function analyzeTemporalConsistency(event: UnifiedEvent): TemporalConsistencyAnalysis {
  const p = event.raw;
  if (is(p, 'deepfakeVideo') || is(p, 'syntheticVideo')) {
    return {
      interFrameWarpingScore: 88,
      morphingDeltaVariance: 76,
      objectPersistenceScore: 34,
      frameJitterPattern: 'AI_GENERATIVE_WARP',
    };
  }
  return {
    interFrameWarpingScore: 8,
    morphingDeltaVariance: 5,
    objectPersistenceScore: 96,
    frameJitterPattern: 'NATURAL_CAMERA_SHAKE',
  };
}

export function temporalConsistencyCheck(event: UnifiedEvent): MediaCheckResult {
  const applicable = s(event.raw, 'mediaKind', 'video') === 'video';
  if (!applicable) return result('temporal-consistency', 'Temporal consistency', 100, false, []);

  const t = analyzeTemporalConsistency(event);
  // Warping and morphing are BAD when high; persistence is good when high.
  const score = round((100 - t.interFrameWarpingScore + (100 - t.morphingDeltaVariance) + t.objectPersistenceScore) / 3);

  const findings: MediaFinding[] = [];
  if (t.frameJitterPattern === 'AI_GENERATIVE_WARP') {
    findings.push(
      finding('GENERATIVE_WARP', 'Inter-frame optical flow shows AI-generative warping, not natural camera shake'),
      finding('GEOMETRY_INSTABILITY', 'Facial geometry morphing delta variance is outside physical bounds'),
      finding('OBJECT_DEGRADATION', 'Background object persistence flickers between frames'),
    );
  }

  return result('temporal-consistency', 'Temporal consistency', score, true, findings);
}

/* ------------------------------------------------------------------ *
 * 5. ACOUSTIC SPECTRUM
 * ------------------------------------------------------------------ */

/** Synthesize acoustic spectrum analytics from payload signals. */
export function analyzeAcousticSpectrum(event: UnifiedEvent): AcousticSpectrumAnalysis {
  const p = event.raw;
  const aiVoice =
    is(p, 'aiVoiceover') || is(p, 'syntheticAudio') || is(p, 'clonedVoice') || is(p, 'syntheticWaveform');
  const deepfake = is(p, 'deepfakeVideo') || is(p, 'syntheticVideo');

  if (aiVoice) {
    return {
      noiseFloorDbfs: -94.2,
      harmonicPhaseEnvelopeScore: 22,
      highFrequencyCutoffKhz: 16.0,
      avSyncOffsetMs: deepfake ? 185 : 42,
      voiceCloningProbability: n(p, 'voiceCloningProbability', 91),
    };
  }
  return {
    noiseFloorDbfs: -52.8,
    harmonicPhaseEnvelopeScore: 92,
    highFrequencyCutoffKhz: 22.05,
    avSyncOffsetMs: 11,
    voiceCloningProbability: 8,
  };
}

export function acousticSpectrumCheck(event: UnifiedEvent): MediaCheckResult {
  const p = event.raw;
  const hasAudio = s(p, 'mediaKind', 'video') === 'audio' || is(p, 'audioTrack');
  if (!hasAudio) return result('acoustic-spectrum', 'Acoustic spectrum', 100, false, []);

  const spectrum = analyzeAcousticSpectrum(event);
  const score = round(
    (100 - spectrum.voiceCloningProbability) * 0.6 +
      spectrum.harmonicPhaseEnvelopeScore * 0.4,
  );

  const findings: MediaFinding[] = [];
  if (spectrum.voiceCloningProbability > 60) {
    findings.push(
      finding('VOICE_CLONING', `Voice cloning probability ${spectrum.voiceCloningProbability}% — synthesized speech profile`),
      finding('ZERO_AMBIENT_FLOOR', `Noise floor ${spectrum.noiseFloorDbfs} dBFS — anechoic studio signature, not an environment`),
      finding(
        'NEURAL_BANDWIDTH_CAP',
        `High-frequency cutoff ${spectrum.highFrequencyCutoffKhz} kHz — neural vocoder bandwidth limit`,
      ),
    );
  }
  if (spectrum.avSyncOffsetMs > 120) {
    findings.push(finding('AV_DESYNC', `Audio/video offset ${spectrum.avSyncOffsetMs}ms — beyond physical camera sync`));
  }

  return result('acoustic-spectrum', 'Acoustic spectrum', score, true, findings);
}

/* ------------------------------------------------------------------ *
 * 6. SENSOR PRNU
 * ------------------------------------------------------------------ */

/** Synthesize camera/sensor characteristics from payload signals. */
export function analyzeCameraCharacteristics(event: UnifiedEvent): CameraSensorCharacteristics {
  const p = event.raw;
  if (is(p, 'deepfakeVideo') || is(p, 'syntheticVideo')) {
    return {
      estimatedSensorType: 'Synthetic Neural Render (No Physical Sensor)',
      prnuSensorFingerprintMatch: 4,
      chromaticAberrationConsistency: 22,
      compressionPattern: s(p, 'compressionPattern', 'FFmpeg Synthetic Transcode'),
    };
  }
  return {
    estimatedSensorType: s(p, 'estimatedSensorType', '1/2.3" High-Dynamic CMOS (Rolling Shutter Compensation Active)'),
    prnuSensorFingerprintMatch: n(p, 'prnuMatchPct', 94),
    chromaticAberrationConsistency: n(p, 'chromaticAberrationPct', 91),
    compressionPattern: s(p, 'compressionPattern', 'H.264 High@L4.1 CABAC Bitstream'),
  };
}

export function sensorPrnuCheck(event: UnifiedEvent): MediaCheckResult {
  const applicable = s(event.raw, 'mediaKind', 'video') === 'video';
  if (!applicable) return result('sensor-prnu', 'Sensor PRNU fingerprint', 100, false, []);

  const camera = analyzeCameraCharacteristics(event);
  const score = mean([
    camera.prnuSensorFingerprintMatch,
    camera.chromaticAberrationConsistency,
  ]);

  const findings: MediaFinding[] = [];
  if (camera.prnuSensorFingerprintMatch < 15) {
    findings.push(
      finding('PRNU_MISMATCH', `PRNU sensor fingerprint match ${camera.prnuSensorFingerprintMatch}% — no physical camera chain`),
      finding('LENS_ABERRATION_INCONSISTENT', `Chromatic aberration consistency ${camera.chromaticAberrationConsistency}% — lens physics not simulated`),
    );
  }

  return result('sensor-prnu', 'Sensor PRNU fingerprint', score, true, findings);
}

/* ------------------------------------------------------------------ *
 * 7. EDIT ORIGIN
 * ------------------------------------------------------------------ */

/**
 * The single most important discriminator the flow demands: distinguishing
 * LEGITIMATE EDITING from EVENT-FABRICATING MANIPULATION.
 *
 * Editing changes the presentation (cut, crop, grade, stabilize, denoise,
 * transcode). Fabrication changes the SUBJECT (generated video, cloned voice,
 * synthetic waveform). One preserves an event that happened; the other can
 * manufacture an event that never did. The two must never be scored alike.
 */
export function editOriginCheck(
  event: UnifiedEvent,
  chain: ProvenanceEntry[],
): MediaCheckResult {
  const p = event.raw;
  const findings: MediaFinding[] = [];

  const deepfake = is(p, 'deepfakeVideo') || is(p, 'syntheticVideo');
  const syntheticVoice = is(p, 'aiVoiceover') || is(p, 'syntheticAudio') || is(p, 'clonedVoice') || is(p, 'syntheticWaveform');

  if (deepfake) {
    findings.push(
      finding('SUBJECT_GENERATED', 'Subject content is neural-generated — the media can depict an event that never occurred'),
    );
    return result('edit-origin', 'Edit origin & subject generation', 15, true, findings);
  }

  if (syntheticVoice) {
    findings.push(
      finding('VOICE_LAYER_SYNTHETIC', 'Audio layer is synthesized (TTS/cloned voice) over non-generated footage'),
    );
    return result('edit-origin', 'Edit origin & subject generation', 40, true, findings);
  }

  const edits = chain.filter((c) => c.legitimateEditing && !c.syntheticGeneration);
  const captures = chain.filter((c) => c.hardwareCapture);

  if (edits.length > 0) {
    findings.push(
      finding('LEGIT_EDIT_PRESENT', `${edits.length} legitimate editing step${edits.length === 1 ? '' : 's'} in the chain (${edits.map((c) => c.tool ?? 'edit').join(', ')})`),
    );
  }
  if (captures.length === 0) {
    findings.push(finding('NO_CAPTURE_STEP', 'No hardware capture step in the chain'));
  }

  return result(
    'edit-origin',
    'Edit origin & subject generation',
    edits.length > 0 ? 70 : captures.length > 0 ? 90 : 60,
    true,
    findings,
  );
}

/* ------------------------------------------------------------------ *
 * Runner
 * ------------------------------------------------------------------ */

/** Run all seven checks against one media event. */
export function runMediaChecks(
  event: UnifiedEvent,
  metadata: MediaForensicMetadata,
  chain: ProvenanceEntry[],
): MediaCheckResult[] {
  return [
    provenanceC2paCheck(event, metadata),
    bitstreamContainerCheck(event, metadata),
    visualFrameCheck(event),
    temporalConsistencyCheck(event),
    acousticSpectrumCheck(event),
    sensorPrnuCheck(event),
    editOriginCheck(event, chain),
  ];
}
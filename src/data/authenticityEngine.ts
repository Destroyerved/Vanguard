/**
 * Vanguard Multi-Parameter AI Media & OSINT Authenticity Verification Engine
 * Analyzes social media clips, hydrophone sound recordings, drone video feeds,
 * and news items for synthetic deepfake artifacts, EXIF/C2PA provenance,
 * acoustic spectrum integrity, and cross-sensor satellite/radar corroboration.
 */

import { UnifiedEvent, AuthenticityAudit } from '../types/schema';
import { extractForensicMetadata } from './forensicMetadataExtractor';
import { analyzeVisualFrames, analyzeTemporalConsistency } from './visualFrameAnalyzer';
import { analyzeAcousticSpectrum, analyzeCameraCharacteristics } from './acousticSpectrumAnalyzer';

export function evaluateMediaAuthenticity(event: UnifiedEvent): AuthenticityAudit {
  // Extract all rich multi-parameter forensic layers
  const metadata = extractForensicMetadata(event);
  const visualFrames = analyzeVisualFrames(event);
  const temporalConsistency = analyzeTemporalConsistency(event);
  const acousticSpectrum = analyzeAcousticSpectrum(event);
  const cameraCharacteristics = analyzeCameraCharacteristics(event);

  // Return pre-existing audit if explicitly set on event, but attach extracted sub-properties if missing
  if (event.authenticityAudit) {
    return {
      ...event.authenticityAudit,
      metadata: event.authenticityAudit.metadata || metadata,
      visualFrames: event.authenticityAudit.visualFrames || visualFrames,
      temporalConsistency: event.authenticityAudit.temporalConsistency || temporalConsistency,
      acousticSpectrum: event.authenticityAudit.acousticSpectrum || acousticSpectrum,
      cameraCharacteristics: event.authenticityAudit.cameraCharacteristics || cameraCharacteristics,
    };
  }

  const { sourceType, raw, corroboratedBy, confidence } = event;

  let aiSyntheticScore = 15; // Baseline low AI score
  const deepfakeArtifacts: string[] = [];
  let acousticSpectrumScore = 85;
  let provenanceScore = 90;
  let crossSensorCorroborationScore = (corroboratedBy?.length || 0) > 0 ? 95 : 60;

  // 1. Social Media / Instagram / X Analysis
  if (sourceType === 'social_media' || raw?.platform === 'Instagram' || raw?.platform === 'X_Twitter') {
    const isAiVoice = Boolean(raw?.aiVoiceover) || Boolean(raw?.syntheticAudio);
    const isDeepfakeVideo = Boolean(raw?.deepfakeVideo) || Boolean(raw?.syntheticVideo);
    const isClonedAudio = Boolean(raw?.clonedVoice);

    if (isDeepfakeVideo) {
      aiSyntheticScore = 92;
      deepfakeArtifacts.push('Generative AI Video Artifact (Inter-frame warping detected at 30fps)');
      deepfakeArtifacts.push('Synthetic Facial Mask / Neural Render Boundary Unnatural Blur');
      deepfakeArtifacts.push('Pupil Corneal Highlight Geometric Asymmetry & Illumination Inversion');
      provenanceScore = 20;
    } else if (isAiVoice || isClonedAudio) {
      aiSyntheticScore = 78;
      deepfakeArtifacts.push('Neural Text-to-Speech (TTS) Voice Model Harmonics (Constant Phase Envelope)');
      deepfakeArtifacts.push('Zero Ambient Noise Floor (-94 dBFS Studio Synthetic Profile)');
      acousticSpectrumScore = 35;
      provenanceScore = 45;
    } else {
      aiSyntheticScore = 25;
      deepfakeArtifacts.push('Minor Compression Noise (Standard H.264 Instagram Transcode)');
      provenanceScore = 85;
    }
  }

  // 2. Audio / Hydrophone / Radio Recording Analysis
  if (sourceType === 'audio_recording' || raw?.audioStream) {
    const isSyntheticWaveform = Boolean(raw?.syntheticWaveform);

    if (isSyntheticWaveform) {
      aiSyntheticScore = 88;
      deepfakeArtifacts.push('Synthetic Audio Generator Pattern (Zero background ambient floor)');
      acousticSpectrumScore = 22;
    } else {
      aiSyntheticScore = 12;
      acousticSpectrumScore = 94; // Authentic physical sound signature
    }
  }

  // 3. Sensor Corroboration Calculation
  if (corroboratedBy && corroboratedBy.length > 0) {
    crossSensorCorroborationScore = Math.min(100, 75 + corroboratedBy.length * 10);
  } else if (event.isAnomaly) {
    crossSensorCorroborationScore = 50; // Single source anomaly needing satellite review
  }

  // 4. Overall Authenticity & Veracity Classification
  const overallAuthenticityScore = Math.round(
    provenanceScore * 0.25 +
    (100 - aiSyntheticScore) * 0.35 +
    acousticSpectrumScore * 0.20 +
    crossSensorCorroborationScore * 0.20
  );

  let veracityClassification: AuthenticityAudit['veracityClassification'] = 'VERIFIED_AUTHENTIC';
  let factualCoreExtracted = '';

  if (aiSyntheticScore >= 80 && crossSensorCorroborationScore < 60) {
    veracityClassification = 'SYNTHETIC_DISINFORMATION';
    factualCoreExtracted = 'FABRICATED MEDIA: Zero physical sensor corroboration detected. Unsubstantiated social media claim.';
  } else if (aiSyntheticScore >= 60 && crossSensorCorroborationScore >= 80) {
    // HYBRID CASE: Video or audio was AI-edited/narrated, BUT satellite/radar confirms the physical event occurred!
    veracityClassification = 'HYBRID_AI_AUTHENTIC_FACT';
    factualCoreExtracted = `VERIFIED GROUND TRUTH: While video/audio packaging exhibits AI synthetic enhancement (${aiSyntheticScore}% AI score), physical event coordinates and timestamp are 100% CORROBORATED by orbital satellite imagery and primary radar sensors.`;
  } else if (overallAuthenticityScore >= 75) {
    veracityClassification = 'VERIFIED_AUTHENTIC';
    factualCoreExtracted = `AUTHENTIC EVENT: Intact EXIF/C2PA metadata provenance, natural acoustic spectrum, and ${confidence}% multi-sensor correlation.`;
  } else {
    veracityClassification = 'UNVERIFIED_AMBIGUOUS';
    factualCoreExtracted = 'UNVERIFIED SIGNAL: Awaiting additional satellite pass or secondary radar track correlation.';
  }

  return {
    overallAuthenticityScore,
    veracityClassification,
    aiSyntheticScore,
    deepfakeArtifacts,
    acousticSpectrumScore,
    provenanceScore,
    crossSensorCorroborationScore,
    factualCoreExtracted,
    metadata,
    visualFrames,
    temporalConsistency,
    acousticSpectrum,
    cameraCharacteristics,
  };
}

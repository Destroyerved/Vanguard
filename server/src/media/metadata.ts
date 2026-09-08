/**
 * VANGUARD — Forensic media metadata extraction.
 *
 * Turns the raw payload's bitstream hints into a normalized
 * `MediaForensicMetadata` and — more importantly — reconstructs the PROVENANCE
 * CHAIN as structured data. A video is not one photograph granted integrity by
 * a signature; it is a sequence of processing steps, each of which either
 * preserves a hardware capture, applies legitimate editing, or introduces
 * synthetic content. Recording that chain as data is what lets the briefing
 * explain, with citations, exactly WHY a clip is distrusted.
 *
 * Deterministic by construction: the same payload always yields the same
 * metadata, and a judge can recompute the provenance labels by hand from the
 * re-encoding history strings.
 */

import type {
  MediaForensicMetadata,
  MediaFinding,
  ProvenanceEntry,
  UnifiedEvent,
} from '../types/events.js';

/** Identifiers that mark a re-encoding step as originating from physical capture. */
const HARDWARE_CAPTURE_MARKERS = [
  'captur',
  'optical',
  'sensor',
  'adc',
  'hardware',
  'hsm',
  'prnu',
];

/** Identifiers that mark a step as introducing synthetic/generated content. */
const SYNTHETIC_MARKERS = [
  'ai generation',
  'synthetic',
  'neural',
  'tts',
  'elevenlabs',
  'runway',
  'sora',
  'generated',
  'cloned',
];

/** Editor tools that apply legitimate, non-fabricating edits. */
const LEGIT_EDIT_MARKERS = [
  'premiere',
  'capcut',
  'davinci',
  'after effects',
  'imovie',
  'crop',
  'stabilize',
  'denoise',
  'upscale',
  'color',
  'lut',
  'edit',
];

/** Read a finite number from an untyped payload with a fallback. */
function num(payload: Record<string, unknown>, key: string, fallback: number): number {
  const v = payload[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/** Read a non-empty string from an untyped payload with a fallback. */
function str(payload: Record<string, unknown>, key: string, fallback: string): string {
  const v = payload[key];
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}

/** Read a boolean with a fallback. */
function bool(payload: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const v = payload[key];
  return typeof v === 'boolean' ? v : fallback;
}

/** Read a string array, dropping non-strings. */
function strList(payload: Record<string, unknown>, key: string): string[] {
  const v = payload[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

/** Read an optional non-empty string; `undefined` when absent. */
function optionalStr(payload: Record<string, unknown>, key: string): string | undefined {
  const v = payload[key];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

/** Classify one re-encoding step as capture, synthetic generation, or editing. */
export function classifyProvenanceStep(line: string): Omit<ProvenanceEntry, 'step' | 'tool'> {
  const lower = line.toLowerCase();
  return {
    hardwareCapture: HARDWARE_CAPTURE_MARKERS.some((m) => lower.includes(m)),
    syntheticGeneration: SYNTHETIC_MARKERS.some((m) => lower.includes(m)),
    legitimateEditing: LEGIT_EDIT_MARKERS.some((m) => lower.includes(m)),
  };
}

/** Reconstruct the structured provenance chain from the re-encoding history. */
export function buildProvenanceChain(history: string[]): ProvenanceEntry[] {
  return history.filter((line) => line.trim().length > 0).map((line) => {
    const flags = classifyProvenanceStep(line);
    // "Captured: Sony ILCE-7M4" -> tool "Sony ILCE-7M4".
    const colon = line.indexOf(':');
    const tool = colon >= 0 ? line.slice(colon + 1).trim() : undefined;
    return { step: line, tool, ...flags };
  });
}

/**
 * Extract normalized forensic metadata from a media event's raw payload.
 * Missing fields fall back to inert sentinels so downstream checks can always
 * run; an absent value is evidence of sparseness, not of tampering.
 */
export function extractForensicMetadata(event: UnifiedEvent): MediaForensicMetadata {
  const p = event.raw;
  const mediaKind = str(p, 'mediaKind', 'video');

  const metadata: MediaForensicMetadata = {
    container: str(p, 'container', 'UNKNOWN_CONTAINER'),
    videoCodec: str(p, 'videoCodec', mediaKind === 'audio' ? 'N/A' : 'UNKNOWN_CODEC'),
    audioCodec: str(p, 'audioCodec', mediaKind === 'video' || mediaKind === 'image' ? 'N/A' : 'UNKNOWN_CODEC'),
    resolution: str(p, 'resolution', mediaKind === 'audio' ? 'N/A' : 'UNKNOWN_RESOLUTION'),
    frameRateFps: mediaKind === 'audio' ? 0 : num(p, 'frameRateFps', 0),
    bitrateKbps: num(p, 'bitrateKbps', 0),
    durationSec: num(p, 'durationSec', 0),
    creationTimestamp: str(p, 'creationTimestamp', event.timestamp),
    softwareMuxer: str(p, 'softwareMuxer', 'UNKNOWN_MUXER'),
    reEncodingHistory: strList(p, 'reEncodingHistory'),
    c2paManifestIntact: bool(p, 'c2paManifestIntact', false),
    deviceFingerprint: optionalStr(p, 'deviceFingerprint') ?? optionalStr(p, 'exifDeviceFingerprint'),
    captureDevice: optionalStr(p, 'captureDevice'),
  };

  return metadata;
}

/**
 * Extract the artifact strings a forensic check found, from the payload arrays
 * the simulators attach. Each becomes a `MediaFinding` an operator can read.
 */
export function payloadFindings(
  event: UnifiedEvent,
  ...keys: string[]
): MediaFinding[] {
  const out: MediaFinding[] = [];
  for (const key of keys) {
    const v = event.raw[key];
    if (!Array.isArray(v)) continue;
    for (const item of v) {
      if (typeof item === 'string') {
        out.push({ code: key, detail: item, confidence: 90 });
      } else if (typeof item === 'object' && item !== null) {
        const rec = item as Record<string, unknown>;
        out.push({
          code: (rec.code as string) ?? key,
          detail: (rec.detail as string) ?? 'artifact reported',
          confidence: typeof rec.confidence === 'number' ? rec.confidence : 90,
        });
      }
    }
  }
  return out;
}